// Measures the reference models (STL or 3MF in the git-ignored reference/ folder) and compares them with catalog.json and shapes.js.
// Run: node tools/measure.mjs [id or file …] [--id=sbc7] [--front=-z] [--up=+y] [--res=0.2] [--holes] [--svg] [--json]
// Name each file by its catalog id (reference/sbc7.3mf, reference/u7pro45-adapter.stl); the report then compares it with that entry.
// Only numbers come out of this. Never commit the models or anything traced from them; --svg writes its overlay into reference/.
// Panel coordinates follow shapes.js: x across the front from the centre (left to right as seen from the front), y up from the
// bottom edge of the panel, z = 0 at the front face with the part going back to −z. All sizes in mm.
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const U = 44.45, CLEAR = 0.79, HOLE_X = 236.525 / 2, OPEN = 111; // OPEN: half the 222 mm clear width between the posts
const REF = fileURLToPath(new URL('../reference/', import.meta.url));
const opt = {}, wanted = [];
for (const a of process.argv.slice(2)) { const m = /^--([\w-]+)(?:=(.*))?$/.exec(a); if (m) opt[m[1]] = m[2] ?? true; else wanted.push(a); }
const RES = +opt.res || 0.2, out = opt.json ? () => {} : s => console.log(s);
const f = (v, d = 1) => { const s = (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, ''); return s === '-0' ? '0' : s; };
const span = (a, b) => `${f(a)}…${f(b)}`;

/* ---------- catalog and shapes.js (a browser script, so give it a window) ---------- */
const cat = JSON.parse(readFileSync(new URL('../catalog.json', import.meta.url), 'utf8'));
const win = {};
new Function('window', readFileSync(new URL('../shapes.js', import.meta.url), 'utf8'))(win);
const LS = win.LRShapes, entries = new Map(), devices = new Map();
cat.panels.forEach(g => g.items.forEach(p => entries.set(p.id, { kind: 'panel', e: p })));
cat.devices.forEach(g => g.items.forEach(d => { devices.set(d.device, d); d.mounts.forEach(m => entries.set(m.id, { kind: m.position === 'top' ? 'top' : 'mount', e: m, dev: d })); }));
cat.extras.forEach(g => g.items.forEach(x => entries.set(x.id, { kind: 'extra', e: x })));
const lookup = n => devices.get(n) || null;
const modelNo = e => (/models?\/(\d+)/.exec(e.url || '') || [])[1];

