const assert = require('assert');
const { formatTimestamp, materialTitle, formatBytes } = require(process.argv[2] + '/format.js');
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
// The expected local string is computed independently from the same instant, so the test holds in any timezone.
const local = (iso, dateOnly) => {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  const day = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return dateOnly ? day : `${day} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
t('UTC timestamp becomes local date and time', () =>
  assert.equal(formatTimestamp('2026-10-24 14:49:08'), local('2026-10-24T14:49:08Z')),
);
t('date only', () =>
  assert.equal(formatTimestamp('2026-10-24 23:30:00', true), local('2026-10-24T23:30:00Z', true)),
);
t('crossing midnight in UTC can change the local date', () =>
  assert.equal(formatTimestamp('2026-12-31 23:59:59', true), local('2026-12-31T23:59:59Z', true)),
);
t('text that already names a zone is read as written', () => {
  assert.equal(formatTimestamp('2026-10-24T14:49:08.000Z'), local('2026-10-24T14:49:08Z'));
  assert.equal(formatTimestamp('2026-10-24T16:49:08+02:00'), local('2026-10-24T14:49:08Z'));
  assert.equal(formatTimestamp('2026-10-24 16:49:08+0200'), local('2026-10-24T14:49:08Z'));
});
t('not a timestamp is returned unchanged', () => {
  assert.equal(formatTimestamp('yesterday'), 'yesterday');
  assert.equal(formatTimestamp(''), '');
});
t('materialTitle prefers the title, ignores blanks', () => {
  assert.equal(materialTitle({ ModuleCode: 'Maths', FileName: 'a.pdf' }), 'Maths');
  assert.equal(materialTitle({ ModuleCode: null, FileName: 'a.pdf' }), 'a.pdf');
  assert.equal(materialTitle({ ModuleCode: '  ', FileName: 'a.pdf' }), 'a.pdf');
});
process.exitCode = failed ? 1 : 0;
