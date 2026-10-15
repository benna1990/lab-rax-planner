/* Mini Rack Planner — parametric parts for 10" racks, STL export and a small ZIP writer. MIT licensed.
   Dimensions follow the 10" rack standard used by Lab Rax:
   1U = 44.45 mm, panel height = n·44.45 − 0.79 mm, hole spacing 236.525 mm (centre to centre),
   222 mm clear width between the posts, holes at 6.35 / 22.225 / 38.1 mm inside each U, M6 screws. */
(function () {
'use strict';

const U = 44.45;
const CLEAR = 0.79;                // panel height clearance (EIA-310)
const HOLE_X = 236.525 / 2;        // hole centre from the middle
const CLEAR_W = 222;               // clear width between posts
const PANEL_W = 250;               // printed panel width; fits on a 256 mm bed (see README)
const HOLE_D = 6.6;                // M6 clearance
const SLOT_L = 9;                  // horizontal slot length for tolerance
const KS_W = 14.9, KS_H = 16.4;    // keystone cut-out (module face is 14.5 × 16.0 mm)

const panelH = u => u * U - CLEAR;

/* ---------- three.js loading (only needed for geometry and the 3D views) ---------- */
let threeP = null;
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); });
}
function loadThree() {
  if (!threeP) {
    threeP = (window.THREE ? Promise.resolve() : loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'))
      .then(() => window.THREE.OrbitControls ? null : loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'))
      .then(() => window.THREE);
    threeP.catch(() => { threeP = null; });
  }
  return threeP;
}

/* ---------- 2D helpers ---------- */
function rectPath(T, x, y, w, h, r) {
  const p = new T.Path(); r = Math.min(r || 0, w / 2, h / 2);
  p.moveTo(x + r, y); p.lineTo(x + w - r, y); if (r) p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r); if (r) p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h); if (r) p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r); if (r) p.quadraticCurveTo(x, y, x + r, y);
  return p;
}
function slotPath(T, cx, cy, len, d, vertical) {
  // stadium shape; len is centre-to-centre travel
  const r = d / 2, p = new T.Path(), seg = 16;
  if (!vertical) {
    p.moveTo(cx - len / 2, cy - r); p.lineTo(cx + len / 2, cy - r);
    p.absarc(cx + len / 2, cy, r, -Math.PI / 2, Math.PI / 2, false);
    p.lineTo(cx - len / 2, cy + r);
    p.absarc(cx - len / 2, cy, r, Math.PI / 2, Math.PI * 1.5, false);
  } else {
    p.moveTo(cx + r, cy - len / 2); p.lineTo(cx + r, cy + len / 2);
    p.absarc(cx, cy + len / 2, r, 0, Math.PI, false);
    p.lineTo(cx - r, cy - len / 2);
    p.absarc(cx, cy - len / 2, r, Math.PI, Math.PI * 2, false);
  }
  return p;
}
function hexPath(T, cx, cy, r) {
  const p = new T.Path();
  for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k + Math.PI / 6; const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); k ? p.lineTo(x, y) : p.moveTo(x, y); }
  p.closePath(); return p;
}
/* Rack screw holes for a panel of u units; y = 0 is the panel's bottom edge.
   The planner puts the top edge of every panel of 1U and taller on a U boundary (app.js aligned()),
   so a 1½U or 2½U panel has its extra half U at the bottom. */