/* ---------- reading files: zip (3MF), 3MF XML, STL ---------- */
function readZip(buf) {
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error('not a zip file');
  let n = buf.readUInt16LE(e + 10), p = buf.readUInt32LE(e + 16);
  if ((p === 0xffffffff || n === 0xffff) && e >= 20 && buf.readUInt32LE(e - 20) === 0x07064b50) { // zip64
    const z = Number(buf.readBigUInt64LE(e - 12)); n = Number(buf.readBigUInt64LE(z + 32)); p = Number(buf.readBigUInt64LE(z + 48));
  }
  const files = new Map();
  for (let i = 0; i < n && buf.readUInt32LE(p) === 0x02014b50; i++) {
    const method = buf.readUInt16LE(p + 10), nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32);
    let size = buf.readUInt32LE(p + 20), usize = buf.readUInt32LE(p + 24), off = buf.readUInt32LE(p + 42);
    for (let x = p + 46 + nl; x < p + 46 + nl + xl; x += 4 + buf.readUInt16LE(x + 2)) if (buf.readUInt16LE(x) === 1) {
      let q = x + 4;
      if (usize === 0xffffffff) { usize = Number(buf.readBigUInt64LE(q)); q += 8; }
      if (size === 0xffffffff) { size = Number(buf.readBigUInt64LE(q)); q += 8; }
      if (off === 0xffffffff) off = Number(buf.readBigUInt64LE(q));
    }
    files.set(buf.toString('utf8', p + 46, p + 46 + nl), { method, size, off });
    p += 46 + nl + xl + cl;
  }
  return {
    names: [...files.keys()],
    read(name) {
      const z = files.get(name); if (!z) return null;
      const s = z.off + 30 + buf.readUInt16LE(z.off + 26) + buf.readUInt16LE(z.off + 28), d = buf.subarray(s, s + z.size);
      if (z.method === 0) return d;
      if (z.method === 8) return inflateRawSync(d);
      throw new Error(`${name}: zip compression method ${z.method} is not supported`);
    }
  };
}
const attrs = s => Object.fromEntries([...s.matchAll(/([\w:]+)\s*=\s*"([^"]*)"/g)].map(m => [m[1], m[2]]));
const ID = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
const mat = s => s ? s.trim().split(/\s+/).map(Number) : ID;
function mul(A, B) { // 3MF row-vector transforms: apply A, then B
  const C = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) C.push(A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j] + (i === 3 ? B[9 + j] : 0));
  return C;
}
function parseModel(xml) {
  const unit = { micron: .001, millimeter: 1, centimeter: 10, inch: 25.4, foot: 304.8, meter: 1000 }[(/<model\b[^>]*\bunit="(\w+)"/.exec(xml) || [])[1]] || 1;
  const objects = new Map();
  for (const m of xml.matchAll(/<object\b([^>]*)>([\s\S]*?)<\/object>/g)) {
    const a = attrs(m[1]), body = m[2], o = { name: a.name, type: a.type || 'model', comps: [...body.matchAll(/<component\b([^>]*)\/>/g)].map(q => attrs(q[1])) };
    if (body.includes('<vertex')) {
      const v = [], t = [];
      for (const q of body.matchAll(/<vertex\b([^>]*)\/>/g)) { const r = /\bx="([^"]*)"\s+y="([^"]*)"\s+z="([^"]*)"/.exec(q[1]) || [0, ...['x', 'y', 'z'].map(k => attrs(q[1])[k])]; v.push(+r[1], +r[2], +r[3]); }
      for (const q of body.matchAll(/<triangle\b([^>]*)\/>/g)) { const r = /\bv1="(\d+)"\s+v2="(\d+)"\s+v3="(\d+)"/.exec(q[1]) || [0, ...['v1', 'v2', 'v3'].map(k => attrs(q[1])[k])]; t.push(+r[1], +r[2], +r[3]); }
      o.v = v; o.t = t;
    }
    objects.set(a.id, o);
  }
  const build = [...((/<build\b[^>]*>([\s\S]*?)<\/build>/.exec(xml) || [])[1] || '').matchAll(/<item\b([^>]*)\/>/g)].map(q => attrs(q[1]));
  return { unit, objects, build };
}
function load3mf(buf) {
  const zip = readZip(buf), models = new Map();
  const model = path => { if (!models.has(path)) { const d = zip.read(path); models.set(path, d ? parseModel(d.toString('utf8')) : null); } return models.get(path); };
  const rels = zip.read('_rels/.rels');
  const rootPath = ((rels && /Target="\/?([^"]+\.model)"/i.exec(rels.toString('utf8'))) || [])[1] || zip.names.find(n => /\.model$/i.test(n));
  const root = rootPath && model(rootPath);
  if (!root) throw new Error('no 3D model inside this 3MF');
  // Bambu/Orca keep object names and part kinds (normal, negative, modifier) in model_settings.config
  const cfg = new Map(), cb = zip.read('Metadata/model_settings.config');
  if (cb) for (const m of cb.toString('utf8').matchAll(/<object id="(\d+)"[^>]*>([\s\S]*?)<\/object>/g))
    cfg.set(m[1], { name: (/<metadata key="name" value="([^"]*)"/.exec(m[2]) || [])[1], parts: new Map([...m[2].matchAll(/<part id="(\d+)" subtype="(\w+)"/g)].map(q => [q[1], q[2]])) });
  return root.build.map(it => {
    const T = [], NG = [], c = cfg.get(it.objectid), skipped = new Set();
    const walk = (path, id, M, sub, top) => {
      const md = model(path), o = md && md.objects.get(id);
      if (!o || (o.type !== 'model' && o.type !== 'solidsupport')) return;
      if (o.v) for (let k = 0; k < o.t.length; k++) {
        const i = o.t[k] * 3, x = o.v[i], y = o.v[i + 1], z = o.v[i + 2];
        T.push((x * M[0] + y * M[3] + z * M[6] + M[9]) * root.unit, (x * M[1] + y * M[4] + z * M[7] + M[10]) * root.unit, (x * M[2] + y * M[5] + z * M[8] + M[11]) * root.unit);
        if (k % 3 === 2) NG.push(sub === 'negative_part' ? 1 : 0);
      }
      for (const k of o.comps) {
        const st = (top && c && c.parts.get(k.objectid)) || sub;
        if (st && st !== 'normal_part' && st !== 'negative_part') { skipped.add(st); continue; }
        walk(k['p:path'] ? k['p:path'].replace(/^\//, '') : path, k.objectid, mul(mat(k.transform), M), st, false);
      }
    };
    walk(rootPath, it.objectid, mat(it.transform), null, true);
    return { name: (c && c.name) || root.objects.get(it.objectid)?.name || `object ${it.objectid}`, T: Float64Array.from(T), NG: Uint8Array.from(NG), skipped: [...skipped] };
  });
}
function loadStl(buf, name) {
  const n = buf.length >= 84 ? buf.readUInt32LE(80) : -1, head = buf.toString('latin1', 0, Math.min(buf.length, 1000));
  let T;
  if (n >= 0 && (buf.length === 84 + n * 50 || !/^\s*solid[\s\S]*facet/.test(head))) {
    const m = Math.min(n, Math.floor((buf.length - 84) / 50)); T = new Float64Array(m * 9);
    for (let i = 0; i < m; i++) for (let k = 0; k < 9; k++) T[i * 9 + k] = buf.readFloatLE(84 + i * 50 + 12 + k * 4);
  } else {
    const v = [], re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g, s = buf.toString('latin1'); let m;
    while ((m = re.exec(s))) v.push(+m[1], +m[2], +m[3]);
    T = Float64Array.from(v.slice(0, v.length - v.length % 9));
  }
  return [{ name, T, NG: new Uint8Array(T.length / 9), skipped: [] }];
}

/* ---------- geometry helpers ---------- */
const AX = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], NAME = ['x', 'y', 'z'];
const axis = (a, s) => AX[a].map(v => v * s), axName = v => (v[0] + v[1] + v[2] > 0 ? '+' : '−') + NAME[v.findIndex(c => c)];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function bboxOf(T) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < T.length; i += 3) for (let a = 0; a < 3; a++) { const v = T[i + a]; if (v < min[a]) min[a] = v; if (v > max[a]) max[a] = v; }
  return { min, max, size: [0, 1, 2].map(a => max[a] - min[a]) };
}
const triN = (T, t) => { const ax = T[t + 3] - T[t], ay = T[t + 4] - T[t + 1], az = T[t + 5] - T[t + 2], bx = T[t + 6] - T[t], by = T[t + 7] - T[t + 1], bz = T[t + 8] - T[t + 2]; return [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx]; };
// coordinates in a frame: x = p·X − o0, y = p·Y − o1, z = p·Z − o2 (X, Y, Z right-handed, so triangles keep their winding)
function toFrame(T, X, Y, Z, o) {
  const P = new Float64Array(T.length);
  for (let i = 0; i < T.length; i += 3) { const p = [T[i], T[i + 1], T[i + 2]]; P[i] = dot(p, X) - o[0]; P[i + 1] = dot(p, Y) - o[1]; P[i + 2] = dot(p, Z) - o[2]; }
  return P;
}
function solidOnly(P, NG) { // without negative parts (they only cut)
  if (!NG.some(v => v)) return P;
  const out = [];
  for (let t = 0, i = 0; t < P.length; t += 9, i++) if (!NG[i]) for (let k = 0; k < 9; k++) out.push(P[t + k]);
  return Float64Array.from(out);
}
function near(P, NG, zlo, zhi) { // only the triangles that reach into zlo…zhi
  const keep = [];
  for (let t = 0, i = 0; t < P.length; t += 9, i++) if (Math.max(P[t + 2], P[t + 5], P[t + 8]) >= zlo && Math.min(P[t + 2], P[t + 5], P[t + 8]) <= zhi) keep.push(i);
  const T = new Float64Array(keep.length * 9), N = new Uint8Array(keep.length);
  keep.forEach((i, k) => { T.set(P.subarray(i * 9, i * 9 + 9), k * 9); N[k] = NG[i]; });
  return [T, N];
}
// separate bodies: shells that share vertices, then shells whose boxes overlap (a panel and the text on it stay together)
function bodies(T, NG) {
  const nt = T.length / 9;
  if (nt > 3e6) return [{ T, NG }];
  const ids = new Map(), par = [], find = i => { while (par[i] !== i) i = par[i] = par[par[i]]; return i; };
  const vid = (x, y, z) => { const k = Math.round(x * 1e3) + ',' + Math.round(y * 1e3) + ',' + Math.round(z * 1e3); let i = ids.get(k); if (i === undefined) { i = par.length; par.push(i); ids.set(k, i); } return i; };
  const tv = new Int32Array(nt);
  for (let t = 0; t < nt; t++) { const a = vid(T[t * 9], T[t * 9 + 1], T[t * 9 + 2]), b = vid(T[t * 9 + 3], T[t * 9 + 4], T[t * 9 + 5]), c = vid(T[t * 9 + 6], T[t * 9 + 7], T[t * 9 + 8]); par[find(b)] = find(a); par[find(c)] = find(a); tv[t] = a; }
  const sh = new Map();
  for (let t = 0; t < nt; t++) {
    const r = find(tv[t]); let s = sh.get(r);
    if (!s) sh.set(r, s = { tris: [], min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
    s.tris.push(t);
    for (let k = 0; k < 9; k++) { const a = k % 3, v = T[t * 9 + k]; if (v < s.min[a]) s.min[a] = v; if (v > s.max[a]) s.max[a] = v; }
  }
  const list = [...sh.values()];
  if (list.length > 4000) return [{ T, NG }];
  const p2 = list.map((_, i) => i), f2 = i => { while (p2[i] !== i) i = p2[i] = p2[p2[i]]; return i; };
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const A = list[i], B = list[j];
    if ([0, 1, 2].every(a => A.min[a] <= B.max[a] + .5 && B.min[a] <= A.max[a] + .5)) p2[f2(j)] = f2(i);
  }
  const groups = new Map();
  list.forEach((s, i) => { const r = f2(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(...s.tris); });
  return [...groups.values()].map(tris => {
    const B = new Float64Array(tris.length * 9), N = new Uint8Array(tris.length);
    tris.forEach((t, k) => { B.set(T.subarray(t * 9, t * 9 + 9), k * 9); N[k] = NG[t]; });
    return { T: B, NG: N };
  }).sort((a, b) => { const va = bboxOf(a.T).size.reduce((x, y) => x * y, 1), vb = bboxOf(b.T).size.reduce((x, y) => x * y, 1); return vb - va; });
}
// parts often lie turned on the bed (a 250 mm panel fits a 180 mm bed diagonally): turn the mesh so that its biggest flat face
// and the smallest rectangle around it line up with the axes; null when it already does
function align(T) {
  const g = new Map();
  for (let t = 0; t < T.length; t += 9) {
    const n = triN(T, t), l = Math.hypot(...n); if (!l) continue;
    const k = n.map(v => Math.round(v / l * 60)).join(',');
    let e = g.get(k); if (!e) g.set(k, e = { a: 0, n: [0, 0, 0] });
    e.a += l / 2; for (let i = 0; i < 3; i++) e.n[i] += n[i];
  }
  if (!g.size) return null;
  const unit = v => { const l = Math.hypot(...v); return v.map(c => c / l); };
  const Z = unit([...g.values()].reduce((a, b) => b.a > a.a ? b : a).n);
  const u0 = unit(Math.abs(Z[0]) < .9 ? cross(Z, [1, 0, 0]) : cross(Z, [0, 1, 0])), v0 = cross(Z, u0), seen = new Map();
  for (let i = 0; i < T.length; i += 3) { const p = [T[i], T[i + 1], T[i + 2]], a = dot(p, u0), b = dot(p, v0); seen.set(Math.round(a * 20) + ',' + Math.round(b * 20), [a, b]); }
  const pts = [...seen.values()].sort((p, q) => p[0] - q[0] || p[1] - q[1]), hull = [];
  const turn = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  for (const pass of [pts, [...pts].reverse()]) { const start = hull.length; for (const p of pass) { while (hull.length >= start + 2 && turn(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) hull.pop(); hull.push(p); } hull.pop(); }
  let best = null;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length], th = Math.atan2(b[1] - a[1], b[0] - a[0]), c = Math.cos(th), sn = Math.sin(th);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of hull) { const u = x * c + y * sn, v = -x * sn + y * c; x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v); }
    const area = (x1 - x0) * (y1 - y0);
    if (!best || area < best.area - 1e-6) best = { area, c, sn, long: x1 - x0 >= y1 - y0 };
  }
  if (!best) return null;
  let X = [0, 1, 2].map(k => u0[k] * best.c + v0[k] * best.sn);
  if (!best.long) X = cross(Z, X);
  const Y = cross(Z, X), square = v => Math.max(...v.map(Math.abs)) > Math.cos(.5 * Math.PI / 180);
  if (square(X) && square(Y) && square(Z)) return null;
  // keep the result close to the file's own axes, so 'up is +z' still means what it says for a part on its back
  const off = Math.max(...[X, Y, Z].map(v => Math.acos(Math.min(1, Math.max(...v.map(Math.abs)))) * 180 / Math.PI));
  return { X, Y, Z, note: `the part lies turned ${f(off)}° in the file; measured along its own edges, so the axes named here are the part's, not the file's` };
}
// the biggest flat face facing each way (±x, ±y, ±z), within 6 mm of that side of the box
function planes(T, bb) {
  const res = [];
  for (let a = 0; a < 3; a++) for (const s of [-1, 1]) {
    const lim = s > 0 ? bb.max[a] : bb.min[a], acc = new Map();
    for (let t = 0; t < T.length; t += 9) {
      const p = T[t + a];
      if (Math.abs(p - T[t + 3 + a]) > .02 || Math.abs(p - T[t + 6 + a]) > .02 || Math.abs(p - lim) > 6) continue;
      const n = triN(T, t); if (n[a] * s <= 0) continue;
      const k = Math.round(p * 20); acc.set(k, (acc.get(k) || 0) + Math.hypot(...n) / 2);
    }
    let best = { a, s, at: lim, area: 0 };
    for (const [k, ar] of acc) if (ar > best.area) best = { a, s, at: k / 20, area: ar };
    res.push(best);
  }
  return res;
}

