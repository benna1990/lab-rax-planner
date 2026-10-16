/* Lab Rax Planner — what each part looks like. MIT licensed.
   A part's look is a small shape spec (catalog `shape`, or a default from its `face`), compiled into primitives in millimetres:
   x across the front (0 = centre), y up (0 = bottom edge of the panel), z towards the viewer (0 = front face of the panel, the part
   extends to −z). The same primitives are drawn three ways: an SVG front view (rack view), an SVG oblique view (library thumbnails)
   and three.js meshes (3D view). Nothing here is copied from the community models; the looks are drawn from the shape spec and the
   devices' published dimensions. See CONTRIBUTING.md for the spec. */
(function () {
'use strict';

const DIMS = window.LRRack.dimensions, FRAME = window.LRRack.frame;
const U = DIMS.u, CLEAR = DIMS.panelClearance, PANEL_W = DIMS.panelWidth, HOLE_X = DIMS.holeSpacing / 2, SPAN = DIMS.cutoutSpan, PLATE = 3;
const panelH = u => u * U - CLEAR;
/* How a panel sits in its slot (the U's it takes, or half a U), in mm: height h, bottom edge `lift` above the bottom of the slot,
   `mid` the middle of the slot (y up from the panel's bottom edge, like the screw slots, the screws drawn in them and the notches
   in the side edges). EIA panels are n·44.45 − 0.79 high and sit in the middle of their slot. Lab Rax panels (catalog `fit:
   "labrax"`, measured on mklements' models) are n·44.45 − 2.45 high, also in the middle, with three 10 × 7 slots per U and a 2.4 × 4
   notch in each side edge at every U boundary; the ½U ones are 22.6 high with one slot 4.9 mm from the edge that sits on the U's
   outer hole, so they reach 1.8 mm past the middle of the U, and one in the upper half (upper) is the same panel turned over.
   Custom parts (parts.js) are EIA, like their STLs. */
const LR = { clear: 2.45, slots: [5.1, 21, 36.9], half: 22.6, halfSlot: 4.9, notch: [2.4, 4] };
function plateFit(d, upper) {
  const u = d.u || (d.h2 ? d.h2 / 2 : 1), slot = u * U;
  if (d.fit !== 'labrax') { const h = slot - CLEAR; return { h, lift: CLEAR / 2, mid: h / 2, slots: [], screws: screwYs(h), notches: [] }; }
  if (u < 1) {
    const h = LR.half, s = upper ? h - LR.halfSlot : LR.halfSlot, lift = upper ? slot - (6.35 - LR.halfSlot) - h : 6.35 - LR.halfSlot;
    return { h, lift, mid: slot / 2 - lift, slots: [s], screws: [s], notches: [] };
  }
  const h = slot - LR.clear, lift = LR.clear / 2, slots = [], screws = [], notches = [];
  for (let k = 0; k < Math.ceil(u); k++) {
    LR.slots.forEach((y, j) => { const yy = k * U + y; if (yy + 3.5 < h) { slots.push(yy); if (j !== 1) screws.push(yy); } });
    if (k && k * U - lift < h) notches.push(k * U - lift);
  }
  return { h, lift, mid: h / 2, slots, screws, notches };
}
// the plate's outline: a rounded rectangle, with the notches cut into both side edges
function plateOutline(H, notches) {
  const p = rectP(-PANEL_W / 2, 0, PANEL_W, H, 1.2);
  if (!notches.length) return p;
  const [nd, nh] = LR.notch, X = PANEL_W / 2, k = p.length / 4; // four corners of k points: bottom right, top right, top left, bottom left
  const right = notches.flatMap(y => [[X, y - nh / 2], [X - nd, y - nh / 2], [X - nd, y + nh / 2], [X, y + nh / 2]]);
  const left = notches.slice().reverse().flatMap(y => [[-X, y + nh / 2], [-X + nd, y + nh / 2], [-X + nd, y - nh / 2], [-X, y - nh / 2]]);
  return p.slice(0, k).concat(right, p.slice(k, 3 * k), left, p.slice(3 * k));
}
const C = {
  hole: '#0A0B0D', port: '#141518', metal: '#C4C9CE', steel: '#8F969D', pcb: '#1F6B3C', gold: '#C9A55A', black: '#1B1C1F', white: '#ECEEEF',
  led: '#4ADE80', amber: '#F5A524', blue: '#2F6BD8', red: '#E5484D', screen: '#0D1726', fan: '#1E2023', blade: '#33363B', drive: '#9AA1A8'
};

/* ---------- small helpers ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v, d) => typeof v === 'number' && isFinite(v) ? v : d;
function shade(hex, f) { // f > 0 mixes towards white, f < 0 towards black
  const n = parseInt(String(hex).slice(1), 16), t = f < 0 ? 0 : 255, k = Math.abs(f);
  const ch = s => Math.round(((n >> s) & 255) + (t - ((n >> s) & 255)) * k);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}
const lum = hex => { const n = parseInt(String(hex).slice(1), 16); return (.2126 * (n >> 16) + .7152 * (n >> 8 & 255) + .0722 * (n & 255)) / 255; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* 2D outlines as point lists */
function rectP(x, y, w, h, r) {
  r = Math.min(r || 0, w / 2, h / 2);
  if (r < .05) return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const p = [], n = r > 3 ? 5 : 3;
  [[x + w - r, y + r, -90], [x + w - r, y + h - r, 0], [x + r, y + h - r, 90], [x + r, y + r, 180]].forEach(([cx, cy, a0]) => {
    for (let i = 0; i <= n; i++) { const a = (a0 + i * 90 / n) * Math.PI / 180; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  });
  return p;
}
function circP(cx, cy, r, n) { n = n || clamp(Math.round(r * 2.4), 12, 56); const p = []; for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return p; }
function ngonP(cx, cy, r, n, rot) { const p = []; for (let i = 0; i < n; i++) { const a = (rot || 0) + i / n * 2 * Math.PI; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return p; }
const slotP = (cx, cy, w, h) => rectP(cx - w / 2, cy - h / 2, w, h, Math.min(w, h) / 2);

/* ---------- primitives ----------
   box  {x,y,z,w,h,d,c,r}       front face at z, x/y its lower left corner, extends back by d; r rounds the front corners
   cyl  {x,y,z,r,d,c}            axis along z, x/y its centre
   ext  {axis,pts,holes,at,d,c}  an extruded outline: axis 'z' pts (x,y) front at z=at going back; axis 'y' pts (x, back) from y=at
                                  up by d; axis 'x' pts (back, y) from x=at to the right by d (back = −z)
   disc {x,y,z,r,d,tilt,c,dome}  a round device (access point): centre of its base, axis tilted from vertical towards the front;
                                  r2 (optional) is the radius at the top, for a cone
   text {x,y,z,s,str,c}          SVG only
   lines {segs,z,c,sw}           SVG only (bristles and such) */
const box = (x, y, z, w, h, d, c, r) => ({ t: 'box', x, y, z, w, h, d, c, r: r || 0 });
// ports and screens stand this far proud of a device's face: on the face itself they flicker in 3D (z-fighting)
const IO_LIFT = .15;
const cyl = (x, y, z, r, d, c) => ({ t: 'cyl', x, y, z, r, d, c });
const ext = (pts, holes, z, d, c) => ({ t: 'ext', axis: 'z', pts, holes: holes || [], at: z, d, c });
const flat = (axis, pts, holes, at, d, c) => ({ t: 'ext', axis, pts, holes: holes || [], at, d, c });

/* A scene is a list of objects; each object is a list of primitives drawn in order (a device body before its ports).
   layer 0 = behind the plate, 1 = the plate, 2 = on or in front of it. */
function scene() {
  const S = { objs: [], holes: [] };
  S.obj = (layer, key) => { const o = { layer, prims: [], key }; S.objs.push(o); return o.prims; };
  return S;
}

// a convex outline cut to a rectangle (Sutherland–Hodgman), and the area of an outline
function clipRect(p, x0, y0, x1, y1) {
  const cut = (pts, inside, at) => { const out = []; pts.forEach((a, i) => { const b = pts[(i + 1) % pts.length], ia = inside(a), ib = inside(b); if (ia) out.push(a); if (ia !== ib) out.push(at(a, b)); }); return out; };
  const along = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  p = cut(p, q => q[0] >= x0, (a, b) => along(a, b, (x0 - a[0]) / (b[0] - a[0])));
  p = cut(p, q => q[0] <= x1, (a, b) => along(a, b, (x1 - a[0]) / (b[0] - a[0])));
  p = cut(p, q => q[1] >= y0, (a, b) => along(a, b, (y0 - a[1]) / (b[1] - a[1])));
  return cut(p, q => q[1] <= y1, (a, b) => along(a, b, (y1 - a[1]) / (b[1] - a[1])));
}
const polyArea = p => Math.abs(p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0)) / 2;

/* ---------- vent patterns: holes inside a rectangle ---------- */
function ventHoles(pattern, x0, y0, w, h, opt) {
  const out = [], x1 = x0 + w, y1 = y0 + h, inside = p => p.every(([x, y]) => x >= x0 - .01 && x <= x1 + .01 && y >= y0 - .01 && y <= y1 + .01);
  const o = opt || {};
  if (pattern === 'slots' || pattern === 'vslots') {
    const sw = o.sw || 3.2, pitch = o.pitch || 6.6, n = Math.max(1, Math.floor((w + pitch - sw) / pitch)), off = x0 + (w - ((n - 1) * pitch + sw)) / 2;
    for (let i = 0; i < n; i++) out.push(slotP(off + i * pitch + sw / 2, y0 + h / 2, sw, h));
  } else if (pattern === 'hslots') {
    const sh = o.sw || 3.2, pitch = o.pitch || 6.6, n = Math.max(1, Math.floor((h + pitch - sh) / pitch)), off = y0 + (h - ((n - 1) * pitch + sh)) / 2;
    for (let i = 0; i < n; i++) out.push(slotP(x0 + w / 2, off + i * pitch + sh / 2, w, sh));
  } else if (pattern === 'round' || pattern === 'perf') {
    const r = o.r || (pattern === 'perf' ? 1.6 : 2.4), pitch = o.pitch || r * 2.9, dy = pitch * .866;
    for (let j = 0, y = y0 + r; y <= y1 - r + .01; j++, y += dy) for (let x = x0 + r + (j % 2) * pitch / 2; x <= x1 - r + .01; x += pitch) out.push(circP(x, y, r, 12));
  } else if (pattern === 'grid') {
    const s = o.r || 5, pitch = s + (o.wall || 2.2);
    const nx = Math.floor((w + pitch - s) / pitch), ny = Math.floor((h + pitch - s) / pitch), ox = x0 + (w - (nx * pitch - (pitch - s))) / 2, oy = y0 + (h - (ny * pitch - (pitch - s))) / 2;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) out.push(rectP(ox + i * pitch, oy + j * pitch, s, s, .6));
  } else if (pattern === 'diamond') {
    const s = o.r || 4.2, pitch = s * 2 + (o.wall || 2.4);
    for (let j = 0, y = y0 + s; y <= y1 - s + .01; j++, y += pitch / 2) for (let x = x0 + s + (j % 2) * pitch / 2; x <= x1 - s + .01; x += pitch) out.push(ngonP(x, y, s, 4, 0));
  } else if (pattern === 'y') {
    const r = o.r || 5, pitch = r * 2.3, dy = pitch * .866;
    for (let j = 0, y = y0 + r; y <= y1 - r + .01; j++, y += dy) for (let x = x0 + r + (j % 2) * pitch / 2; x <= x1 - r + .01; x += pitch) {
      const p = [], arm = 1.3; // a three-armed Y
      for (let k = 0; k < 3; k++) { const a = Math.PI / 2 + k * 2 * Math.PI / 3, b = a + Math.PI / 2; p.push([x + arm * Math.cos(b) - arm * .5 * Math.cos(a), y + arm * Math.sin(b) - arm * .5 * Math.sin(a)], [x + arm * Math.cos(b) + r * Math.cos(a), y + arm * Math.sin(b) + r * Math.sin(a)], [x - arm * Math.cos(b) + r * Math.cos(a), y - arm * Math.sin(b) + r * Math.sin(a)]); }
      out.push(p);
    }
  } else if (pattern === 'crown') {
    const s = o.r || 6.5, pitch = s * 2 + 2.6;
    for (let x = x0 + s; x <= x1 - s + .01; x += pitch) for (let y = y0 + s; y <= y1 - s + .01; y += pitch) {
      out.push([[x - s, y - s * .8], [x + s, y - s * .8], [x + s, y + s * .7], [x + s * .5, y + s * .1], [x, y + s * .9], [x - s * .5, y + s * .1], [x - s, y + s * .7]]);
    }
  } else { // hex, the Lab Rax look; pointy-top cells
    const R = o.r || 7, wall = o.wall || 2.4, Rc = R + wall / Math.sqrt(3), dx = Math.sqrt(3) * Rc, dy = 1.5 * Rc;
    if (o.clip) { // as on the Lab Rax vent panels: a cell in the middle of the field, the cells along its edges cut off by it
      const cx = x0 + w / 2, cy = y0 + h / 2, nj = Math.ceil((h / 2 + R) / dy), ni = Math.ceil((w / 2 + R) / dx) + 1;
      for (let j = -nj; j <= nj; j++) for (let i = -ni; i <= ni; i++) {
        const p = clipRect(ngonP(cx + (i + (j & 1 ? .5 : 0)) * dx, cy + j * dy, R, 6, Math.PI / 6), x0, y0, x1, y1);
        if (p.length > 2 && polyArea(p) > 1) out.push(p);
      }
      return out;
    }
    const rows = Math.max(1, Math.floor((h - 2 * R) / dy + 1e-6) + 1), oy = y0 + (h - ((rows - 1) * dy + 2 * R)) / 2 + R;
    for (let j = 0; j < rows; j++) {
      const y = oy + j * dy, n = Math.floor((w - Math.sqrt(3) * R) / dx + 1e-6) + 1, ox = x0 + (w - ((n - 1) * dx + Math.sqrt(3) * R)) / 2 + Math.sqrt(3) * R / 2 + (j % 2 ? dx / 2 : 0);
      for (let i = 0; i < n; i++) { const p = ngonP(ox + i * dx, y, R, 6, Math.PI / 6); if (inside(p)) out.push(p); }
    }
    return out;
  }
  return out.filter(inside);
}

/* ---------- devices: real sizes and what faces out ---------- */
/* Built-in looks for things that aren't devices in the catalog (power supplies, bricks); catalog devices carry their own
   `size` [w, h, d] in mm and `io`, the tokens on the face that shows at the front. */
const PRESETS = {
  'atx-psu': { size: [150, 86, 140], color: '#1B1C1F', io: ['grille', 'iec', 'rocker'] },
  'sfx-psu': { size: [125, 63.5, 100], color: '#1B1C1F', io: ['grille', 'iec', 'rocker'] },
  'flexatx-psu': { size: [81.5, 40.5, 150], color: '#9AA1A8', io: ['fan', 'iec'] },
  'server-psu': { size: [54.5, 40.5, 196], color: '#AEB4BA', io: ['fan', 'led', 'handle'] },
  'hdplex-psu': { size: [150, 40, 160], color: '#26282B', io: ['vent', 'iec'] },
  'meanwell': { size: [99, 30, 129], color: '#B8BEC4', io: ['terminal'] },
  'brick': { size: [60, 30, 120], color: '#202124', io: ['power'] },
  'strip': { size: [200, 40, 45], color: '#ECEEEF', io: [] },
  'switch5': { size: [100, 26, 98], color: '#2A2C30', io: ['led', 'rj45x5'] },
  'switch8': { size: [158, 26, 101], color: '#2A2C30', io: ['led', 'rj45x8'] },
  'mini-pc': { size: [120, 40, 120], color: '#2A2C30', io: ['btn', 'usbax2', 'usbc', 'audio', 'vent'] },
  'box': { size: [150, 30, 120], color: '#3A3D42', io: ['led'] },
  'ssd25': { size: [69.85, 9.5, 100], color: '#2A2C30', io: [] },
  'nvme': { size: [40, 12, 100], color: '#3A3D42', io: ['usbc', 'led'] },
  'itx-io': { size: [158.8, 44.5, 170], color: '#9AA1A8', io: ['usbax2', 'hdmi', 'dp', 'usba3x2', 'rj45', 'antennax2', 'audiox3'] }
};

/* ---------- face tokens: what is on a device's face ---------- */
// size [w, h] in mm before any fitting; draw() pushes primitives with the token's lower left at (x, y)
const TOK = {
  rj45: { s: [15.9, 13.6], draw(P, x, y, z, s, o) {
    P.push(box(x, y, z, 15.9 * s, 13.6 * s, .4, o.bezel || C.metal, .4 * s), box(x + 2.1 * s, y + 3.2 * s, z + .05, 11.7 * s, 8.6 * s, .3, C.hole), box(x + 5.2 * s, y + 1.4 * s, z + .05, 5.5 * s, 2.2 * s, .3, C.hole));
    if (o.leds !== false) P.push(box(x + 1 * s, y + 12 * s, z + .1, 2 * s, 1.1 * s, .2, C.led), box(x + 12.9 * s, y + 12 * s, z + .1, 2 * s, 1.1 * s, .2, C.amber));
  } },
  sfp: { s: [14.2, 9.8], draw(P, x, y, z, s) { P.push(box(x, y, z, 14.2 * s, 9.8 * s, .4, C.metal), box(x + .8 * s, y + .7 * s, z + .05, 12.6 * s, 8.4 * s, .3, C.hole), box(x + 2 * s, y + 3.8 * s, z + .1, 10.2 * s, 2.2 * s, .2, '#3A3D42')); } },
  usba: { s: [14.2, 6.6], draw(P, x, y, z, s, o) { P.push(box(x, y, z, 14.2 * s, 6.6 * s, .4, C.metal, .4 * s), box(x + 1 * s, y + 1 * s, z + .05, 12.2 * s, 4.6 * s, .3, C.hole), box(x + 1.7 * s, y + 3.3 * s, z + .1, 10.8 * s, 1.8 * s, .2, o.usb3 ? C.blue : '#2C2E33')); } },
  usbc: { s: [8.9, 3.3], draw(P, x, y, z, s) { P.push(ext(slotP(x + 4.45 * s, y + 1.65 * s, 8.9 * s, 3.3 * s), [], z + .3, .3, C.steel), ext(slotP(x + 4.45 * s, y + 1.65 * s, 7.5 * s, 2.2 * s), [], z + .35, .3, C.hole)); } },
  hdmi: { s: [15.2, 5.8], draw(P, x, y, z, s) { P.push(ext([[x, y + 5.8 * s], [x + 15.2 * s, y + 5.8 * s], [x + 15.2 * s, y + 2.2 * s], [x + 12.6 * s, y], [x + 2.6 * s, y]], [], z + .3, .3, C.metal), ext([[x + 1 * s, y + 4.9 * s], [x + 14.2 * s, y + 4.9 * s], [x + 14.2 * s, y + 2.5 * s], [x + 12.2 * s, y + .9 * s], [x + 3 * s, y + .9 * s], [x + 1 * s, y + 2.5 * s]], [], z + .35, .3, C.hole)); } },
  mhdmi: { s: [7.2, 3.6], draw(P, x, y, z, s) { P.push(box(x, y, z, 7.2 * s, 3.6 * s, .4, C.metal), box(x + .6 * s, y + .6 * s, z + .05, 6 * s, 2.4 * s, .3, C.hole)); } },
  dp: { s: [16, 6.4], draw(P, x, y, z, s) { P.push(ext([[x, y], [x + 16 * s, y], [x + 16 * s, y + 4.4 * s], [x + 14 * s, y + 6.4 * s], [x, y + 6.4 * s]], [], z + .3, .3, C.metal), box(x + 1 * s, y + 1 * s, z + .05, 13.6 * s, 4.4 * s, .3, C.hole)); } },
  musb: { s: [7.6, 3], draw(P, x, y, z, s) { P.push(box(x, y, z, 7.6 * s, 3 * s, .4, C.metal), box(x + .7 * s, y + .6 * s, z + .05, 6.2 * s, 1.8 * s, .3, C.hole)); } },
  audio: { s: [6.4, 6.4], draw(P, x, y, z, s) { P.push(cyl(x + 3.2 * s, y + 3.2 * s, z + .3, 3.2 * s, .3, '#3A3D42'), cyl(x + 3.2 * s, y + 3.2 * s, z + .35, 1.8 * s, .3, C.hole)); } },
  power: { s: [8, 8], draw(P, x, y, z, s) { P.push(cyl(x + 4 * s, y + 4 * s, z + .3, 4 * s, .3, C.steel), cyl(x + 4 * s, y + 4 * s, z + .35, 2.8 * s, .3, C.hole), cyl(x + 4 * s, y + 4 * s, z + .4, .9 * s, .3, C.metal)); } },
  btn: { s: [8, 8], draw(P, x, y, z, s, o) { P.push(cyl(x + 4 * s, y + 4 * s, z + .5, 4 * s, .5, shade(o.color || '#3A3D42', lum(o.color || '#333') > .5 ? -.12 : .18)), cyl(x + 4 * s, y + 4 * s, z + .55, 1.1 * s, .2, o.ledColor || '#E6F2FF')); } },
  led: { s: [2.6, 2.6], draw(P, x, y, z, s, o) { P.push(cyl(x + 1.3 * s, y + 1.3 * s, z + .2, 1.3 * s, .2, o.ledColor || C.led)); } },
  ledw: { s: [2.6, 2.6], draw(P, x, y, z, s) { P.push(cyl(x + 1.3 * s, y + 1.3 * s, z + .2, 1.3 * s, .2, '#F2F6FF')); } },
  ledb: { s: [2.6, 2.6], draw(P, x, y, z, s) { P.push(cyl(x + 1.3 * s, y + 1.3 * s, z + .2, 1.3 * s, .2, '#5AA9FF')); } },
  lcd: { s: [22, 12], draw(P, x, y, z, s, o) {
    const w = (o.w || 22) * s, h = (o.h || 12) * s;
    P.push(box(x, y, z, w, h, .3, C.screen, .6 * s), box(x + w * .12, y + h * .62, z + .05, w * .5, h * .12, .2, '#7FB8FF'), box(x + w * .12, y + h * .38, z + .05, w * .72, h * .1, .2, '#3E6E9E'), box(x + w * .12, y + h * .18, z + .05, w * .36, h * .1, .2, '#3E6E9E'));
  } },
  sd: { s: [12, 1.8], draw(P, x, y, z, s) { P.push(box(x, y, z + .05, 12 * s, 1.8 * s, .3, C.hole)); } },
  fan: { s: [36, 36], draw(P, x, y, z, s, o) { fanFace(P, x + 18 * s, y + 18 * s, z, 18 * s * (o.d ? o.d / 36 : 1), o); } },
  grille: { s: [60, 60], grow: true, draw(P, x, y, z, s, o, w, h) {
    const holes = ventHoles('hex', x + 1, y + 1, w - 2, h - 2, { r: 2.4, wall: 1.1 });
    P.push(box(x, y, z - .2, w, h, .2, C.hole), ext(rectP(x, y, w, h, 1), holes, z + .2, .2, o.color ? shade(o.color, -.1) : '#2A2C30'));
  } },
  vent: { s: [24, 10], grow: true, draw(P, x, y, z, s, o, w, h) {
    const holes = ventHoles('vslots', x + 1, y + h * .18, w - 2, h * .64, { sw: 1.6, pitch: 3.6 });
    holes.forEach(p => P.push(ext(p, [], z + .05, .3, shade(o.color || '#333333', lum(o.color || '#333') > .5 ? -.35 : -.55))));
  } },
  antenna: { s: [7, 7], draw(P, x, y, z, s) { P.push(cyl(x + 3.5 * s, y + 3.5 * s, z + 4, 3.3 * s, 4, C.gold), cyl(x + 3.5 * s, y + 3.5 * s, z + 4.05, 1.4 * s, .3, C.hole)); } },
  coax: { s: [11, 11], draw(P, x, y, z, s) { P.push(ext(ngonP(x + 5.5 * s, y + 5.5 * s, 5.5 * s, 6, Math.PI / 6), [], z + 3, 3, C.metal), cyl(x + 5.5 * s, y + 5.5 * s, z + 3.05, 3.2 * s, .3, '#E6E8EA'), cyl(x + 5.5 * s, y + 5.5 * s, z + 3.1, .6 * s, .3, '#9A6B2E')); } },
  phone: { s: [11, 9.6], draw(P, x, y, z, s) { P.push(box(x, y, z, 11 * s, 9.6 * s, .4, '#2C2E33'), box(x + 1.4 * s, y + 2.4 * s, z + .05, 8.2 * s, 6 * s, .3, C.hole), box(x + 3.8 * s, y + 1 * s, z + .05, 3.4 * s, 1.6 * s, .3, C.hole)); } },
  iec: { s: [27.5, 19.5], draw(P, x, y, z, s) {
    const o = [[x + 3 * s, y], [x + 24.5 * s, y], [x + 27.5 * s, y + 4 * s], [x + 27.5 * s, y + 19.5 * s], [x, y + 19.5 * s], [x, y + 4 * s]];
    P.push(ext(o, [], z + .5, .5, '#1A1B1E'), ext(o.map(([a, b]) => [x + 13.75 * s + (a - x - 13.75 * s) * .8, y + 9.75 * s + (b - y - 9.75 * s) * .76]), [], z + .55, .3, C.hole));
    [[-7, 10.5], [0, 10.5], [7, 10.5]].forEach(([dx, dy], i) => P.push(box(x + (13.75 + dx - .9) * s, y + (dy - (i === 1 ? 3 : 0) - 2.2) * s, z + .6, 1.8 * s, 4.4 * s, .3, C.metal)));
  } },
  rocker: { s: [13, 19], draw(P, x, y, z, s) { P.push(box(x, y, z + 1, 13 * s, 19 * s, 1, '#1A1B1E', 1 * s), box(x + 1.4 * s, y + 1.4 * s, z + 2.2, 10.2 * s, 8 * s, 1.2, '#2A2C30'), box(x + 1.4 * s, y + 9.6 * s, z + 3, 10.2 * s, 8 * s, 2, '#3A3D42')); } },
  handle: { s: [10, 30], draw(P, x, y, z, s, o, w, h) { P.push(box(x + 1 * s, y + h * .12, z + 9, 6 * s, h * .76, 9, '#2A2C30', 2)); } },
  terminal: { s: [60, 10], draw(P, x, y, z, s) { for (let i = 0; i < 7; i++) P.push(box(x + i * 8.6 * s, y, z + .5, 7.6 * s, 10 * s, .5, '#2B2D31'), cyl(x + (i * 8.6 + 3.8) * s, y + 5 * s, z + .6, 2.4 * s, .3, C.metal)); } },
  vbay: { s: [30, 120], draw(P, x, y, z, s, o, w, h) { // a NAS drive tray standing up: latch at the bottom, LED at the top
    P.push(box(x, y, z, w, h, .5, shade(o.color || '#2A2C30', lum(o.color || '#333') > .5 ? -.08 : .1), 1.2), box(x + w * .2, y + h * .05, z + .5, w * .6, h * .09, .5, shade(o.color || '#2A2C30', lum(o.color || '#333') > .5 ? -.2 : .22), 1));
    ventHoles('hslots', x + w * .2, y + h * .2, w * .6, h * .55, { sw: 1.4, pitch: 3.4 }).forEach(p => P.push(ext(p, [], z + .55, .1, C.hole)));
    P.push(cyl(x + w / 2, y + h * .92, z + .55, Math.min(1.2, w * .05), .1, C.led));
  } },
  bay25: { s: [74, 12], draw(P, x, y, z, s, o) { sled(P, x, y, z, 74 * s, 12 * s, o.color || '#2A2C30', o); } },
  bay35: { s: [104, 28], draw(P, x, y, z, s, o) { sled(P, x, y, z, 104 * s, 28 * s, o.color || '#2A2C30', o); } },
  logo: { s: [7, 7], draw(P, x, y, z, s, o) { P.push(cyl(x + 3.5 * s, y + 3.5 * s, z + .2, 3.5 * s, .2, o.logo || shade(o.color || '#888888', lum(o.color || '#888') > .5 ? -.25 : .35))); } },
  slot: { s: [40, 4], draw(P, x, y, z, s, o, w, h) { P.push(box(x, y, z + .05, w, h, .3, C.hole, h / 2)); } },
  gap: { s: [6, 1], grow: false, draw() {} },
  space: { s: [4, 1], grow: true, draw() {} }
};
const ALIAS = { usba3: ['usba', { usb3: true }], usb3: ['usba', { usb3: true }], usb: ['usba', {}], usb2: ['usba', {}], rj45poe: ['rj45', {}], sfpplus: ['sfp', {}], sfp28: ['sfp', {}], minidp: ['mhdmi', {}], microhdmi: ['mhdmi', {}], minihdmi: ['mhdmi', {}], dc: ['power', {}], oled: ['lcd', { w: 23, h: 12 }], display: ['lcd', { w: 30, h: 16 }], microusb: ['musb', {}], rj11: ['phone', {}], dsl: ['phone', {}], switch: ['rocker', {}] };
function parseTok(t) {
  const m = /^([a-z0-9]+?)(?:x(\d+))?(?:@([\d.]+)(?:x([\d.]+))?)?$/.exec(String(t).toLowerCase());
  if (!m) return null;
  let k = m[1], o = {};
  if (ALIAS[k]) { o = Object.assign({}, ALIAS[k][1]); k = ALIAS[k][0]; }
  if (!TOK[k]) return null;
  if (m[3]) { o.w = +m[3]; o.h = +(m[4] || m[3]); }
  return { k, n: m[2] ? +m[2] : 1, o };
}
// lay a device's face tokens out in a row, centred, scaled down to fit when needed
function drawFace(P, toks, x, y, z, w, h, base) {
  const items = (toks || []).map(parseTok).filter(Boolean);
  if (!items.length) return;
  items.forEach(it => { if ((it.k === 'rj45' || it.k === 'sfp') && it.n >= 10 && h >= 2 * TOK[it.k].s[1] + 5) { it.rows = 2; } });
  const size = it => { const s = TOK[it.k].s, ow = it.o.w || s[0], oh = it.o.h || s[1]; return [ow, oh]; };
  const inner = 2.6, gap = 4;
  let total = 0, grow = 0;
  items.forEach((it, i) => { const [tw] = size(it), n = it.rows === 2 ? Math.ceil(it.n / 2) : it.n; if (TOK[it.k].grow) grow++; else total += n * tw + (n - 1) * (it.k === 'rj45' || it.k === 'sfp' ? .9 : inner); if (i) total += gap; });
  const maxH = Math.max(...items.map(it => size(it)[1] * (it.rows || 1) + (it.rows === 2 ? 1.2 : 0)));
  let s = Math.min(1, (w - 6) / Math.max(1, total + grow * 10), (h - 2.4) / maxH);
  s = Math.max(.35, s);
  const free = Math.max(0, w - 6 - total * s), gw = grow ? free / grow : 0;
  let cx = x + 3 + (grow ? 0 : (w - 6 - total * s) / 2);
  items.forEach((it, i) => {
    const t = TOK[it.k], [tw, th] = size(it), o = Object.assign({ color: base }, it.o);
    if (i) cx += gap * s;
    if (t.grow) { const gh = Math.min(h - 4, Math.max(th * s, h * .7)); t.draw(P, cx, y + (h - gh) / 2, z, s, o, gw, gh); cx += gw; return; }
    if (it.rows === 2) { // stacked pairs, the upper row upside down like real stacked jacks
      const cols = Math.ceil(it.n / 2), y0 = y + (h - 2 * th * s - 1.2) / 2;
      for (let k = 0; k < cols; k++) { t.draw(P, cx, y0, z, s, o, tw * s, th * s); if (k + cols < it.n) t.draw(P, cx, y0 + th * s + 1.2, z, s, o, tw * s, th * s); cx += tw * s + (k < cols - 1 ? .9 * s : 0); }
      return;
    }
    for (let k = 0; k < it.n; k++) { t.draw(P, cx, y + (h - th * s) / 2, z, s, o, tw * s, th * s); cx += tw * s + (k < it.n - 1 ? (it.k === 'rj45' || it.k === 'sfp' ? .9 : inner) * s : 0); }
  });
}
// a primitive turned a quarter anticlockwise about (cx, cy) in the front plane
function turn(p, cx, cy) {
  const r = ([x, y]) => [cx - (y - cy), cy + (x - cx)];
  if (p.t === 'box') { const [x, y] = r([p.x + p.w, p.y]); return Object.assign({}, p, { x, y, w: p.h, h: p.w }); }
  if (p.t === 'cyl') { const [x, y] = r([p.x, p.y]); return Object.assign({}, p, { x, y }); }
  if (p.t === 'ext' && p.axis === 'z') return Object.assign({}, p, { pts: p.pts.map(r), holes: p.holes.map(h => h.map(r)) });
  return p;
}
function sled(P, x, y, z, w, h, c, o) {
  P.push(box(x, y, z, w, h, .6, c, 1.2));
  if (o && o.handle === false) return;
  const hw = Math.min(w * .72, 70), hh = Math.min(h * .26, 6), hx = x + (w - hw) / 2, hy = y + Math.max(1.2, h * .14);
  P.push(box(hx, hy, z + 7, hw, hh, 7, o && o.accent || '#5AA9E6', Math.min(hh / 2, 2)));
}
function fanFace(P, cx, cy, z, r, o) {
  // the duct, seven swept blades and the hub, seen through the panel
  P.push(cyl(cx, cy, z + .1, r, .3, C.hole)); // just proud of the fan frame, or the two flicker in 3D
  const hub = r * .38;
  for (let i = 0; i < 7; i++) {
    const a0 = i / 7 * Math.PI * 2, p = [];
    for (let k = 0; k <= 6; k++) { const t = k / 6, rr = hub + (r * .95 - hub) * t, a = a0 + t * .55; p.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
    for (let k = 6; k >= 0; k--) { const t = k / 6, rr = hub + (r * .95 - hub) * t, a = a0 + t * .55 + .62; p.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
    P.push(ext(p, [], z + .4, .4, o && o.blade || C.blade));
  }
  P.push(cyl(cx, cy, z + .8, hub, .8, o && o.hub || '#2A2C30'));
}

/* ---------- boards (single-board computers), port edge seen from the front ---------- */
// a: along the port edge from the left, port shapes in (a, b) with b up from the top of the board
const BOARDS = {
  pi5: { edge: 56, len: 85, ports: [['rj45', 10.25], ['usb3', 29], ['usb2', 47]] }, // a: along the port edge from the left, component side up
  pi4: { edge: 56, len: 85, ports: [['usb2', 9], ['usb3', 27], ['rj45', 45.75]] },
  pi3: { edge: 56, len: 85, ports: [['rj45', 10.25], ['usb2', 29], ['usb2', 47]] },
  zero: { edge: 65, len: 30, ports: [['mhdmi', 12.4], ['musb', 41.4], ['musb', 54]] },
  opiz3: { edge: 50, len: 55, ports: [['rj45', 12], ['usb2s', 33]] },
  rock5b: { edge: 72, len: 100, ports: [['rj45', 11], ['usb3', 31], ['usb2', 50], ['power', 66]] },
  uno: { edge: 53.4, len: 68.6, ports: [['usbb', 12], ['dc', 41]] },
  generic: { edge: 56, len: 85, ports: [['rj45', 12], ['usb2', 32]] }
};
const PORT = { // [w along a, h along b, depth back, parts: [a0, b0, w, h, colour]]
  usb2: [14.6, 15.8, 17.5, [[0, 0, 14.6, 15.8, C.metal], [1.1, 1.6, 12.4, 5, C.hole], [1.1, 9.2, 12.4, 5, C.hole], [1.8, 4.2, 11, 1.8, '#202226'], [1.8, 11.8, 11, 1.8, '#202226']]],
  usb3: [14.6, 15.8, 17.5, [[0, 0, 14.6, 15.8, C.metal], [1.1, 1.6, 12.4, 5, C.hole], [1.1, 9.2, 12.4, 5, C.hole], [1.8, 4.2, 11, 1.8, C.blue], [1.8, 11.8, 11, 1.8, C.blue]]],
  usb2s: [14.6, 7.2, 14, [[0, 0, 14.6, 7.2, C.metal], [1.1, 1.2, 12.4, 4.8, C.hole], [1.8, 3.6, 11, 1.7, '#202226']]],
  rj45: [15.9, 13.5, 21, [[0, 0, 15.9, 13.5, C.metal], [2.1, 3.4, 11.7, 8.4, C.hole], [5.2, 1.3, 5.5, 2.4, C.hole], [1, 11.9, 2, 1.1, C.led], [12.9, 11.9, 2, 1.1, C.amber]]],
  mhdmi: [7.2, 3.6, 7, [[0, 0, 7.2, 3.6, C.metal], [.6, .6, 6, 2.4, C.hole]]],
  musb: [7.6, 3, 5, [[0, 0, 7.6, 3, C.metal], [.7, .6, 6.2, 1.8, C.hole]]],
  usbb: [12, 11, 16, [[0, 0, 12, 11, C.metal], [2, 2, 8, 7, C.hole], [3.5, 3.5, 5, 4, '#E9E9E9']]],
  dc: [9, 11, 13, [[0, 0, 9, 11, '#1A1B1E'], [2.2, 3.2, 4.6, 4.6, C.hole]]],
  power: [9, 11, 13, [[0, 0, 9, 11, '#1A1B1E'], [2.2, 3.2, 4.6, 4.6, C.hole]]]
};
/* One board with its ports facing the front. Horizontal: the board lies flat, (x, y) is the lower left of its port edge.
   Vertical: the board stands on its long side with the port edge running up, (x, y) the lower left. Returns the window box. */
function boardFront(S, kind, x, y, vertical, deep) {
  const b = BOARDS[kind] || BOARDS.generic, P = S.obj(0), zf = -PLATE - .2, pcb = 1.6;
  const map = (a, bb, w, h) => vertical ? [x + pcb + bb, y + (b.edge - a - w), h, w] : [x + a, y + pcb + bb, w, h];
  P.push(vertical ? box(x, y, zf - 1, pcb, b.edge, b.len, C.pcb) : box(x, y, zf - 1, b.edge, pcb, b.len, C.pcb));
  let lo = [1e9, 1e9], hi = [-1e9, -1e9];
  const rects = [];
  b.ports.forEach(([k, a]) => {
    const pt = PORT[k]; if (!pt) return;
    const a0 = a - pt[0] / 2;
    const [bx, by, bw, bh] = map(a0, 0, pt[0], pt[1]);
    P.push(box(bx, by, zf, bw, bh, pt[2], C.metal, .3));
    pt[3].slice(1).forEach(([pa, pb, pw, ph, c], i) => { const [qx, qy, qw, qh] = map(a0 + pa, pb, pw, ph); P.push(box(qx, qy, zf + .1 + i * .06, qw, qh, .2, c)); }); // each part a step proud of the one under it
    lo = [Math.min(lo[0], bx), Math.min(lo[1], by)]; hi = [Math.max(hi[0], bx + bw), Math.max(hi[1], by + bh)]; rects.push([bx, by, bw, bh]);
  });
  if (deep) P.push(vertical ? box(x + pcb, y + 6, zf - 30, 12, b.edge - 12, 40, '#2B2E33') : box(x + 6, y + pcb, zf - 30, b.edge - 12, 10, 40, '#2B2E33'));
  return { x: lo[0], y: lo[1], w: hi[0] - lo[0], h: hi[1] - lo[1], vw: vertical ? 18 : b.edge, vh: vertical ? b.edge : 18, ports: rects };
}

/* ---------- modules: the things laid out across a panel ---------- */
const MODS = ['dev', 'sbc', 'ks', 'bay', 'fan', 'vent', 'open', 'screen', 'out', 'inlet', 'rocker', 'btn', 'knob', 'oled', 'text', 'brush', 'comb', 'ring', 'hook', 'dtype', 'drawer', 'matrix', 'pcie', 'usb', 'gap', 'col', 'slot', 'tile', 'logo'];
const kindOf = m => typeof m === 'string' ? m : MODS.find(k => m && m[k] !== undefined) || 'gap';
const asObj = m => typeof m === 'string' ? { [m]: true } : m;
const kindVent = m => m.vent === true || m.vent === 'hex' ? 'hex' : m.vent;

function devOf(m, ctx) {
  const v = m.dev;
  let d = null;
  if (v === true || v == null) d = ctx.device;
  else if (typeof v === 'string') d = (ctx.lookup && ctx.lookup(v)) || PRESETS[v] || null;
  else if (typeof v === 'object') d = v;
  d = d || ctx.device || PRESETS.box;
  const size = Array.isArray(d.size) ? d.size : [d.w || 150, d.h || 30, d.d || 120];
  return { w: size[0], h: size[1], d: size[2], color: d.color || '#3A3D42', io: m.io || d.io || [], name: d.device || v };
}

function measure(m, ctx, avail) {
  const k = kindOf(m), H = ctx.ih;
  m = asObj(m);
  switch (k) {
    case 'dev': {
      const d = devOf(m, ctx), n = num(m.n, 1), rot = m.rot === 90;
      let w = rot ? d.h : d.w, h = rot ? d.w : d.h;
      const sc = Math.min(1, (H - .5) / h); if (sc < 1 && m.fit !== false) { w *= m.squash === false ? sc : 1; h *= sc; }
      const gap = num(m.gap, 4), tot = n * w + (n - 1) * gap;
      if (tot > avail) { const f = (avail - (n - 1) * gap) / (n * w); w *= f; if (m.squash === false) h *= f; }
      return { w: n * w + (n - 1) * gap, h, fw: w, fh: h, d };
    }
    case 'sbc': {
      const n = num(m.sbc === true ? 1 : m.sbc, 1), b = BOARDS[m.board || 'pi5'] || BOARDS.generic, vert = m.orient === 'v' && H >= b.edge + 6;
      const pitch = num(m.pitch, vert ? (m.tray ? 29.7 : 22) : b.edge + 8), w = vert ? n * pitch - (pitch - (m.tray ? pitch - .7 : 18)) : n * b.edge + (n - 1) * (pitch - b.edge);
      return { w: Math.min(w, avail), h: vert ? (m.tray ? H : b.edge) : 19, vert, pitch, b };
    }
    case 'ks': {
      const n = num(m.ks === true ? 1 : m.ks, 1), rows = clamp(num(m.rows, 1), 1, 4), per = Math.ceil(n / rows), pitch = num(m.pitch, 17.6);
      const vp = Math.min(19.5, (H - 16.4) / Math.max(1, rows - 1) + 16.4 - 16.4 + 16.4 + 2);
      return { w: (per - 1) * pitch + 14.9, h: (rows - 1) * vp + 16.4, per, rows, pitch, vp, n };
    }
    case 'bay': {
      const size = m.bay === 2.5 || m.bay === '2.5' ? 2.5 : 3.5, n = num(m.n, 1), vert = m.orient === 'v', rows = clamp(num(m.rows, 1), 1, 6);
      let bw = size === 3.5 ? (vert ? 30 : 104) : (vert ? 13 : 74), bh = size === 3.5 ? (vert ? 108 : 30) : (vert ? 76 : 13.5);
      if (m.w) bw = m.w; if (m.h) bh = m.h;
      const per = Math.ceil(n / rows), gap = 3;
      bh = Math.min(bh, (H - (rows - 1) * gap) / rows);
      const w = per * bw + (per - 1) * gap;
      if (w > avail) bw = (avail - (per - 1) * gap) / per;
      return { w: per * bw + (per - 1) * gap, h: rows * bh + (rows - 1) * gap, bw, bh, per, rows, size, vert, n };
    }
    case 'fan': {
      const d = Math.min(num(m.fan === true ? 40 : m.fan, 40), H - 1), n = num(m.n, 1), gap = num(m.gap, n > 1 ? clamp((avail - n * d) / (n + 1), 1.5, 10) : 0);
      return { w: n * d + (n - 1) * gap, h: d, d, n, gap };
    }
    case 'vent': return { w: m.w || 0, h: m.h || (kindVent(m) === 'hex' ? Math.min(H + 2, (ctx.H || H + 4) - 4) : Math.max(6, H - (H < 25 ? 4 : 9))), grow: !m.w };
    case 'open': return { w: m.w || 0, h: m.h || H - 6, grow: !m.w };
    case 'slot': return { w: m.w || 0, h: m.h || Math.min(14, H - 8), grow: !m.w };
    case 'brush': return { w: m.w || 0, h: m.h || Math.min(18, H - 10), grow: !m.w };
    case 'screen': {
      let w, h;
      if (m.w && m.h) { w = m.w; h = m.h; } else { const dg = num(m.screen === true ? 7 : m.screen, 7) * 25.4, r = num(m.ratio, 5 / 3), a = Math.atan(1 / r); w = dg * Math.cos(a); h = dg * Math.sin(a); if (m.portrait) [w, h] = [h, w]; }
      const bz = num(m.bezel, 4), n = num(m.n, 1), gap = 6;
      let ow = w + 2 * bz, oh = h + 2 * bz, f = Math.min(1, (H - 2) / oh, (avail - (n - 1) * gap) / (n * ow));
      return { w: n * ow * f + (n - 1) * gap, h: oh * f, sw: w * f, sh: h * f, bz: bz * f, n, gap };
    }
    case 'out': {
      const t = m.type || 'schuko', n = num(m.out === true ? 4 : m.out, 4), rows = num(m.rows, 1), per = Math.ceil(n / rows);
      const sz = { schuko: [36, 36], us: [26, 34], uk: [32, 32], iec: [24.5, 15.5], usbc: [11, 7], usba: [16, 8.5], au: [30, 30], ch: [26, 30] }[t] || [36, 36];
      const gap = t === 'usbc' || t === 'usba' ? 4 : 3.2;
      let s = Math.min(1, (H - 4 - (rows - 1) * gap) / (rows * sz[1]), (avail - (per - 1) * gap) / (per * sz[0]));
      return { w: per * sz[0] * s + (per - 1) * gap, h: rows * sz[1] * s + (rows - 1) * gap, s, sz, per, rows, t, n, gap };
    }
    case 'inlet': return { w: m.fuse ? 48 : 30, h: 21 };
    case 'rocker': { const big = m.rocker === 'kcd4' || m.size === 'large'; const n = num(m.n, 1); return { w: n * (big ? 31 : 15) + (n - 1) * 6, h: big ? 25 : 21, big, n }; }
    case 'btn': return { w: num(m.btn === true ? 16 : m.btn, 16), h: num(m.btn === true ? 16 : m.btn, 16) };
    case 'knob': return { w: 18, h: 18 };
    case 'oled': { const w = num(m.w, 25), h = num(m.h, 14), f = Math.min(1, (H - 3) / h); return { w: w * f, h: h * f }; }
    case 'text': { const s = num(m.size, Math.min(9, H * .32)); return { w: String(m.text).length * s * .62, h: s }; }
    case 'logo': return { w: num(m.w, 34), h: num(m.h, Math.min(16, H - 8)) };
    case 'comb': { const n = num(m.comb === true ? 8 : m.comb, 8); return { w: m.w || 0, h: H - 8, n, grow: !m.w }; }
    case 'ring': case 'hook': { const n = num(m[k] === true ? 3 : m[k], 3), rw = num(m.size, 44); return { w: n * rw + (n - 1) * 16, h: Math.min(H - 6, 30), n, rw }; }
    case 'dtype': { const n = num(m.dtype === true ? 4 : m.dtype, 4), s = Math.min(1, (H - 4) / 31); return { w: n * 26 * s + (n - 1) * 5, h: 31 * s, n, s }; }
    case 'drawer': { const n = num(m.drawer === true ? 1 : m.drawer, 1); return { w: m.w || 0, h: H - 6, n, grow: !m.w }; }
    case 'matrix': { const n = num(m.matrix === true ? 4 : m.matrix, 4), s = Math.min(32, H - 4); return { w: n * s, h: s, n, s }; }
    case 'pcie': return { w: 79.2, h: Math.min(18.4, H - 4) };
    case 'usb': { const n = num(m.usb === true ? 2 : m.usb, 2); return { w: n * 15 + (n - 1) * 3, h: 8 }; }
    case 'tile': return { w: num(m.w, 40), h: num(m.h, H - 8) };
    case 'gap': return { w: num(m.gap === true ? 8 : m.gap, 8), h: 1 };
    case 'col': {
      const kids = (m.col || []).map(c => measure(c, Object.assign({}, ctx, { ih: (H - ((m.col.length - 1) * 3)) / m.col.length }), avail));
      return { w: Math.max(...kids.map(q => q.w), 1), h: kids.reduce((s, q) => s + q.h, 0) + (kids.length - 1) * 3, kids };
    }
  }
  return { w: 8, h: 1 };
}

function buildMod(S, m, x, y, z, ms, ctx) {
  const k = kindOf(m), c = ctx.color, H = ctx.ih, cy = y + ms.h / 2;
  m = asObj(m);
  const hole = p => S.holes.push(p);
  const front = () => S.obj(2), back = () => S.obj(0);
  switch (k) {
    case 'dev': {
      const d = ms.d, n = num(m.n, 1), gap = num(m.gap, 4), rot = m.rot === 90;
      for (let i = 0; i < n; i++) {
        const fx = x + i * (ms.fw + gap), fy = y + (ms.h - ms.fh) / 2, P = back(), zf = -PLATE - .4;
        P.push(box(fx, fy, zf, ms.fw, ms.fh, Math.min(d.d, ctx.maxDepth), d.color, Math.min(2.5, ms.fh / 6)));
        if (rot) { // a device standing on its side: lay its face out lying down, then turn it a quarter
          const F = [], cx0 = fx + ms.fw / 2, cy0 = fy + ms.fh / 2;
          drawFace(F, d.io, cx0 - ms.fh / 2, cy0 - ms.fw / 2, zf + IO_LIFT, ms.fh, ms.fw, d.color);
          F.forEach(q => P.push(turn(q, cx0, cy0)));
        } else drawFace(P, d.io, fx, fy, zf + IO_LIFT, ms.fw, ms.fh, d.color);
        const win = m.win || 'full';
        if (win === 'full') hole(rectP(fx - .8, fy - .8, ms.fw + 1.6, ms.fh + 1.6, 1.6));
        else if (win === 'ports') { const iw = Math.min(ms.fw - 4, num(m.ww, ms.fw * .8)), ih = Math.min(ms.fh - 2, num(m.wh, ms.fh * .7)); hole(rectP(fx + (ms.fw - iw) / 2, fy + (ms.fh - ih) / 2, iw, ih, 1.5)); }
        else if (win === 'frame') { hole(rectP(fx + 3, fy + 3, ms.fw - 6, ms.fh - 6, 2)); }
      }
      return;
    }
    case 'sbc': {
      const n = num(m.sbc === true ? 1 : m.sbc, 1), kind = m.board || 'pi5';
      // the builder's choice (app.js): fill boards in the first slots, the rest blank; a name per slot printed on its plate
      const fill = m.fill != null ? Math.max(0, Math.min(n, m.fill)) : n, names = Array.isArray(m.names) ? m.names : [];
      const label = (i, bx, bw, PH, z, col, onBoard) => { const t = names[i]; if (!t) return; const ink = shade(col, lum(col) > .5 ? -.5 : .5);
        S.obj(2).push(onBoard ? { t: 'text', x: bx + bw / 2, y: PH - 12, z, s: 3.2, str: String(t).slice(0, 9), c: ink } : { t: 'text', x: bx + bw / 2, y: PH / 2, z, s: Math.min(6, bw * .3), str: String(t).slice(0, 16), c: ink, rot: -90 }); };
      if (ms.vert) {
        const bh = ms.b.edge, PH = ctx.H || H;
        for (let i = 0; i < n; i++) {
          const bx = x + i * ms.pitch;
          if (m.tray) { // a printed blade in front of the holder, as tall as the panel and screwed on top and bottom: a window per
            // port, the board on a carrier behind it with its circuit board 7.2 mm from the blade's left edge (measured from mklements' 2U SBC holder)
            const bw = ms.pitch - .7, on = i < fill, win = on ? boardFront(S, kind, bx + 7.2, PH / 2 - bh / 2 - 5.7, true, m.hat) : null;
            hole(rectP(bx + bw / 2 - (ms.pitch - 2.2) / 2, 8, ms.pitch - 2.2, PH - 16, 1.5)); // the holder's slot behind the blade
            const P = front(), wins = on ? win.ports.map(([qx, qy, qw, qh]) => rectP(qx - .5, qy - .7, qw + 1, qh + 1.4, .8)) : []; // a blank blade where no board sits
            P.push(ext(rectP(bx, 0, bw, PH, 1.2), wins, PLATE, PLATE, ctx.trayColor || c));
            for (const sy of [4.2, PH - 4.2]) P.push(cyl(bx + bw / 2, sy, PLATE + .9, 2.3, .9, C.metal));
            label(i, bx, bw, PH, PLATE + .2, ctx.trayColor || c, on);
          } else if (i < fill) {
            const win = boardFront(S, kind, bx, y + (ms.h - bh) / 2, true, m.hat);
            hole(rectP(win.x - 1.4, win.y - 1.4, win.w + 2.8, win.h + 2.8, 1.5));
          } else label(i, bx, ms.pitch, y * 2 + ms.h, .2, c, false); // no board: the plate stays closed
        }
      } else {
        for (let i = 0; i < fill; i++) {
          const bx = x + i * ms.pitch, win = boardFront(S, kind, bx, y, false, m.hat);
          hole(rectP(win.x - 1.4, win.y - 1.4, win.w + 2.8, win.h + 2.8, 1.5));
        }
      }
      return;
    }
    case 'ks': {
      const col = m.jack === 'white' ? C.white : m.jack && m.jack[0] === '#' ? m.jack : '#18191C';
      let k2 = 0;
      for (let r = 0; r < ms.rows; r++) for (let i = 0; i < ms.per && k2 < ms.n; i++, k2++) {
        const kx = x + i * ms.pitch, ky = y + ms.h - 16.4 - r * ms.vp;
        hole(rectP(kx, ky, 14.9, 16.4, .6));
        const P = back(), zf = -PLATE - .2;
        P.push(box(kx + .2, ky + .2, zf, 14.5, 16, 26, col), box(kx + 1.6, ky + 2.6, zf + .1, 11.7, 9.8, .2, C.hole), box(kx + 4.7, ky + 12.2, zf + .1, 5.5, 2.4, .2, C.hole));
        const nb = m.fill != null ? ms.n - m.fill : m.blank || 0; // blank inserts in the last jacks
        if (nb && k2 >= ms.n - nb) P.push(box(kx + .2, ky + .2, zf + .3, 14.5, 16, .3, col));
        if (ms.rows === 1 && Array.isArray(m.names) && m.names[k2]) S.obj(2).push({ t: 'text', x: kx + 7.45, y: ky - 3.4, z: .2, s: 2.6, str: String(m.names[k2]).slice(0, 7), c: shade(c, lum(c) > .5 ? -.5 : .5) });
      }
      return;
    }
    case 'bay': {
      let k2 = 0;
      for (let r = 0; r < ms.rows; r++) for (let i = 0; i < ms.per && k2 < ms.n; i++, k2++) {
        const bx = x + i * (ms.bw + 3), by = y + ms.h - ms.bh - r * (ms.bh + 3);
        hole(rectP(bx - .6, by - .6, ms.bw + 1.2, ms.bh + 1.2, 1.4));
        const nm = Array.isArray(m.names) && m.names[k2], ink = shade(ctx.sledColor || c, lum(ctx.sledColor || c) > .5 ? -.5 : .5);
        if (m.fill != null && k2 >= m.fill) { // no drive: a blank cover
          front().push(box(bx, by, 0, ms.bw, ms.bh, PLATE + 1, ctx.sledColor || c, 1.2));
          if (nm) S.obj(2).push({ t: 'text', x: bx + ms.bw / 2, y: by + ms.bh / 2 - 1.5, z: PLATE + 1.2, s: Math.min(5, ms.bh * .3, ms.bw * .3), str: String(nm).slice(0, 16), c: ink, rot: ms.vert ? -90 : 0 });
          continue;
        }
        if (nm) S.obj(2).push({ t: 'text', x: bx + ms.bw / 2, y: by + 2, z: PLATE + 3.2, s: Math.min(3.4, ms.bh * .22), str: String(nm).slice(0, 16), c: ink, rot: ms.vert ? -90 : 0 });
        const P = back();
        if (ms.vert) P.push(box(bx + 1.5, by + 1.5, -PLATE - 6, ms.bw - 3, ms.bh - 3, ms.size === 3.5 ? 147 : 100, C.drive));
        else P.push(box(bx + 1.5, by + 1.5, -PLATE - 6, ms.bw - 3, ms.bh - 3, ms.size === 3.5 ? 147 : 100, C.drive));
        const F = front();
        F.push(box(bx, by, 0, ms.bw, ms.bh, PLATE + 3, ctx.sledColor || c, 1.2));
        if (m.handle !== false) {
          const hw = ms.vert ? ms.bw * .6 : Math.min(ms.bw * .7, 72), hh = ms.vert ? Math.min(ms.bh * .4, 34) : Math.min(ms.bh * .28, 6.5);
          const hx = bx + (ms.bw - hw) / 2, hy = ms.vert ? by + ms.bh - hh - 4 : by + Math.max(1.5, ms.bh * .16);
          F.push(box(hx, hy, 6, hw, hh, 6, ctx.accent, Math.min(hw, hh) / 2.5));
        }
        if (m.led !== false) F.push(cyl(ms.vert ? bx + ms.bw / 2 : bx + ms.bw - 4, ms.vert ? by + 5 : by + ms.bh - 4, .3, .9, .3, C.led));
      }
      return;
    }
    case 'fan': {
      const hs = { 40: 32, 50: 40, 60: 50, 70: 60, 80: 71.5, 92: 82.5, 120: 105, 140: 124.5, 180: 160, 200: 154 }[Math.round(ms.d)] || ms.d * .875;
      for (let i = 0; i < ms.n; i++) {
        const fx = x + i * (ms.d + ms.gap) + ms.d / 2, fy = cy, r = ms.d / 2 - 1.2, P = back();
        P.push(box(fx - ms.d / 2, fy - ms.d / 2, -PLATE - .3, ms.d, ms.d, ms.d >= 80 ? 25 : 10, m.frame || C.fan, ms.d * .06));
        fanFace(P, fx, fy, -PLATE - .3, r, { blade: m.blade, hub: m.hub });
        if (m.grille === 'hex') { ventHoles('hex', fx - r, fy - r, 2 * r, 2 * r, { r: Math.max(3, ms.d / 16), wall: 1.6 }).filter(p => p.every(([a, b]) => Math.hypot(a - fx, b - fy) < r)).forEach(hole); }
        else hole(circP(fx, fy, r));
        const F = front();
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) F.push(cyl(fx + sx * hs / 2, fy + sy * hs / 2, PLATE * 0 + 1.6, ms.d >= 80 ? 3.2 : 2.4, 1.6, '#2A2C30'));
        if (m.grille === 'wire' || m.grille === 'guard') { // a wire guard: concentric rings
          for (let k2 = 1; k2 <= 3; k2++) F.push(ext(circP(fx, fy, r * k2 / 3.2 + .7), [circP(fx, fy, r * k2 / 3.2 - .3)], 2.2, 1, C.metal));
        }
      }
      return;
    }
    case 'vent': { const pat = kindVent(m); ventHoles(pat, x, y, ms.w, ms.h, pat === 'hex' ? { r: m.r || 6, wall: m.wall || 1.6, clip: true } : { r: m.r, wall: m.wall }).forEach(hole); return; }
    case 'open': {
      hole(rectP(x, y, ms.w, ms.h, num(m.r, 2.5)));
      if (m.floor !== false) back().push(box(x + 2, y - 2.5, -PLATE, ms.w - 4, 2.5, ctx.maxDepth - 10, c));
      return;
    }
    case 'slot': hole(rectP(x, y, ms.w, ms.h, ms.h / 2)); return;
    case 'brush': {
      hole(rectP(x, y, ms.w, ms.h, 2));
      const P = back(), segs = [];
      P.push(box(x, y, -PLATE - .5, ms.w, ms.h / 2 - .4, 6, '#16171A'), box(x, y + ms.h / 2 + .4, -PLATE - .5, ms.w, ms.h / 2 - .4, 6, '#16171A'));
      for (let bx = x + .8; bx < x + ms.w; bx += 1.3) segs.push([bx, y, bx + .3, y + ms.h / 2 - .5], [bx + .4, y + ms.h, bx + .1, y + ms.h / 2 + .5]);
      S.obj(0).push({ t: 'lines', segs, z: -PLATE - .3, c: '#2E3136', sw: .45 });
      return;
    }
    case 'screen': {
      for (let i = 0; i < ms.n; i++) {
        const sx = x + i * (ms.w - (ms.n - 1) * ms.gap) / ms.n + i * ms.gap, ow = (ms.w - (ms.n - 1) * ms.gap) / ms.n;
        const ax = sx + ms.bz, ay = y + ms.bz;
        hole(rectP(ax - 1.2, ay - 1.2, ms.sw + 2.4, ms.sh + 2.4, 1.2));
        const P = back(), zf = -PLATE - .3;
        P.push(box(sx, y, zf, ow, ms.h, 7, '#0E0F11', 2), box(ax, ay, zf + .1, ms.sw, ms.sh, .2, C.screen));
        screenUI(P, ax, ay, zf + .2, ms.sw, ms.sh, m.ui);
      }
      return;
    }
    case 'out': {
      const P = back(), s = ms.s, ow = ms.sz[0] * s, oh = ms.sz[1] * s, face = m.color === 'black' ? '#1F2023' : m.color || C.white;
      P.push(box(x - 3, y - 2, -PLATE - 1.5, ms.w + 6, ms.h + 4, 40, face, 3));
      let k2 = 0;
      for (let r = 0; r < ms.rows; r++) for (let i = 0; i < ms.per && k2 < ms.n; i++, k2++) {
        const ox = x + i * (ow + ms.gap), oy = y + ms.h - oh - r * (oh + ms.gap), ocx = ox + ow / 2, ocy = oy + oh / 2, zf = -PLATE - 1.2;
        hole(ms.t === 'schuko' || ms.t === 'au' ? circP(ocx, ocy, Math.min(ow, oh) / 2 + .6) : rectP(ox - .6, oy - .6, ow + 1.2, oh + 1.2, ms.t === 'iec' ? 1 : 3 * s));
        socket(P, ms.t, ox, oy, zf, ow, oh, s, face);
      }
      return;
    }
    case 'inlet': {
      const P = front(), ix = x + 1.25, iy = y + .75;
      hole(rectP(ix, iy, 27.5, 19.5, 1));
      P.push(box(ix - 3, iy - 3, 1.2, 33.5, 25.5, 1.2, '#1A1B1E', 2));
      TOK.iec.draw(S.obj(2), ix, iy, 1.25, 1, {});
      if (m.fuse) { P.push(box(x + 34, y + 4, 1.5, 12, 13, 1.5, '#1A1B1E', 2)); P.push(cyl(x + 40, y + 10.5, 2, 4, .6, '#2A2C30')); }
      return;
    }
    case 'rocker': {
      for (let i = 0; i < ms.n; i++) {
        const w = ms.big ? 31 : 15, rx = x + i * (w + 6), P = front(), on = m.color || (ms.big ? '#C8372D' : '#1E1F22');
        hole(rectP(rx + 1, y + 1, w - 2, ms.h - 2, 1));
        P.push(box(rx, y, 2, w, ms.h, 2, '#141518', 1.5), box(rx + 2, y + 2, 4.5, w - 4, (ms.h - 4) / 2, 2.5, shade(on, -.25)), box(rx + 2, y + ms.h / 2, 3, w - 4, (ms.h - 4) / 2, 1, on));
      }
      return;
    }
    case 'btn': {
      const r = ms.w / 2, P = front(); hole(circP(x + r, cy, r * .82));
      P.push(cyl(x + r, cy, 2.2, r, 2.2, C.metal), cyl(x + r, cy, 2.4, r * .62, .3, shade(C.metal, -.18)), ext(circP(x + r, cy, r * .78), [circP(x + r, cy, r * .66)], 2.5, .3, m.ring || ctx.accent));
      return;
    }
    case 'knob': { const P = front(); hole(circP(x + 9, cy, 4)); P.push(cyl(x + 9, cy, 15, 9, 13, '#1E1F22'), box(x + 8.4, cy + 2.5, 15.2, 1.2, 6, .3, C.white)); return; }
    case 'oled': {
      hole(rectP(x, y, ms.w, ms.h, 1));
      const P = back(); P.push(box(x - 2, y - 2, -PLATE - .2, ms.w + 4, ms.h + 4, 3, '#0C0D0F'));
      const lines = Math.max(2, Math.floor(ms.h / 3.2));
      for (let i = 0; i < lines; i++) P.push(box(x + 1.5, y + ms.h - 2.6 - i * 3.2, -PLATE - .1, ms.w * (i % 2 ? .55 : .8), 1.3, .1, i ? '#9FD4FF' : '#E8F4FF'));
      return;
    }
    case 'text': {
      const s = ms.h;
      S.obj(2).push({ t: 'text', x: x + ms.w / 2, y: y, z: .2, s, str: String(m.text).slice(0, 24), c: m.color === 'part' ? shade(c, lum(c) > .5 ? -.3 : .3) : m.color || ctx.accent, rot: m.vertical ? -90 : 0 });
      return;
    }
    case 'logo': { const P = front(); P.push(box(x, y, .4, ms.w, ms.h, .4, m.color || ctx.accent, 2)); return; }
    case 'tile': { const P = front(); P.push(box(x, y, .6, ms.w, ms.h, .6, m.color || shade(c, lum(c) > .5 ? -.08 : .08), 2)); if (m.vent) { const P2 = S.obj(2); ventHoles(m.vent, x + 3, y + 3, ms.w - 6, ms.h - 6, {}).forEach(p => P2.push(ext(p, [], .65, .1, C.hole))); } return; }
    case 'comb': {
      const P = front(), n = ms.n, fw = 3.6, pitch = (ms.w - fw) / Math.max(1, n - 1);
      for (let i = 0; i < n; i++) P.push(box(x + i * pitch, y + 2, 18, fw, ms.h - 4, 18, c, 1.2));
      P.push(box(x, y, 2.5, ms.w, 4, 2.5, c));
      return;
    }
    case 'ring': case 'hook': {
      for (let i = 0; i < ms.n; i++) {
        const rx = x + i * (ms.rw + 16), P = front(), t = 4.5, depth = 32, open = k === 'hook';
        // a U (D-ring) standing out from the panel, seen from above: two legs and a front bar
        P.push(flat('y', [[rx, 0], [rx + t, 0], [rx + t, -depth + t], [rx + ms.rw - t, -depth + t], [rx + ms.rw - t, open ? -depth + 12 : 0], [rx + ms.rw, open ? -depth + 12 : 0], [rx + ms.rw, -depth], [rx, -depth]].map(([a, b]) => [a, b]), [], y + (ms.h - 8) / 2, 8, c));
      }
      return;
    }
    case 'dtype': {
      const s = ms.s, types = m.types || ['xlr', 'rj45', 'xlr', 'usb', 'hdmi', 'xlr'];
      for (let i = 0; i < ms.n; i++) {
        const dx = x + i * (26 * s + 5), dcx = dx + 13 * s, dcy = cy, P = back(), F = front(), t = types[i % types.length];
        hole(circP(dcx, dcy, 12 * s)); hole(circP(dcx - 9.5 * s, dcy + 12 * s, 1.6 * s)); hole(circP(dcx + 9.5 * s, dcy - 12 * s, 1.6 * s));
        F.push(ext(rectP(dx, dcy - 15.5 * s, 26 * s, 31 * s, 2.5 * s), [circP(dcx, dcy, 11 * s)], 1.6, 1.6, '#1A1B1E'));
        F.push(cyl(dcx - 9.5 * s, dcy + 12 * s, 1.8, 1.5 * s, .2, C.metal), cyl(dcx + 9.5 * s, dcy - 12 * s, 1.8, 1.5 * s, .2, C.metal));
        if (t === 'xlr') { P.push(cyl(dcx, dcy, -.5, 10.5 * s, 12, C.metal), cyl(dcx, dcy, -.4, 8.4 * s, .3, '#1A1B1E')); [[0, 4], [-4, -2.5], [4, -2.5]].forEach(([a, b]) => P.push(cyl(dcx + a * s, dcy + b * s, -.3, 1.1 * s, .3, C.hole))); P.push(box(dcx - 1.2 * s, dcy + 8 * s, -.3, 2.4 * s, 1.6 * s, .3, C.metal)); }
        else if (t === 'rj45') { P.push(cyl(dcx, dcy, -.5, 10.5 * s, 12, '#2A2C30')); TOK.rj45.draw(P, dcx - 7.95 * s, dcy - 6.8 * s, -.4, s, { leds: false }); }
        else if (t === 'usb') { P.push(cyl(dcx, dcy, -.5, 10.5 * s, 12, '#2A2C30')); TOK.usba.draw(P, dcx - 7.1 * s, dcy - 3.3 * s, -.4, s, {}); }
        else { P.push(cyl(dcx, dcy, -.5, 10.5 * s, 12, '#2A2C30')); TOK.hdmi.draw(P, dcx - 7.6 * s, dcy - 2.9 * s, -.7, s, {}); }
      }
      return;
    }
    case 'drawer': {
      const n = ms.n, dw = (ms.w - (n - 1) * 2) / n;
      for (let i = 0; i < n; i++) {
        const dx = x + i * (dw + 2), F = front();
        hole(rectP(dx, y, dw, ms.h, 1.5));
        F.push(box(dx + .5, y + .5, .8, dw - 1, ms.h - 1, ctx.maxDepth - 12, ctx.drawerColor || shade(c, lum(c) > .5 ? -.06 : .07), 1.2));
        const hw = Math.min(dw * .42, 46), hh = Math.min(ms.h * .22, 6);
        F.push(box(dx + (dw - hw) / 2, y + ms.h / 2 - hh / 2, 6.5, hw, hh, 5.7, ctx.accent, hh / 2));
      }
      return;
    }
    case 'matrix': {
      hole(rectP(x, y, ms.w, ms.h, 1));
      const P = back(), p = ms.s / 8;
      P.push(box(x, y, -PLATE - .5, ms.w, ms.h, 4, '#121314'));
      for (let i = 0; i < ms.n * 8; i++) for (let j = 0; j < 8; j++) P.push(cyl(x + (i + .5) * p, y + (j + .5) * p, -PLATE - .4, p * .36, .2, (i * 7 + j * 3) % 5 === 0 ? '#FF4D4D' : '#3A1416'));
      return;
    }
    case 'pcie': {
      const P = back(), ph = ms.h, py = cy - ph / 2;
      hole(rectP(x, py, ms.w, ph, 1));
      P.push(box(x, py, -PLATE - .3, ms.w, ph, 1, C.metal));
      drawFace(P, m.io || ['rj45x2'], x + 6, py, -PLATE - .2, ms.w - 12, ph, C.metal);
      return;
    }
    case 'usb': {
      const n = ms.w > 15 ? Math.round((ms.w + 3) / 18) : 1, P = back();
      for (let i = 0; i < n; i++) { const ux = x + i * 18; hole(rectP(ux, cy - 4, 15, 8, 1)); P.push(box(ux - 2, cy - 6, -PLATE - .2, 19, 12, 10, '#1A1B1E')); TOK[m.type === 'c' ? 'usbc' : 'usba'].draw(P, ux + .4, cy - (m.type === 'c' ? 1.65 : 3.3), -PLATE - .1, 1, { usb3: true }); }
      return;
    }
    case 'col': {
      let yy = y + ms.h;
      m.col.forEach((child, i) => { const q = ms.kids[i]; yy -= q.h; buildMod(S, child, x + (ms.w - q.w) / 2, yy, z, q, Object.assign({}, ctx)); yy -= 3; });
      return;
    }
  }
}
function socket(P, t, x, y, z, w, h, s, face) {
  const cx = x + w / 2, cy = y + h / 2, rim = shade(face, lum(face) > .5 ? -.08 : .1), hole = C.hole;
  if (t === 'schuko' || t === 'au') {
    P.push(cyl(cx, cy, z, Math.min(w, h) / 2, .4, rim), cyl(cx, cy, z - .6, Math.min(w, h) / 2 - 1.4 * s, .3, shade(face, -.12)));
    if (t === 'schuko') { P.push(cyl(cx - 9.5 * s, cy, z - .5, 2.4 * s, .3, hole), cyl(cx + 9.5 * s, cy, z - .5, 2.4 * s, .3, hole), box(cx - 2 * s, y + 1.2 * s, z - .4, 4 * s, 2.4 * s, .3, C.metal), box(cx - 2 * s, y + h - 3.6 * s, z - .4, 4 * s, 2.4 * s, .3, C.metal)); }
    else { P.push(box(cx - 7 * s, cy + 1 * s, z - .4, 2 * s, 6 * s, .3, hole), box(cx + 5 * s, cy + 1 * s, z - .4, 2 * s, 6 * s, .3, hole), box(cx - 1 * s, cy - 8 * s, z - .4, 2 * s, 6 * s, .3, hole)); }
  } else if (t === 'us') {
    P.push(box(x, y, z, w, h, .4, rim, 3 * s), box(cx - 6.5 * s, cy + 1 * s, z + .05, 2 * s, 7.5 * s, .3, hole), box(cx + 4.5 * s, cy + 1 * s, z + .05, 2.6 * s, 7.5 * s, .3, hole), ext(circP(cx, cy - 6.5 * s, 2.6 * s).filter(p => p[1] <= cy - 6.5 * s + .4 * s), [], z + .4, .3, hole));
  } else if (t === 'uk') {
    P.push(box(x, y, z, w, h, .4, rim, 2 * s), box(cx - 2 * s, cy + 3 * s, z + .05, 4 * s, 8 * s, .3, hole), box(cx - 11.5 * s, cy - 8 * s, z + .05, 7 * s, 4 * s, .3, hole), box(cx + 4.5 * s, cy - 8 * s, z + .05, 7 * s, 4 * s, .3, hole));
  } else if (t === 'ch') {
    P.push(box(x, y, z, w, h, .4, rim, 4 * s)); [[-5, 2], [5, 2], [0, -4]].forEach(([a, b]) => P.push(cyl(cx + a * s, cy + b * s, z + .05, 2 * s, .3, hole)));
  } else if (t === 'iec') {
    P.push(ext([[x, y], [x + w, y], [x + w, y + h - 4 * s], [x + w - 4 * s, y + h], [x + 4 * s, y + h], [x, y + h - 4 * s]], [], z + .4, .4, '#1A1B1E'));
    [[-6, 1.5], [0, -3.5], [6, 1.5]].forEach(([a, b]) => P.push(box(cx + (a - .9) * s, cy + (b - 2) * s, z + .5, 1.8 * s, 4 * s, .3, hole)));
  } else if (t === 'usbc' || t === 'usba') {
    P.push(box(x, y, z, w, h, .4, '#1A1B1E', 1.5 * s)); TOK[t].draw(P, cx - TOK[t].s[0] * s * .5, cy - TOK[t].s[1] * s * .5, z + .1, s, { usb3: true });
  }
}
function screenUI(P, x, y, z, w, h, kind) {
  // a dim dashboard: a title bar, a few tiles and a graph line, so a screen reads as a screen
  if (kind === false) return;
  const pad = Math.min(w, h) * .07, tb = Math.max(1.2, h * .1);
  P.push(box(x + pad, y + h - pad - tb, z, w * .45, tb, .1, '#4E8FD8'));
  const n = w > h * 1.4 ? 3 : 2, tw = (w - pad * (n + 1)) / n, th = (h - tb - pad * 3) * .55;
  for (let i = 0; i < n; i++) P.push(box(x + pad + i * (tw + pad), y + pad + (h - tb - pad * 3) * .45 + pad, z, tw, th, .1, ['#173A5C', '#1D4A3A', '#3D2E14'][i % 3]));
  P.push(box(x + pad, y + pad, z, w - 2 * pad, Math.max(.8, h * .06), .1, '#46C2A0'));
}

/* ---------- compile a rack part ---------- */
/* d: { u, shape, face, device: {size, color, io}, depth }, opts: { color, accent, lookup } */
function screwYs(H) {
  if (H < U - 1) return [H / 2];
  const n = Math.round((H + CLEAR) / U), out = [];
  for (let i = 0; i < n; i++) out.push(i * U + 6.35 - CLEAR / 2, i * U + 38.1 - CLEAR / 2);
  return out;
}
function defaultShape(d) {
  const f = d.face || 'shelf', u = d.u || (d.h2 ? d.h2 / 2 : 1);
  switch (f) {
    case 'vent': return { row: [{ vent: 'hex' }] };
    case 'fan': return u <= 1 ? { row: [{ fan: 40, n: 5 }] } : u <= 2 ? { row: [{ fan: 80, n: 2 }] } : u <= 3 ? { row: [{ fan: 120 }] } : { row: [{ fan: 140 }] };
    case 'ks': return { row: [{ ks: u < 1 ? 12 : 10 }] };
    case 'sbc': return { row: [{ sbc: u >= 2 ? 4 : 2, board: 'pi5', orient: u >= 2 ? 'v' : 'h' }] };
    case 'drv2': return { row: [{ bay: 3.5, n: 2 }] };
    case 'drv4': return { row: [{ bay: 2.5, n: 4, rows: 2 }] };
    case 'switch': return { row: [{ dev: d.device ? true : 'switch8' }], shelf: true };
    case 'cut': return { row: [{ open: true }] };
    case 'd': return { row: [{ dtype: 6 }] };
    case 'blank': case 'custom': return d.device ? { row: [{ dev: true }], shelf: true } : { row: [] };
    default: return d.device || f === 'shelf' && d.custom !== true ? { row: [{ dev: d.device ? true : 'box' }], shelf: true } : { row: [] };
  }
}
function compilePart(d, opts) {
  opts = opts || {};
  const F = plateFit(d, opts.upper), H = F.h, color = opts.color || '#26282B', accent = opts.accent || '#B5CF2A';
  const shape = d.shape || defaultShape(d);
  const S = scene(), margin = H < 25 ? 2 : 3;
  // what the panel holds sits in the middle of its slot: a ½U Lab Rax panel reaches past the middle of its U, so it has a lip there
  const half = Math.min(F.mid, H - F.mid) - margin, top0 = F.mid + half;
  const ctx = { ih: 2 * half, H, color, accent, device: d.device, lookup: opts.lookup, maxDepth: num(opts.maxDepth, 215), trayColor: shape.trayColor, sledColor: shape.sledColor === 'white' ? C.white : shape.sledColor };
  const rows = shape.rows || [shape.row || []], left = -SPAN / 2, avail = SPAN;
  const rowH = (ctx.ih - (rows.length - 1) * 3) / rows.length;
  let yTop = top0, deepest = 0;
  rows.forEach(row => {
    const rctx = Object.assign({}, ctx, { ih: rows.length > 1 ? rowH : ctx.ih });
    const mods = (row || []).map(asObj);
    const ms = mods.map(m => measure(m, rctx, avail));
    const fixed = ms.reduce((s, q) => s + (q.grow ? 0 : q.w), 0), grow = ms.filter(q => q.grow).length, n = mods.length;
    let gap = num(shape.gap, grow ? 6 : n > 1 ? clamp((avail - fixed) / (n + 1), 3, 18) : 0);
    const free = avail - fixed - gap * (n - 1) - (grow ? 2 * 4 : 0);
    if (grow) ms.forEach(q => { if (q.grow) q.w = Math.max(10, free / grow); });
    const total = ms.reduce((s, q) => s + q.w, 0) + gap * (n - 1);
    let x = shape.align === 'left' ? left + 4 : shape.align === 'right' ? left + avail - 4 - total : left + (avail - total) / 2;
    const rh = rctx.ih, y0 = yTop - rh;
    mods.forEach((m, i) => {
      const q = ms[i], yy = m.valign === 'bottom' ? y0 : m.valign === 'top' ? y0 + rh - q.h : y0 + (rh - q.h) / 2;
      buildMod(S, m, x, yy, 0, q, rctx);
      if (q.d && q.d.d) deepest = Math.max(deepest, Math.min(q.d.d, ctx.maxDepth));
      x += q.w + gap;
    });
    yTop -= rh + 3;
  });
  // whole-plate patterns fill what the modules leave free
  if (shape.plate && shape.plate !== 'solid') {
    const taken = S.holes.map(bbox), pat = ventHoles(shape.plate, -SPAN / 2, top0 - 2 * half + .5, SPAN, 2 * half - 1, { r: shape.plateR });
    pat.forEach(p => { const b = bbox(p); if (!taken.some(t => b[0] < t[2] + 2.4 && b[2] > t[0] - 2.4 && b[1] < t[3] + 2.4 && b[3] > t[1] - 2.4)) S.holes.push(p); });
  }
  // a shelf or tray behind the panel for devices
  const depth = num(shape.depth, num(d.depth, deepest ? deepest + 8 : 0));
  if (shape.shelf && depth > 0) {
    const P = S.obj(0, 'shelf'), sw = Math.min(SPAN + 4, num(shape.shelfW, SPAN - 4)), fl = shape.floor;
    const floorPts = [[-sw / 2, PLATE], [sw / 2, PLATE], [sw / 2, depth], [-sw / 2, depth]];
    const fh = fl === 'hex' || fl === 'slots' ? ventHoles(fl === 'hex' ? 'hex' : 'hslots', -sw / 2 + 8, PLATE + 10, sw - 16, depth - 20, { r: 7, wall: 2.6 }) : [];
    P.push(flat('y', floorPts, fh, margin - 2.2, 2.2, color));
    for (const sx of [-1, 1]) P.push(flat('x', [[PLATE, margin], [depth, margin], [depth, margin + 7], [PLATE + 12, H * .72], [PLATE, H * .72]], [], sx < 0 ? -sw / 2 : sw / 2 - 2.4, 2.4, color));
  } else if (shape.rails && depth > 0) {
    const P = S.obj(0, 'rails'), sw = num(shape.shelfW, SPAN - 8);
    for (const sx of [-1, 1]) P.push(flat('x', [[PLATE, margin], [depth, margin], [depth, H - margin], [PLATE, H - margin]], [], sx < 0 ? -sw / 2 - 2.4 : sw / 2, 2.4, color));
  }
  // the plate itself with its holes, and the screws in the ears
  const plate = S.obj(1, 'plate');
  plate.push(ext(plateOutline(H, F.notches), S.holes.concat(F.slots.flatMap(y => [-1, 1].map(sx => slotP(sx * HOLE_X, y, 10, 7)))), 0, PLATE, color));
  const scr = S.obj(2, 'screws');
  for (const sx of [-1, 1]) for (const sy of F.screws) scr.push(cyl(sx * HOLE_X, sy, 2.6, 5.4, 2.6, C.metal), ext(ngonP(sx * HOLE_X, sy, 1.9, 6, 0), [], 2.65, .1, '#55595E'));
  return { w: PANEL_W, h: H, objs: S.objs, depth: Math.max(depth, deepest), color };
}

/* ---------- top mounts (replace the top panel) ----------
   Coordinates: y = 0 on top of the frame, z = 0 at the front of the frame going back; the opening is about 222 × 182 mm. */
const SQUARE = new Set(['U7 Pro', 'U7 Pro Max', 'U7 Pro XG']); // UniFi's rounded-square access points
const AP = { 'U7 Pro': [206, 46.5], 'U7 Pro Max': [206, 46.5], 'U6+': [160, 32.7], 'U6 Pro': [196.7, 35], 'U7 Lite': [160, 33], 'U6 Lite': [160, 33], 'U7 Pro XG': [206, 46.5] };
function compileTop(d, opts) {
  opts = opts || {};
  const sh = d.shape || { ap: 'U7 Pro', tilt: 45 }, S = scene(), color = opts.color || '#26282B', frame = opts.frame || color, accent = opts.accent || '#B5CF2A';
  const W = DIMS.clearWidth, D = num(opts.depth, DIMS.depth) - 58, z0 = -29, zc = z0 - D / 2;
  const holes = [];
  const fans = sh.fan ? [].concat(sh.fan) : [];
  const nF = num(sh.n, fans.length ? 1 : 0), fd = fans[0] || 0;
  const fanAt = [];
  for (let i = 0; i < nF; i++) fanAt.push([-(nF - 1) * (fd + 8) / 2 + i * (fd + 8), zc]);
  fanAt.forEach(([fx, fz]) => holes.push(circP(fx, -fz, fd / 2 - 1.5)));
  if (sh.plate === 'hex' || sh.plate === 'mesh' || sh.plate === 'slots') {
    const pat = ventHoles(sh.plate === 'slots' ? 'vslots' : 'hex', -W / 2 + 10, -z0 + 10, W - 20, D - 20, { r: sh.plate === 'mesh' ? 3.6 : 6.4, wall: 2 });
    pat.forEach(p => { if (!fanAt.some(([fx, fz]) => p.some(([a, b]) => Math.hypot(a - fx, b + fz) < fd / 2 + 3))) holes.push(p); });
  }
  const tilted = sh.ap && num(sh.tilt, 0) > 0;
  if (tilted) { // under the 45° mount: a 110 mm square of openings and four screws (measured from the Lab Rax U7 Pro mount)
    ventHoles('grid', -55, -zc - 55, 110, 110, { r: 10, wall: 4 }).forEach(p => holes.push(p));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) holes.push(circP(sx * 52.5, -zc + sz * 52.6, 2.25));
  } else if (sh.ap) holes.push(circP(0, -(zc), 18)); // cable hole under the access point
  const plateP = S.obj(0, 'plate');
  plateP.push(flat('y', rectP(-W / 2, -z0, W, D, 2), holes, -3, 3, color));
  fanAt.forEach(([fx, fz]) => {
    const P = S.obj(0);
    P.push(flat('y', rectP(fx - fd / 2, -fz - fd / 2, fd, fd, fd * .06), [circP(fx, -fz, fd / 2 - 1.5)], -3 - (fd >= 80 ? 25 : 10), fd >= 80 ? 25 : 10, C.fan));
    const r = fd / 2 - 2, hub = r * .38;
    for (let i = 0; i < 7; i++) { const a0 = i / 7 * Math.PI * 2, p = []; for (let k = 0; k <= 5; k++) { const t = k / 5, rr = hub + (r - hub) * t, a = a0 + t * .55; p.push([fx + rr * Math.cos(a), -fz + rr * Math.sin(a)]); } for (let k = 5; k >= 0; k--) { const t = k / 5, rr = hub + (r - hub) * t, a = a0 + t * .55 + .62; p.push([fx + rr * Math.cos(a), -fz + rr * Math.sin(a)]); } P.push(flat('y', p, [], -6, 1, C.blade)); }
    P.push(flat('y', circP(fx, -fz, hub), [], -6, 2, '#2A2C30'));
    if (sh.grille !== false) { const G = S.obj(2); for (let k = 1; k <= 3; k++) G.push(flat('y', circP(fx, -fz, r * k / 3.1 + .8), [circP(fx, -fz, r * k / 3.1 - .4)], 0, 1, sh.grille === 'print' ? color : C.metal)); }
  });
  if (sh.plate === 'grid' || sh.plate === 'gridfinity') { // 42 mm Gridfinity cells with a few bins
    const G = S.obj(2), n = Math.floor(W / 42), m2 = Math.floor(D / 42), gx = -n * 21, gz = -z0 + (D - m2 * 42) / 2;
    for (let i = 0; i < n; i++) for (let j = 0; j < m2; j++) G.push(flat('y', rectP(gx + i * 42 + .6, gz + j * 42 + .6, 40.8, 40.8, 4), [rectP(gx + i * 42 + 2.6, gz + j * 42 + 2.6, 36.8, 36.8, 3)], 0, 2.4, shade(color, lum(color) > .5 ? -.08 : .1)));
    [[0, 0, 2, 1], [3, 1, 1, 2], [1, 2, 2, 1]].forEach(([i, j, a, b], k) => { if (i + a <= n && j + b <= m2) G.push(flat('y', rectP(gx + i * 42 + 1, gz + j * 42 + 1, a * 42 - 2, b * 42 - 2, 4), [rectP(gx + i * 42 + 3, gz + j * 42 + 3, a * 42 - 6, b * 42 - 6, 3)], 2.4, 14 + (k % 2) * 7, k === 1 ? accent : shade(color, lum(color) > .5 ? -.12 : .2))); });
  }
  if (sh.ap) {
    const [dia, th] = AP[sh.ap] || AP['U7 Pro'], tilt = num(sh.tilt, 0), r = dia / 2, A = S.obj(2);
    if (tilt > 0) {
      // two towers, 28 mm wide, carry a printed adapter at the tilt; the access point clips onto it. Measured from the Lab Rax
      // U7 Pro 45° mount: base 94 mm deep (50 behind the plate's centre to 44 in front), 128 mm above the plate, the seat's
      // middle 86 mm up and 7.6 mm in front of the centre, the adapter 172 mm across and 4.5 mm thick
      const t = tilt * Math.PI / 180, sy = 86.1, sz = 7.6, top = 128.3, seatAt = zz => sy + (sz - zz) * Math.tan(t);
      const zTop = sz - (top - sy) / Math.tan(t), prof = [[-50, 0], [44, 0], [44, Math.max(8, seatAt(44))], [Math.max(-34, zTop), top], [-36, top]];
      for (const sx of [-1, 1]) A.push(flat('x', prof.map(([zz, yy]) => [-zc - zz, yy]), [], sx < 0 ? -74 : 46, 28, frame));
      A.push({ t: 'disc', x: 0, y: sy, z: zc + sz, r: 86, d: 4.5, tilt, c: shade(frame, .1) });
      A.push({ t: 'disc', x: 0, y: sy + 4.5 * Math.cos(t), z: zc + sz + 4.5 * Math.sin(t), r, d: th, tilt, c: '#F1F2F3', dome: true, ring: '#9CC8FF', sq: SQUARE.has(sh.ap) });
    } else {
      A.push(flat('y', circP(0, -zc, 70), [circP(0, -zc, 18)], 0, 4, frame));
      A.push({ t: 'disc', x: 0, y: 4, z: zc, r, d: th, tilt: 0, c: '#F1F2F3', dome: true, ring: '#9CC8FF', sq: SQUARE.has(sh.ap) });
    }
  }
  return { top: true, objs: S.objs, w: DIMS.outerWidth, h: 0 };
}

/* ---------- frame extras ----------
   An extra's shape says what it changes on the frame: { side: 'hex', fan: 80 }, { handles: 'stackable' }, { feet: 'big' },
   { drawer: true }, { logo: 'neopixel' }, { corner: 11 }, { depth: 50 }, { u: 6 }, { frame: 'lowprofile' }, { wall: true },
   { inside: 'comb' }. They also say how it looks and where it sits: { feet: 'big', foot: 'cone' } round feet, { feet: 'casters', chassis: 'blocks' }
   corner blocks under the casters, { rails: 'counterbore' } bare posts with a column of counterbored holes, { side: 'asanoha' } or
   { side: 'raisedhex' } patterned panels, { side: 'hex', mount: [180, 200] } mounting holes for those fans, { sides: 'open' } no side panel,
   { hl: ['edges', 'sides'] } what to colour (base, top, posts, handles, edges = the side beams, sides = the side panels), { wall: 'cleat' |
   'plate' | 'dock' }, { width: 482.6, hl: 'braces', bar: 'center' } a wider frame with its cross braces coloured, { tandem: 2 } racks side by side
   sharing the middle posts, { joiner: 'post' | 'depth' | 'outer', u: 6 } how a build taller than 5U is joined at the seam: plates on the posts, a bar
   between front and rear posts, or a bar across the outside of the side panels. frameMods() merges the extras in a build for the front and 3D views; extraScene() draws one for its card. */
function frameMods(list) {
  // feet stays plain | big | casters for the views that only know those; foot, chassis, wallStyle and sideMount say more
  const m = { side: null, sideFan: 0, sideMount: null, handles: 'plain', handlesAt: null, feet: 'plain', foot: null, chassis: null, drawer: false, logo: null, corner: 0, depthAdd: 0, wall: false, wallStyle: null, edgeSwitch: false, width: 0, tandem: 0 };
  (list || []).forEach(d => {
    const s = d && d.shape || {};
    if (s.side || s.fan) { m.side = s.side || m.side || 'plain'; if (s.fan) m.sideFan = num(s.fan, 80); }
    if (s.mount) m.sideMount = [].concat(s.mount).filter(v => typeof v === 'number');
    if (s.handles) { m.handles = s.handles; m.handlesAt = s.at || null; }
    if (s.feet) { m.feet = s.feet; m.foot = s.foot || null; m.chassis = s.chassis || null; } // the last feet extra wins, with its own look
    if (s.drawer) m.drawer = true;
    if (s.logo) m.logo = s.logo;
    if (s.corner) m.corner = num(s.corner, 4);
    if (s.depth) m.depthAdd = Math.max(m.depthAdd, num(s.depth, 0));
    if (s.wall) { m.wall = true; m.wallStyle = typeof s.wall === 'string' ? s.wall : 'plain'; }
    if (s.edge === 'switch') m.edgeSwitch = true;
    if (s.width) m.width = num(s.width, 0);
    if (s.tandem) m.tandem = num(s.tandem, 0);
  });
  return m;
}
// Asanoha (hemp leaf), the Kumiko lattice: a triangular grid, each triangle cut in three by lines from its centre to its corners; the
// cut-outs are those thirds, shrunk to leave a bar. s is the triangle side, bar the bar width, both in mm.
function asanohaHoles(x0, y0, w, h, s, bar) {
  const out = [], th = s * Math.sqrt(3) / 2, rows = Math.floor(h / th + 1e-6), f = 1 - bar / 2 / (s * .134);
  const n = Math.max(1, Math.floor((w - s) / (s / 2) + 1e-6) + 1), ox = x0 + (w - ((n - 1) * s / 2 + s)) / 2, oy = y0 + (h - rows * th) / 2;
  for (let r = 0; r < rows; r++) for (let j = 0; j < n; j++) {
    const xj = ox + j * s / 2, yb = oy + r * th, yt = yb + th;
    const tri = (j + r) % 2 === 0 ? [[xj, yb], [xj + s, yb], [xj + s / 2, yt]] : [[xj, yt], [xj + s, yt], [xj + s / 2, yb]];
    const g = [(tri[0][0] + tri[1][0] + tri[2][0]) / 3, (tri[0][1] + tri[1][1] + tri[2][1]) / 3];
    for (let k = 0; k < 3; k++) {
      const a = tri[k], b = tri[(k + 1) % 3], c = [(a[0] + b[0] + g[0]) / 3, (a[1] + b[1] + g[1]) / 3];
      out.push([g, a, b].map(q => [c[0] + (q[0] - c[0]) * f, c[1] + (q[1] - c[1]) * f]));
    }
  }
  return out;
}
/* a side panel pattern on the plane of a side, in (back, y) from the front bottom corner of the panel. opts.mount lists fan sizes whose
   four mounting holes are drilled through the pattern (the hex cells they would hit are left out). back: a second-colour plate behind the
   cut-outs, rim: the width of a raised border (dual-tone panels). */
function sideHoles(side, fan, depth, height, opts) {
  const holes = [], m = 14, studs = [];
  let back = false, rim = 0;
  if (fan) { const fd = Math.min(fan, height - 16, depth - 30); holes.push(circP(depth / 2, height / 2, fd / 2 - 1.5)); return { holes, fan: { cx: depth / 2, cy: height / 2, d: fd } }; }
  if (side === 'hex' || side === 'honeycomb') ventHoles('hex', m, m, depth - 2 * m, height - 2 * m, { r: side === 'honeycomb' ? 11 : 7.5, wall: side === 'honeycomb' ? 4 : 2.6 }).forEach(h => holes.push(h));
  else if (side === 'raisedhex') { ventHoles('hex', m, m, depth - 2 * m, height - 2 * m, { r: 4.6, wall: 1.6 }).forEach(h => holes.push(h)); back = true; rim = m - 3; }
  else if (side === 'asanoha') asanohaHoles(m, m, depth - 2 * m, height - 2 * m, 28, 2.2).forEach(h => holes.push(h));
  else if (side === 'vent' || side === 'slots') ventHoles('hslots', m + 20, m + 8, depth - 2 * m - 40, height - 2 * m - 16, { sw: 4, pitch: 9 }).forEach(h => holes.push(h));
  else if (side === 'kumiko') { for (let x = m; x + 26 <= depth - m; x += 28) for (let y = m; y + 26 <= height - m; y += 28) holes.push([[x + 3, y + 1.5], [x + 23, y + 1.5], [x + 13, y + 11.5]], [[x + 24.5, y + 3], [x + 24.5, y + 23], [x + 14.5, y + 13]], [[x + 23, y + 24.5], [x + 3, y + 24.5], [x + 13, y + 14.5]], [[x + 1.5, y + 23], [x + 1.5, y + 3], [x + 11.5, y + 13]]); }
  else if (side === 'skadis') { for (let j = 0, y = m; y + 15 <= height - m; j++, y += 20) for (let x = m + (j % 2) * 20; x + 5 <= depth - m; x += 40) holes.push(slotP(x + 2.5, y + 7.5, 5, 15)); }
  else if (side === 'multiboard') { for (let x = m + 11; x <= depth - m - 11; x += 25) for (let y = m + 11; y <= height - m - 11; y += 25) holes.push(ngonP(x, y, 10, 8, Math.PI / 8)); }
  else if (side === 'grid') ventHoles('grid', m, m, depth - 2 * m, height - 2 * m, { r: 12, wall: 3.5 }).forEach(h => holes.push(h));
  else if (side === 'brick') { for (let x = m + 8; x <= depth - m - 8; x += 16) for (let y = m + 8; y <= height - m - 8; y += 16) studs.push([x, y]); }
  // fan mounting holes: the corners of a square of about .77 of the fan size (estimated: the pages give no hole spacing), round the middle
  const mounts = [];
  [].concat(opts && opts.mount || []).forEach(sz => { const q = Math.round(sz * .77) / 2; for (const dx of [-1, 1]) for (const dy of [-1, 1]) { const x = depth / 2 + dx * q, y = height / 2 + dy * q; if (x > m + 4 && x < depth - m - 4 && y > m + 4 && y < height - m - 4) mounts.push([x, y]); } });
  if (mounts.length) {
    const mid = h => [h.reduce((a, q) => a + q[0], 0) / h.length, h.reduce((a, q) => a + q[1], 0) / h.length];
    const keep = holes.filter(h => { const c = mid(h); return mounts.every(q => Math.hypot(c[0] - q[0], c[1] - q[1]) > 9); });
    holes.length = 0; keep.forEach(h => holes.push(h));
    mounts.forEach(q => holes.push(circP(q[0], q[1], 2.6, 12)));
  }
  return { holes, studs, back, rim };
}
// Turns a scene a quarter turn clockwise about the viewing axis, (x, y) → (y, −x): a rack hanging on its side, its feet to the left.
function turnQuarter(S) {
  const rot = q => [q[1], -q[0]], swap = q => [q[1], q[0]];
  const turned = p => {
    if (p.t === 'box') return Object.assign({}, p, { x: p.y, y: -(p.x + p.w), w: p.h, h: p.w });
    if (p.t === 'cyl') return Object.assign({}, p, { x: p.y, y: -p.x });
    if (p.t === 'text') return Object.assign({}, p, { x: p.y, y: -p.x, rot: (p.rot || 0) + 90 });
    if (p.t === 'lines') return Object.assign({}, p, { segs: p.segs.map(g => [g[1], -g[0], g[3], -g[2]]) });
    if (p.t !== 'ext') return p;
    if (p.axis === 'z') return Object.assign({}, p, { pts: p.pts.map(rot), holes: p.holes.map(h => h.map(rot)) });
    if (p.axis === 'y') return Object.assign({}, p, { axis: 'x', pts: p.pts.map(rot), holes: p.holes.map(h => h.map(rot)) });
    return Object.assign({}, p, { axis: 'y', at: -(p.at + p.d), pts: p.pts.map(swap), holes: p.holes.map(h => h.map(swap)) });
  };
  S.objs.forEach(ob => { ob.prims = ob.prims.map(turned); });
}
// Moves a scene sideways by dx mm.
function shiftScene(S, dx) {
  const moved = p => {
    if (p.t === 'box' || p.t === 'cyl' || p.t === 'disc' || p.t === 'text') return Object.assign({}, p, { x: p.x + dx });
    if (p.t === 'lines') return Object.assign({}, p, { segs: p.segs.map(g => [g[0] + dx, g[1], g[2] + dx, g[3]]) });
    if (p.t !== 'ext') return p;
    if (p.axis === 'x') return Object.assign({}, p, { at: p.at + dx });
    const mv = q => [q[0] + dx, q[1]]; // axis z: (x, y); axis y: (x, back)
    return Object.assign({}, p, { pts: p.pts.map(mv), holes: p.holes.map(h => h.map(mv)) });
  };
  S.objs.forEach(ob => { ob.prims = ob.prims.map(moved); });
}
// racks side by side, neighbours sharing a pair of posts; only the outer side of the last one gets a panel
function tandemScene(sp, o) {
  const n = clamp(Math.floor(num(sp.tandem, 2)), 2, 3), one = Object.assign({}, sp, { tandem: 0 }), dx = FRAME.outer - 2 * 3 - FRAME.post;
  const out = { rack: true, objs: [], w: FRAME.outer + (n - 1) * dx, h: 0 };
  for (let k = 0; k < n; k++) {
    const sc = rackScene(k < n - 1 ? Object.assign({}, one, { sides: 'open' }) : one, o);
    shiftScene(sc, k * dx - (n - 1) * dx / 2); out.objs.push(...sc.objs); out.h = sc.h;
  }
  return out;
}
/* A small Lab Rax for the extras' cards and anything else that needs the frame as primitives (3D side panels use sideHoles). */
function rackScene(spec, o) {
  o = o || {};
  const sp = spec || {}, frame = o.frame || '#26282B', accent = o.accent || '#B5CF2A', S = scene();
  if (sp.tandem) return tandemScene(sp, o);
  const u = num(sp.u, 3), W = sp.width ? clamp(num(sp.width, FRAME.outer), FRAME.outer, 600) : sp.frame === 'matx' ? 304 : FRAME.outer, D = FRAME.depth + num(sp.depth, 0), ih = u * U, post = FRAME.post, bot = sp.frame === 'lowprofile' ? 8 : FRAME.bottom, top = sp.frame === 'lowprofile' ? 18 : FRAME.top, ring = FRAME.ring;
  const wallStyle = typeof sp.wall === 'string' ? sp.wall : sp.wall ? 'plain' : null;
  const postX = sx => sx < 0 ? -W / 2 + 3 : W / 2 - 3 - post; // left edge of the posts on the left (-1) or right (1) side
  const y0 = (sp.feet === 'casters' ? 46 : sp.feet === 'big' ? 14 : wallStyle === 'dock' ? 28 : 8) + (sp.drawer ? 30 : 0), yT = y0 + bot + ih;
  const B = (x, y, z, w, h, d, c, layer) => S.obj(layer == null ? 0 : layer).push(box(x, y, z, w, h, d, c));
  // dark inside, then the rings, posts and side panels
  B(-W / 2 + 8, y0 + bot, -D + 4, W - 16, ih, 2, '#0C0D0F');
  // what the extra changes is coloured: hl is one of base, top, posts, handles, edges (the side beams of both rings) and sides (the side panels), or a list of them
  const hlOn = k => [].concat(sp.hl || []).includes(k), hl = k => hlOn(k) ? accent : frame, edgeC = k => hlOn('edges') || hlOn(k) ? accent : frame, brC = k => hlOn('braces') || hlOn(k) ? accent : frame;
  B(-W / 2, y0, 0, ring, bot, D, edgeC('base')); B(W / 2 - ring, y0, 0, ring, bot, D, edgeC('base')); B(-W / 2 + ring, y0, 0, W - 2 * ring, bot, ring, brC('')); B(-W / 2 + ring, y0, -D + ring, W - 2 * ring, bot, ring, brC(''));
  for (const sx of [-1, 1]) for (const z of [0, -D + 20]) B(sx < 0 ? -W / 2 + 3 : W / 2 - 3 - post, y0 + bot, z, post, ih, 20, hl('posts'));
  // rails with larger bolt heads: the posts bare, a column of counterbored holes (three per U, EIA spacing) in the front face of each
  if (sp.rails) { const R = S.obj(2); for (const sx of [-1, 1]) for (const z of [0, -D + 20]) for (let k = 0; k < u; k++) for (const off of DIMS.holeY) { const hy = yT - k * U - off; R.push(cyl(sx * HOLE_X, hy, z + .12, 6.4, .1, shade(frame, -.4)), cyl(sx * HOLE_X, hy, z + .24, 3.4, .1, C.hole)); } }
  // front: a few panels so it reads as a rack
  const PW = sp.width ? W - 30 : 250, ns = sp.width ? Math.round(PW / 50) : 5; // panel width and number of slots in the bottom one: a wider frame has wider panels
  if (!sp.rails) for (let i = 0; i < u; i++) { const P = S.obj(1); P.push(box(-PW / 2, y0 + bot + i * U + .4, 2.6, PW, U - .8, 3, shade(frame, .05), 1)); if (i === u - 1) ventHoles('hex', -PW / 2 + 25, y0 + bot + i * U + 7, PW - 50, U - 14, {}).forEach(h => P.push(ext(h, [], 2.7, .1, C.hole))); else if (i === 0) { for (let k = 0; k < ns; k++) P.push(box(-(ns * 40 - 10) / 2 + k * 40, y0 + bot + i * U + 8, 2.7, 30, U - 17, .1, C.hole, 2)); } }
  // top ring with the hex grille and logo, or the keystone corner
  B(-W / 2, yT, 0, ring, top, D, edgeC('top'), 1); B(W / 2 - ring, yT, 0, ring, top, D, edgeC('top'), 1); B(-W / 2 + ring, yT, -D + ring, W - 2 * ring, top, ring, brC('top'), 1);
  const F = S.obj(1); F.push(box(-W / 2 + ring, yT, 0, W - 2 * ring, top, ring, brC('top')));
  if (sp.bar === 'center') B(-10, yT + top - 5, 0, 20, 5, D, brC(''), 1); // a flat bar along the middle of the top, front brace to back brace
  const G = S.obj(2);
  if (sp.corner) { const n = Math.min(num(sp.corner, 11), 12); for (let i = 0; i < n; i++) G.push(box(-((n - 1) * 17.6) / 2 + i * 17.6 - 7.45, yT + top / 2 - 8.2, .1, 14.9, 16.4, .1, '#18191C'), box(-((n - 1) * 17.6) / 2 + i * 17.6 - 5.85, yT + top / 2 - 5.8, .2, 11.7, 9.8, .1, C.hole)); }
  else {
    ventHoles('hex', -W / 2 + 18, yT + 5, W - 36, top - 10, { r: 3.4, wall: 1.4 }).forEach(h => G.push(ext(h, [], .1, .1, sp.logo === 'hexbar' ? accent : C.hole)));
    if (top > 20) G.push({ t: 'text', x: 0, y: yT + top / 2 - (sp.logo === 'neopixel' ? 9 : 6), z: .3, s: sp.logo === 'neopixel' ? 22 : 14, str: o.label || 'Lab Rax', c: accent, glow: sp.logo === 'neopixel' });
  }
  if (sp.edge === 'switch') G.push(box(W / 2 - ring - 30, yT + top / 2 - 7, .4, 16, 14, .4, C.red, 3));
  // right side panel with its pattern (the left one is hidden)
  const sh = sideHoles(sp.side, sp.fan, D - 40, ih + 8, { mount: sp.mount }), SP = S.obj(2), side = hlOn('sides') ? accent : sp.side || sp.fan ? frame : sp.sides === 'acrylic' ? '#2A3038' : frame;
  const sx0 = 20, sy0 = y0 + bot - 4, sw = D - 40, shh = ih + 8;
  if (sp.sides !== 'open') { // open: no printed side panel, the frame shows
    if (sh.back) SP.push(flat('x', rectP(sx0 + sh.rim, sy0 + sh.rim, sw - 2 * sh.rim, shh - 2 * sh.rim, 1), [], W / 2 - 4.2, 1.2, shade(accent, -.25))); // the second colour, seen through the cut-outs
    if (sp.joiner && u > 1) { // a build taller than 5U has two side panels with a seam at the joint (the upper one an extension)
      const h1 = Math.min(5, u - 1) * U + 4;
      SP.push(flat('x', rectP(sx0, sy0, sw, h1 - .6, 2), [], W / 2 - 3, 3, frame), flat('x', rectP(sx0, sy0 + h1 + .6, sw, shh - h1 - .6, 2), [], W / 2 - 3, 3, hlOn('sides') ? accent : frame));
    } else
    SP.push(flat('x', rectP(sx0, sy0, sw, shh, 2), sh.holes.map(h => h.map(([a, b]) => [a + 20, b + y0 + bot - 4])), W / 2 - 3, 3, side));
    if (sh.rim) SP.push(flat('x', rectP(sx0, sy0, sw, shh, 2), [rectP(sx0 + sh.rim, sy0 + sh.rim, sw - 2 * sh.rim, shh - 2 * sh.rim, 1)], W / 2, 1.6, shade(side, .1))); // the raised border
    if (sh.fan) { const fx = 20 + sh.fan.cx, fy = y0 + bot - 4 + sh.fan.cy, r = sh.fan.d / 2 - 2; for (let k = 1; k <= 3; k++) SP.push(flat('x', circP(fx, fy, r * k / 3.2 + .8), [circP(fx, fy, r * k / 3.2 - .4)], W / 2 + .5, 1, C.metal)); SP.push(flat('x', circP(fx, fy, r * .36), [], W / 2 - 2, 1, '#2A2C30')); }
    (sh.studs || []).forEach(([a, b]) => SP.push(flat('x', circP(a + 20, b + y0 + bot - 4, 4.8, 14), [], W / 2, 1.8, shade(frame, .08))));
  }
  // joiners at the seam of a tall build (see the header): plates over the post joints, a bar from front to rear post, a bar across the outside of the side panels
  if (sp.joiner) {
    const jy = y0 + bot + Math.min(5, u - 1) * U, J = S.obj(2);
    if (sp.joiner === 'post') for (const sx of [-1, 1]) for (const z of [0, -D + 20]) J.push(box(postX(sx), jy - 18, z + .6, post, 36, 2.4, accent));
    else if (sp.joiner === 'depth') for (const sx of [-1, 1]) J.push(flat('x', rectP(10, jy - 8, D - 20, 16, 2), [], sx < 0 ? -W / 2 + 3 : W / 2 - 7, 4, accent));
    else if (sp.joiner === 'outer') { J.push(flat('x', rectP(10, jy - 9, D - 20, 18, 2), [], W / 2, 3, accent)); for (const b of [18, D - 18]) J.push(flat('x', circP(b, jy, 4.5), [], W / 2 + 3, 1.6, C.steel)); }
  }
  // handles on top, feet or casters below, a drawer in the base
  const hs = sp.handles || 'plain';
  if (hs === 'side') { // attachment is documented; the grip outline and size remain approximate
    const gz = 40, gl = D - 120, at = sp.at || sp.handlesAt;
    const gy = at === 'top-corners' ? yT + top / 2 - 13 : at === 'bottom-corners' ? y0 + bot / 2 - 13 : y0 + bot + ih * .62;
    for (const sx of [-1, 1]) S.obj(2).push(flat('x', rectP(gz, gy, gl, 26, 10), [rectP(gz + 12, gy + 7, gl - 24, 12, 6)], sx < 0 ? -W / 2 - 12 : W / 2, 12, accent));
  } else if (hs !== 'none') for (const sx of [-1, 1]) {
    const L = hs === 'long' && sp.depth ? FRAME.depth * FRAME.handleLen + num(sp.depth, 0) : (D) * (hs === 'long' ? .7 : .53), H = hs === 'stackable' ? 26 : 34, z0 = -(D - L) / 2, leg = 14, sl = hs === 'stackable' ? 0 : .35, bar = 10;
    const pts = [[-z0, 0], [-z0 + leg, 0], [-z0 + leg + (H - bar) * sl, H - bar], [-z0 + L - leg - (H - bar) * sl, H - bar], [-z0 + L - leg, 0], [-z0 + L, 0], [-z0 + L - H * sl, H], [-z0 + H * sl, H]];
    S.obj(2).push(flat('x', hs === 'stackable' ? [[-z0, 0], [-z0 + L, 0], [-z0 + L, H], [-z0, H]].map(([a, b]) => [a, b + yT + top]) : pts.map(([a, b]) => [a, b + yT + top]), hs === 'stackable' ? [rectP(-z0 + 14, 6 + yT + top, L - 28, H - 14, 4)] : [], sx * (W / 2 - 23) - 6, 12, hs === 'side' || hlOn('handles') || sp.handles && sp.handles !== 'plain' ? accent : frame));
  }
  const ft = sp.feet || 'plain';
  for (const sx of [-1, 1]) for (const z of [-8, -(D - 30)]) {
    const fx = sx < 0 ? -W / 2 + 6 : W / 2 - 34, cx = fx + 14, cz = z - 11, F0 = S.obj(0);
    if (ft === 'casters' && sp.chassis === 'blocks') { // a base block under the frame corner, the caster's swivel plate, its fork, and a wheel rolling front to back
      F0.push(flat('x', circP(-cz, 15, 15), [], cx - 5, 10, '#25272B'), flat('x', circP(-cz, 15, 8), [], cx - 5.2, 10.4, C.steel), flat('x', circP(-cz, 15, 2.6, 12), [], cx - 7.2, 14.4, C.metal)); // tyre, hub, axle
      for (const k of [cx - 7.2, cx + 5]) F0.push(flat('x', rectP(-cz - 9, 7, 18, y0 - 14.5 - 7, 4), [], k, 2.2, C.steel));
      F0.push(box(fx - 3, y0 - 14.5, z + 3, 34, 2.5, 28, C.steel), box(fx, y0 - 12, z, 28, 12, 22, accent)); // painted bottom to top: the block rests on the plate
    }
    else if (ft === 'casters') { F0.push(box(fx, y0 - 10, z, 28, 10, 22, '#3A3D42'), cyl(fx + 14, y0 - 28, z + 4, 16, 6, '#1A1B1E'), cyl(fx + 14, y0 - 28, z + 4.2, 6, .4, C.metal)); }
    else if (sp.foot) F0.push({ t: 'disc', x: cx, y: y0 - 14, z: cz, r: sp.foot === 'cone' ? 11.5 : 14, r2: 14, d: 14, tilt: 0, c: accent }); // a round foot (a cone: narrower at the floor)
    else if (wallStyle === 'dock') F0.push(box(cx - 12, 6, z, 24, 6, 22, accent), box(cx - 7, 12, z, 14, y0 - 12, 22, accent)); // adapter foot: a flange that slides into the bracket, and a neck
    else F0.push(box(fx, y0 - (ft === 'big' ? 14 : 8), z, 28, ft === 'big' ? 14 : 8, 22, ft === 'big' ? accent : '#1A1B1E'));
  }
  if (sp.drawer) { S.obj(0).push(box(-W / 2 + 6, y0 - 30, 0, W - 12, 28, D - 20, frame, 2)); S.obj(2).push(box(-30, y0 - 19, 6, 60, 7, 6, accent, 3)); }
  if (wallStyle === 'plain') { S.obj(0).push(box(-W / 2 - 30, -10, -D - 2, W + 60, yT + top + 30, 6, '#D9DCDF')); }
  else if (wallStyle) { // brackets: the part in the accent colour (the wall's half darker), the wall light
    const wallC = '#D9DCDF', dark = shade(accent, -.4), W0 = S.obj(0), rearX = postX;
    if (wallStyle === 'cleat') { // pairs of interlocking cleats on the rear posts and the wall, a spacer at the foot of each rear post
      W0.push(box(-W / 2 - 60, -30, -D - 12, W + 120, yT + top + 90, 4, wallC));
      for (const sx of [-1, 1]) W0.push(box(rearX(sx), yT - 28, -D - 6, post, 78, 6, dark), box(rearX(sx), yT - 36, -D, post, 44, 6, accent), box(rearX(sx), y0 + bot + 4, -D, post, 18, 12, accent));
    } else if (wallStyle === 'plate') { // a plate on the wall, a slotted slide mount on each rear post, bolts at the foot of the rear as spacers
      W0.push(box(-W / 2 - 60, -30, -D - 12, W + 120, yT + top + 90, 4, wallC), box(-80, yT - 110, -D - 8, 160, 180, 4, dark));
      for (const sx of [-1, 1]) { const x = rearX(sx); W0.push(ext(rectP(x, yT - 70, post, 80, 2), [slotP(x + post / 2, yT - 30, 6, 40)], -D, 8, accent), cyl(x + post / 2, y0 + bot + 14, -D, 5.5, 12, C.steel)); }
    } else if (wallStyle === 'dock') { // the rack on its side on the wall: the brackets that take the adapter feet, seen here under the feet
      W0.push(box(-W / 2 - 50, -6, 40, W + 100, 6, D + 90, wallC));
      for (const sx of [-1, 1]) { const bx = (sx < 0 ? -W / 2 + 20 : W / 2 - 20) - 17; W0.push(box(bx, 0, -4, 34, 5, D - 4, dark), box(bx, 5, -4, 4, 8, D - 4, dark), box(bx + 30, 5, -4, 4, 8, D - 4, dark)); }
    }
  }
  if (sp.inside) {
    const P = S.obj(2), k = sp.inside;
    if (k === 'comb' || k === 'guide') for (let i = 0; i < 6; i++) P.push(box(-W / 2 + 40 + i * 9, y0 + bot + 10, 10, 4, ih - 20, 14, accent, 1.5));
    else if (k === 'atx' || k === 'matx') P.push(box(-90, y0 + bot + 8, -40, 180, ih - 16, 2, C.pcb), box(-60, y0 + bot + 30, -38, 40, 40, 20, C.metal));
    else if (k === 'fans') { for (const sx of [-1, 1]) P.push(cyl(sx * 55, y0 + bot + ih / 2, 4, 38, 4, C.fan), cyl(sx * 55, y0 + bot + ih / 2, 4.2, 14, .4, '#2A2C30')); }
    else P.push(box(W / 2 - 70, y0 + bot + 12, 6, 50, 28, 6, accent, 3));
  }
  if (wallStyle === 'dock') turnQuarter(S); // the page hangs the rack on its side, its feet against the wall
  return { rack: true, objs: S.objs, w: W, h: yT + top };
}

/* ---------- drawing: SVG ---------- */
const f1 = v => Math.round(v * 10) / 10;
function pathD(pts, P) { return 'M' + pts.map(p => { const q = P(p); return f1(q[0]) + ' ' + f1(q[1]); }).join('L') + 'Z'; }
function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
// a point on the outline of a round (n = 2) or rounded-square (n ≈ 5) access point
const sup = (a, n) => { const c = Math.cos(a), s2 = Math.sin(a); return [Math.sign(c) * Math.pow(Math.abs(c), 2 / n), Math.sign(s2) * Math.pow(Math.abs(s2), 2 / n)]; };
function discRims(p) {
  const t = p.tilt * Math.PI / 180, ax = [0, Math.cos(t), Math.sin(t)], v = [0, -Math.sin(t), Math.cos(t)], n = p.sq ? 5 : 2, rim = (h, r) => {
    const o = []; for (let i = 0; i < 48; i++) { const [cx, cy] = sup(i / 48 * Math.PI * 2, n); o.push([p.x + r * cx, p.y + ax[1] * h + r * cy * v[1], p.z + ax[2] * h + r * cy * v[2]]); } return o;
  };
  const top = p.dome ? rim(p.d * .5, p.r) : rim(p.d, p.r2 == null ? p.r : p.r2), dome = p.dome ? rim(p.d, p.r * .78) : null;
  return { base: rim(0, p.r), top, dome, ring: p.ring ? rim(p.d + .2, p.r * .12) : null };
}
/* Turn the scene into SVG. mode 'front': straight-on orthographic; mode 'oblique': cabinet projection seen from the front, above and
   right, with lit top faces and shaded sides. */
function toSVG(sc, mode, o) {
  o = o || {};
  const obl = mode === 'oblique', kx = obl ? num(o.kx, .34) : 0, ky = obl ? num(o.ky, .24) : 0;
  const prj = (x, y, z) => [x - z * kx, -(y - z * ky)];
  const out = [], bb = [1e9, 1e9, -1e9, -1e9];
  const grow = (q) => { bb[0] = Math.min(bb[0], q[0]); bb[1] = Math.min(bb[1], q[1]); bb[2] = Math.max(bb[2], q[0]); bb[3] = Math.max(bb[3], q[1]); return q; };
  const tol = num(o.tol, obl ? .45 : .12);
  const ring = pts2 => { // projected points as path data, dropping points closer than tol to the last one
    let last = null, d = '';
    for (const q of pts2) { if (last && Math.abs(q[0] - last[0]) < tol && Math.abs(q[1] - last[1]) < tol) continue; grow(q); d += (d ? 'L' : 'M') + f1(q[0]) + ' ' + f1(q[1]); last = q; }
    return d + 'Z';
  };
  const poly = (pts3, fill, extra) => { out.push('<path d="' + ring(pts3.map(p => prj(p[0], p[1], p[2]))) + '" fill="' + fill + '"' + (extra || '') + '/>'); };
  const topS = c => shade(c, .16), sideS = c => shade(c, -.24);
  const tiny = obl ? num(o.tiny, .9) : num(o.tiny, .25);
  /* Seen straight on there are no sides to shade, so the front view lights from above, like the 3D view: raised edges catch a
     highlight on top and a shade below, round heads get a darker rim, parts in front of the plate cast a soft shadow on it, and
     the plate shades the top of each window. o.lit === false draws flat. */
  const lit = !obl && o.lit !== false;
  const edge = (a, b, y, z, c, w) => { const q0 = prj(a, y, z), q1 = prj(b, y, z); out.push('<path d="M' + f1(q0[0]) + ' ' + f1(q0[1]) + 'H' + f1(q1[0]) + '" stroke="' + c + '" stroke-width="' + f1(w) + '"/>'); };
  const drawPrim = p => {
    if ((p.t === 'box' && p.w < tiny && p.h < tiny) || (p.t === 'cyl' && p.r * 2 < tiny)) return;
    if (p.t === 'box') {
      const x0 = p.x, x1 = p.x + p.w, y0 = p.y, y1 = p.y + p.h, zf = p.z, zb = p.z - p.d;
      if (obl && p.d > .8) { poly([[x1, y0, zf], [x1, y0, zb], [x1, y1, zb], [x1, y1, zf]], sideS(p.c)); poly([[x0, y1, zf], [x1, y1, zf], [x1, y1, zb], [x0, y1, zb]], topS(p.c)); }
      poly(p.r ? rectP(x0, y0, p.w, p.h, p.r).map(q => [q[0], q[1], zf]) : [[x0, y0, zf], [x1, y0, zf], [x1, y1, zf], [x0, y1, zf]], p.c);
      if (lit && p.d > .8 && p.w > 3 && p.h > 3) { const r = Math.min(p.r, p.w / 2, p.h / 2), e = Math.min(.6, p.h * .06); edge(x0 + r, x1 - r, y1 - e / 2, zf, shade(p.c, .2), e); edge(x0 + r, x1 - r, y0 + e / 2, zf, shade(p.c, -.3), e); }
    } else if (p.t === 'cyl') {
      if (obl && p.d > .8) { const f = circP(p.x, p.y, p.r, 16), b = f.map(q => [q[0], q[1], p.z - p.d]); out.push('<path d="' + ring(hull(f.map(q => prj(q[0], q[1], p.z)).concat(b.map(q => prj(q[0], q[1], q[2]))))) + '" fill="' + sideS(p.c) + '"/>'); }
      if (lit && p.d > .8 && p.r > 1.5) { poly(circP(p.x, p.y, p.r).map(q => [q[0], q[1], p.z]), shade(p.c, -.3)); poly(circP(p.x, p.y + p.r * .06, p.r * .84).map(q => [q[0], q[1], p.z]), shade(p.c, -.1)); } // a round head: dark rim, lit face, a little darker than flat, as in 3D
      else poly(circP(p.x, p.y, p.r).map(q => [q[0], q[1], p.z]), p.c);
    } else if (p.t === 'ext') {
      const to3 = p.axis === 'z' ? (q, front) => [q[0], q[1], front ? p.at : p.at - p.d] : p.axis === 'y' ? (q, top) => [q[0], top ? p.at + p.d : p.at, -q[1]] : (q, right) => [right ? p.at + p.d : p.at, q[1], -q[0]];
      if (!obl && p.axis !== 'z') { // seen edge-on from the front: draw its front edge
        const xs = p.pts.map(q => p.axis === 'y' ? q[0] : null), front = Math.min(...p.pts.map(q => q[0 + (p.axis === 'y' ? 1 : 0)]));
        if (p.axis === 'y') { const a = Math.min(...xs), b = Math.max(...xs); poly([[a, p.at, -front], [b, p.at, -front], [b, p.at + p.d, -front], [a, p.at + p.d, -front]], p.c); }
        else { const ys = p.pts.filter(q => q[0] <= front + 1).map(q => q[1]); const a = Math.min(...p.pts.map(q => q[1])), b = Math.max(...(ys.length > 1 ? ys : p.pts.map(q => q[1]))); poly([[p.at, a, -front], [p.at + p.d, a, -front], [p.at + p.d, b, -front], [p.at, b, -front]], p.c); }
        return;
      }
      if (obl && p.d > .8) { // side walls of the outline that face the viewer
        const pts = p.pts, n = pts.length;
        let area = 0; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
        const view = p.axis === 'z' ? [kx, ky] : p.axis === 'y' ? [kx, -1] : [-1, ky]; // viewer direction in the outline's plane
        for (let i = 0; i < n; i++) {
          const a = pts[i], b = pts[(i + 1) % n], nx = (b[1] - a[1]) * Math.sign(area), ny = -(b[0] - a[0]) * Math.sign(area);
          if (nx * view[0] + ny * view[1] > 0) poly([to3(a, true), to3(b, true), to3(b, false), to3(a, false)], p.axis === 'y' ? sideS(p.c) : (Math.abs(nx) > Math.abs(ny) ? sideS(p.c) : topS(p.c)));
        }
      }
      const face = p.axis === 'y' ? topS(p.c) : p.axis === 'x' ? sideS(p.c) : p.c;
      out.push('<path fill-rule="evenodd" d="' + [p.pts].concat(p.holes).map(r => ring(r.map(q => { const v = to3(q, true); return prj(v[0], v[1], v[2]); }))).join('') + '" fill="' + face + '"/>');
    } else if (p.t === 'disc') {
      const r = discRims(p), pr = q => prj(q[0], q[1], q[2]), all = r.base.concat(r.top, r.dome || []).map(pr);
      const h = hull(all); out.push('<path d="M' + h.map(q => { grow(q); return f1(q[0]) + ' ' + f1(q[1]); }).join('L') + 'Z" fill="' + shade(p.c, -.16) + '"/>');
      out.push('<path d="M' + r.top.map(q => { const s = pr(q); return f1(s[0]) + ' ' + f1(s[1]); }).join('L') + 'Z" fill="' + shade(p.c, -.04) + '"/>');
      if (r.dome) { const hd = hull(r.top.concat(r.dome).map(pr).filter(q => true)); out.push('<path d="M' + hd.map(q => f1(q[0]) + ' ' + f1(q[1])).join('L') + 'Z" fill="' + p.c + '" opacity=".0"/>'); out.push('<path d="M' + r.dome.map(q => { const s = pr(q); return f1(s[0]) + ' ' + f1(s[1]); }).join('L') + 'Z" fill="' + shade(p.c, .06) + '"/>'); }
      if (r.ring) out.push('<path d="M' + r.ring.map(q => { const s = pr(q); return f1(s[0]) + ' ' + f1(s[1]); }).join('L') + 'Z" fill="none" stroke="' + p.ring + '" stroke-width="' + f1(Math.max(.8, p.r * .03)) + '"/>');
    } else if (p.t === 'text') {
      const q = grow(prj(p.x, p.y + p.s * .1, p.z));
      out.push('<text x="' + f1(q[0]) + '" y="' + f1(q[1]) + '" font-size="' + f1(p.s) + '" text-anchor="middle" font-family="Audiowide,\'Plus Jakarta Sans\',sans-serif" fill="' + p.c + '"' + (p.glow ? ' style="filter:drop-shadow(0 0 ' + f1(p.s * .3) + 'px ' + p.c + ')"' : '') + (p.rot ? ' transform="rotate(' + p.rot + ' ' + f1(q[0]) + ' ' + f1(q[1] - p.s * .35) + ')"' : '') + '>' + esc(p.str) + '</text>');
    } else if (p.t === 'lines') {
      out.push('<path d="' + p.segs.map(s => { const a = prj(s[0], s[1], p.z), b = prj(s[2], s[3], p.z); return 'M' + f1(a[0]) + ' ' + f1(a[1]) + 'L' + f1(b[0]) + ' ' + f1(b[1]); }).join('') + '" stroke="' + p.c + '" stroke-width="' + p.sw + '"/>');
    }
  };
  // painter's order: behind the plate, the plate, in front of it; within a layer far to near (for the oblique view: left, low and deep first)
  const key = ob => {
    const p = ob.prims[0]; if (!p) return 0;
    let x = 0, y = 0, z = 0;
    if (p.t === 'box') { x = p.x + p.w / 2; y = p.y + p.h / 2; z = p.z; }
    else if (p.t === 'cyl' || p.t === 'disc' || p.t === 'text') { x = p.x; y = p.y; z = p.z; }
    else if (p.t === 'ext') { const b = bbox(p.pts); if (p.axis === 'z') { x = (b[0] + b[2]) / 2; y = (b[1] + b[3]) / 2; z = p.at; } else if (p.axis === 'y') { x = (b[0] + b[2]) / 2; y = p.at; z = -(b[1] + b[3]) / 2; } else { x = p.at; y = (b[1] + b[3]) / 2; z = -(b[0] + b[2]) / 2; } }
    else if (p.t === 'lines') z = p.z;
    return obl ? x * kx + y * ky + z : z;
  };
  const objs = sc.objs.map((ob, i) => ({ ob, i, k: key(ob) })).sort((a, b) => a.ob.layer - b.ob.layer || (obl ? a.k - b.k : 0) || a.i - b.i);
  if (o.backdrop) { const q0 = prj(-sc.w / 2, sc.h, 0), q1 = prj(sc.w / 2, 0, 0); out.push('<rect x="' + f1(q0[0]) + '" y="' + f1(q0[1]) + '" width="' + f1(q1[0] - q0[0]) + '" height="' + f1(q1[1] - q0[1]) + '" fill="' + o.backdrop + '"/>'); }
  // a part standing out in front of the plate drops a soft shadow down and to the right
  const drawLit = p => { const n = out.length; drawPrim(p); if (lit && p.d > .8 && out.length > n && out[n].startsWith('<path')) out.splice(n, 0, out[n].replace(/ fill="[^"]*"/, ' fill="#000"').replace('<path ', '<path opacity=".3" transform="translate(.4 .9)" ')); };
  objs.forEach(({ ob }) => {
    // the plate's shadow along the top of each window: the window minus itself moved down (the plate covers what falls outside)
    if (lit && ob.layer === 1) ob.prims.forEach(p => { if (p.t === 'ext' && p.axis === 'z' && p.holes.length) out.push('<path fill-rule="evenodd" fill="#000" opacity=".42" d="' + p.holes.map(h => ring(h.map(q => prj(q[0], q[1], p.at))) + ring(h.map(q => prj(q[0], q[1] - 1.6, p.at)))).join('') + '"/>'); });
    // seen straight on, things standing out from the panel in its own colour need an edge to show
    if (!obl && ob.layer === 2 && sc.color) { const n = out.length; ob.prims.forEach(drawLit); for (let i = n; i < out.length; i++) if (out[i].indexOf('fill="' + sc.color + '"') > 0) out[i] = out[i].replace('fill="' + sc.color + '"', 'fill="' + shade(sc.color, lum(sc.color) > .5 ? -.05 : .07) + '" stroke="#000" stroke-opacity=".5" stroke-width=".4"'); }
    else ob.prims.forEach(ob.layer === 2 ? drawLit : drawPrim);
  });
  let vb;
  if (o.view) vb = o.view; // [x, y, w, h] in projected units
  else if (mode === 'front' && !sc.top) vb = [-sc.w / 2, -sc.h, sc.w, sc.h];
  else { const pad = o.pad == null ? 2 : o.pad; vb = [bb[0] - pad, bb[1] - pad, bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + 2 * pad]; }
  return { vb, body: out.join('') };
}
function bbox(pts) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const p of pts) { if (p[0] < a) a = p[0]; if (p[1] < b) b = p[1]; if (p[0] > c) c = p[0]; if (p[1] > d) d = p[1]; } return [a, b, c, d]; }
function svg(sc, mode, o) {
  o = o || {};
  const r = toSVG(sc, mode, o), vb = r.vb.map(f1).join(' ');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '"' + (o.cls ? ' class="' + o.cls + '"' : '') + (o.style ? ' style="' + o.style + '"' : '') + ' preserveAspectRatio="' + (o.par || 'xMidYMid meet') + '" aria-hidden="true">' + r.body + '</svg>';
}

/* ---------- drawing: three.js ---------- */
function mergeGeoms(T, list) {
  let n = 0; const parts = list.map(g => { const ng = g.index ? g.toNonIndexed() : g; if (!ng.attributes.normal) ng.computeVertexNormals(); n += ng.attributes.position.count; return ng; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  parts.forEach(g => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; g.dispose(); });
  const out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.setAttribute('normal', new T.BufferAttribute(nor, 3));
  return out;
}
function shapeOf(T, pts, holes) {
  const s = new T.Shape(pts.map(p => new T.Vector2(p[0], p[1])));
  (holes || []).forEach(h => s.holes.push(new T.Path(h.map(p => new T.Vector2(p[0], p[1])))));
  return s;
}
// a lathe whose outline can be a rounded square: prof is [[radius share, height], …] from the bottom centre to the top centre
function domeGeom(T, prof, r, n) {
  const seg = 64, pos = [];
  const pt = (k, i) => { const [cx, cz] = sup(i / seg * Math.PI * 2, n); return [cx * prof[k][0] * r, prof[k][1], -cz * prof[k][0] * r]; };
  for (let k = 0; k < prof.length - 1; k++) for (let i = 0; i < seg; i++) {
    const a = pt(k, i), b = pt(k, i + 1), c = pt(k + 1, i + 1), d = pt(k + 1, i);
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}
/* All primitives as geometries grouped by colour: { colour: BufferGeometry }. Text and lines are left out. */
function geoms(T, sc) {
  const by = {};
  const add = (c, g) => { (by[c] = by[c] || []).push(g); };
  sc.objs.forEach(ob => ob.prims.forEach(p => {
    let g = null;
    if (p.t === 'box') {
      if (p.r > .3 && p.d > .5) { g = new T.ExtrudeGeometry(shapeOf(T, rectP(p.x, p.y, p.w, p.h, p.r)), { depth: p.d, bevelEnabled: false, curveSegments: 3 }); g.translate(0, 0, p.z - p.d); }
      else { g = new T.BoxGeometry(p.w, p.h, Math.max(.05, p.d)); g.translate(p.x + p.w / 2, p.y + p.h / 2, p.z - p.d / 2); }
    } else if (p.t === 'cyl') {
      g = new T.CylinderGeometry(p.r, p.r, Math.max(.05, p.d), p.r > 6 ? 32 : 16); g.rotateX(Math.PI / 2); g.translate(p.x, p.y, p.z - p.d / 2);
    } else if (p.t === 'ext') {
      g = new T.ExtrudeGeometry(shapeOf(T, p.pts, p.holes), { depth: p.d, bevelEnabled: false, curveSegments: 4 });
      if (p.axis === 'z') g.translate(0, 0, p.at - p.d);
      else if (p.axis === 'y') { g.rotateX(-Math.PI / 2); g.translate(0, p.at, 0); }
      else { g.rotateY(Math.PI / 2); g.translate(p.at, 0, 0); }
    } else if (p.t === 'disc') {
      const t = p.tilt * Math.PI / 180;
      if (p.dome) {
        const prof = [[0, 0], [.97, 0], [1, p.d * .12], [1, p.d * .42]];
        for (let k = 1; k <= 8; k++) { const a = k / 8 * Math.PI / 2; prof.push([Math.cos(a) * .98 + .02, p.d * .42 + p.d * .58 * Math.sin(a)]); }
        prof.push([0, p.d]);
        g = domeGeom(T, prof, p.r, p.sq ? 5 : 2);
        if (p.ring) { const rg = new T.TorusGeometry(p.r * .12, .9, 6, 32); rg.rotateX(Math.PI / 2); rg.translate(0, p.d + .2, 0); rg.rotateX(t); rg.translate(p.x, p.y, p.z); add(p.ring, rg); }
      } else { g = new T.CylinderGeometry(p.r2 == null ? p.r : p.r2, p.r, p.d, 48); g.translate(0, p.d / 2, 0); }
      g.rotateX(t); g.translate(p.x, p.y, p.z);
    }
    if (g) add(p.c, g);
  }));
  const out = {};
  Object.keys(by).forEach(c => { out[c] = mergeGeoms(T, by[c]); });
  return out;
}

/* ---------- checking catalog entries (used by tools/validate.mjs) ---------- */
const PART_KEYS = new Set(['row', 'rows', 'plate', 'plateR', 'shelf', 'rails', 'floor', 'depth', 'shelfW', 'gap', 'align', 'trayColor', 'sledColor']);
const TOP_KEYS = new Set(['ap', 'tilt', 'plate', 'fan', 'n', 'grille']);
const EXTRA_KEYS = new Set(['side', 'fan', 'handles', 'feet', 'drawer', 'logo', 'corner', 'depth', 'u', 'frame', 'wall', 'inside', 'edge', 'hl', 'at', 'foot', 'chassis', 'rails', 'mount', 'sides', 'width', 'tandem', 'bar', 'joiner']);
const SIDE_PATTERNS = ['plain', 'hex', 'honeycomb', 'raisedhex', 'asanoha', 'kumiko', 'vent', 'slots', 'skadis', 'multiboard', 'grid', 'brick'];
const HL_PARTS = ['base', 'top', 'posts', 'handles', 'edges', 'sides', 'braces'];
const PATTERNS = new Set(['hex', 'slots', 'vslots', 'hslots', 'round', 'perf', 'grid', 'diamond', 'y', 'crown', 'solid', 'mesh', 'gridfinity']);
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
function check(kind, shape, devName) {
  const err = [];
  if (!isObj(shape)) return ['shape must be an object'];
  const keys = kind === 'top' ? TOP_KEYS : kind === 'extra' ? EXTRA_KEYS : PART_KEYS;
  if (shape.at != null && !['front-slot','rear-slot','top','bottom','side-panel','top-corners','bottom-corners','posts','inside','feet','wall','desk'].includes(shape.at)) err.push('shape.at: unknown attachment point');
  Object.keys(shape).forEach(k => { if (!keys.has(k)) err.push('shape: unknown key "' + k + '"'); });
  if (kind === 'top') {
    if (shape.ap != null && !AP[shape.ap]) err.push('shape.ap must be one of ' + Object.keys(AP).join(', '));
    if (shape.plate != null && !PATTERNS.has(shape.plate)) err.push('shape.plate: unknown pattern "' + shape.plate + '"');
    return err;
  }
  if (kind === 'extra') {
    const oneOf = (k, list) => { if (shape[k] != null && !list.includes(shape[k])) err.push('shape.' + k + ' must be one of ' + list.join(', ')); };
    oneOf('side', SIDE_PATTERNS); oneOf('feet', ['plain', 'big', 'casters']); oneOf('foot', ['round', 'cone']); oneOf('chassis', ['blocks']); oneOf('rails', ['counterbore']); oneOf('sides', ['open', 'acrylic']);
    if (shape.wall != null && shape.wall !== true && !['cleat', 'plate', 'dock'].includes(shape.wall)) err.push('shape.wall must be true or one of cleat, plate, dock');
    if (shape.hl != null && ![].concat(shape.hl).every(k => HL_PARTS.includes(k))) err.push('shape.hl must be one or a list of ' + HL_PARTS.join(', '));
    if (shape.mount != null && ![].concat(shape.mount).every(v => typeof v === 'number' && v >= 40 && v <= 250)) err.push('shape.mount is a fan size or a list of fan sizes in mm, 40 to 250');
    if (shape.width != null && !(typeof shape.width === 'number' && shape.width >= 280 && shape.width <= 600)) err.push('shape.width is the outside width of the frame in mm, 280 to 600');
    if (shape.tandem != null && !(shape.tandem === 2 || shape.tandem === 3)) err.push('shape.tandem is the number of racks side by side, 2 or 3');
    oneOf('bar', ['center']); oneOf('joiner', ['post', 'depth', 'outer']);
    if (shape.foot != null && shape.feet !== 'big') err.push('shape.foot goes with feet: "big"');
    if (shape.chassis != null && shape.feet !== 'casters') err.push('shape.chassis goes with feet: "casters"');
    return err;
  }
  if (shape.plate != null && !PATTERNS.has(shape.plate)) err.push('shape.plate: unknown pattern "' + shape.plate + '"');
  const rows = shape.rows || (shape.row ? [shape.row] : []);
  if (shape.row && shape.rows) err.push('shape: use row or rows, not both');
  if (!Array.isArray(rows) || rows.some(r => !Array.isArray(r))) return err.concat('shape.row must be a list of modules');
  const mod = (m, where) => {
    if (typeof m === 'string') { if (!MODS.includes(m)) err.push(where + ': unknown module "' + m + '"'); return; }
    if (!isObj(m)) return err.push(where + ': a module is a name or an object');
    const k = MODS.find(q => m[q] !== undefined);
    if (!k) return err.push(where + ': no module key (' + MODS.join(', ') + ')');
    if (k === 'dev' && typeof m.dev === 'string' && !PRESETS[m.dev] && !(devName && devName(m.dev))) err.push(where + ': unknown device "' + m.dev + '"');
    if (k === 'dev' && isObj(m.dev)) checkDevice(m.dev, where + '.dev').forEach(e => err.push(e));
    if (k === 'vent' && typeof m.vent === 'string' && !PATTERNS.has(m.vent)) err.push(where + ': unknown vent pattern "' + m.vent + '"');
    if (k === 'sbc' && m.board && !BOARDS[m.board]) err.push(where + ': unknown board "' + m.board + '" (' + Object.keys(BOARDS).join(', ') + ')');
    if (k === 'col') (m.col || []).forEach((c, i) => mod(c, where + '.col[' + i + ']'));
    if (m.io) (Array.isArray(m.io) ? m.io : [m.io]).forEach(t => { if (!parseTok(t)) err.push(where + ': unknown io token "' + t + '"'); });
  };
  rows.forEach((r, i) => r.forEach((m, j) => mod(m, 'shape.row' + (rows.length > 1 ? 's[' + i + ']' : '') + '[' + j + ']')));
  return err;
}
function checkDevice(d, where) {
  const err = [];
  if (d.size != null && !(Array.isArray(d.size) && d.size.length === 3 && d.size.every(v => typeof v === 'number' && v > 0 && v <= 500))) err.push(where + ': size must be [width, height, depth] in mm');
  if (d.color != null && !/^#[0-9a-fA-F]{6}$/.test(d.color)) err.push(where + ': color must be a hex colour like #E9EBEC');
  if (d.io != null) { if (!Array.isArray(d.io)) err.push(where + ': io must be a list'); else d.io.forEach(t => { if (!parseTok(t)) err.push(where + ': unknown io token "' + t + '"'); }); }
  return err;
}

/* ---------- glue for the app ----------
   The app hands over library entries (see app.js buildCatalog): { key, u, face, shape, device: { size, color, io }, top, extra },
   a generated part { gen, params } or an own device { custom, h2 }. Drawings and 3D geometry are cached per part and colours. */
let lookupFn = null;
const drawCache = new Map(), geomCache = new Map();
function remember(map, key, make, max) { if (map.has(key)) return map.get(key); const v = make(); if (map.size >= (max || 2000)) { const k = map.keys().next().value; map.delete(k); } map.set(key, v); return v; }
// generated parts (parts.js) drawn like the catalog's
function genShape(p) {
  switch (p.type) {
    case 'vent': return { row: [{ vent: p.pattern === 'hex' ? 'hex' : 'slots' }] };
    case 'keystone': return { row: [{ ks: (p.ports || 12) * (p.rows || 1), rows: p.rows || 1 }] };
    case 'shelf': return { row: [{ dev: { size: [p.dw || 120, p.dh || 30, p.dd || 120], color: '#3A3D42', io: ['led'] }, win: p.open === false ? 'frame' : 'full' }], shelf: true, depth: (p.dd || 120) + 6 };
    case 'label': return { row: p.text ? [{ text: p.text, size: Math.min(14, p.u * U * .38) }] : [] };
    case 'fan': { // spaced as parts.js fanPitch(); a fan is drawn at most 7 mm smaller than the plate, so the gap makes up the rest
      const size = p.size || 40, n = p.fans || 1, pitch = n > 1 ? Math.min(size + 8, (SPAN - size) / (n - 1)) : 0, drawn = Math.min(size, panelH(p.u) - 7);
      return { row: [Object.assign({ fan: size, n, gap: Math.max(0, pitch - drawn) }, p.grille === 'open' ? {} : { grille: 'hex' })] };
    }
    case 'dtype': { const r = [{ dtype: p.ports || 6 }]; return p.u >= 2 ? { rows: [r, r] } : { row: r }; }
    case 'pass': return { row: [{ [p.style === 'brush' ? 'brush' : 'slot']: true, w: p.width || 120, h: p.u >= 1 ? 26 : 12 }] }; // slot height as parts.js passH()
    default: return { row: [] };
  }
}
function lookOf(d) {
  if (d.gen) return { u: d.params.u, shape: genShape(d.params), key: 'gen:' + JSON.stringify(d.params) };
  if (d.custom) { const hh = Math.min(60, d.h2 * U / 2 - 10); return { u: d.h2 / 2, shape: { row: [{ dev: { size: [190, Math.max(8, hh), 160], color: '#3A3D42', io: ['led', 'space'] } }], shelf: true }, key: 'custom:' + d.h2 }; }
  return Object.assign({}, d, { u: d.u || (d.h2 ? d.h2 / 2 : 1) });
}
/* A patterned side panel for the 3D view: the plate spans x 0–t, (back, y) from its front lower corner; out = +1 for the right side
   (the fan guard and studs stand out to +x), −1 for the left. */
function sideScene(mods, depth, height, color, out) {
  const S = scene(), t = 3, sh = sideHoles(mods.side, mods.sideFan, depth, height, { mount: mods.sideMount }), P = S.obj(1), xo = out > 0 ? t : 0;
  // a dual-tone panel: a second-colour plate behind the cut-outs and a raised border (sh.back, sh.rim)
  if (sh.back) P.push(flat('x', rectP(sh.rim, sh.rim, depth - 2 * sh.rim, height - 2 * sh.rim, 1), [], out > 0 ? -1.2 : t, 1.2, shade(color, lum(color) > .5 ? -.28 : .38)));
  P.push(flat('x', rectP(0, 0, depth, height, 2), sh.holes, 0, t, color));
  if (sh.rim) P.push(flat('x', rectP(0, 0, depth, height, 2), [rectP(sh.rim, sh.rim, depth - 2 * sh.rim, height - 2 * sh.rim, 1)], out > 0 ? t : -1.6, 1.6, shade(color, lum(color) > .5 ? -.08 : .1)));
  if (sh.fan) {
    const { cx, cy, d } = sh.fan, r = d / 2 - 2, F = S.obj(0), fx = out > 0 ? -25 : t;
    F.push(flat('x', rectP(cx - d / 2, cy - d / 2, d, d, d * .06), [circP(cx, cy, d / 2 - 1.5)], fx, 25, C.fan));
    for (let i = 0; i < 7; i++) { const a0 = i / 7 * Math.PI * 2, q = []; for (let k = 0; k <= 5; k++) { const tt = k / 5, rr = r * .38 + (r * .62) * tt, a = a0 + tt * .55; q.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); } for (let k = 5; k >= 0; k--) { const tt = k / 5, rr = r * .38 + (r * .62) * tt, a = a0 + tt * .55 + .62; q.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); } F.push(flat('x', q, [], fx + 10, 1.5, C.blade)); }
    F.push(flat('x', circP(cx, cy, r * .38), [], fx + 9, 3, '#2A2C30'));
    const G = S.obj(2), gx = out > 0 ? t + .5 : -1.5;
    for (let k = 1; k <= 3; k++) G.push(flat('x', circP(cx, cy, r * k / 3.1 + .8), [circP(cx, cy, r * k / 3.1 - .4)], gx, 1, C.metal));
  }
  (sh.studs || []).forEach(([a, b]) => S.obj(2).push(flat('x', circP(a, b, 4.8, 14), [], out > 0 ? t : -1.8, 1.8, shade(color, .06))));
  return S;
}
const ckey = (d, o) => (d.key || '') + (d.variant || '') + '|' + (o.color || '') + '|' + (o.accent || '') + '|' + (o.frame || '') + '|' + (o.depth || '') + (o.upper ? '|^' : '');
function sceneFor(d, o) {
  o = Object.assign({ lookup: lookupFn }, o || {});
  if (d.top) return compileTop(d, o);
  return compilePart(lookOf(d), o);
}
// three.js meshes for a scene, one per colour; mat(colour) makes the material
function meshes(T, sc, mat, key) {
  const gs = key ? remember(geomCache, key, () => geoms(T, sc), 400) : geoms(T, sc), g = new T.Group();
  Object.keys(gs).forEach(c => { const m = new T.Mesh(gs[c], mat(c)); if (key) m.userData.cached = true; g.add(m); });
  return g;
}

/* ---------- public ---------- */
window.LRShapes = {
  U, PANEL_W, panelH, PRESETS, BOARDS, AP, shade,
  // how a part's panel sits in its slot: { h, lift, mid, slots, screws, notches } in mm; upper: a ½U part in the upper half of a U
  fit: (d, upper) => plateFit(lookOf(d), upper),
  part: compilePart, top: compileTop, rack: rackScene, frameMods, sideHoles, ventHoles,
  svg, geoms, meshes, defaultShape, genShape, check, checkDevice,
  // network ports in a device's io (RJ45 and SFP), for the power and network budget
  netPorts: io => (io || []).map(parseTok).filter(t => t && (t.k === 'rj45' || t.k === 'sfp')).reduce((n, t) => n + t.n, 0),
  // the app tells us how to find a device by name (for shapes like { "dev": "JetKVM" })
  devices(fn) { lookupFn = fn; drawCache.clear(); geomCache.clear(); },
  scene: sceneFor,
  // library thumbnail (oblique) and front view (rack) of a library entry, cached
  thumbFor(d, o) { o = o || {}; return remember(drawCache, 'th' + ckey(lookOf(d), o) + (d.top ? 't' : d.extra ? 'x' : ''), () => d.extra ? this.extraThumb(d, o) : this.thumb(sceneFor(d, o), o.svg)); },
  frontFor(d, o) { o = o || {}; return remember(drawCache, 'fr' + ckey(lookOf(d), o), () => this.front(sceneFor(d, o), { cls: o.cls || 'pf' })); },
  topFor(d, o) { o = o || {}; return remember(drawCache, 'tf' + ckey(d, o), () => this.topFront(sceneFor(d, o), { cls: o.cls || 'pf' })); },
  // 3D: a part's meshes with their geometry cached per part and colours (meshes are marked userData.cached)
  rackMeshes(T, d, o, mat) { return meshes(T, rackScene(d.shape || {}, o || {}), mat, 'x' + ckey(d, o || {})); },
  partMeshes(T, d, o, mat) { o = o || {}; const look = lookOf(d); return meshes(T, sceneFor(d, o), mat, 'p' + ckey(look, o) + '|' + (o.maxDepth || '')); },
  sideMeshes(T, mods, depth, height, color, out, mat) { return meshes(T, sideScene(mods, depth, height, color, out), mat, 's' + [mods.side, mods.sideFan, (mods.sideMount || []).join('+'), Math.round(depth), Math.round(height), color, out].join('|')); },
  topMeshes(T, d, o, mat) { o = o || {}; return meshes(T, compileTop(d, o), mat, 't' + ckey(d, o)); }, TOKENS: Object.keys(TOK).concat(Object.keys(ALIAS)), MODULES: MODS,
  // library thumbnails: an oblique drawing of the part, the top mount or the extra
  thumb(sc, o) { return svg(sc, 'oblique', Object.assign(sc.top ? { pad: 3, kx: .36, ky: .62 } : sc.rack ? { pad: 3, kx: .5, ky: .36 } : { pad: 3 }, o)); },
  front(sc, o) { return svg(sc, 'front', Object.assign({ par: 'none', backdrop: C.hole }, o)); },
  // a top mount seen from the front, cropped to what stands above the frame: { svg, w, h } in mm (w across the frame, 280)
  topFront(sc, o) {
    const r = toSVG(sc, 'front', o || {}), hgt = Math.max(1, -r.vb[1] - (o && o.pad != null ? o.pad : 2));
    return { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-140 ' + f1(-hgt) + ' 280 ' + f1(hgt) + '" preserveAspectRatio="none" aria-hidden="true"' + (o && o.cls ? ' class="' + o.cls + '"' : '') + '>' + r.body + '</svg>', w: 280, h: hgt };
  },
  // an extra on a small rack, turned and cropped to show what it changes
  extraThumb(d, o) {
    const sp = d && d.shape || {}, oo = Object.assign({ frame: '#4A4E55' }, o);
    const edges = [].concat(sp.hl || []).includes('edges'), wallSide = typeof sp.wall === 'string' && sp.wall !== 'dock'; // the beams and a wall's cleats show side-on
    const side = sp.side || sp.fan || edges || wallSide, focus = edges ? null : sp.handles || sp.logo || sp.corner || sp.edge ? 'top' : sp.feet || sp.drawer ? 'bottom' : null;
    const view = side ? { kx: .95, ky: .3 } : { kx: .5, ky: .36 }, r = toSVG(rackScene(sp, oo), 'oblique', Object.assign({ pad: 4 }, view, o));
    let vb = r.vb;
    if (focus === 'top') vb = [vb[0], vb[1], vb[2], vb[3] * .5];
    if (focus === 'bottom') vb = [vb[0], vb[1] + vb[3] * .5, vb[2], vb[3] * .5];
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb.map(f1).join(' ') + '"' + (o && o.style ? ' style="' + o.style + '"' : '') + ' preserveAspectRatio="xMidYMid meet" aria-hidden="true">' + r.body + '</svg>';
  }
};
})();
