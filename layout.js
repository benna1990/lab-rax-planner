/* Placement on the rack's posts, without the page: free slots, the nearest one, moving parts past each other, closing gaps and
   the rack height a part needs. Pure, so it runs in Node too (tools/test-layout.mjs); app.js wraps it with its state.
   A rack is { slots, items }: slots is the height in half-units (½U), items the placed parts as { id, pos2, h2, side }, pos2 the
   top half-unit counted from the top and h2 the height in half-units. Whole-U parts (even h2) start on a whole U. */
(function () {
const aligned = (p, h2) => h2 === 1 || p % 2 === 0;
const onSide = (r, side, except) => r.items.filter(o => o.side === side && o.id !== except);
function isFree(r, p, h2, side, except) {
  if (p < 0 || p + h2 > r.slots || !aligned(p, h2)) return false;
  return !onSide(r, side, except).some(o => p < o.pos2 + o.h2 && o.pos2 < p + h2);
}
// the free slot closest to t (ties go up), or null
function nearest(r, t, h2, side, except) {
  for (let d = 0; d <= r.slots; d++) for (const c of d ? [t - d, t + d] : [t]) if (isFree(r, c, h2, side, except)) return c;
  return null;
}
function firstFree(r, h2, side) { for (let p = 0; p + h2 <= r.slots; p++) if (isFree(r, p, h2, side)) return p; return null; }
const freeSlots = (r, side) => r.slots - onSide(r, side).reduce((n, o) => n + o.h2, 0);
function gaps(r, side) {
  const out = []; let start = null;
  for (let p = 0; p <= r.slots; p++) {
    const free = p < r.slots && isFree(r, p, 1, side);
    if (free && start == null) start = p;
    if (!free && start != null) { out.push({ pos2: start, h2: p - start }); start = null; }
  }
  return out;
}
// the lowest rack height in U, above the current one and up to maxU, with room for h2 at the bottom; null when even maxU has none
function heightFor(r, h2, side, maxU) {
  for (let u = r.slots / 2 + 1; u <= (maxU || 10); u++) if (firstFree({ slots: u * 2, items: r.items }, h2, side) != null) return u;
  return null;
}
// the parts on a side slid up against each other, so their free space is one gap at the bottom: { id: pos2 }
function pack(r, side) {
  const out = {}; let p = 0;
  onSide(r, side).slice().sort((x, y) => x.pos2 - y.pos2).forEach(o => { while (!aligned(p, o.h2)) p++; out[o.id] = p; p += o.h2; });
  return out;
}
/* part id to slot t, the parts it passes sliding the other way, so a full rack can be reordered: { id: pos2 } for every part that
   moves, or null when that would put a whole-U part off its U, or a part outside the rack */
function reorder(r, id, t) {
  const it = r.items.find(o => o.id === id); if (!it) return null;
  const h = it.h2, a = it.pos2, others = onSide(r, it.side, id), pos = {};
  let np;
  if (t < a) { const hit = others.filter(o => o.pos2 < a && o.pos2 + o.h2 > t); np = Math.min(t, ...hit.map(o => o.pos2)); hit.forEach(o => { pos[o.id] = o.pos2 + h; }); }
  else { const end = t + h, hit = others.filter(o => o.pos2 >= a + h && o.pos2 < end); np = Math.max(end, ...hit.map(o => o.pos2 + o.h2)) - h; hit.forEach(o => { pos[o.id] = o.pos2 - h; }); }
  pos[id] = np;
  const all = [it, ...others].map(o => ({ p: pos[o.id] != null ? pos[o.id] : o.pos2, h2: o.h2 }));
  const ok = all.every(o => o.p >= 0 && o.p + o.h2 <= r.slots && aligned(o.p, o.h2)) && all.every((o, i) => all.every((q, j) => i === j || q.p >= o.p + o.h2 || o.p >= q.p + q.h2));
  return ok ? pos : null;
}
window.LRLayout = { aligned, isFree, nearest, firstFree, freeSlots, gaps, heightFor, pack, reorder };
})();
