const assert = require('assert');
const path = require('path');
const Module = require('module');
const B = process.argv[2];

// ---- in-memory file system + stubs
const fs = new Map(); // uri -> true
const calls = {};
const st = {};
const reset = () => {
  fs.clear();
  Object.assign(st, {
    picker: { canceled: true },
    extractText: async () => 'First sentence. Second sentence. '.repeat(200),
    extractorAvailable: true,
    rows: [],
    chunks: [],
    deletedRows: [],
    failCreateRow: false,
    failChunks: false,
    failFileDelete: false,
    userId: 5,
    mkdirs: 0,
    renamed: undefined,
  });
};
const norm = (u) => u.replace(/\/+$/, '');
class Directory {
  constructor(base, name) {
    this.uri = name ? norm(base.uri || base) + '/' + name : norm(base);
  }
  create() {
    st.mkdirs++;
  }
}
class File {
  constructor(base, name) {
    this.uri = name ? norm(base.uri || base) + '/' + name : base;
    this.name = this.uri.split('/').pop();
  }
  get exists() {
    return fs.has(this.uri);
  }
  async copy(dest) {
    if (!fs.has(this.uri)) throw new Error('source missing');
    await new Promise((r) => setTimeout(r, 5));
    fs.set(dest.uri, true);
  }
  delete() {
    if (st.failFileDelete) throw new Error('disk error');
    fs.delete(this.uri);
  }
}
const stubs = {
  'expo-file-system': {
    Directory,
    File,
    Paths: { document: 'file:///docs', cache: { uri: 'file:///cache/' } },
  },
  'expo-document-picker': { getDocumentAsync: async () => st.picker },
  'expo-pdf-text-extract': {
    isAvailable: () => st.extractorAvailable,
    extractText: (u) => {
      if (!fs.has(u)) throw new Error('ENOENT ' + u);
      return st.extractText(u);
    },
  },
  'db/queries': {
    getOrCreateUserProfile: async () => ({ UserID: st.userId }),
    createStudyMaterial: async (i) => {
      if (st.failCreateRow) throw new Error('row failed');
      const m = { MaterialID: 42, UploadDate: 'd', ...i };
      st.rows.push(m);
      return m;
    },
    deleteStudyMaterial: async (id) => {
      st.deletedRows.push(id);
      st.rows = st.rows.filter((r) => r.MaterialID !== id);
    },
    listStudyMaterials: async (uid) => {
      st.listUser = uid;
      return st.rows;
    },
    getStudyMaterial: async (id) => st.rows.find((r) => r.MaterialID === id) ?? null,
    updateStudyMaterialTitle: async (id, title) => {
      st.renamed = [id, title];
      const r = st.rows.find((x) => x.MaterialID === id);
      if (r) r.ModuleCode = title;
    },
    createMaterialChunks: async (c) => {
      if (st.failChunks) throw new Error('chunks failed');
      st.chunks.push(...c);
    },
  },
};
const orig = Module._load;
Module._load = function (req, parent, ...r) {
  if (stubs[req]) return stubs[req];
  if (parent && parent.filename && parent.filename.startsWith(B) && req.startsWith('.')) {
    const abs = path.resolve(path.dirname(parent.filename), req);
    for (const k of Object.keys(stubs))
      if (k.includes('/') && abs.endsWith(path.join(B, k))) return stubs[k];
  }
  return orig.call(this, req, parent, ...r);
};
const { chunkText, chunkAndStore } = require(B + '/services/ChunkingService.js');
const D = require(B + '/services/DocumentService.js');
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
const MAX = 2048;

