// Runs the isolated tests: `npm test`.
//
// These test the logic that does not need a phone (answer parsing, chunking, PDF import with a fake
// file system, embeddings and retrieval with a fake model, the generation pipeline, ...). Each suite
// compiles the TypeScript it needs into a temporary folder with the TypeScript compiler, then runs a
// plain Node script against it. React Native and the database are replaced by small fakes inside the
// test files, so no phone or emulator is needed and no extra packages are installed.

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const tsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');

const suites = [
  {
    name: 'answer parser and chunk sampler',
    files: ['src/services/OutputParser.ts', 'src/services/ChunkSampler.ts'],
    test: 'inference.test.js',
  },
  {
    name: 'generation pipeline',
    files: ['src/services/GenerationPipeline.ts'],
    test: 'pipeline.test.js',
  },
  {
    name: 'PDF import and chunking',
    files: ['src/services/DocumentService.ts', 'src/services/ChunkingService.ts'],
    test: 'ingestion.test.js',
  },
  {
    name: 'embeddings and retrieval',
    files: ['src/services/RetrievalService.ts'],
    test: 'retrieval.test.js',
  },
  {
    name: 'inference router',
    files: ['src/services/InferenceRouter.ts'],
    test: 'router.test.js',
  },
  {
    name: 'active material',
    files: ['src/utils/activeMaterial.ts'],
    test: 'activeMaterial.test.js',
  },
  { name: 'date and title formatting', files: ['src/utils/format.ts'], test: 'format.test.js' },
];

// realpath: on macOS the temp folder is a symlink, and the tests match module paths exactly.
const work = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'studybee-tests-')));
let passed = 0;
let failed = 0;

for (const [index, suite] of suites.entries()) {
  const out = path.join(work, String(index));
  const compile = spawnSync(
    process.execPath,
    [
      tsc,
      '--ignoreConfig',
      '--module',
      'commonjs',
      '--target',
      'es2020',
      '--skipLibCheck',
      '--esModuleInterop',
      '--strict',
      '--outDir',
      out,
      ...suite.files,
    ],
    { cwd: root, encoding: 'utf8' },
  );
  if (compile.status !== 0) {
    console.log(
      `FAIL  ${suite.name}: the code did not compile\n${compile.stdout}${compile.stderr}`,
    );
    failed += 1;
    continue;
  }
  const run = spawnSync(process.execPath, [path.join(__dirname, suite.test), out], {
    encoding: 'utf8',
  });
  const lines = `${run.stdout}${run.stderr}`.split('\n');
  const ok = lines.filter((line) => line.startsWith('PASS ')).length;
  const bad = lines.filter((line) => line.startsWith('FAIL ')).length;
  passed += ok;
  failed += bad + (run.status !== 0 && bad === 0 ? 1 : 0);
  console.log(
    `${bad === 0 && run.status === 0 ? 'ok  ' : 'FAIL'}  ${suite.name}: ${ok} passed, ${bad} failed`,
  );
  if (bad > 0 || run.status !== 0)
    console.log(lines.filter((line) => !line.startsWith('PASS ')).join('\n'));
}

fs.rmSync(work, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
