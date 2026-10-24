const assert = require('assert');
const path = require('path');
const Module = require('module');
const B = process.argv[2];
const DIM = 384;
const st = {};
const reset = () =>
  Object.assign(st, {
    modelInstalled: true,
    active: 0,
    maxActive: 0,
    inits: 0,
    releases: 0,
    embedCalls: [],
    failEmbed: false,
    dimOverride: null,
    chunks: [],
    updates: 0,
    lists: 0,
    maxChars: null,
  });
const words = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
const hash = (w) => {
  let h = 7;
  for (const c of w) h = (h * 31 + c.charCodeAt(0)) % 100003;
  return h % DIM;
};
const bow = (text) => {
  const v = new Array(st.dimOverride || DIM).fill(0);
  for (const w of words(text)) v[hash(w) % v.length] += 1;
  return v;
};
const stubs = {
  'llama.rn': {
    initLlama: async (p) => {
      assert.equal(p.embedding, true);
      assert.equal(p.n_ctx, 512);
      st.inits++;
      st.active++;
      st.maxActive = Math.max(st.maxActive, st.active);
      await new Promise((r) => setTimeout(r, 3));
      return {
        id: st.inits,
        embedding: async (text) => {
          if (st.failEmbed) throw new Error('native embed failed');
          if (st.maxChars && text.length > st.maxChars) throw new Error('input is too large');
          st.embedCalls.push(text);
          return { embedding: bow(text) };
        },
        release: async () => {
          st.active--;
          st.releases++;
        },
      };
    },
  },
  'expo-file-system': {
    Directory: class {
      constructor(b, n) {
        this.uri = (b.uri || b) + '/' + n;
      }
    },
    File: class {
      constructor(d, n) {
        this.uri = d.uri + '/' + n;
        this.name = n;
      }
      get exists() {
        return st.modelInstalled;
      }
    },
    Paths: { document: 'file:///docs' },
  },
  'db/queries': {
    listMaterialChunks: async (id) =>
      (st.lists++, st.chunks)
        .filter((c) => c.MaterialID === id)
        .sort((a, b) => a.ChunkIndex - b.ChunkIndex)
        .map((c) => ({ ...c })),
    updateChunkEmbedding: async (cid, blob) => {
      st.updates++;
      const holder = new Uint8Array(blob.length + 3);
      holder.set(blob, 3);
      st.chunks.find((c) => c.ChunkID === cid).VectorEmbedding = holder.subarray(3);
    },
  },
};
const orig = Module._load;
Module._load = function (req, parent, ...r) {
  if (stubs[req]) return stubs[req];
  if (parent && parent.filename && parent.filename.startsWith(B) && req.startsWith('.')) {
    const abs = path.resolve(path.dirname(parent.filename), req);
    for (const k of Object.keys(stubs))
      if (k.includes('/') && !k.startsWith('expo') && abs.endsWith(path.join(B, k)))
        return stubs[k];
  }
  return orig.call(this, req, parent, ...r);
};
const V = require(B + '/services/VectorMath.js');
const E = require(B + '/services/EmbeddingService.js');
const R = require(B + '/services/RetrievalService.js');
// The app no longer exports embedMaterial; the tests keep the same one-call helper.
E.embedMaterial = (id) =>
  E.withEmbeddingModel(async () => (await E.embedPendingChunks(id)).embedded);