(async () => {
  // ---- chunker
  await t('empty and whitespace -> []', () => {
    assert.deepEqual(chunkText(''), []);
    assert.deepEqual(chunkText('  \n\t \r\n '), []);
  });
  await t('100 chars -> 1 chunk', () => {
    const s = 'a'.repeat(50) + ' ' + 'b'.repeat(49);
    const c = chunkText(s);
    assert.equal(c.length, 1);
    assert.equal(c[0], s);
  });
  await t('10k chars: ~6 chunks, <=2048, overlap, full coverage', () => {
    const sents = Array.from({ length: 400 }, (_, i) => `Sentence number ${i} here.`);
    const text = sents.join(' ');
    assert.ok(text.length > 9000);
    const c = chunkText(text);
    assert.ok(c.length >= 5 && c.length <= 8, 'count ' + c.length);
    c.forEach((x) => assert.ok(x.length <= MAX, 'len ' + x.length));
    for (let i = 0; i + 1 < c.length; i++) {
      const head = c[i + 1].slice(0, 25);
      assert.ok(c[i].includes(head), 'no overlap between ' + i + ' and ' + (i + 1));
      assert.ok(c[i + 1].length > 0);
    }
    sents.forEach((s) =>
      assert.ok(
        c.some((x) => x.includes(s)),
        'missing: ' + s,
      ),
    );
  });
  await t('chunks end at sentence boundaries when possible', () => {
    const text = Array.from({ length: 300 }, (_, i) => `Fact ${i} is true.`).join(' ');
    const c = chunkText(text);
    c.forEach((x) => assert.match(x, /\.$/));
  });
  await t('5000-char single word terminates and covers everything', () => {
    const c = chunkText('x'.repeat(5000));
    assert.ok(c.length >= 3 && c.length <= 5);
    c.forEach((x) => assert.ok(x.length <= MAX));
    assert.equal(c[c.length - 1].slice(-10), 'x'.repeat(10));
  });
  await t('100k chars of one word does not hang', () => {
    const t0 = Date.now();
    const c = chunkText('y'.repeat(100000));
    assert.ok(Date.now() - t0 < 500);
    assert.ok(c.length > 40);
  });
  await t('whitespace normalised, paragraphs kept', () => {
    assert.deepEqual(chunkText('a  \t b\r\n\r\n\r\n\r\nc'), ['a b\n\nc']);
  });
  await t('2MB of text chunks quickly', () => {
    const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(35000);
    const t0 = Date.now();
    const c = chunkText(text);
    assert.ok(Date.now() - t0 < 1500, 'slow ' + (Date.now() - t0));
    c.forEach((x) => assert.ok(x.length <= MAX));
  });
  await t('every chunk starts at a word boundary', () => {
    const text = Array.from({ length: 800 }, (_, i) => 'word' + i).join(' ');
    chunkText(text).forEach((x) => assert.match(x, /^word\d+/));
  });

  await t('no-whitespace text keeps its overlap', () => {
    const text = Array.from({ length: 1500 }, (_, i) => String(i).padStart(4, '0')).join('');
    const c = chunkText(text);
    assert.ok(c.length >= 3);
    for (let i = 0; i + 1 < c.length; i++)
      assert.ok(c[i].includes(c[i + 1].slice(0, 20)), 'no overlap at ' + i);
  });
  await t('astral characters are never split', () => {
    const c = chunkText('\u{1F600}'.repeat(3000));
    assert.ok(c.length >= 3);
    c.forEach((x) =>
      assert.ok(
        !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(x),
        'lone surrogate',
      ),
    );
  });
  await t('no tiny chunks when there is no sentence end', () => {
    const c = chunkText('Hi. ' + 'word '.repeat(2000));
    c.slice(0, -1).forEach((x) => assert.ok(x.length > 1000, 'tiny chunk of ' + x.length));
  });
  await t('chunkAndStore stores indexed rows and returns count', async () => {
    const n = await chunkAndStore(9, 'Hello world. '.repeat(500));
    assert.equal(n, st.chunks.length);
    assert.ok(n >= 2);
    assert.deepEqual(
      st.chunks.map((c) => c.ChunkIndex),
      [...Array(n).keys()],
    );
    assert.ok(st.chunks.every((c) => c.MaterialID === 9));
  });
  await t('chunkAndStore rejects empty text', async () => {
    await rejects(chunkAndStore(9, '   '), /no readable text/);
    assert.equal(st.chunks.length, 0);
  });

  // ---- pickDocument
  await t('pick: cancel -> null', async () => {
    assert.equal(await D.pickDocument(), null);
  });
  await t('pick: returns the document', async () => {
    st.picker = {
      canceled: false,
      assets: [{ uri: 'file:///cache/a.pdf', name: 'Notes.PDF', size: 12 }],
    };
    assert.deepEqual(await D.pickDocument(), {
      uri: 'file:///cache/a.pdf',
      name: 'Notes.PDF',
      size: 12,
    });
  });
  await t('pick: non-pdf rejected', async () => {
    st.picker = { canceled: false, assets: [{ uri: 'file:///cache/a.txt', name: 'a.txt' }] };
    await rejects(D.pickDocument(), /Choose a PDF/);
  });

  // ---- importDocument
  const doc = { uri: 'file:///cache/My Notes (1).pdf', name: 'My Notes (1).pdf', size: 10 };
  const arm = () => fs.set(doc.uri, true);
  await t('import: success, stage order, title in ModuleCode, copy kept', async () => {
    arm();
    const stages = [];
    const m = await D.importDocument(doc, '  Mathematics  ', (s) => stages.push(s));
    assert.deepEqual(stages, ['copying', 'extracting', 'saving', 'chunking']);
    assert.equal(m.ModuleCode, 'Mathematics');
    assert.equal(m.FileName, 'My Notes (1).pdf');
    assert.equal(m.UserID, 5);
    assert.match(m.FilePath, /^file:\/\/\/docs\/materials\/\d+-[a-z0-9]{1,4}-My_Notes_1\.pdf$/);
    assert.ok(fs.has(m.FilePath));
    assert.ok(st.chunks.length > 0 && st.chunks.every((c) => c.MaterialID === 42));
    assert.equal(st.mkdirs, 1);
    assert.equal(fs.has(doc.uri), false, 'picker cache copy should be removed');
  });
  await t('import: empty title rejected before anything is copied', async () => {
    arm();
    await rejects(D.importDocument(doc, '   '), /Enter a title/);
    assert.equal(st.mkdirs, 0);
    assert.equal([...fs.keys()].length, 1);
  });
  await t('import: overlong title rejected', async () => {
    arm();
    await rejects(D.importDocument(doc, 'x'.repeat(81)), /under 80/);
  });
  await t('import: scanned PDF leaves no file and no row', async () => {
    arm();
    st.extractText = async () => '  \n ';
    await rejects(D.importDocument(doc, 'T'), /no selectable text/);
    assert.deepEqual([...fs.keys()], [doc.uri]);
    assert.equal(st.rows.length, 0);
  });
  await t('import: password protected -> friendly error, copy removed', async () => {
    arm();
    st.extractText = async () => {
      const e = new Error('native');
      e.code = 'PASSWORD_REQUIRED';
      throw e;
    };
    await rejects(D.importDocument(doc, 'T'), /password protected/);
    assert.deepEqual([...fs.keys()], [doc.uri]);
  });
  await t('import: corrupt PDF -> friendly error', async () => {
    arm();
    st.extractText = async () => {
      const e = new Error('native');
      e.code = 'CORRUPT_PDF';
      throw e;
    };
    await rejects(D.importDocument(doc, 'T'), /could not be read/);
  });
  await t('import: extractor unavailable', async () => {
    arm();
    st.extractorAvailable = false;
    await rejects(D.importDocument(doc, 'T'), /not available/);
    assert.deepEqual([...fs.keys()], [doc.uri]);
  });
  await t('import: chunk failure removes row and copy', async () => {
    arm();
    st.failChunks = true;
    await rejects(D.importDocument(doc, 'T'), /chunks failed/);
    assert.deepEqual(st.deletedRows, [42]);
    assert.equal(st.rows.length, 0);
    assert.deepEqual([...fs.keys()], [doc.uri]);
  });
  await t('import: row failure removes copy, deletes no row', async () => {
    arm();
    st.failCreateRow = true;
    await rejects(D.importDocument(doc, 'T'), /row failed/);
    assert.deepEqual(st.deletedRows, []);
    assert.deepEqual([...fs.keys()], [doc.uri]);
  });
  await t('import: missing source file -> error, no row', async () => {
    await rejects(D.importDocument(doc, 'T'), /source missing/);
    assert.equal(st.rows.length, 0);
  });
  await t('import: failed cleanup does not hide the real error', async () => {
    arm();
    st.failChunks = true;
    st.failFileDelete = true;
    await rejects(D.importDocument(doc, 'T'), /chunks failed/);
  });
  await t('import: progress callback optional', async () => {
    arm();
    await D.importDocument(doc, 'T');
  });

  await t('import: picker copy outside cache is left alone', async () => {
    const outside = { uri: 'file:///downloads/a.pdf', name: 'a.pdf', size: 1 };
    fs.set(outside.uri, true);
    await D.importDocument(outside, 'T');
    assert.equal(fs.has(outside.uri), true);
  });
  await t('import: picker copy kept when the import fails (retry possible)', async () => {
    arm();
    st.failChunks = true;
    await rejects(D.importDocument(doc, 'T'), /chunks failed/);
    assert.equal(fs.has(doc.uri), true);
  });
  await t('import: names never collide within a millisecond', async () => {
    arm();
    const a = await D.importDocument(doc, 'A');
    arm();
    const b = await D.importDocument(doc, 'B');
    assert.notEqual(a.FilePath, b.FilePath);
  });
  await t('pick: PDF with no extension accepted by mime type', async () => {
    st.picker = {
      canceled: false,
      assets: [{ uri: 'file:///cache/Lecture 3', name: 'Lecture 3', mimeType: 'application/pdf' }],
    };
    assert.equal((await D.pickDocument()).name, 'Lecture 3');
  });
  await t('pick: rejected non-pdf has its cache copy removed', async () => {
    fs.set('file:///cache/a.txt', true);
    st.picker = {
      canceled: false,
      assets: [{ uri: 'file:///cache/a.txt', name: 'a.txt', mimeType: 'text/plain' }],
    };
    await rejects(D.pickDocument(), /Choose a PDF/);
    assert.equal(fs.has('file:///cache/a.txt'), false);
  });
  await t('import: password error detected from the message alone', async () => {
    arm();
    st.extractText = async () => {
      throw new Error('Cannot open: document is encrypted');
    };
    await rejects(D.importDocument(doc, 'T'), /password protected/);
  });

  // ---- list / delete
  await t('list: uses the profile user id', async () => {
    await D.listMaterials();
    assert.equal(st.listUser, 5);
  });
  await t('delete: removes row and stored PDF', async () => {
    arm();
    const m = await D.importDocument(doc, 'T');
    assert.ok(fs.has(m.FilePath));
    await D.deleteMaterial(42);
    assert.deepEqual(st.deletedRows, [42]);
    assert.equal(fs.has(m.FilePath), false);
  });
  await t('delete: unknown id throws and deletes nothing', async () => {
    await rejects(D.deleteMaterial(7), /no longer exists/);
    assert.deepEqual(st.deletedRows, []);
  });
  await t('delete: a file that will not delete does not fail the delete', async () => {
    arm();
    await D.importDocument(doc, 'T');
    st.failFileDelete = true;
    await D.deleteMaterial(42);
    assert.deepEqual(st.deletedRows, [42]);
  });

  // ---- title validation / rename
  await t('validateTitle: trims, rejects empty and overlong', () => {
    assert.equal(D.validateTitle('  Maths  '), 'Maths');
    assert.throws(() => D.validateTitle('   '), /Enter a title/);
    assert.throws(() => D.validateTitle('x'.repeat(81)), /under 80/);
    assert.equal(D.validateTitle('x'.repeat(80)).length, 80);
  });
  await t('rename: updates the stored title', async () => {
    arm();
    await D.importDocument(doc, 'Old');
    await D.renameMaterial(42, '  New name ');
    assert.deepEqual(st.renamed, [42, 'New name']);
    assert.equal(st.rows[0].ModuleCode, 'New name');
  });
  await t('rename: bad title rejected before touching the database', async () => {
    await rejects(D.renameMaterial(42, ' '), /Enter a title/);
    assert.equal(st.renamed, undefined);
  });
  await t('rename: unknown material', async () => {
    await rejects(D.renameMaterial(5, 'X'), /no longer exists/);
    assert.equal(st.renamed, undefined);
  });
  process.exitCode = failed ? 1 : 0;
})();