/* ---------- slicing and rasters ---------- */
function cutBox(T, z, win) { // exact extent of the cut through the mesh at z (only the edges inside win = [x0, x1, y0, y1])
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  z += 1.37e-4;
  for (let t = 0; t < T.length; t += 9) {
    const p = [];
    for (const [u, v] of [[t, t + 3], [t + 3, t + 6], [t + 6, t]]) {
      const du = T[u + 2] - z, dv = T[v + 2] - z;
      if ((du >= 0) !== (dv >= 0)) { const k = du / (du - dv); p.push([T[u] + k * (T[v] - T[u]), T[u + 1] + k * (T[v + 1] - T[u + 1])]); }
    }
    if (p.length < 2 || (win && !p.every(([x, y]) => x >= win[0] && x <= win[1] && y >= win[2] && y <= win[3]))) continue;
    for (const [x, y] of p) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { x0, x1, y0, y1 };
}
function flatAt(T, lo, hi, s) { // the z of the biggest flat face between lo and hi facing +z (s = 1) or −z (s = −1)
  const acc = new Map();
  for (let t = 0; t < T.length; t += 9) {
    const z = T[t + 2];
    if (z < lo || z > hi || Math.abs(z - T[t + 5]) > .01 || Math.abs(z - T[t + 8]) > .01) continue;
    const n = triN(T, t); if (n[2] * s <= 0) continue;
    const k = Math.round(z * 100); acc.set(k, (acc.get(k) || 0) + Math.hypot(...n) / 2);
  }
  let best = null, ba = 0;
  for (const [k, a] of acc) if (a > ba) { ba = a; best = k / 100; }
  return best;
}
const grid = (x0, y0, x1, y1, r) => ({ x0, y0, r, nx: Math.max(1, Math.ceil((x1 - x0) / r)), ny: Math.max(1, Math.ceil((y1 - y0) / r)) });
const px = (g, i) => g.x0 + (i + .5) * g.r, py = (g, j) => g.y0 + (j + .5) * g.r;
function addSeg(rows, g, xa, ya, xb, yb, w) {
  if (ya === yb) return;
  const lo = Math.min(ya, yb), hi = Math.max(ya, yb);
  const j0 = Math.max(0, Math.ceil((lo - g.y0) / g.r - .5)), j1 = Math.min(g.ny - 1, Math.ceil((hi - g.y0) / g.r - .5) - 1);
  for (let j = j0; j <= j1; j++) rows[j].push(xa + (py(g, j) - ya) * (xb - xa) / (yb - ya), w);
}
function fillRows(rows, g, a, inside) {
  for (let j = 0; j < g.ny; j++) {
    const r = rows[j]; if (!r.length) continue;
    const idx = []; for (let k = 0; k < r.length; k += 2) idx.push(k);
    idx.sort((p, q) => r[p] - r[q]);
    let s = 0, k = 0;
    for (let i = 0; i < g.nx; i++) { const xc = px(g, i); while (k < idx.length && r[idx[k]] <= xc) s += r[idx[k++] + 1]; if (s && inside(s)) a[j * g.nx + i] = 1; }
  }
}
// material where the plane z = const cuts the mesh; overlapping bodies count once, negative parts cut away
function slice(T, NG, z, g) {
  const rows = Array.from({ length: g.ny }, () => []), a = new Uint8Array(g.nx * g.ny);
  z += 1.37e-4; // keep off exact vertex heights
  for (let t = 0, i = 0; t < T.length; t += 9, i++) {
    const d0 = T[t + 2] - z, d1 = T[t + 5] - z, d2 = T[t + 8] - z;
    if ((d0 >= 0) === (d1 >= 0) && (d1 >= 0) === (d2 >= 0)) continue;
    const p = [];
    const cut = (u, v, du, dv) => { if ((du >= 0) !== (dv >= 0)) { const k = du / (du - dv); p.push(T[u] + k * (T[v] - T[u]), T[u + 1] + k * (T[v + 1] - T[u + 1])); } };
    cut(t, t + 3, d0, d1); cut(t + 3, t + 6, d1, d2); cut(t + 6, t, d2, d0);
    const nx = (T[t + 4] - T[t + 1]) * (T[t + 8] - T[t + 2]) - (T[t + 5] - T[t + 2]) * (T[t + 7] - T[t + 1]);
    addSeg(rows, g, p[0], p[1], p[2], p[3], (nx < 0 ? 1 : -1) * (NG[i] ? 65536 : 1));
  }
  fillRows(rows, g, a, s => { const q = Math.round(s / 65536); return s - q * 65536 > 0 && q <= 0; });
  return a;
}
function polys(list, g) { // even-odd fill of outlines (the holes shapes.js draws)
  const rows = Array.from({ length: g.ny }, () => []), a = new Uint8Array(g.nx * g.ny);
  for (const p of list) for (let k = 0; k < p.length; k++) { const A = p[k], B = p[(k + 1) % p.length]; addSeg(rows, g, A[0], A[1], B[0], B[1], 1); }
  fillRows(rows, g, a, s => s % 2 === 1);
  return a;
}
function regions(open, g) { // 4-connected regions of set pixels
  const lab = new Int32Array(open.length).fill(-1), q = new Int32Array(open.length), list = [];
  for (let s = 0; s < open.length; s++) if (open[s] && lab[s] < 0) {
    const c = { n: 0, i0: 1e9, i1: -1, j0: 1e9, j1: -1, si: 0, sj: 0, edge: false, id: list.length };
    let h = 0, t = 0; q[t++] = s; lab[s] = c.id;
    while (h < t) {
      const p = q[h++], i = p % g.nx, j = (p - i) / g.nx;
      c.n++; c.si += i; c.sj += j;
      if (i < c.i0) c.i0 = i; if (i > c.i1) c.i1 = i; if (j < c.j0) c.j0 = j; if (j > c.j1) c.j1 = j;
      if (i === 0 || j === 0 || i === g.nx - 1 || j === g.ny - 1) c.edge = true;
      if (i > 0 && open[p - 1] && lab[p - 1] < 0) { lab[p - 1] = c.id; q[t++] = p - 1; }
      if (i < g.nx - 1 && open[p + 1] && lab[p + 1] < 0) { lab[p + 1] = c.id; q[t++] = p + 1; }
      if (j > 0 && open[p - g.nx] && lab[p - g.nx] < 0) { lab[p - g.nx] = c.id; q[t++] = p - g.nx; }
      if (j < g.ny - 1 && open[p + g.nx] && lab[p + g.nx] < 0) { lab[p + g.nx] = c.id; q[t++] = p + g.nx; }
    }
    list.push(c);
  }
  return { list, lab };
}
// a region in mm, with a guess at its outline from how much of its box it fills
function hole(c, g) {
  const r = g.r, w = (c.i1 - c.i0 + 1) * r, h = (c.j1 - c.j0 + 1) * r, area = c.n * r * r, fill = area / (w * h), asp = Math.max(w, h) / Math.min(w, h);
  const kind = fill > .93 ? 'rect' : asp < 1.07 && fill > .74 && fill < .83 ? 'round' : asp > 1.08 && asp < 1.22 && fill > .7 && fill < .8 ? 'hex' : asp >= 1.4 && fill > .8 ? 'slot' : 'other';
  return { x: g.x0 + (c.si / c.n + .5) * r, y: g.y0 + (c.sj / c.n + .5) * r, x0: g.x0 + c.i0 * r, x1: g.x0 + (c.i1 + 1) * r, y0: g.y0 + c.j0 * r, y1: g.y0 + (c.j1 + 1) * r, w, h, area, fill, kind };
}
const hdesc = o => `${o.kind} ${f(o.w)} × ${f(o.h)}`;
// openings close together form an area (a vent field, a fan grille); in each, the sizes that repeat
function areas(list) {
  const p = list.map((_, i) => i), fd = i => { while (p[i] !== i) i = p[i] = p[p[i]]; return i; };
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const A = list[i], B = list[j];
    if (A.x0 <= B.x1 + 2.6 && B.x0 <= A.x1 + 2.6 && A.y0 <= B.y1 + 2.6 && B.y0 <= A.y1 + 2.6) p[fd(j)] = fd(i);
  }
  const m = new Map();
  list.forEach((o, i) => { const r = fd(i); if (!m.has(r)) m.set(r, []); m.get(r).push(o); });
  return [...m.values()].map(hs => {
    const a = { x0: Math.min(...hs.map(o => o.x0)), x1: Math.max(...hs.map(o => o.x1)), y0: Math.min(...hs.map(o => o.y0)), y1: Math.max(...hs.map(o => o.y1)), n: hs.length, area: hs.reduce((s, o) => s + o.area, 0) };
    const by = new Map();
    hs.forEach(o => { const k = o.kind + ' ' + Math.round(o.w * 2) + ' ' + Math.round(o.h * 2); if (!by.has(k)) by.set(k, []); by.get(k).push(o); });
    a.sizes = [...by.values()].sort((x, y) => y.length - x.length).map(g => {
      const ys = [...new Set(g.map(o => Math.round(o.y)))], d = [];
      ys.forEach(y => { const xs = g.filter(o => Math.round(o.y) === y).map(o => o.x).sort((a, b) => a - b); xs.slice(1).forEach((x, i) => d.push(x - xs[i])); });
      d.sort((a, b) => a - b); const pitch = d.length ? d[Math.floor(d.length / 2)] : 0;
      const w = g.reduce((s, o) => s + o.w, 0) / g.length, h = g.reduce((s, o) => s + o.h, 0) / g.length;
      return { n: g.length, kind: g[0].kind, w, h, pitch, rows: ys.length, xs: g.map(o => o.x) };
    });
    return a;
  }).sort((a, b) => a.x0 - b.x0 || a.y0 - b.y0);
}
function areaText(a, i) {
  const s = a.sizes.slice(0, 3).map(z => `${z.n > 1 ? z.n + '× ' : ''}${z.kind} ${f(z.w)} × ${f(z.h)}${z.n > 1 && z.pitch ? ', pitch ' + f(z.pitch) : ''}${z.rows > 1 ? ', ' + z.rows + ' rows' : ''}`);
  const rest = a.sizes.slice(3).reduce((n, z) => n + z.n, 0);
  return `${String.fromCharCode(65 + i % 26)}  x ${span(a.x0, a.x1)}, y ${span(a.y0, a.y1)} (${f(a.x1 - a.x0)} × ${f(a.y1 - a.y0)}, ${a.n === 1 ? 'one opening' : a.n + ' openings, ' + Math.round(a.area / ((a.x1 - a.x0) * (a.y1 - a.y0)) * 100) + ' % open'}): ${s.join('; ')}${rest ? `; ${rest} others` : ''}`;
}

