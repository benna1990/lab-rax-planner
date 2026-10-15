/* Mini Rack Planner — printers and the print bed check. MIT licensed.
   Build volumes in mm (width × depth × height) from the makers' spec sheets. A part fits when it lies flat on the bed, straight
   or turned: a long, narrow part often fits diagonally where it doesn't fit straight. */
(function () {
'use strict';
const list = [
  ['a1mini', 'Bambu Lab A1 mini', 180, 180, 180],
  ['a1', 'Bambu Lab A1 / P1S / X1C', 256, 256, 256],
  ['mk4', 'Prusa MK4 / MK4S', 250, 210, 220],
  ['coreone', 'Prusa Core One', 250, 220, 270],
  ['mini', 'Prusa MINI+', 180, 180, 180],
  ['xl', 'Prusa XL', 360, 360, 360],
  ['ender3', 'Creality Ender 3', 220, 220, 250],
  ['k1', 'Creality K1 / K1C', 220, 220, 250],
  ['k1max', 'Creality K1 Max', 300, 300, 300]
].map(([id, name, w, d, h]) => ({ id, name, w, d, h }));
const MIN = 50, MAX = 1000;
const okSize = v => typeof v === 'number' && Number.isFinite(v) && v >= MIN && v <= MAX;
// the printer a saved setting names: a preset { id }, or { id: 'custom', w, d, h } where the height may be left out; else null
function bed(s) {
  if (!s || typeof s !== 'object') return null;
  if (s.id === 'custom') return okSize(s.w) && okSize(s.d) ? { id: 'custom', name: 'Your printer', w: s.w, d: s.d, h: okSize(s.h) ? s.h : null } : null;
  return list.find(p => p.id === s.id) || null;
}
/* 2: a p × q rectangle fits in a × b straight, 1: only turned, 0: not at all. With p ≥ q and a ≥ b it fits iff p ≤ a and q ≤ b,
   or p > a, q ≤ b and ((a + b) / (p + q))² + ((a − b) / (p − q))² ≥ 2 (Carver 1956; Wetzel, "Rectangles in rectangles", 2000). */
const E = 1e-6;
function fitRect(p, q, a, b) {
  if (p < q) [p, q] = [q, p];
  if (a < b) [a, b] = [b, a];
  if (p <= a + E && q <= b + E) return 2;
  if (q > b + E) return 0;
  return ((a + b) / (p + q)) ** 2 + ((a - b) / (p - q)) ** 2 >= 2 - E ? 1 : 0;
}
// a piece is { ways: [[a, b, z], …] }: the footprints it can lie on, each with the height it then stands; the best way counts
const fit = (piece, B) => Math.max(0, ...piece.ways.filter(w => !B.h || w[2] <= B.h + E).map(w => fitRect(w[0], w[1], B.w, B.d)));
// the pieces that don't fit, and those that only fit turned
function check(pieces, B) {
  const bad = [], turned = [];
  for (const p of pieces || []) { const f = fit(p, B); if (f === 0) bad.push(p); else if (f === 1) turned.push(p); }
  return bad.length || turned.length ? { bad, turned } : null;
}
window.LRPrinters = { list, bed, fitRect, fit, check, MIN, MAX };
})();