let failed = 0;
const t = async (name, fn) => {
  reset();
  try {
    await fn();
    console.log('PASS', name);
  } catch (e) {
    failed++;
    console.log('FAIL', name, '\n  ', e.stack.split('\n').slice(0, 3).join('\n   '));
  }
};
const rejects = async (p, re) => {
  try {
    await p;
  } catch (e) {
    assert.match(e.message, re);
    return;
  }
  assert.fail('expected rejection ' + re);
};
const TEXTS = [
  'Photosynthesis converts light energy into glucose in plants',
  'The Calvin cycle fixes carbon dioxide using ATP and NADPH in the stroma',
  'Cellular respiration releases energy from glucose in mitochondria',
  'The French Revolution began in 1789 with the storming of the Bastille',
  'Napoleon crowned himself emperor in 1804 after a coup',
  'Newton described gravity and the three laws of motion',
  'Einstein proposed relativity linking space and time',
  'The mitochondria produce ATP through oxidative phosphorylation',
  'Plate tectonics explains earthquakes and volcanoes',
  'The water cycle moves water through evaporation and rain',
];
const seed = (n = TEXTS.length, mat = 1) => {
  st.chunks = TEXTS.slice(0, n).map((x, i) => ({
    ChunkID: i + 1,
    MaterialID: mat,
    ChunkIndex: i,
    ExtractedText: x,
    VectorEmbedding: null,
  }));
};
const approx = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} vs ${b}`);

(async () => {
  // ---- VectorMath
  await t('cosine: identical = 1', () =>
    approx(V.cosineSimilarity(Float32Array.of(1, 2, 3), Float32Array.of(1, 2, 3)), 1),
  );
  await t('cosine: orthogonal = 0', () =>
    approx(V.cosineSimilarity(Float32Array.of(1, 0), Float32Array.of(0, 1)), 0),
  );
  await t('cosine: opposite = -1', () =>
    approx(V.cosineSimilarity(Float32Array.of(1, 1), Float32Array.of(-1, -1)), -1),
  );
  await t('cosine: zero vector = 0 (either side)', () => {
    approx(V.cosineSimilarity(new Float32Array(3), Float32Array.of(1, 2, 3)), 0);
    approx(V.cosineSimilarity(Float32Array.of(1, 2, 3), new Float32Array(3)), 0);
  });
  await t('cosine: length mismatch throws', () =>
    assert.throws(
      () => V.cosineSimilarity(Float32Array.of(1), Float32Array.of(1, 2)),
      /length mismatch/,
    ),
  );
  await t('cosine: scale invariant', () =>
    approx(V.cosineSimilarity(Float32Array.of(1, 2, 3), Float32Array.of(10, 20, 30)), 1),
  );
  await t('normalise: unit length; zero vector unchanged', () => {
    const n = V.normalise(Float32Array.of(3, 4));
    approx(n[0], 0.6);
    approx(n[1], 0.8);
    assert.deepEqual([...V.normalise(new Float32Array(2))], [0, 0]);
  });
  await t('blob round trip, plain', () => {
    const v = Float32Array.of(0.5, -1.25, 3.75, 1e-7);
    assert.deepEqual([...V.fromBlob(V.toBlob(v))], [...v]);
  });
  await t('blob round trip from an offset Uint8Array view (alignment 1 and 3)', () => {
    const v = Float32Array.of(0.1, 0.2, 0.3, 0.4);
    for (const off of [1, 2, 3, 5]) {
      const holder = new Uint8Array(v.byteLength + 8);
      holder.set(V.toBlob(v), off);
      const view = holder.subarray(off, off + v.byteLength);
      assert.notEqual(view.byteOffset % 4, 0);
      assert.deepEqual([...V.fromBlob(view)], [...v]);
    }
  });
  await t('naive Float32Array(view.buffer) would be wrong here (guards the helper)', () => {
    const v = Float32Array.of(1, 2);
    const holder = new Uint8Array(16);
    holder.set(V.toBlob(v), 3);
    const view = holder.subarray(3, 11);
    assert.throws(() => new Float32Array(view.buffer, view.byteOffset, 2), RangeError);
  });
  await t('toBlob copies: a subarray vector does not leak neighbours or alias', () => {
    const big = Float32Array.of(9, 1, 2, 9);
    const sub = big.subarray(1, 3);
    const blob = V.toBlob(sub);
    assert.equal(blob.byteLength, 8);
    assert.deepEqual([...V.fromBlob(blob)], [1, 2]);
    big[1] = 5;
    assert.deepEqual([...V.fromBlob(blob)], [1, 2]);
  });
  await t('fromBlob rejects partial floats', () =>
    assert.throws(() => V.fromBlob(new Uint8Array(7)), /whole number of floats/),
  );

  // ---- Embedding
  await t('embed: needs a loaded model', async () => rejects(E.embed('hi'), /not loaded/));
  await t('embed: unit vector of the right size', async () => {
    await E.withEmbeddingModel(async () => {
      const v = await E.embed('The Calvin cycle');
      assert.equal(v.length, DIM);
      approx(V.cosineSimilarity(v, v), 1);
      approx(Math.hypot(...v), 1, 1e-5);
    });
  });
  await t('embed: long text is cut to 1800 chars', async () => {
    await E.withEmbeddingModel(() => E.embed('abc '.repeat(2000)));
    assert.ok(st.embedCalls[0].length <= 1800);
  });
  await t('embed: never ends on half an emoji', async () => {
    await E.withEmbeddingModel(() => E.embed('a'.repeat(1799) + '\u{1F600}'));
    const x = st.embedCalls[0];
    assert.ok(!/[\ud800-\udbff]$/.test(x));
  });
  await t('embed: blank text rejected', async () => {
    await rejects(
      E.withEmbeddingModel(() => E.embed('   ')),
      /no text to embed/,
    );
    assert.equal(st.active, 0);
  });
  await t('embed: wrong dimension rejected', async () => {
    st.dimOverride = 100;
    await rejects(
      E.withEmbeddingModel(() => E.embed('x')),
      /returned 100 values, expected 384/,
    );
    assert.equal(st.active, 0);
  });
  await t('model not installed -> clear error, nothing loaded', async () => {
    st.modelInstalled = false;
    assert.equal(E.isEmbeddingModelInstalled(), false);
    await rejects(
      E.withEmbeddingModel(async () => 1),
      /not installed/,
    );
    assert.equal(st.inits, 0);
  });
  await t('model is released after work, even when work throws', async () => {
    await rejects(
      E.withEmbeddingModel(async () => {
        throw new Error('boom');
      }),
      /boom/,
    );
    assert.equal(st.active, 0);
    assert.equal(st.releases, 1);
  });
  await t('release is safe when nothing is loaded', async () => {
    await E.releaseEmbeddingModel();
    await E.releaseEmbeddingModel();
  });
  await t('needsEmbedding: null and wrong-size blobs', () => {
    assert.equal(E.needsEmbedding(null), true);
    assert.equal(E.needsEmbedding(new Uint8Array(10)), true);
    assert.equal(E.needsEmbedding(new Uint8Array(DIM * 4)), false);
  });
  await t('embedMaterial: embeds every chunk once, stores BLOBs, releases', async () => {
    seed();
    const n = await E.embedMaterial(1);
    assert.equal(n, 10);
    assert.equal(st.updates, 10);
    assert.ok(st.chunks.every((c) => c.VectorEmbedding.byteLength === DIM * 4));
    assert.equal(st.active, 0);
    assert.equal(await E.embedMaterial(1), 0);
    assert.equal(st.updates, 10);
  });
  await t('embedMaterial: resumes after a failure part-way', async () => {
    seed();
    let calls = 0;
    const realFail = () => {
      calls++;
      if (calls === 4) st.failEmbed = true;
    };
    const orig = stubs['llama.rn'].initLlama;
    stubs['llama.rn'].initLlama = async (p) => {
      const c = await orig(p);
      const e = c.embedding;
      c.embedding = async (x) => {
        realFail();
        return e(x);
      };
      return c;
    };
    await rejects(E.embedMaterial(1), /native embed failed/);
    assert.equal(st.updates, 3);
    assert.equal(st.active, 0);
    stubs['llama.rn'].initLlama = orig;
    st.failEmbed = false;
    assert.equal(await E.embedMaterial(1), 7);
    assert.equal(st.updates, 10);
  });
  await t('embedMaterial: re-embeds a chunk whose stored vector has the wrong size', async () => {
    seed(3);
    await E.embedMaterial(1);
    st.chunks[1].VectorEmbedding = new Uint8Array(40);
    st.updates = 0;
    assert.equal(await E.embedMaterial(1), 1);
    assert.equal(st.chunks[1].VectorEmbedding.byteLength, DIM * 4);
  });

  // ---- Retrieval

  await t('blank chunk gets a zero vector, no model call, and is not retried', async () => {
    seed(3);
    st.chunks[1].ExtractedText = '  \n ';
    assert.equal(await E.embedMaterial(1), 3);
    assert.equal(st.embedCalls.length, 2);
    assert.ok(st.chunks[1].VectorEmbedding.every((b) => b === 0));
    assert.equal(await E.embedMaterial(1), 0);
  });
  await t('blank chunk never breaks retrieval and scores 0', async () => {
    seed(3);
    st.chunks[1].ExtractedText = ' ';
    const r = await R.retrieve('light energy glucose', 1);
    assert.equal(r.length, 3);
    assert.equal(r.find((c) => c.ChunkIndex === 1).similarity, 0);
  });
  await t('token-dense chunk that overflows is retried shorter and succeeds', async () => {
    seed(2);
    st.chunks[0].ExtractedText = 'z9 '.repeat(500);
    st.maxChars = 700;
    assert.equal(await E.embedMaterial(1), 2);
    assert.ok(st.embedCalls.some((x) => x.length <= 600 && x.startsWith('z9')));
    assert.equal(st.chunks[0].VectorEmbedding.byteLength, DIM * 4);
  });
  await t(
    'a failure that persists after the retry still surfaces (model problem, not a bad chunk)',
    async () => {
      seed(2);
      st.chunks[0].ExtractedText = 'q '.repeat(500);
      st.maxChars = 10;
      await rejects(E.embedMaterial(1), /too large/);
      assert.equal(st.chunks[0].VectorEmbedding, null);
      assert.equal(st.active, 0);
    },
  );
  await t('short chunk that fails is not retried with the same text', async () => {
    seed(1);
    st.failEmbed = true;
    st.chunks[0].ExtractedText = 'short';
    await rejects(E.embedMaterial(1), /native embed failed/);
  });
  await t('retrieve reads the chunks once per question', async () => {
    seed();
    st.lists = 0;
    await R.retrieve('Calvin', 1);
    assert.equal(st.lists, 1);
  });
  await t('retrieve: finds the Calvin cycle chunk first', async () => {
    seed();
    const r = await R.retrieve('What is the Calvin cycle?', 1);
    const top = [...r].sort((a, b) => b.similarity - a.similarity)[0];
    assert.equal(top.ChunkIndex, 1);
    assert.ok(top.similarity > 0.3);
  });
  await t('retrieve: at most TOP_K, in reading order, similarity attached', async () => {
    seed();
    const r = await R.retrieve('glucose energy mitochondria ATP', 1);
    assert.equal(r.length, 5);
    assert.deepEqual(
      r.map((c) => c.ChunkIndex),
      [...r.map((c) => c.ChunkIndex)].sort((a, b) => a - b),
    );
    assert.ok(r.every((c) => typeof c.similarity === 'number'));
  });
  await t('retrieve: the 5 returned are really the 5 best', async () => {
    seed();
    const q = 'ATP glucose energy cycle';
    const r = await R.retrieve(q, 1);
    const qv = V.normalise(Float32Array.from(bow(q)));
    const all = TEXTS.map((x, i) => ({
      i,
      s: V.cosineSimilarity(qv, V.normalise(Float32Array.from(bow(x)))),
    }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 5)
      .map((x) => x.i)
      .sort((a, b) => a - b);
    assert.deepEqual(
      r.map((c) => c.ChunkIndex),
      all,
    );
  });
  await t('retrieve: fewer chunks than TOP_K returns them all', async () => {
    seed(3);
    assert.equal((await R.retrieve('light', 1)).length, 3);
  });
  await t(
    'retrieve: vectors stored once and reused (second call embeds only the query)',
    async () => {
      seed();
      await R.retrieve('Calvin', 1);
      const first = st.embedCalls.length;
      assert.equal(first, 11);
      await R.retrieve('Napoleon', 1);
      assert.equal(st.embedCalls.length, first + 1);
      assert.equal(st.updates, 10);
    },
  );
  await t('retrieve: model released before returning', async () => {
    seed();
    await R.retrieve('x y', 1);
    assert.equal(st.active, 0);
    assert.equal(st.inits, st.releases);
  });
  await t('retrieve: released even when embedding fails', async () => {
    seed();
    st.failEmbed = true;
    await rejects(R.retrieve('q', 1), /native embed failed/);
    assert.equal(st.active, 0);
  });
  await t('retrieve: blank query rejected before the model loads', async () => {
    seed();
    await rejects(R.retrieve('   ', 1), /Type a question first/);
    assert.equal(st.inits, 0);
  });
  await t('retrieve: material with no chunks -> []', async () => {
    assert.deepEqual(await R.retrieve('anything', 99), []);
  });
  await t('retrieve: only searches the requested material', async () => {
    seed(3, 1);
    st.chunks.push(
      ...TEXTS.slice(3, 6).map((x, i) => ({
        ChunkID: 100 + i,
        MaterialID: 2,
        ChunkIndex: i,
        ExtractedText: x,
        VectorEmbedding: null,
      })),
    );
    const r = await R.retrieve('Napoleon emperor', 1);
    assert.ok(r.every((c) => c.MaterialID === 1));
    assert.ok(st.chunks.filter((c) => c.MaterialID === 2).every((c) => c.VectorEmbedding === null));
  });
  await t('retrieve: model not installed -> clear error', async () => {
    seed();
    st.modelInstalled = false;
    await rejects(R.retrieve('q', 1), /not installed/);
  });
  await t('retrieve: concurrent calls never run two embedding contexts at once', async () => {
    seed();
    await Promise.all([
      R.retrieve('Calvin cycle', 1),
      R.retrieve('French Revolution', 1),
      E.embedMaterial(1),
      R.retrieve('gravity', 1),
    ]);
    assert.equal(st.maxActive, 1);
    assert.equal(st.active, 0);
  });
  await t('retrieve: a failure does not break the queue for the next caller', async () => {
    seed();
    st.failEmbed = true;
    await rejects(R.retrieve('q', 1), /native embed failed/);
    st.failEmbed = false;
    assert.equal((await R.retrieve('Calvin cycle', 1)).length, 5);
  });
  await t('retrieve: stored vectors survive an odd-offset BLOB view (SQLite-like)', async () => {
    seed();
    await E.embedMaterial(1);
    assert.ok(st.chunks.some((c) => c.VectorEmbedding.byteOffset % 4 !== 0));
    st.embedCalls.length = 0;
    const r = await R.retrieve('Calvin cycle', 1);
    assert.equal(st.embedCalls.length, 1);
    assert.ok(r.length === 5);
  });
  process.exitCode = failed ? 1 : 0;
})();