/* ---------- U, holes ---------- */
const fitU = h => { const n = Math.min(10, Math.max(.5, Math.round((h + 1.6) / U * 2) / 2)); return { n, d: h - (n * U - CLEAR), short: n * U - h }; };
// rack holes are 6.35, 22.225 and 38.1 mm into each U; a panel sits in the middle of its U's, so its bottom edge is half its
// shortfall above the U boundary (0.4 mm for EIA panels, 1.2 for the Lab Rax ones)
const lift = H => (fitU(H).n * U - H) / 2;
function eiaIn(lo, hi, H) { // the rack holes between lo and hi, whole-U and half-U positions
  const out = [];
  for (const o of [0, U / 2]) for (let k = -1; k <= 11; k++) for (const h of [6.35, 22.225, 38.1]) { const e = k * U + h - o - lift(H); if (e >= lo && e <= hi && e > -1 && e < H + 1 && !out.some(q => Math.abs(q.e - e) < .01)) out.push({ e, half: o > 0 }); }
  return out.sort((a, b) => a.e - b.e);
}
function eia(y, H) { // the nearest rack hole (6.35, 22.225 and 38.1 mm into each U), with the panel on a whole or a half U
  let best = null;
  for (const o of [0, U / 2]) for (let k = -1; k <= 11; k++) for (const h of [6.35, 22.225, 38.1]) {
    const e = k * U + h - o - lift(H);
    if (e > -1 && e < H + 1 && (!best || Math.abs(y - e) < Math.abs(y - best.e))) best = { e, half: o > 0 };
  }
  return best;
}