function mountHoles(T, u) {
  const out = [], off = CLEAR / 2;
  if (u === 0.5) {
    // fits a top or bottom half-U: slot spans the 6.35 and 15.875 mm positions
    for (const s of [-1, 1]) out.push(slotPath(T, s * HOLE_X, (6.35 + 15.875) / 2 - off, 15.875 - 6.35, HOLE_D, true));
    return out;
  }
  const whole = Math.floor(u), half = u - whole, base = half ? U / 2 : 0;
  if (half) for (const s of [-1, 1]) out.push(slotPath(T, s * HOLE_X, 38.1 - U / 2 - off, SLOT_L - HOLE_D, HOLE_D, false)); // the 38.1 mm hole of the U below
  for (let k = 0; k < whole; k++) for (const y of [6.35, 38.1]) for (const s of [-1, 1]) out.push(slotPath(T, s * HOLE_X, base + k * U + y - off, SLOT_L - HOLE_D, HOLE_D, false));
  return out;
}
function plateShape(T, u, extraHoles) {
  const h = panelH(u), w = PANEL_W, r = 2;
  const s = new T.Shape();
  s.moveTo(-w / 2 + r, 0); s.lineTo(w / 2 - r, 0); s.quadraticCurveTo(w / 2, 0, w / 2, r);
  s.lineTo(w / 2, h - r); s.quadraticCurveTo(w / 2, h, w / 2 - r, h);
  s.lineTo(-w / 2 + r, h); s.quadraticCurveTo(-w / 2, h, -w / 2, h - r);
  s.lineTo(-w / 2, r); s.quadraticCurveTo(-w / 2, 0, -w / 2 + r, 0);
  s.holes.push(...mountHoles(T, u), ...(extraHoles || []));
  return s;
}
function extrude(T, shape, depth, z) {
  const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, z); return g;
}
function box(T, w, h, d, x, y, z) { // x,y = min corner in panel coords; z = front (extends to z - d)
  const g = new T.BoxGeometry(w, h, d); g.translate(x + w / 2, y + h / 2, z - d / 2); return g;
}

