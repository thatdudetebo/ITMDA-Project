// Tests InferenceRouter.dispatch with a fake model: which temperature each task uses, loading the
// model on demand, the cut-off flag, and the one-generation-at-a-time guard.
const assert = require('assert');
const path = require('path');
const Module = require('module');

const B = process.argv[2];
const state = {};
const reset = () =>
  Object.assign(state, {
    loaded: false,
    loads: 0,
    calls: [],
    cut: false,
    enhancedMode: false,
    delay: 0,
    failGenerate: false,
  });
const stubs = {
  'services/GenerationService': {
    isModelLoaded: () => state.loaded,
    loadGenerationModel: async () => {
      state.loads++;
      state.loaded = true;
    },
    generate: async (prompt, onToken, temperature) => {
      state.calls.push({ prompt, temperature });
      if (state.delay) await new Promise((r) => setTimeout(r, state.delay));
      if (state.failGenerate) throw new Error('model failed');
      onToken && onToken('tok');
      return 'generated text';
    },
    lastGenerationWasCut: () => state.cut,
  },
  'services/PreferencesService': {
    getPreferences: async () => ({ enhancedMode: state.enhancedMode, wifiOnlyDownloads: true }),
  },
};
const orig = Module._load;
Module._load = function (req, parent, ...rest) {
  if (parent && parent.filename && parent.filename.startsWith(B) && req.startsWith('.')) {
    const abs = path.resolve(path.dirname(parent.filename), req);
    for (const k of Object.keys(stubs)) if (abs.endsWith(path.join(B, k))) return stubs[k];
  }
  return orig.call(this, req, parent, ...rest);
};
const router = require(B + '/services/InferenceRouter.js');
const config = require(B + '/config.js');

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
const chunk = {
  ChunkID: 1,
  MaterialID: 1,
  ChunkIndex: 0,
  ExtractedText: 'Some notes.',
  VectorEmbedding: null,
  similarity: 1,
};

(async () => {
  for (const task of ['summary', 'freeform', 'flashcards', 'questions']) {
    await t(`${task} runs at its own temperature`, async () => {
      await router.dispatch(task, [chunk], task === 'freeform' ? 'What?' : undefined);
      assert.equal(state.calls[0].temperature, config.TASK_TEMPERATURE[task]);
    });
  }
  await t('structured tasks run colder than prose tasks', () => {
    assert.ok(config.TASK_TEMPERATURE.flashcards <= config.TASK_TEMPERATURE.summary);
    assert.ok(config.TASK_TEMPERATURE.questions <= config.TASK_TEMPERATURE.freeform);
  });
  await t('loads the model when it is not loaded, once', async () => {
    await router.dispatch('summary', [chunk]);
    await router.dispatch('summary', [chunk]);
    assert.equal(state.loads, 1);
  });
  await t('returns the generated text and streams tokens', async () => {
    const tokens = [];
    const text = await router.dispatch('summary', [chunk], undefined, (x) => tokens.push(x));
    assert.equal(text, 'generated text');
    assert.deepEqual(tokens, ['tok']);
  });
  await t('reports a cut-off generation, and clears it on the next one', async () => {
    state.cut = true;
    await router.dispatch('questions', [chunk]);
    assert.equal(router.lastDispatchWasCut(), true);
    state.cut = false;
    await router.dispatch('questions', [chunk]);
    assert.equal(router.lastDispatchWasCut(), false);
  });
  await t('a failed run does not leave a stale cut-off flag', async () => {
    state.cut = true;
    await router.dispatch('questions', [chunk]);
    state.failGenerate = true;
    await assert.rejects(router.dispatch('questions', [chunk]), /model failed/);
    assert.equal(router.lastDispatchWasCut(), false);
  });
  await t('only one generation at a time, and the guard resets', async () => {
    state.delay = 30;
    const first = router.dispatch('summary', [chunk]);
    assert.equal(router.isRouterBusy(), true);
    await assert.rejects(router.dispatch('summary', [chunk]), /already running/);
    await first;
    assert.equal(router.isRouterBusy(), false);
  });
  await t('the busy guard resets after a failure', async () => {
    state.failGenerate = true;
    await assert.rejects(router.dispatch('summary', [chunk]), /model failed/);
    assert.equal(router.isRouterBusy(), false);
  });
  await t('Enhanced Mode on with no cloud address still runs on the phone', async () => {
    state.enhancedMode = true;
    await router.dispatch('summary', [chunk]);
    assert.equal(state.calls.length, 1);
  });
  process.exitCode = failed ? 1 : 0;
})();