/* ---------- a panel or a mount (front plate with what is behind it) ---------- */
function findFront(T, NG, bb, pl) {
  const fx = opt.front && /^([+-−])?([xyz])$/.exec(opt.front), ux = opt.up && /^([+-−])?([xyz])$/.exec(opt.up);
  let best = null;
  for (const p of pl) {
    if (fx && (p.a !== 'xyz'.indexOf(fx[2]) || p.s !== (fx[1] && fx[1] !== '+' ? -1 : 1))) continue;
    for (const b of [0, 1, 2].filter(a => a !== p.a)) {
      if (ux && b !== 'xyz'.indexOf(ux[2])) continue;
      const Z = axis(p.a, p.s), Y = axis(b, ux && ux[1] && ux[1] !== '+' ? -1 : 1), X = cross(Y, Z);
      const P = toFrame(T, X, Y, Z, [0, 0, p.s * p.at]), [S, SN] = near(P, NG, -1.2, 0), b2 = bboxOf(S.length ? S : P);
      const g = grid(b2.min[0] - 1, b2.min[1] - 1, b2.max[0] + 1, b2.max[1] + 1, .5), m = slice(S, SN, -.4, g);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) if (m[j * g.nx + i]) { const x = px(g, i), y = py(g, j); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      if (x0 > x1) continue;
      const w = x1 - x0 + .5, h = y1 - y0 + .5, cx = (x0 + x1) / 2, inv = m.map(v => 1 - v), hs = regions(inv, g).list.filter(c => !c.edge).map(c => hole(c, g)).filter(o => o.area > 6 && o.area < 500);
      const L = hs.filter(o => Math.abs(o.x - cx + HOLE_X) < 5), R = hs.filter(o => Math.abs(o.x - cx - HOLE_X) < 5);
      const pairs = L.filter(o => R.some(q => Math.abs(q.y - o.y) < 1.5)).length, wOK = w > 225 && w < 286, hOK = Math.abs(fitU(h).short - 1.6) < 1.5;
      const score = p.area * (wOK ? 2 : 1) * (hOK ? 3 : 1) * (pairs ? 6 : 1);
      if (!best || score > best.score) best = { p, X, Y, Z, w, h, pairs, wOK, hOK, score };
    }
  }
  return best && (best.pairs || (best.wOK && best.hOK) || fx) ? best : null;
}
function analysePart(body, fr, pl, notes) {
  let { X, Y, Z } = fr;
  // up: what sits behind the plate (a shelf floor, a tray) is normally at the bottom
  let P = toFrame(body.T, X, Y, Z, [0, 0, fr.p.s * fr.p.at]), bb = bboxOf(solidOnly(P, body.NG));
  let sy = 0, sa = 0;
  for (let t = 0; t < P.length; t += 9) if (!body.NG[t / 9] && P[t + 2] < -6 && P[t + 5] < -6 && P[t + 8] < -6) { const a = Math.hypot(...triN(P, t)); sa += a; sy += a * (P[t + 1] + P[t + 4] + P[t + 7]) / 3; }
  const mid = (bb.min[1] + bb.max[1]) / 2;
  if (!opt.up && sa && sy / sa > mid + 2) { Y = Y.map(v => -v); X = cross(Y, Z); P = toFrame(body.T, X, Y, Z, [0, 0, fr.p.s * fr.p.at]); bb = bboxOf(solidOnly(P, body.NG)); }
  if (!opt.up && (!sa || Math.abs(sy / sa - mid) <= 2)) notes.push('up and down can\'t be told from the model (nothing behind the plate); use --up=±axis if the openings look upside down');
  const back = pl.find(q => q.a === fr.p.a && q.s === -fr.p.s);
  if (!opt.front && back && back.area > fr.p.area * .9 && bb.min[2] > -8) notes.push('both faces of the plate look alike; if the openings look mirrored, use --front=' + axName(fr.Z.map(v => -v)));
  // how thick the plate is: walk back from the front face until less than half of it is left
  const depth = -bb.min[2], walk = Math.min(depth, 30), [S, SN] = near(P, body.NG, -walk - .5, 0);
  const gc = grid(bb.min[0] - 1, bb.min[1] - 1, bb.max[0] + 1, bb.max[1] + 1, .5), cov = [], bcx = (bb.min[0] + bb.max[0]) / 2;
  for (let z = .15; z < walk; z += .25) {
    const m = slice(S, SN, -z, gc); let all = 0, ear = 0;
    for (let i = 0; i < m.length; i++) if (m[i]) { all++; if (Math.abs(px(gc, i % gc.nx) - bcx) > OPEN + 1) ear++; }
    cov.push([z, all, ear]);
  }
  const cmax = Math.max(...cov.map(c => c[1])), k0 = cov.findIndex(c => c[1] >= cmax * .5), emax = Math.max(...cov.map(c => c[2]));
  let k1 = k0; while (k1 + 1 < cov.length && cov[k1 + 1][1] >= cmax * .5) k1++;
  let e1 = cov.findIndex(c => c[2] >= emax * .5); if (e1 >= 0) while (e1 + 1 < cov.length && cov[e1 + 1][2] >= emax * .5) e1++;
  // the walk finds the plate to ¼ mm; its flat front and back faces give the exact thickness
  let zf = cov[k0][0] - .15, zb = Math.min(depth, cov[k1][0] + .125);
  const ff = flatAt(S, -zf - .4, -zf + .4, 1), fb = flatAt(S, -zb - .4, -zb + .4, -1);
  if (ff != null) zf = -ff; if (fb != null) zb = -fb;
  const thick = zb - zf, F = Math.min(thick, 5); // F: the front few mm, what you see from the front
  let earThick = e1 >= 0 && emax > 20 ? cov[e1][0] + .125 - zf : null;
  if (earThick != null) { const fe = flatAt(S, -(zf + earThick) - .4, -(zf + earThick) + .4, -1); if (fe != null) earThick = -fe - zf; }
  if (zf > .4) notes.push(`the plate's front face is ${f(zf)} mm behind what sticks out furthest in front`);
  // plate outline from cuts through the front few mm; the panel's centre and bottom become x = 0 and y = 0
  const ob = [.1, .3, .5, .7, .9].map(k => cutBox(S, -(zf + k * F))).reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1) }));
  const W = ob.x1 - ob.x0, H = ob.y1 - ob.y0, cx = (ob.x0 + ob.x1) / 2, by = ob.y0;
  for (let i = 0; i < P.length; i += 3) { P[i] -= cx; P[i + 1] -= by; }
  for (let i = 0; i < S.length; i += 3) { S[i] -= cx; S[i + 1] -= by; }
  bb = bboxOf(solidOnly(P, body.NG));
  // openings straight through the front few mm, from slices across them
  const g = grid(-W / 2 - 1, -1, W / 2 + 1, H + 1, RES), solid = new Uint8Array(g.nx * g.ny);
  const zs = [.12, .3, .5, .7, .88].map(k => zf + k * F);
  zs.forEach(z => slice(S, SN, -z, g).forEach((v, i) => { if (v) solid[i] = 1; }));
  const front = slice(S, SN, -(zf + Math.min(.25, thick / 4)), g), openM = solid.map(v => 1 - v), R = regions(openM, g);
  const inside = (o, m) => o.x0 > -W / 2 + m && o.x1 < W / 2 - m && o.y0 > m && o.y1 < H - m;
  const holes = R.list.filter(c => !c.edge && c.n * RES * RES > .8).map(c => Object.assign(hole(c, g), { id: c.id }));
  // notches: open to an edge of the plate, but reaching more than 1.5 mm in and not just a rounded corner
  const edgeIds = new Set(R.list.filter(c => c.edge).map(c => c.id)), nm = new Uint8Array(openM.length);
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) { const s = j * g.nx + i, x = px(g, i), y = py(g, j); if (edgeIds.has(R.lab[s]) && Math.abs(x) < W / 2 - 1.5 && y > 1.5 && y < H - 1.5) nm[s] = 1; }
  const notches = regions(nm, g).list.map(c => hole(c, g)).filter(o => o.area > 4 && !((Math.abs(o.x) > W / 2 - 6) && (o.y < 6 || o.y > H - 6) && o.w < 6 && o.h < 6)).map(o => {
    const side = [['left', o.x0 + W / 2], ['right', W / 2 - o.x1], ['bottom', o.y0], ['top', H - o.y1]].sort((a, b) => a[1] - b[1])[0][0];
    return Object.assign(o, { side, kind: 'notch' });
  });
  const ears = [...holes, ...notches].filter(o => Math.abs(o.x) > OPEN - 3 && o.area < 600), mid2 = [...holes, ...notches].filter(o => !ears.includes(o));
  ears.filter(o => o.kind !== 'notch').forEach(o => { // screw holes to the hundredth, from the cut itself
    const c = cutBox(S, -(zf + F / 2), [o.x0 - RES, o.x1 + RES, o.y0 - RES, o.y1 + RES]);
    if (c.x1 > c.x0) Object.assign(o, { x0: c.x0, x1: c.x1, y0: c.y0, y1: c.y1, x: (c.x0 + c.x1) / 2, y: (c.y0 + c.y1) / 2, w: c.x1 - c.x0, h: c.y1 - c.y0 });
  });
  // recessed areas (labels, sunk text): open at the front face, closed further in
  const rec = new Uint8Array(openM.length);
  for (let i = 0; i < rec.length; i++) rec[i] = !front[i] && solid[i] && py(g, Math.floor(i / g.nx)) > 0 && py(g, Math.floor(i / g.nx)) < H ? 1 : 0;
  const recs = regions(rec, g).list.filter(c => !c.edge && c.n * RES * RES > 2).map(c => hole(c, g));
  // what is behind the plate
  let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
  for (let t = 0; t < P.length; t += 9) if (!body.NG[t / 9] && Math.min(P[t + 2], P[t + 5], P[t + 8]) < -(zb + .5)) for (let k = 0; k < 9; k += 3) { bx0 = Math.min(bx0, P[t + k]); bx1 = Math.max(bx1, P[t + k]); by0 = Math.min(by0, P[t + k + 1]); by1 = Math.max(by1, P[t + k + 1]); }
  const seats = depth - zb > 8 ? [.25, .5, .75].map(k => seat(P, body.NG, -(zb + k * (depth - zb)), k)) : [];
  return { X, Y, Z, P, W, H, u: fitU(H), thick, F, earThick, zf, depth, behind: depth - zb, bbox: bb, g, openM, lab: R.lab, holes, notches, ears, mid: mid2, recs, behindBox: bx0 < bx1 ? [bx0, bx1, by0, by1] : null, seats };
}
// a slice across the shelf: the floor, the clear width between the walls just above it, and how high the walls go
function seat(P, NG, z, k) {
  const [S, SN] = near(P, NG, z - .1, z + .1), bb = bboxOf(solidOnly(P, NG)), g = grid(bb.min[0] - 1, bb.min[1] - 1, bb.max[0] + 1, bb.max[1] + 1, .25), m = slice(S, SN, z, g);
  const row = j => { let n = 0; for (let i = 0; i < g.nx; i++) n += m[j * g.nx + i]; return n; };
  let xa = Infinity, xb = -Infinity;
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) if (m[j * g.nx + i]) { xa = Math.min(xa, px(g, i)); xb = Math.max(xb, px(g, i)); }
  if (xa > xb) return { k, z, empty: true };
  const full = (xb - xa) / g.r;
  let j = 0; while (j < g.ny && row(j) < full * .3) j++;
  const floorAt = j < g.ny && py(g, j) < bb.min[1] + (bb.max[1] - bb.min[1]) * .4 ? j : -1;
  let jt = floorAt; if (floorAt >= 0) while (jt + 1 < g.ny && row(jt + 1) >= full * .3) jt++;
  const floor = floorAt >= 0 ? py(g, jt) + g.r / 2 : null, yp = floor != null ? floor + 3 : (bb.min[1] + bb.max[1]) / 2, jp = Math.min(g.ny - 1, Math.max(0, Math.floor((yp - g.y0) / g.r)));
  // the widest empty run in that row with material on both sides
  let run = null;
  for (let i = 0, s = -1; i < g.nx; i++) {
    const v = m[jp * g.nx + i];
    if (!v && s < 0) s = i;
    if (v && s >= 0) { if (s > 0 && (!run || i - s > run[1] - run[0])) run = [s, i]; s = -1; }
  }
  if (!run) return { k, z, floor, xa, xb };
  const wallTop = i => { let j2 = jp; while (j2 + 1 < g.ny && m[(j2 + 1) * g.nx + i]) j2++; return py(g, j2) + g.r / 2; };
  let lid = null; const ic = Math.floor((run[0] + run[1]) / 2);
  for (let j2 = jp + 1; j2 < g.ny; j2++) if (m[j2 * g.nx + ic]) { lid = py(g, j2) - g.r / 2; break; }
  return { k, z, floor, xa, xb, x0: g.x0 + run[0] * g.r, x1: g.x0 + run[1] * g.r, clear: (run[1] - run[0]) * g.r, walls: Math.min(wallTop(run[0] - 1), wallTop(run[1])), lid };
}

