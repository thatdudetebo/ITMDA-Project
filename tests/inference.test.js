const assert = require('assert');
const B = process.argv[2];
const { parseQAPairs } = require(B + '/services/OutputParser.js');
const { sampleChunks } = require(B + '/services/ChunkSampler.js');
const t = (name, fn) => {
  try {
    fn();
    console.log('PASS', name);
  } catch (e) {
    console.log('FAIL', name, '\n', e.message);
    process.exitCode = 1;
  }
};

t('clean 5 pairs', () => {
  const s = [1, 2, 3, 4, 5].map((i) => `Q: What is ${i}?\nA: It is ${i}.`).join('\n\n');
  const p = parseQAPairs(s);
  assert.equal(p.length, 5);
  assert.equal(p[2].answer, 'It is 3.');
});
t('numbered one-line', () => {
  const p = parseQAPairs('1. Q: What is ATP? A: Energy currency.');
  assert.deepEqual(p, [{ question: 'What is ATP?', answer: 'Energy currency.' }]);
});
t('bold Question 1 / Answer', () => {
  const p = parseQAPairs('**Question 1:** What is ATP?\n**Answer:** Energy currency.');
  assert.deepEqual(p, [{ question: 'What is ATP?', answer: 'Energy currency.' }]);
});
t('rambling -> []', () => {
  assert.deepEqual(parseQAPairs('Sure! Here is some text about plants. Quantum stuff.'), []);
});
t('trailing Q dropped', () => {
  const p = parseQAPairs('Q: One?\nA: Yes.\nQ: Two?');
  assert.equal(p.length, 1);
});
t('multi-line answer', () => {
  const p = parseQAPairs('Q: List?\nA: First\nsecond line\nQ: Next?\nA: ok');
  assert.equal(p.length, 2);
  assert.equal(p[0].answer, 'First\nsecond line');
});
t('empty answer dropped', () => {
  assert.equal(parseQAPairs('Q: Hi?\nA:   \nQ: B?\nA: c').length, 1);
});
t('answer text containing "A:" mid word not split', () => {
  const p = parseQAPairs('Q: Define a?\nA: Vitamin A: helps vision');
  assert.equal(p.length, 1);
  assert.ok(p[0].answer.includes('helps vision'));
});

const mk = (n, chars) =>
  Array.from({ length: n }, (_, i) => ({
    ChunkID: i + 1,
    MaterialID: 1,
    ChunkIndex: i,
    ExtractedText: 'x'.repeat(chars),
    VectorEmbedding: null,
  }));
const BUDGET = 4096 - 600 - 150;
for (const n of [1, 5, 40])
  t(`sample ${n} chunks`, () => {
    const r = sampleChunks(mk(n, 2048));
    const tokens = r.reduce((s, c) => s + Math.ceil(c.ExtractedText.length / 4), 0);
    assert.ok(r.length >= 1 && tokens <= BUDGET, `tokens ${tokens} count ${r.length}`);
    assert.deepEqual(
      r.map((c) => c.ChunkIndex),
      [...r.map((c) => c.ChunkIndex)].sort((a, b) => a - b),
    );
    if (n === 1) assert.equal(r.length, 1);
    if (n === 40) {
      assert.equal(r[0].ChunkIndex, 0);
      assert.ok(r[r.length - 1].ChunkIndex > 20, 'covers later doc');
    }
    assert.ok(r.every((c) => c.similarity === 1));
  });
t('empty', () => assert.deepEqual(sampleChunks([]), []));
t('shuffled input sorted', () => {
  const c = mk(3, 100).reverse();
  assert.deepEqual(
    sampleChunks(c).map((x) => x.ChunkIndex),
    [0, 1, 2],
  );
});
t('A-level continuation not an answer', () => {
  const p = parseQAPairs('Q: Who sits\nA-level exams?\nA: Students.');
  assert.deepEqual(p, [{ question: 'Who sits A-level exams?', answer: 'Students.' }]);
});
t('duplicate A: kept as continuation', () => {
  const p = parseQAPairs('Q: One?\nA: first\nA: second');
  assert.equal(p.length, 1);
  assert.ok(p[0].answer.includes('second'));
});
t('inline lowercase a:', () => {
  assert.equal(parseQAPairs('Q: Why? a: Because.').length, 1);
});
t('option A: inside question not split', () => {
  const p = parseQAPairs('Q: Which is correct, Option A: x or B: y?\nA: x');
  assert.equal(p.length, 1);
  assert.ok(p[0].question.includes('Option A: x'));
});
t('lettered "a." not an answer marker', () => {
  assert.equal(parseQAPairs('Q: Pick?\na. thing').length, 0);
});
t('uneven 2000 chunks fast', () => {
  const c = Array.from({ length: 2000 }, (_, i) => ({
    ChunkID: i,
    MaterialID: 1,
    ChunkIndex: i,
    ExtractedText: 'x'.repeat(i % 50 === 0 ? 2048 : 100),
    VectorEmbedding: null,
  }));
  const t0 = Date.now();
  const r = sampleChunks(c);
  assert.ok(Date.now() - t0 < 200);
  assert.ok(r.reduce((s, x) => s + Math.ceil(x.ExtractedText.length / 4), 0) <= 3346);
});
t('numbered question text is cleaned', () => {
  const p = parseQAPairs('Question: 1. What is ATP?\nAnswer: Energy.\nQ: 2) Why?\nA: Because.');
  assert.deepEqual(p, [
    { question: 'What is ATP?', answer: 'Energy.' },
    { question: 'Why?', answer: 'Because.' },
  ]);
});
