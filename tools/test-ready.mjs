// Checks ready.js, the build readiness list. Run: node tools/test-ready.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const win = {};
new Function('window', readFileSync(new URL('../ready.js', import.meta.url), 'utf8'))(win);
const R = win.LRReady;
const base = { parts: 4, unplaced: 0, clashes: 0, overlaps: 0, printer: { name: 'A1', bad: 0 }, cooling: { level: 'cool', maxT: 28 }, power: [], estimated: 0, market: 'Netherlands' };
const run = f => R.checks(Object.assign({}, base, f));

// a complete, sound build is ready; the estimates stay as notes
let c = run({});
assert.equal(R.summary(c).ready, true);
assert.ok(c.some(x => x.id === 'frame' && x.state === 'info'));
assert.equal(R.stepState(c, 2), 'ok');

// an empty rack and no printer: two things to do, not ready
c = run({ parts: 0, printer: null });
assert.equal(R.summary(c).ready, false);
assert.deepEqual(c.filter(x => x.state === 'todo').map(x => x.id).sort(), ['parts', 'printer']);
assert.ok(!c.some(x => x.id === 'power'), 'no power check without parts');

// problems become warnings with a fix, on the right step
c = run({ unplaced: 2, clashes: 1, clashId: 7, overlaps: 2, overlapId: 3, cooling: { level: 'hot', maxT: 52.4 }, printer: { name: 'A1 mini', bad: 3 }, power: [{ level: 'short', text: 'The PoE budget runs short.' }, { level: 'tight', text: 'tight' }] });
const warn = c.filter(x => x.state === 'warn');
assert.deepEqual(warn.map(x => x.id), ['unplaced', 'clash', 'overlap', 'printer', 'cooling', 'power0']);
assert.ok(warn.every(x => x.fix && x.fix.act), 'every warning has a fix');
assert.equal(c.find(x => x.id === 'clash').fix.id, 7);
assert.match(c.find(x => x.id === 'cooling').title, /52 °C/);
assert.equal(R.stepState(c, 3), 'warn');
assert.equal(R.stepState(c, 5), 'warn');
assert.equal(R.summary(c).warn, 6);

// parts without a hardware list are a note on step 5, not a problem
c = run({ noHardware: 3 });
assert.equal(c.find(x => x.id === 'hardware').state, 'info'); assert.equal(c.find(x => x.id === 'hardware').step, 5); assert.equal(R.summary(c).ready, true);

// warm is a warning too; estimated heights are counted as a note
c = run({ cooling: { level: 'warm', maxT: 38.6 }, estimated: 1 });
assert.equal(c.find(x => x.id === 'cooling').state, 'warn');
assert.match(c.find(x => x.id === 'estimated').title, /^1 part has/);

console.log('Readiness checks passed: complete, empty, broken and warm builds.');

// A mismatched print profile warns without preventing exports or changing the selection.
c = run({ profileMismatches: ['Side handles · Only XL Bolted Parts'] });
assert.equal(c.find(x => x.id === 'profile-frame').state, 'warn');
assert.match(c.find(x => x.id === 'profile-frame').why, /Only XL Bolted Parts/);
assert.ok(!run({ profileMismatches: [] }).some(x => x.id === 'profile-frame'));