/* ---------- a top mount (replaces the top panel) ---------- */
function analyseTop(body, pl) {
  const p = pl.reduce((a, b) => b.area > a.area ? b : a), Z = axis(p.a, p.s), bb0 = bboxOf(solidOnly(body.T, body.NG));
  const [a1, a2] = [0, 1, 2].filter(a => a !== p.a), X = axis(bb0.size[a1] >= bb0.size[a2] ? a1 : a2, 1), Y = cross(Z, X);
  let P = toFrame(body.T, X, Y, Z, [0, 0, p.s * p.at]), bb = bboxOf(solidOnly(P, body.NG));
  const height = -bb.min[2], gc = grid(bb.min[0] - 1, bb.min[1] - 1, bb.max[0] + 1, bb.max[1] + 1, .5), [S, SN] = near(P, body.NG, -Math.min(height, 20) - .5, 0), cov = [];
  for (let z = .15; z < Math.min(height, 20); z += .25) cov.push([z, slice(S, SN, -z, gc).reduce((s, v) => s + v, 0)]);
  const cmax = Math.max(...cov.map(c => c[1])); let k1 = 0; while (k1 + 1 < cov.length && cov[k1 + 1][1] >= cmax * .5) k1++;
  const t0 = cov[k1][0] + .125, tb = flatAt(S, -t0 - .4, -t0 + .4, -1), thick = tb != null ? -tb : t0;
  const ob = cutBox(S, -thick / 2), W = ob.x1 - ob.x0, D = ob.y1 - ob.y0, cx = (ob.x0 + ob.x1) / 2, cy = (ob.y0 + ob.y1) / 2;
  for (let i = 0; i < P.length; i += 3) { P[i] -= cx; P[i + 1] -= cy; }
  const g = grid(-W / 2 - 1, -D / 2 - 1, W / 2 + 1, D / 2 + 1, Math.max(RES, .3)), solid = new Uint8Array(g.nx * g.ny);
  [.25, .5, .75].forEach(k => slice(P, body.NG, -k * thick, g).forEach((v, i) => { if (v) solid[i] = 1; }));
  const holes = regions(solid.map(v => 1 - v), g).list.filter(c => !c.edge && c.n * g.r * g.r > 1).map(c => hole(c, g));
  // the tilt: flat faces above the plate that are neither level nor upright, grouped by the way they face, biggest first
  const tris = [];
  for (let t = 0; t < P.length; t += 9) {
    if (body.NG[t / 9] || Math.max(P[t + 2], P[t + 5], P[t + 8]) > -(thick + .5)) continue;
    const n = triN(P, t), l = Math.hypot(...n); if (!l) continue;
    const nn = n.map(v => v / l), ang = Math.acos(Math.max(-1, Math.min(1, -nn[2]))) * 180 / Math.PI;
    if (ang > 2.5 && ang < 177.5 && Math.abs(ang - 90) > 2.5) tris.push([t, nn, l / 2]);
  }
  const dirKey = n => Math.round(Math.acos(Math.max(-1, Math.min(1, -n[2]))) * 180 / Math.PI) + ',' + Math.round(Math.atan2(n[1], n[0]) * 36 / Math.PI);
  const mean = sel => { const n = [0, 1, 2].map(k => sel.reduce((s, q) => s + q[1][k] * q[2], 0)), l = Math.hypot(...n); return n.map(v => v / l); };
  const faces = [];
  let left = tris;
  while (faces.length < 3 && left.length) {
    const bins = new Map();
    left.forEach(q => { const k = dirKey(q[1]); bins.set(k, (bins.get(k) || 0) + q[2]); });
    const [bk, ba] = [...bins].reduce((a, b) => b[1] > a[1] ? b : a);
    if (ba < 50) break;
    let nn = mean(left.filter(q => dirKey(q[1]) === bk));
    const sel = left.filter(q => dot(q[1], nn) > Math.cos(2 * Math.PI / 180)), area = sel.reduce((s, q) => s + q[2], 0);
    nn = mean(sel); left = left.filter(q => !sel.includes(q));
    const tilt = Math.acos(Math.max(-1, Math.min(1, -nn[2]))) * 180 / Math.PI;
    const e1 = cross([0, 0, -1], nn), l1 = Math.hypot(...e1), u1 = e1.map(v => v / l1), u2 = cross(nn, u1);
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity, sx = 0, sy = 0, sz = 0, sw = 0;
    for (const [t, , w] of sel) for (let k = 0; k < 9; k += 3) {
      const v = [P[t + k], P[t + k + 1], P[t + k + 2]], s1 = dot(v, u1), s2 = dot(v, u2);
      a0 = Math.min(a0, s1); a1 = Math.max(a1, s1); b0 = Math.min(b0, s2); b1 = Math.max(b1, s2); sx += v[0] * w; sy += v[1] * w; sz += v[2] * w; sw += w;
    }
    // the middle of the face's outline in its own plane, back in plate coordinates
    const dn = sel.reduce((s, [t, , w]) => s + w * (dot([P[t], P[t + 1], P[t + 2]], nn)), 0) / area, mc = [0, 1, 2].map(k => u1[k] * (a0 + a1) / 2 + u2[k] * (b0 + b1) / 2 + nn[k] * dn);
    faces.push({ tilt, up: tilt < 90, area, w: a1 - a0, h: b1 - b0, at: [sx / sw, sy / sw, -sz / sw], mid: [mc[0], mc[1], -mc[2]], lean: Math.atan2(nn[1], nn[0]) * 180 / Math.PI });
  }
  let fx0 = Infinity, fx1 = -Infinity, fy0 = Infinity, fy1 = -Infinity;
  for (let t = 0; t < P.length; t += 9) if (!body.NG[t / 9] && Math.min(P[t + 2], P[t + 5], P[t + 8]) < -(thick + 1)) for (let k = 0; k < 9; k += 3) { fx0 = Math.min(fx0, P[t + k]); fx1 = Math.max(fx1, P[t + k]); fy0 = Math.min(fy0, P[t + k + 1]); fy1 = Math.max(fy1, P[t + k + 1]); }
  return { X, Y, Z, W, D, thick, height, holes, faces, foot: fx0 < fx1 ? [fx0, fx1, fy0, fy1] : null };
}

/* ---------- comparison with what the planner draws ---------- */
function drawnPart(ent, upper) { // upper: a ½U panel drawn turned over, as in the upper half of a U
  const e = ent.e, d = { u: e.u, shape: e.shape, face: e.face, device: ent.dev, depth: e.depth, fit: e.fit };
  const sc = LS.part(d, { lookup, upper }), plate = sc.objs.find(o => o.key === 'plate');
  // the openings, without the screw slots in the ears (the model's are listed with the screw holes)
  const inside = h => Math.abs(h.reduce((s, q) => s + q[0], 0) / h.length) < OPEN;
  return { holes: plate ? plate.prims[0].holes.filter(inside) : [], H: sc.h, depth: sc.depth };
}
function mapText(m, dm, g, W, H, ears) { // # open in both, m only in the model, d only in the drawing, o screw holes, . solid
  const cols = 100, cw = 250 / cols, rh = 5, rows = Math.max(1, Math.round(H / rh)), lines = [];
  for (let r = rows - 1; r >= 0; r--) {
    let s = '';
    for (let c = 0; c < cols; c++) {
      const xa = -125 + c * cw, ya = r * H / rows;
      let n = 0, a = 0, b = 0, e = 0;
      for (let j = Math.max(0, Math.floor((ya - g.y0) / g.r)); j < g.ny && py(g, j) < ya + H / rows; j++) for (let i = Math.max(0, Math.floor((xa - g.x0) / g.r)); i < g.nx && px(g, i) < xa + cw; i++) {
        const k = j * g.nx + i; n++; a += m[k]; b += dm[k]; e += ears[k];
      }
      const x = xa + cw / 2;
      s += Math.abs(x) > W / 2 ? ' ' : !n ? ' ' : e / n > .2 ? 'o' : a / n > .4 && b / n > .4 ? '#' : a / n > .4 ? 'm' : b / n > .4 ? 'd' : '.';
    }
    lines.push('      |' + s + '|');
  }
  return lines;
}
function svgOut(file, k, r, dr) {
  const { g, W, H } = r, parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-W / 2 - 4} ${-H - 4} ${W + 8} ${H + 8}" width="${(W + 8) * 4}" height="${(H + 8) * 4}">`,
    `<rect x="${-W / 2}" y="${-H}" width="${W}" height="${H}" fill="#ddd"/>`, '<g fill="#d33">'];
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
    const s = j * g.nx + i; if (!r.mopen[s]) continue;
    let e = i; while (e + 1 < g.nx && r.mopen[j * g.nx + e + 1]) e++;
    parts.push(`<rect x="${f(px(g, i) - g.r / 2, 2)}" y="${f(-(py(g, j) + g.r / 2), 2)}" width="${f((e - i + 1) * g.r, 2)}" height="${g.r}"/>`); i = e;
  }
  parts.push('</g><g fill="none" stroke="#2563eb" stroke-width=".3">');
  (dr ? dr.holes : []).forEach(p => parts.push(`<path d="M${p.map(q => f(q[0], 2) + ' ' + f(-q[1], 2)).join('L')}Z"/>`));
  parts.push('</g></svg>');
  const name = join(REF, basename(file).replace(/\.\w+$/, '') + (k ? '.' + k : '') + '.compare.svg');
  writeFileSync(name, parts.join('\n'));
  return name;
}

