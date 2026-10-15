// Checks layout.js, placement on the rack. Run: node tools/test-layout.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const win = {};
new Function('window', readFileSync(new URL('../layout.js', import.meta.url), 'utf8'))(win);
const L = win.LRLayout;
// a 5U rack (10 half-units): a ½U at the top, a 1U, a 2U, and a 1U at the bottom on the front; one 1U at the back
const rack = () => ({ slots: 10, items: [
  { id: 1, pos2: 0, h2: 1, side: 'front' }, { id: 2, pos2: 2, h2: 2, side: 'front' }, { id: 3, pos2: 4, h2: 4, side: 'front' },
  { id: 4, pos2: 8, h2: 2, side: 'front' }, { id: 9, pos2: 0, h2: 2, side: 'back' }] });

// whole-U parts start on a U; ½U parts may sit in either half
assert.equal(L.aligned(1, 2), false); assert.equal(L.aligned(2, 2), true); assert.equal(L.aligned(1, 1), true);

// collisions per side, the rack's edges, and the part being moved doesn't block itself
let r = rack();
assert.equal(L.isFree(r, 1, 1, 'front'), true, 'the ½U next to the top ½U is free');
assert.equal(L.isFree(r, 0, 2, 'front'), false, 'overlaps the ½U');
assert.equal(L.isFree(r, 2, 2, 'back'), true, 'the back has its own slots');
assert.equal(L.isFree(r, 9, 2, 'front'), false, 'past the bottom');
assert.equal(L.isFree(r, 2, 2, 'front', 2), true, 'a part may stay where it is');

// first free slot and nearest free slot
assert.equal(L.firstFree(r, 1, 'front'), 1);
assert.equal(L.firstFree(r, 2, 'front'), null, 'no whole U free at the front');
assert.equal(L.nearest(r, 6, 1, 'front'), 1);
assert.equal(L.firstFree(r, 2, 'back'), 2);
assert.equal(L.freeSlots(r, 'front'), 1); assert.equal(L.freeSlots(r, 'back'), 8);

// the rack height a part needs: a 2U part needs 7U here (the bottom U is taken), a 6U part can't fit even at 10U
assert.equal(L.heightFor(r, 4, 'front', 10), 7);
assert.equal(L.heightFor(r, 12, 'front', 10), null);

// reorder in a full rack: the 1U at the bottom moves to the top and the parts it passes slide down
r = { slots: 8, items: [{ id: 1, pos2: 0, h2: 2, side: 'front' }, { id: 2, pos2: 2, h2: 4, side: 'front' }, { id: 3, pos2: 6, h2: 2, side: 'front' }] };
assert.deepEqual(L.reorder(r, 3, 0), { 1: 2, 2: 4, 3: 0 });
// and back down past both
assert.deepEqual(L.reorder(r, 1, 6), { 2: 0, 3: 4, 1: 6 });
// a whole-U part can't swap with a single ½U part: it would land off its U
r = { slots: 4, items: [{ id: 1, pos2: 0, h2: 1, side: 'front' }, { id: 2, pos2: 1, h2: 1, side: 'front' }, { id: 3, pos2: 2, h2: 2, side: 'front' }] };
assert.equal(L.reorder(r, 3, 1), null);
// but it can pass the whole U of two ½U parts
assert.deepEqual(L.reorder(r, 3, 0), { 1: 2, 2: 3, 3: 0 });

// pack: parts slide up into one gap at the bottom, keeping whole-U parts on a U
r = { slots: 10, items: [{ id: 1, pos2: 1, h2: 1, side: 'front' }, { id: 2, pos2: 4, h2: 2, side: 'front' }, { id: 3, pos2: 8, h2: 2, side: 'front' }, { id: 4, pos2: 6, h2: 2, side: 'back' }] };
assert.deepEqual(L.pack(r, 'front'), { 1: 0, 2: 2, 3: 4 });
assert.deepEqual(L.pack(r, 'back'), { 4: 0 });

console.log('Layout checks passed: alignment, collisions, free and nearest slots, needed height, reorder, pack.');
