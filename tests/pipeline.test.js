const assert = require('assert');
const path = require('path');
const Module = require('module');
const B = process.argv[2];
const state = {};
const reset = () =>
  Object.assign(state, {
    chunks: [
      {
        ChunkID: 1,
        MaterialID: 7,
        ChunkIndex: 0,
        ExtractedText: 'alpha notes',
        VectorEmbedding: null,
      },
    ],
    dispatchText: '',
    dispatchArgs: null,
    retrieve: async () => {
      throw new Error('Not implemented');
    },
    history: [],
    decks: [],
    cards: [],
    deleted: [],
    dispatchDelay: 0,
    routerBusy: false,
    failCards: false,
    failHistory: false,
  });
const stubs = {
  'db/queries': {
    listMaterialChunks: async () => state.chunks,
    createRevisionDeck: async (m, name) => {
      const d = { DeckID: 99, MaterialID: m, DeckName: name };
      state.decks.push(d);
      return d;
    },
    createFlashcards: async (c) => {
      if (state.failCards) throw new Error('cards failed');
      state.cards.push(...c);
    },
    deleteRevisionDeck: async (id) => {
      state.deleted.push(id);
    },
    createGenerationHistory: async (i) => {
      if (state.failHistory) throw new Error('history failed');
      state.history.push(i);
      return { HistoryID: 1, MaterialName: 'x', GeneratedDate: 'd', ...i };
    },
  },
  'services/InferenceRouter': {
    isRouterBusy: () => state.routerBusy,
    dispatch: async (task, chunks, userText, onToken) => {
      state.dispatchArgs = { task, chunks, userText };
      if (state.dispatchDelay) await new Promise((r) => setTimeout(r, state.dispatchDelay));
      onToken && onToken('tok');
      return state.dispatchText;
    },
  },
  'services/RetrievalService': { retrieve: (...a) => state.retrieve(...a) },
};
const orig = Module._load;
Module._load = function (req, parent, ...r) {
  if (parent && parent.filename && parent.filename.startsWith(B)) {
    const abs = path.resolve(path.dirname(parent.filename), req);
    for (const k of Object.keys(stubs)) if (abs.endsWith(path.join(B, k))) return stubs[k];
  }
  return orig.call(this, req, parent, ...r);
};
const { generateForMaterial, isPipelineBusy } = require(B + '/services/GenerationPipeline.js');
let failed = 0;
const t = async (name, fn) => {
  reset();
  try {
    await fn();
    console.log('PASS', name);
  } catch (e) {
    failed++;
    console.log('FAIL', name, '\n  ', e.message);
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
const QA = 'Q: One?\nA: a1\nQ: Two?\nA: a2\nQ: Three?\nA: a3';

(async () => {
  await t('summary trims text, label as prompt', async () => {
    state.dispatchText = '  - point  \n';
    const r = await generateForMaterial(7, 'summary');
    assert.deepEqual(r.Result, { kind: 'text', text: '- point' });
    assert.equal(r.Prompt, 'Summary');
    assert.equal(state.decks.length, 0);
  });
  await t('flashcards create deck + cards + history', async () => {
    state.dispatchText = QA;
    const r = await generateForMaterial(7, 'flashcards');
    assert.equal(state.decks.length, 1);
    assert.match(state.decks[0].DeckName, /^Flashcards - \d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/);
    assert.equal(state.cards.length, 3);
    assert.equal(state.cards[0].DeckID, 99);
    assert.equal(state.cards[1].Question, 'Two?');
    assert.equal(r.Result.kind, 'flashcards');
    assert.equal(r.Result.cards.length, 3);
    assert.equal(r.TaskType, 'flashcards');
  });
  await t('questions shape, no deck', async () => {
    state.dispatchText = QA;
    const r = await generateForMaterial(7, 'questions');
    assert.equal(r.Result.kind, 'question-answer');
    assert.equal(r.Result.items.length, 3);
    assert.equal(state.decks.length, 0);
  });
  await t('unparseable questions: error, nothing saved', async () => {
    state.dispatchText = 'I cannot do that.';
    await rejects(generateForMaterial(7, 'questions'), /Couldn't read the AI's answer/);
    assert.equal(state.history.length, 0);
  });
  await t('unparseable flashcards: no orphan deck', async () => {
    state.dispatchText = 'blah';
    await rejects(generateForMaterial(7, 'flashcards'), /Couldn't read/);
    assert.equal(state.decks.length, 0);
    assert.equal(state.history.length, 0);
  });
  await t('empty summary text rejected', async () => {
    state.dispatchText = '   ';
    await rejects(generateForMaterial(7, 'summary'), /returned no text/);
  });
  await t('zero chunks', async () => {
    state.chunks = [];
    await rejects(generateForMaterial(7, 'summary'), /no readable text/);
    assert.equal(state.dispatchArgs, null);
  });
  await t('freeform falls back to sampled chunks when retrieval not implemented', async () => {
    state.dispatchText = 'The answer.';
    const r = await generateForMaterial(7, 'freeform', '  What is alpha?  ');
    assert.equal(state.dispatchArgs.chunks[0].ExtractedText, 'alpha notes');
    assert.equal(state.dispatchArgs.userText, 'What is alpha?');
    assert.equal(r.Prompt, 'What is alpha?');
    assert.equal(r.Result.kind, 'text');
  });
  await t('freeform uses retrieved chunks', async () => {
    state.dispatchText = 'ok';
    state.retrieve = async (q, m) => {
      assert.equal(q, 'Q?');
      assert.equal(m, 7);
      return [
        {
          ChunkID: 5,
          MaterialID: 7,
          ChunkIndex: 3,
          ExtractedText: 'found',
          VectorEmbedding: null,
          similarity: 0.9,
        },
      ];
    };
    await generateForMaterial(7, 'freeform', 'Q?');
    assert.equal(state.dispatchArgs.chunks[0].ExtractedText, 'found');
  });
  await t('retrieval error falls back to sampling', async () => {
    state.dispatchText = 'ok';
    state.retrieve = async () => {
      throw new Error('embedding model missing');
    };
    await generateForMaterial(7, 'freeform', 'Q?');
    assert.equal(state.dispatchArgs.chunks[0].ExtractedText, 'alpha notes');
    assert.equal(isPipelineBusy(), false);
  });
  await t('empty retrieval falls back to sampling', async () => {
    state.dispatchText = 'ok';
    state.retrieve = async () => [];
    await generateForMaterial(7, 'freeform', 'Q?');
    assert.equal(state.dispatchArgs.chunks[0].ExtractedText, 'alpha notes');
  });
  await t('card insert failure deletes the new deck', async () => {
    state.dispatchText = QA;
    state.failCards = true;
    await rejects(generateForMaterial(7, 'flashcards'), /cards failed/);
    assert.deepEqual(state.deleted, [99]);
    assert.equal(state.history.length, 0);
  });
  await t('history failure deletes the new deck', async () => {
    state.dispatchText = QA;
    state.failHistory = true;
    await rejects(generateForMaterial(7, 'flashcards'), /history failed/);
    assert.deepEqual(state.deleted, [99]);
  });
  await t('failed history on summary deletes nothing', async () => {
    state.dispatchText = 'x';
    state.failHistory = true;
    await rejects(generateForMaterial(7, 'summary'), /history failed/);
    assert.deepEqual(state.deleted, []);
  });
  await t('blank chunks are filtered out', async () => {
    state.chunks = [
      { ChunkID: 1, MaterialID: 7, ChunkIndex: 0, ExtractedText: '  \n ', VectorEmbedding: null },
    ];
    await rejects(generateForMaterial(7, 'summary'), /no readable text/);
  });
  await t('typed text ignored for non-freeform tasks', async () => {
    state.dispatchText = QA;
    const r = await generateForMaterial(7, 'questions', 'only chapter 3');
    assert.equal(state.dispatchArgs.userText, undefined);
    assert.equal(r.Prompt, 'Questions and answers');
  });
  await t('router busy blocks the pipeline', async () => {
    state.routerBusy = true;
    assert.equal(isPipelineBusy(), true);
    await rejects(generateForMaterial(7, 'summary'), /already running/);
  });
  await t('freeform without text', async () => {
    await rejects(generateForMaterial(7, 'freeform', '   '), /Type a question first/);
    assert.equal(isPipelineBusy(), false);
  });
  await t('non-freeform ignores retrieval', async () => {
    state.dispatchText = 'x';
    state.retrieve = async () => {
      throw new Error('should not be called');
    };
    await generateForMaterial(7, 'summary', 'ignored');
  });
  await t('second concurrent call rejected; flag resets', async () => {
    state.dispatchText = 'x';
    state.dispatchDelay = 30;
    const first = generateForMaterial(7, 'summary');
    assert.equal(isPipelineBusy(), true);
    await rejects(generateForMaterial(7, 'summary'), /already running/);
    await first;
    assert.equal(isPipelineBusy(), false);
  });
  await t('onToken forwarded', async () => {
    state.dispatchText = 'x';
    const got = [];
    await generateForMaterial(7, 'summary', undefined, (s) => got.push(s));
    assert.deepEqual(got, ['tok']);
  });
  process.exitCode = failed ? 1 : 0;
})();