/* ---------- report ---------- */
const results = [], files = [];
const idOf = n => (/^[a-z0-9]+/.exec(basename(n).toLowerCase()) || [''])[0];
const refFiles = () => existsSync(REF) ? readdirSync(REF).filter(n => /\.(stl|3mf)$/i.test(n)).sort() : [];
if (!wanted.length) refFiles().forEach(n => files.push(join(REF, n)));
for (const w of wanted) {
  if (existsSync(w)) { files.push(w); continue; }
  const hits = refFiles().filter(n => idOf(n) === w.toLowerCase());
  if (!hits.length) console.error(`No model for "${w}": put it in reference/ as ${w}.3mf or ${w}.stl`);
  hits.forEach(n => files.push(join(REF, n)));
}
if (!files.length) {
  console.log('Nothing to measure. Download the models you want to check from MakerWorld or Printables into reference/ and name each');
  console.log('file by its catalog id, e.g. reference/sbc7.3mf or reference/u7pro45.stl. git ignores that folder; never commit the files.');
  process.exit(wanted.length ? 1 : 0);
}

for (const file of files) {
  const id = (opt.id || idOf(file)), ent = entries.get(id), buf = readFileSync(file), is3mf = buf.readUInt32LE(0) === 0x04034b50;
  let objs;
  try { objs = is3mf ? load3mf(buf) : loadStl(buf, basename(file)); } catch (e) { console.error(`${file}: ${e.message}`); continue; }
  out(`\n${'='.repeat(100)}\n${basename(file)} · ${is3mf ? '3MF' : 'STL'} · ${ent ? `catalog ${id}: ${ent.e.name || ent.e.label}${ent.dev ? ' (' + ent.dev.device + ')' : ''}` : 'no catalog entry with id "' + id + '"'}`);
  // siblings: other catalog entries for the same model page (½U, 1U and 2U versions of one model)
  const sibs = ent ? [...entries.entries()].filter(([, x]) => modelNo(x.e) && modelNo(x.e) === modelNo(ent.e)) : [];
  let k = 0;
  for (const o of objs) {
    if (o.skipped.length) out(`  (${o.name}: left out ${o.skipped.join(', ')})`);
    const bs = bodies(o.T, o.NG);
    for (const body of bs) {
      k++;
      const al = align(solidOnly(body.T, body.NG));
      if (al) body.T = toFrame(body.T, al.X, al.Y, al.Z, [0, 0, 0]);
      const notes = al ? [al.note] : [], bb = bboxOf(solidOnly(body.T, body.NG)), tri = body.T.length / 9, label = `${o.name}${bs.length > 1 ? ` · body ${bs.indexOf(body) + 1} of ${bs.length}` : ''}`;
      const res = { file: basename(file), id, object: label, triangles: tri, box: bb.size.map(v => +f(v, 2)) };
      results.push(res);
      if (Math.max(...bb.size) < 12) notes.push('this is tiny: maybe the file is in inches or cm');
      out(`\n  [${k}] ${label} · ${tri} triangles · box ${bb.size.map(v => f(v)).join(' × ')} mm (file x × y × z)`);
      if (!tri) continue;
      const pl = planes(solidOnly(body.T, body.NG), bb), wantTop = ent && ent.kind === 'top' && body === bs[0] && !opt.front;
      const fr = wantTop ? null : findFront(body.T, body.NG, bb, pl);
      if (fr) {
        const r = analysePart(body, fr, pl, notes);
        res.mode = 'part';
        out(`      front faces ${axName(r.Z)}, up is ${axName(r.Y)}, left to right is ${axName(r.X)} (in the file's axes)`);
        const kind = Math.abs(r.u.short - 2.45) < .3 ? ', like the Lab Rax panels' : Math.abs(r.u.short - CLEAR) < .3 ? ', the EIA size' : '';
        out(`      panel ${f(r.W, 2)} wide × ${f(r.H, 2)} high → ${r.u.n}U (${f(r.u.short, 2)} short of ${f(r.u.n * U, 2)}${kind}); plate ${f(r.thick)} thick${r.earThick != null && Math.abs(r.earThick - r.thick) > .5 ? `, ears ${f(r.earThick)}` : ''}; ${f(r.depth)} deep in all, ${f(r.behind)} behind the plate`);
        if (r.bbox.max[2] > .3) out(`      sticks out ${f(r.bbox.max[2])} in front of the plate`);
        if (r.behindBox) out(`      behind the plate: x ${span(r.behindBox[0], r.behindBox[1])} (${f(r.behindBox[1] - r.behindBox[0])} wide), y ${span(r.behindBox[2], r.behindBox[3])}`);
        Object.assign(res, { u: r.u.n, panel: [+f(r.W, 2), +f(r.H, 2)], short: +f(r.u.short, 2), thick: +f(r.thick, 2), ears: r.earThick && +f(r.earThick, 2), depth: +f(r.depth, 1), behind: +f(r.behind, 1) });
        // screw holes
        const L = r.ears.filter(o => o.x < 0).sort((a, b) => a.y - b.y), Rr = r.ears.filter(o => o.x > 0).sort((a, b) => a.y - b.y);
        const ear = o => {
          const e = eia(o.y, r.H), cov = eiaIn(o.y0 + 1.5, o.y1 - 1.5, r.H), sg = v => Math.abs(v) < .005 ? '±0' : (v > 0 ? '+' : '') + f(v, 2);
          const at = o.h > o.w + 2 && cov.length > 1 ? `covers the rack holes at ${cov.map(c => f(c.e, 2) + (c.half ? ' (half U)' : '')).join(' and ')}` : `rack hole ${f(e.e, 2)}${e.half ? ' on a half U' : ''}, ${sg(o.y - e.e)}`;
          return `y ${f(o.y, 2)} (${o.kind === 'notch' ? 'notch from the ' + o.side + ' ' : ''}${f(o.w, 2)} × ${f(o.h, 2)}; ${at})`;
        };
        if (L.length || Rr.length) {
          const Lh = L.filter(o => o.kind !== 'notch'), Rh = Rr.filter(o => o.kind !== 'notch');
          const sp = Lh.length && Rh.length ? Rh.reduce((s, o) => s + o.x, 0) / Rh.length - Lh.reduce((s, o) => s + o.x, 0) / Lh.length : null;
          out(`      screw holes${sp ? ` ${f(sp, 2)} apart (rack 236.53)` : ''}: left ${L.map(ear).join(', ') || 'none'}; right ${Rr.map(ear).join(', ') || 'none'}`);
          res.screws = { spacing: sp && +f(sp, 2), left: L.map(o => [+f(o.y, 2), +f(o.w, 2), +f(o.h, 2)]), right: Rr.map(o => [+f(o.y, 2), +f(o.w, 2), +f(o.h, 2)]) };
        } else out('      no screw holes found in the ears');
        // openings
        const ar = areas(r.mid), openArea = r.mid.reduce((s, o) => s + Math.max(0, Math.min(o.x1, OPEN) - Math.max(o.x0, -OPEN)) / o.w * o.area, 0), share = openArea / (2 * OPEN * r.H);
        out(`      openings through the front ${f(r.F)} mm: ${r.mid.length}${r.mid.length ? `, ${f(share * 100, 0)} % of the 222 mm opening` : ''}`);
        ar.forEach((a, i) => out('        ' + areaText(a, i)));
        if (opt.holes) [...r.mid].sort((a, b) => a.x - b.x || a.y - b.y).forEach(o => out(`          ${o.kind} ${f(o.w)} × ${f(o.h)} at x ${f(o.x)}, y ${f(o.y)} (x ${span(o.x0, o.x1)}, y ${span(o.y0, o.y1)})`));
        if (r.recs.length) out(`      recessed (not through): ${r.recs.length} area${r.recs.length > 1 ? 's' : ''}, ${r.recs.slice(0, 4).map(o => `x ${span(o.x0, o.x1)} y ${span(o.y0, o.y1)}`).join('; ')}${r.recs.length > 4 ? ' …' : ''}`);
        Object.assign(res, { openShare: +f(share, 3), openings: ar.map(a => ({ box: [a.x0, a.x1, a.y0, a.y1].map(v => +f(v, 1)), n: a.n, sizes: a.sizes.slice(0, 3).map(z => ({ n: z.n, kind: z.kind, w: +f(z.w, 2), h: z.h && +f(z.h, 2), pitch: +f(z.pitch, 2), rows: z.rows })) })) });
        r.seats.forEach(s => {
          if (s.empty) return;
          out(`      ${Math.round(s.k * 100)} % of the way back (z ${f(s.z)}): ${s.floor != null ? `floor up to y ${f(s.floor)}, ` : 'no floor, '}${s.clear != null ? `${f(s.clear)} clear between x ${span(s.x0, s.x1)}, sides up to y ${f(s.walls)}${s.lid != null ? ', covered at y ' + f(s.lid) : ''}` : `material x ${span(s.xa, s.xb)}`}`);
        });
        res.seats = r.seats.filter(s => !s.empty).map(s => ({ at: +f(-s.z, 1), floor: s.floor && +f(s.floor, 1), clear: s.clear && +f(s.clear, 1), walls: s.walls && +f(s.walls, 1) }));
        // compare with the catalog entry that has this height (½U, 1U, 2U versions of one model share a page)
        const pick = sibs.filter(([, x]) => x.e.u != null).sort((a, b) => Math.abs(a[1].e.u - r.u.n) - Math.abs(b[1].e.u - r.u.n))[0];
        const [cid, ce] = pick && Math.abs(pick[1].e.u - r.u.n) < .3 ? pick : ent && ent.kind !== 'top' && ent.kind !== 'extra' ? [id, ent] : [];
        const mopen = new Uint8Array(r.openM.length), ears = new Uint8Array(r.openM.length), midIds = new Set(r.mid.filter(o => o.id != null).map(o => o.id)), earIds = new Set(r.ears.filter(o => o.id != null).map(o => o.id));
        for (let i = 0; i < mopen.length; i++) { if (midIds.has(r.lab[i])) mopen[i] = 1; if (earIds.has(r.lab[i])) ears[i] = 1; }
        r.notches.forEach(o => { for (let j = 0; j < r.g.ny; j++) for (let i = 0; i < r.g.nx; i++) { const x = px(r.g, i), y = py(r.g, j), s = j * r.g.nx + i; if (r.openM[s] && x >= o.x0 && x <= o.x1 && y >= o.y0 && y <= o.y1) (r.ears.includes(o) ? ears : mopen)[s] = 1; } });
        r.mopen = mopen;
        let dr = null;
        if (ce) {
          const screws = r.ears.filter(o => o.kind !== 'notch');
          dr = drawnPart(ce, screws.length > 0 && screws.every(o => o.y > r.H / 2)); // the drawing turned the way the model lies
          const dm = polys(dr.holes, r.g);
          let both = 0, any = 0;
          for (let i = 0; i < dm.length; i++) if (Math.abs(px(r.g, i % r.g.nx)) <= OPEN) { both += mopen[i] && dm[i]; any += mopen[i] || dm[i]; }
          const e = ce.e, dHoles = regions(dm, r.g).list.map(c => hole(c, r.g)), dAr = areas(dHoles);
          out(`      compared with ${cid} (${e.name || e.label}, ${e.u}U${e.estimated ? ', height estimated' : ''}):`);
          out(`        height   catalog ${e.u}U, model ${r.u.n}U${e.u === r.u.n ? (e.estimated ? ' ✓ — the model confirms it: remove "estimated"' : ' ✓') : ' ✗ — set "u": ' + r.u.n}`);
          const devD = ce.dev && ce.dev.size ? ce.dev.size[2] : null;
          out(`        depth    model ${f(r.depth)} (${f(r.behind)} behind the plate); planner draws ${f(dr.depth)}${e.shape && e.shape.depth != null ? ` (shape depth ${e.shape.depth})` : e.depth != null ? ` (depth ${e.depth})` : devD ? ` (device ${devD} deep + 8)` : ''}`);
          const cl = r.seats.filter(s => s.clear != null).map(s => s.clear);
          if (ce.dev && ce.dev.size && cl.length) out(`        seat     ${ce.dev.device} is ${ce.dev.size[0]} × ${ce.dev.size[1]} × ${ce.dev.size[2]}; the model leaves ${f(Math.min(...cl))}–${f(Math.max(...cl))} clear between its sides`);
          out(`        openings model ${f(share * 100, 0)} % open, drawing ${f(dHoles.reduce((s, o) => s + o.area, 0) / (2 * OPEN * r.H) * 100, 0)} %; overlap ${any ? f(both / any * 100, 0) : 100} % (shared open area / all open area, inside the posts)`);
          // the catalog's vent is the open area over 200 mm × the planner's panel height (as app.js counts it for the cooling estimate)
          const ventM = openArea / (200 * (e.u * U - CLEAR));
          if (e.vent != null || e.face === 'vent') out(`        vent     catalog ${e.vent ?? 'none (counted as 40 % of 200 mm × the panel less 13 mm)'}, model ${f(ventM, 2)}`);
          dAr.forEach((a, i) => out('        drawn ' + areaText(a, i)));
          out('      map, front view (# open in both, m only in the model, d only in the drawing, o screw holes):');
          mapText(mopen, dm, r.g, r.W, r.H, ears).forEach(l => out(l));
          res.compare = { id: cid, u: e.u, estimated: !!e.estimated, vent: +f(openArea / (200 * (e.u * U - CLEAR)), 3), drawnDepth: +f(dr.depth, 1), overlap: any ? +f(both / any, 3) : 1, drawnShare: +f(dHoles.reduce((s, o) => s + o.area, 0) / (2 * OPEN * r.H), 3) };
        } else {
          out('      map, front view (m open, o screw holes):');
          mapText(mopen, new Uint8Array(mopen.length), r.g, r.W, r.H, ears).forEach(l => out(l));
        }
        if (opt.svg) out(`      overlay: ${svgOut(file, objs.length + bs.length > 2 ? k : 0, r, dr)}`);
      } else if (wantTop || (pl.some(q => q.area > 15000) && ent && ent.kind === 'top')) {
        const t = analyseTop(body, pl);
        res.mode = 'top';
        out(`      plate ${f(t.W)} × ${f(t.D)}, ${f(t.thick)} thick (up is ${axName(t.Z.map(v => -v))} in the file); stands ${f(t.height)} above its underside`);
        if (t.foot) out(`      what stands on it: x ${span(t.foot[0], t.foot[1])}, y ${span(t.foot[2], t.foot[3])} from the plate's centre (y along the ${f(t.D)} side)`);
        const ar = areas(t.holes);
        out(`      openings in the plate: ${t.holes.length}`);
        ar.forEach((a, i) => out('        ' + areaText(a, i)));
        t.faces.forEach((q, i) => out(`      ${i ? 'also' : 'seat'}: a flat face tilted ${f(q.tilt)}° from level${q.up ? '' : ' (facing down)'}, ${f(q.w)} × ${f(q.h)}, ${f(q.area / 100)} cm², middle ${f(q.mid[2])} above the plate's underside at x ${f(q.mid[0])}, y ${f(q.mid[1])}; leans toward ${f(q.lean, 0)}° (0 = +x, 90 = +y)`));
        if (!t.faces.length) out('      no tilted faces: the device sits level');
        Object.assign(res, { plate: [+f(t.W, 1), +f(t.D, 1)], thick: +f(t.thick, 2), height: +f(t.height, 1), faces: t.faces.map(q => ({ tilt: +f(q.tilt, 1), w: +f(q.w, 1), h: +f(q.h, 1), height: +f(q.mid[2], 1), x: +f(q.mid[0], 1), y: +f(q.mid[1], 1) })) });
        if (ent && ent.kind === 'top') {
          const sc = LS.top(ent.e, {}), discs = sc.objs.flatMap(o => o.prims).filter(q => q.t === 'disc'), tp = cat.frame.dimensions.topPanel;
          const tilt = ent.e.shape && ent.e.shape.tilt || 0, best = t.faces.find(q => q.up) || t.faces[0];
          out(`      compared with ${id} (${ent.e.label}):`);
          out(`        plate    catalog top panel ${tp[0]} × ${tp[1]}; model ${f(t.W)} × ${f(t.D)}`);
          out(`        tilt     catalog ${tilt}°, model ${best ? f(best.tilt) + '°' : 'level'}${best && Math.abs(best.tilt - tilt) < 2.5 ? ' ✓' : ''}`);
          if (discs.length) out(`        drawn    mount disc ${f(discs[0].r * 2)} across, centre ${f(discs[0].y + 3)} above the plate's underside; the AP ${f(discs[discs.length - 1].r * 2)} across`);
        }
      } else {
        res.mode = 'other';
        const top3 = [...pl].sort((a, b) => b.area - a.area).slice(0, 3);
        out(`      not a rack panel or top plate; largest flat faces: ${top3.map(q => `${f(q.area / 100)} cm² facing ${axName(axis(q.a, q.s))}`).join(', ')}`);
      }
      notes.forEach(n => out('      note: ' + n));
      if (notes.length) res.notes = notes;
    }
  }
}
if (opt.json) console.log(JSON.stringify(results, null, 1));