/* ---------- part builders. All return { geoms, size:{w,h,d}, u, note } in mm ---------- */
const BUILDERS = {
  blank(T, p) {
    const t = 3, h = panelH(p.u), geoms = [extrude(T, plateShape(T, p.u), t, -t)];
    const rib = Math.min(8, h / 3);
    geoms.push(box(T, 200, 2.4, rib, -100, 0, -t), box(T, 200, 2.4, rib, -100, h - 2.4, -t));
    return { geoms, size: { w: PANEL_W, h, d: t + rib }, note: '3 mm plate with two stiffening ribs at the back.' };
  },
  vent(T, p) {
    const t = 3, h = panelH(p.u), holes = [], margin = p.u === 0.5 ? 4.5 : 6.5;
    if (p.pattern === 'hex') {
      const r = 4.2, dx = r * Math.sqrt(3) + 1.6, dy = r * 1.5 + 1.4;
      for (let row = 0, y = margin + r; y + r <= h - margin; row++, y += dy)
        for (let x = -98 + (row % 2) * dx / 2; x <= 98; x += dx) holes.push(hexPath(T, x, y, r));
    } else {
      const sw = 4, gap = 3.2, sh = h - margin * 2;
      for (let x = -98; x + sw <= 98; x += sw + gap) holes.push(rectPath(T, x, margin, sw, sh, sw / 2));
    }
    return { geoms: [extrude(T, plateShape(T, p.u, holes), t, -t)], size: { w: PANEL_W, h, d: t }, note: p.pattern === 'hex' ? 'Hexagon vents, 8.4 mm across.' : '4 mm vent slots with 3.2 mm bars.' };
  },
  keystone(T, p) {
    const t = 2, h = panelH(p.u), rows = p.u >= 1 ? Math.max(1, Math.min(p.rows || 1, Math.floor((h - 4 + 4) / (KS_H + 4)))) : 1;
    const n = Math.max(1, Math.min(p.ports || 12, 12));
    const pitch = Math.min(18.5, 200 / n), holes = [];
    const rowGap = 4, blockH = rows * KS_H + (rows - 1) * rowGap, y0 = (h - blockH) / 2;
    for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) holes.push(rectPath(T, -((n - 1) * pitch) / 2 + i * pitch - KS_W / 2, y0 + r * (KS_H + rowGap), KS_W, KS_H, 0.6));
    const geoms = [extrude(T, plateShape(T, p.u, holes), t, -t)];
    const ribW = Math.min(200, (n - 1) * pitch + KS_W + 8);
    if (y0 > 3.2) geoms.push(box(T, ribW, 2, 6, -ribW / 2, y0 - 2.6, -t), box(T, ribW, 2, 6, -ribW / 2, y0 + blockH + 0.6, -t));
    return { geoms, size: { w: PANEL_W, h, d: t + 6 }, ports: n * rows,
      note: n * rows + ' keystone ports, cut-out ' + KS_W + ' × ' + KS_H + ' mm in a 2 mm plate. Print one test port first: keystone clips vary.' };
  },
  shelf(T, p) {
    const t = 3, dw = Math.min(p.dw || 120, CLEAR_W - 10), dh = Math.max(5, p.dh || 30), dd = Math.max(20, Math.min(p.dd || 120, 240));
    const floor = 3, wall = 2.4;
    const need = dh + floor + 5;
    const u = Math.max(p.u, Math.ceil(need / U * 2) / 2);
    const h = panelH(u), bottom = (h - (dh + 1)) / 2 > floor + 2 ? Math.max(floor + 2, Math.min(6, (h - dh) / 2)) : floor + 1;
    const cw = dw + 1, ch = Math.min(dh + 1, h - bottom - 3);
    const opening = rectPath(T, -cw / 2, bottom, cw, ch, 1.5);
    const geoms = [extrude(T, plateShape(T, u, p.open === false ? [] : [opening]), t, -t)];
    const fw = Math.min(dw + 2 * wall + 2, CLEAR_W - 2), fy = bottom - floor;
    geoms.push(box(T, fw, floor, dd + 2, -fw / 2, fy, -t));                         // floor
    const sideH = Math.min(15, ch);
    geoms.push(box(T, wall, sideH, dd + 2, -fw / 2, bottom, -t), box(T, wall, sideH, dd + 2, fw / 2 - wall, bottom, -t)); // side walls
    geoms.push(box(T, fw, Math.min(8, ch), wall, -fw / 2, bottom, -t - dd - 2 + wall)); // rear stop
    for (const s of [-1, 1]) geoms.push(box(T, 2.4, Math.min(h - bottom, 30), 20, s > 0 ? fw / 2 - wall : -fw / 2, fy, -t)); // gussets
    return { geoms, u, size: { w: PANEL_W, h, d: t + dd + 2 },
      note: 'Shelf for a ' + dw + ' × ' + dh + ' × ' + dd + ' mm device' + (u !== p.u ? ', so it needs ' + fmtU(u) : '') + '. Floor ' + floor + ' mm, side walls ' + sideH.toFixed(0) + ' mm.' };
  },
  label(T, p) {
    const t = 3, h = panelH(p.u), geoms = [extrude(T, plateShape(T, p.u), t, 0 - t)];
    const txt = (p.text || 'LAB RAX').slice(0, 24);
    geoms.push(...textGeoms(T, txt, Math.min(h * 0.62, 14), 0.8, h));
    // the text stands proud of the front, so this part prints face-up
    return { geoms, faceUp: true, size: { w: PANEL_W, h, d: t + 0.8 }, note: 'Raised text, 0.8 mm. Prints face-up; swap filament at the text layer for a two-colour label.' };
  }
};

