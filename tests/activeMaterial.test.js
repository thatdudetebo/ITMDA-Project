const assert = require('assert');
const { resolveActiveId, parseStoredId } = require(process.argv[2] + '/activeMaterial.js');
let failed = 0;
const t = (n, f) => {
  try {
    f();
    console.log('PASS', n);
  } catch (e) {
    failed++;
    console.log('FAIL', n, '\n  ', e.message);
  }
};
const L = (...ids) => ids.map((MaterialID) => ({ MaterialID }));
t('stored id still exists -> kept', () => assert.equal(resolveActiveId(2, L(3, 2, 1), true), 2));
t('stored id deleted -> newest (first launch behaviour)', () =>
  assert.equal(resolveActiveId(9, L(3, 2, 1), true), 3),
);
t('stored id deleted, no fallback -> null (B15)', () =>
  assert.equal(resolveActiveId(9, L(3, 2, 1), false), null),
);
t('nothing stored -> newest when allowed', () =>
  assert.equal(resolveActiveId(null, L(3, 2), true), 3),
);
t('nothing stored, deliberate clear -> stays null', () =>
  assert.equal(resolveActiveId(null, L(3, 2), false), null),
);
t('empty library -> null', () => {
  assert.equal(resolveActiveId(4, [], true), null);
  assert.equal(resolveActiveId(null, [], true), null);
});
t('parseStoredId accepts positive integers only', () => {
  assert.equal(parseStoredId('12'), 12);
  assert.equal(parseStoredId(null), null);
  assert.equal(parseStoredId('abc'), null);
  assert.equal(parseStoredId('0'), null);
  assert.equal(parseStoredId('-3'), null);
  assert.equal(parseStoredId('1.5'), null);
  assert.equal(parseStoredId(''), null);
});
process.exitCode = failed ? 1 : 0;