/* Raised text from a canvas bitmap: each run of filled pixels becomes a box. Works offline with any loaded font. */
function textGeoms(T, text, capH, raise, plateH) {
  const res = 0.3, scale = 1 / res, fontPx = Math.round(capH * scale * 1.35);
  const c = document.createElement('canvas'), ctx = c.getContext('2d');
  ctx.font = '700 ' + fontPx + 'px "Audiowide", "Plus Jakarta Sans", sans-serif';
  const tw = Math.min(Math.ceil(ctx.measureText(text).width) + 8, Math.floor(196 * scale));
  c.width = tw; c.height = Math.ceil(fontPx * 1.3);
  ctx.font = '700 ' + fontPx + 'px "Audiowide", "Plus Jakarta Sans", sans-serif';
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillStyle = '#000';
  ctx.fillText(text, c.width / 2, c.height / 2, c.width - 8);
  const data = ctx.getImageData(0, 0, c.width, c.height).data, geoms = [];
  const wmm = c.width * res, hmm = c.height * res, ox = -wmm / 2, oy = (plateH - hmm) / 2;
  for (let y = 0; y < c.height; y++) {
    let x = 0;
    while (x < c.width) {
      if (data[(y * c.width + x) * 4 + 3] > 120) {
        let x2 = x; while (x2 < c.width && data[(y * c.width + x2) * 4 + 3] > 120) x2++;
        geoms.push(box(T, (x2 - x) * res, res, raise, ox + x * res, oy + (c.height - 1 - y) * res, raise));
        x = x2;
      } else x++;
    }
  }
  return geoms;
}

function fmtU(u) { const w = Math.floor(u), h = u - w; return (w || !h ? w : '') + (h ? '½' : '') + 'U'; }

async function build(params) {
  const T = await loadThree();
  const b = BUILDERS[params.type]; if (!b) throw new Error('Unknown part type ' + params.type);
  const r = b(T, Object.assign({ u: 1 }, params));
  r.u = r.u || params.u;
  return r;
}

/* ---------- STL (binary) ---------- */
function toSTL(geoms, name, faceUp) {
  // face-down parts are rotated 180° about X so the front face lies on the print bed; face-up parts keep their
  // orientation so the back lies on the bed. Either way the lowest point ends up at z = 0.
  let tris = 0; const parts = geoms.map(g => { const n = g.index ? g.toNonIndexed() : g; tris += n.attributes.position.count / 3; return n; });
  const ys = faceUp ? 1 : -1;
  let z0 = Infinity; for (const g of parts) { const a = g.attributes.position.array; for (let i = 2; i < a.length; i += 3) z0 = Math.min(z0, ys * a[i]); }
  const buf = new ArrayBuffer(84 + tris * 50), dv = new DataView(buf);
  const head = ('Mini Rack Planner part: ' + (name || '')).slice(0, 79);
  for (let i = 0; i < head.length; i++) dv.setUint8(i, head.charCodeAt(i) & 127);
  dv.setUint32(80, tris, true);
  let o = 84;
  for (const g of parts) {
    const a = g.attributes.position.array;
    for (let i = 0; i < a.length; i += 9) {
      const v = [];
      for (let k = 0; k < 3; k++) v.push([a[i + k * 3], ys * a[i + k * 3 + 1], ys * a[i + k * 3 + 2] - z0]);
      const ux = v[1][0] - v[0][0], uy = v[1][1] - v[0][1], uz = v[1][2] - v[0][2];
      const wx = v[2][0] - v[0][0], wy = v[2][1] - v[0][1], wz = v[2][2] - v[0][2];
      let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; const l = Math.hypot(nx, ny, nz) || 1;
      dv.setFloat32(o, nx / l, true); dv.setFloat32(o + 4, ny / l, true); dv.setFloat32(o + 8, nz / l, true); o += 12;
      for (const p of v) { dv.setFloat32(o, p[0], true); dv.setFloat32(o + 4, p[1], true); dv.setFloat32(o + 8, p[2], true); o += 12; }
      dv.setUint16(o, 0, true); o += 2;
    }
  }
  return new Uint8Array(buf);
}

/* ---------- ZIP (stored, no compression) ---------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zip(files) {
  const enc = new TextEncoder(), chunks = [], central = []; let offset = 0;
  const d = new Date(), dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of files) {
    const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : new Uint8Array(f.data), crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    chunks.push(new Uint8Array(lh.buffer), name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
    ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cdSize = central.reduce((n, c) => n + c.length, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

window.LRParts = { U, CLEAR, HOLE_X, CLEAR_W, PANEL_W, KS_W, KS_H, panelH, fmtU, loadThree, loadScript, build, toSTL, zip, crc32 };
})();
