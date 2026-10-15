/* Mini Rack Planner (formerly Lab Rax Planner) — plan a 3D-printed 10" rack, Lab Rax and more. MIT licensed.
   Parts, devices and mounts come from catalog.json; custom parts from parts.js; 3D view from view3d.js; PDF from pdf.js. */
(function () {
'use strict';

const STORE = 'labrax-planner-v2';
const THEMEKEY = 'labrax-planner-theme';
const REPO_URL = 'https://github.com/benna1990/lab-rax-planner';
const P = window.LRParts;

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mm = n => n.toFixed(1) + ' mm';

const FIL = [['Black', '#26282B'], ['Grey', '#7D848B'], ['White', '#E9EBEC'], ['Blue', '#2E5E9E'], ['Orange', '#E07A2E'], ['Green', '#3E8E5A'], ['Lime', '#B5CF2A'], ['Red', '#C8372D']];
const TABS = [['devices', 'Devices'], ['panels', 'Panels'], ['custom', 'Custom']]; // for the front and the back
// the "Where" bar: which side of the rack the library shows parts for; the front and back hold the panels, the rest have their own lists
const WHERE = [['front', 'Front'], ['back', 'Back'], ['top', 'Top'], ['bottom', 'Bottom'], ['sides', 'Sides'], ['frame', 'Frame']];

/* ---------- catalog ---------- */
let CAT = null, LIB = {}, SIZES = {}, PWDEV = {};
const LS = window.LRShapes; // how parts look: shapes.js
// power and network fields (see the power budget below): pw on a part or mount, pwDev on the device it holds (PWDEV: those per device name)
const PW_KEYS = ['poe', 'poeIn', 'poeOptional', 'ports', 'eth'];
const pwOf = o => { const r = {}; PW_KEYS.forEach(k => { if (o[k] !== undefined) r[k] = o[k]; }); return r; };
function buildCatalog(c) {
  CAT = c; LIB = {}; SIZES = {}; PWDEV = {};
  // src: the catalog entry, for its heat, airflow and power fields
  const add = (id, o, src) => { LIB[id] = Object.assign({ key: id, h2: o.u ? Math.round(o.u * 2) : 0 }, o, { watts: src.watts, wattsEst: !!src.wattsEstimated, fanDir: src.fanDir, vent: src.vent, at: src.at, fanAt: src.fanAt, pw: pwOf(src), fit: src.fit }); };
  (c.panels || []).forEach(g => g.items.forEach(i => add(i.id, { name: i.name, label: null, u: i.u, est: !!i.estimated, face: i.face || 'blank', shape: i.shape, url: i.url || null, author: i.author || '', hardware: i.hardware || [], group: g.group, tab: 'panels' }, i)));
  (c.devices || []).forEach(g => g.items.forEach(d => {
    const dev = d.size ? { device: d.device, size: d.size, color: d.color, io: d.io } : null;
    if (dev) SIZES[d.device] = dev;
    const pwDev = PWDEV[d.device] = Object.assign({ name: d.device, group: g.group, io: d.io || [] }, pwOf(d));
    d.mounts.forEach(m => {
      if (m.ref) { m.key = m.ref; return; }
      m.key = m.id;
      const top = m.position === 'top';
      add(m.id, { name: d.device, label: m.label, u: top ? 0 : m.u, top, est: !!m.estimated, face: m.face || 'shelf', shape: m.shape, device: dev, pwDev, url: m.url || null, author: m.author || '', hardware: m.hardware || [], note: m.note, depth: m.depth, group: g.group, tab: top ? 'top' : 'devices' }, m);
    });
  }));
  (c.extras || []).forEach(g => g.items.forEach(i => add(i.id, { name: i.name, label: i.label || null, u: 0, extra: true, shape: i.shape, url: i.url, author: i.author || '', hardware: i.hardware || [], note: i.note, group: g.group, tab: 'extras' }, i)));
  LS.devices(n => SIZES[n] || null);
}

/* ---------- state ---------- */
function defaultState() {
  let n = 1; const m = (k, p) => ({ id: n++, key: k, pos2: p });
  return { h: 5, version: 'brass', frame: '#26282B', panel: '#26282B', accent: '#B5CF2A', label: 'Lab Rax', top: null, topDir: null, bottom: null, bottomDir: null, extras: [], xdir: {}, back: 'open', room: 25, sides: 'printed', done: {}, example: true,
    power: defaultPower(),
    items: [m('ucgmax1', 0), m('mw2117690', 2), Object.assign(m('sbc7', 4), { fill: 4, names: ['Pi 1', 'Pi 2', 'Pi 3', 'Pi 4'] }), m('fan40', 8)], nextId: n }; // the example passes the readiness checks
}
function load() {
  try { const s = JSON.parse(localStorage.getItem(STORE)); if (s && Array.isArray(s.items) && s.h >= 1 && s.h <= 10 && s.nextId) return Object.assign({ accent: '#B5CF2A', label: 'Lab Rax', top: null, extras: [], done: {} }, s); } catch (e) {}
  return null;
}
/* Undo history: every saved change of the layout, up to 100 steps back. Changes less than 0.8 s apart (typing a label, a run of
   arrow keys) count as one step. Cmd/Ctrl+Z and the arrows next to Height walk it; the Undo link in a message restores its own snapshot. */
const HIST = { back: [], fwd: [], last: null, at: 0, quiet: false };
function save() {
  const s = JSON.stringify(state);
  if (HIST.last != null && s !== HIST.last && !HIST.quiet) { const now = Date.now(); if (now - HIST.at > 800) { HIST.back.push(HIST.last); if (HIST.back.length > 100) HIST.back.shift(); } HIST.fwd.length = 0; HIST.at = now; }
  HIST.last = s; histButtons();
  try { localStorage.setItem(STORE, s); } catch (e) {}
}
function histButtons() { const u = document.getElementById('hist-undo'), r = document.getElementById('hist-redo'); if (u) u.disabled = !HIST.back.length; if (r) r.disabled = !HIST.fwd.length; }
function histGo(dir) { // -1 undo, +1 redo
  const from = dir < 0 ? HIST.back : HIST.fwd, to = dir < 0 ? HIST.fwd : HIST.back;
  if (!from.length) { say(dir < 0 ? 'Nothing to undo.' : 'Nothing to redo.'); return; }
  to.push(JSON.stringify(state)); state = JSON.parse(from.pop()); sel = null; undo = null;
  HIST.quiet = true; try { sanitize(); render(); renderLib(); } finally { HIST.quiet = false; }
  HIST.last = JSON.stringify(state); HIST.at = 0; histButtons();
  say((dir < 0 ? 'Undone' : 'Redone') + ' (' + (dir < 0 ? HIST.back.length + ' more step' + (HIST.back.length === 1 ? '' : 's') + ' back' : HIST.fwd.length + ' more forward') + ').');
}
const HEX = /^#[0-9a-f]{6}$/i;
const FAN_DIRS = ['intake', 'exhaust', 'cross'];
const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
const okU = u => typeof u === 'number' && u >= 0.5 && u <= 10 && Number.isInteger(u * 2);
function cleanParams(p) {
  const num = (v, lo, hi, d) => typeof v === 'number' && v >= lo && v <= hi ? v : d, o = { type: p.type, u: p.u };
  if (p.type === 'vent') o.pattern = p.pattern === 'hex' ? 'hex' : 'slots';
  if (p.type === 'keystone') { o.ports = Math.round(num(p.ports, 1, 12, 12)); o.rows = Math.round(num(p.rows, 1, 4, 1)); }
  if (p.type === 'shelf') { o.dw = num(p.dw, 20, 212, 120); o.dh = num(p.dh, 5, 400, 30); o.dd = num(p.dd, 20, 240, 120); o.open = p.open !== false; }
  if (p.type === 'label') o.text = String(p.text == null ? '' : p.text).slice(0, 24);
  if (p.type === 'fan') { o.size = own(P.FANS, String(p.size)) ? +p.size : 40; const f = P.FANS[o.size]; o.u = f.u; o.fans = Math.round(num(p.fans, 1, f.max, f.max)); o.grille = p.grille === 'open' ? 'open' : 'hex'; }
  if (p.type === 'dtype') { o.u = p.u >= 2 ? 2 : 1; o.ports = Math.round(num(p.ports, 1, 7, 6)); }
  if (p.type === 'pass') { o.u = p.u >= 1 ? 1 : 0.5; o.width = Math.round(num(p.width, 30, 200, 120)); o.style = p.style === 'brush' ? 'brush' : 'slot'; }
  return o;
}
/* power settings: PoE devices outside the rack (fed by the rack's switches), the UPS size, and whether the top mount runs on PoE */
function defaultPower() { return { ext: [], ups: { size: null, unit: 'VA' }, topPoe: null }; }
function cleanPower(p) {
  const o = defaultPower(), num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
  if (!p || typeof p !== 'object') return o;
  o.ext = (Array.isArray(p.ext) ? p.ext : []).filter(x => x && typeof x === 'object').slice(0, 12)
    .map(x => ({ name: String(x.name == null ? 'PoE device' : x.name).slice(0, 32) || 'PoE device', n: num(x.n, 1, 48) ? Math.round(x.n) : 1, w: num(x.w, .5, 100) ? Math.round(x.w * 10) / 10 : 10 }));
  if (p.ups && typeof p.ups === 'object') { if (num(p.ups.size, 1, 100000)) o.ups.size = Math.round(p.ups.size); if (p.ups.unit === 'Wh') o.ups.unit = 'Wh'; }
  if (typeof p.topPoe === 'boolean') o.topPoe = p.topPoe;
  return o;
}
/* Layouts come from this browser or from a shared link, so everything that ends up in the page is checked here. */
function sanitize() {
  const d = defaultState();
  if (!Number.isInteger(state.h) || state.h < 1 || state.h > 10) state.h = d.h;
  if (state.version !== 'bolted') state.version = 'brass';
  if (state.back !== 'closed') state.back = 'open';
  if (!(typeof state.room === 'number' && state.room >= 10 && state.room <= 40)) state.room = 25; // °C in the room, for the cooling estimate
  state.room = Math.round(state.room);
  if (state.sides !== 'acrylic') state.sides = 'printed';
  state.market = own(window.LRMarket.regions,state.market) ? state.market : 'NL';
  state.costs = window.LREstimate.settings(state.costs);
  for (const k of ['frame', 'panel', 'accent']) if (!HEX.test(state[k])) state[k] = d[k];
  state.label = typeof state.label === 'string' ? state.label.slice(0, 16) : d.label;
  state.items = (Array.isArray(state.items) ? state.items : []).filter(i => i && typeof i === 'object' && (
    i.key === 'gen' ? i.params && own(GEN_NAMES, i.params.type) && okU(i.params.u) :
    i.key === 'custom' ? Number.isInteger(i.h2) && i.h2 >= 1 && i.h2 <= 20 :
    own(LIB, i.key) && !LIB[i.key].top && !LIB[i.key].extra));
  const ids = new Set();
  state.items.forEach(i => {
    if (i.key === 'gen') { i.params = cleanParams(i.params); i.name = String(i.name || GEN_NAMES[i.params.type]).slice(0, 24); }
    if (i.color != null && !HEX.test(i.color)) delete i.color;
    if (i.key === 'custom') { i.name = String(i.name || 'Own device').slice(0, 40); if (typeof i.url !== 'string' || !/^https:\/\//.test(i.url)) delete i.url; }
    if (i.label != null && typeof i.label !== 'string') delete i.label;
    if (i.watts != null && !(typeof i.watts === 'number' && i.watts >= 0 && i.watts <= 500)) delete i.watts;
    if (i.fill != null && !(Number.isInteger(i.fill) && i.fill >= 0 && i.fill <= 48)) delete i.fill;
    if (i.names != null) { if (Array.isArray(i.names) && i.names.length <= 48) i.names = i.names.map(t => typeof t === 'string' ? t.slice(0, 16) : ''); else delete i.names; }
    if (i.dir != null && !FAN_DIRS.includes(i.dir)) delete i.dir;
    if (i.poe != null && typeof i.poe !== 'boolean') delete i.poe; // on PoE or on its own power supply, for parts that can run on PoE
    if (i.poeBudget != null && !(typeof i.poeBudget === 'number' && i.poeBudget >= 0 && i.poeBudget <= 1000)) delete i.poeBudget; // a PoE switch's budget with the builder's power adapter
    if (i.pos2 != null && !Number.isInteger(i.pos2)) i.pos2 = 0;
    if (i.side !== 'back') delete i.side;
    if (!Number.isInteger(i.id) || i.id < 1 || ids.has(i.id)) i.id = null; else ids.add(i.id);
  });
  state.nextId = Math.max(Number.isInteger(state.nextId) ? state.nextId : 1, ...[...ids].map(n => n + 1));
  state.items.forEach(i => { if (i.id == null) i.id = state.nextId++; });
  if (state.top && !(own(LIB, state.top) && LIB[state.top].top)) state.top = null;
  state.extras = (Array.isArray(state.extras) ? state.extras : []).filter(k => own(LIB, k) && LIB[k].extra);
  if (!FAN_DIRS.includes(state.topDir)) state.topDir = null;
  // the bottom: null is the printed panel, 'acrylic' a 3 mm sheet, or a top/bottom panel from the catalog (mesh, a fan)
  if (state.bottom != null && state.bottom !== 'acrylic' && !(own(LIB, state.bottom) && canBottom(LIB[state.bottom]))) state.bottom = null;
  if (!FAN_DIRS.includes(state.bottomDir)) state.bottomDir = null;
  const xd = state.xdir && typeof state.xdir === 'object' ? state.xdir : {}; state.xdir = {};
  state.extras.forEach(k => { if (FAN_DIRS.includes(xd[k])) state.xdir[k] = xd[k]; });
  if (!state.done || typeof state.done !== 'object') state.done = {};
  state.power = cleanPower(state.power);
  // older layouts could place whole-U panels on a half U, and a shared link could overlap parts; move them onto free slots
  byPos().forEach(i => { const p = i.pos2; i.pos2 = null; i.pos2 = isFree(p, H(i), i.id) ? p : nearest(p, H(i), i.id); });
}

let state = load() || defaultState();
let sel = null, undo = null, G = {}, drag = null, libKey = null, dropP = null, tab = 'devices', query = '', view = 'front';
let rackSide = 'front'; // the side new parts go to: the back while the Back view is open, else the front (the 3D view keeps the last one)

const info = it => {
  if (it.key === 'custom') return { custom: true, name: it.name, h2: it.h2, face: 'custom', url: it.url || null, hardware: [] };
  if (it.key === 'gen') return { gen: true, name: it.name, label: genLabel(it.params), h2: Math.round(it.params.u * 2), face: genFace(it.params), params: it.params, url: null, hardware: genHardware(it.params) };
  return it.fill != null || it.names ? modded(it, LIB[it.key]) : LIB[it.key];
};
/* Modular parts: a row of like slots (boards, drive sleds, keystone jacks). A placed part may fill fewer slots (it.fill; the rest
   get a blank plate, cover or insert) and name each slot (it.names, printed on its plate). info() then hands out the part with
   that choice in its shape, a variant for the drawing caches and its heat scaled to the boards in it. */
const MOD_KINDS = ['sbc', 'bay', 'ks'], SLOT_NOUN = { sbc: ['board', 'boards', 'blank blade'], bay: ['drive', 'drives', 'blank cover'], ks: ['jack', 'jacks', 'blank insert'] };
function modOf(d) { // { kind, n, idx } of the first module with 2 or more slots, else null
  const row = d && d.shape && Array.isArray(d.shape.row) ? d.shape.row : null; if (!row) return null;
  for (let i = 0; i < row.length; i++) { const m = row[i]; if (m && typeof m === 'object') for (const k of MOD_KINDS) if (typeof m[k] === 'number' && m[k] >= 2) return { kind: k, n: m[k], idx: i }; }
  return null;
}
const modMemo = new Map();
function modded(it, base) {
  const md = modOf(base); if (!md) return base;
  const k = Math.max(0, Math.min(md.n, it.fill != null ? it.fill : md.n)), names = (it.names || []).slice(0, md.n), variant = '~' + k + '~' + names.join('|');
  const mk = it.key + variant; if (modMemo.has(mk)) return modMemo.get(mk);
  const row = base.shape.row.map((m, i) => i === md.idx ? Object.assign({}, m, { fill: k, names }) : m);
  const d = Object.assign({}, base, { shape: Object.assign({}, base.shape, { row }), variant, fill: k, slots: md.n }); // keystone jacks carry no heat
  if (typeof base.watts === 'number' && md.kind !== 'ks') d.watts = Math.round(base.watts * k / md.n * 10) / 10;
  if (modMemo.size > 300) modMemo.clear(); modMemo.set(mk, d); return d;
}
// "3 of 7 boards, 4 blank blades; text on: …" for the print list and the selection, '' when all slots are used and unnamed
function slotText(it) {
  const md = modOf(LIB[it.key]); if (!md || (it.fill == null && !it.names)) return '';
  const k = it.fill != null ? it.fill : md.n, nn = SLOT_NOUN[md.kind], blanks = md.n - k, named = (it.names || []).filter(Boolean);
  return k + ' of ' + md.n + ' ' + nn[1] + (blanks ? ', ' + blanks + ' ' + nn[2] + (blanks > 1 ? 's' : '') : '') + (named.length ? '; text: ' + named.join(', ') + ' (add it with your slicer’s text tool)' : '');
}
function slotsHTML(it) {
  const md = modOf(LIB[it.key]); if (!md) return '';
  const k = it.fill != null ? it.fill : md.n, nn = SLOT_NOUN[md.kind], names = it.names || [], cap = w => w[0].toUpperCase() + w.slice(1);
  return '<div class="slotset"><span class="slab">' + cap(nn[1]) + '</span><div class="stepper small"><button type="button" data-act="fill" data-d="-1" aria-label="One ' + nn[0] + ' fewer"' + (k <= 0 ? ' disabled' : '') + '>−</button><output>' + k + ' of ' + md.n + '</output><button type="button" data-act="fill" data-d="1" aria-label="One ' + nn[0] + ' more"' + (k >= md.n ? ' disabled' : '') + '>+</button></div>' +
    '<span class="hint">' + (k < md.n ? (md.n - k) + ' ' + nn[2] + (md.n - k > 1 ? 's' : '') + ' in the last slots. ' : '') + 'A name per slot is printed on its plate.</span>' +
    '<div class="slotnames">' + Array.from({ length: md.n }, (_, i) => '<input class="field mini" type="text" data-slot="' + i + '" maxlength="16" placeholder="' + (i < k ? cap(nn[0]) + ' ' + (i + 1) : 'Blank ' + (i + 1)) + '" value="' + esc(names[i] || '') + '" aria-label="Name on slot ' + (i + 1) + '">').join('') + '</div></div>';
}
const H = it => info(it).h2;
const canBottom = d => !!(d && d.top && /bottom/i.test(d.label || '')); // top panels made for the bottom too
const bottomPart = () => state.bottom && state.bottom !== 'acrylic' && own(LIB, state.bottom) ? LIB[state.bottom] : null;
const bottomName = () => state.bottom === 'acrylic' ? 'Acrylic, 3 mm' : bottomPart() ? fullName(bottomPart()) : 'Printed panel';
const slots = () => state.h * 2;
const placed = () => state.items.filter(i => i.pos2 != null);
const byPos = () => placed().sort((a, b) => a.pos2 - b.pos2);
const find = id => state.items.find(i => i.id === id);
// panels screw to the front posts or, facing out the back, to the rear posts; each side has its own slots
const sideOf = it => it && it.side === 'back' ? 'back' : 'front';
const atBack = it => sideOf(it) === 'back' ? ' (back)' : '';
const onSide = sd => byPos().filter(i => sideOf(i) === sd);
const colorOf = it => it.color || state.panel; // a part's own colour, or the default panel colour
const colorName = c => (FIL.find(f => f[1].toLowerCase() === c.toLowerCase()) || [c.toUpperCase()])[0];
function fmtU(h2) { const w = Math.floor(h2 / 2), h = h2 % 2; return (w || !h ? w : '') + (h ? '½' : '') + 'U'; }
const uTxt = d => (d.est ? '≈' : '') + fmtU(d.h2);
const shortName = d => d.name;
const fullName = d => d.label ? d.name + ' – ' + d.label : d.name;
function uRange(p, h2) { const hi = state.h - Math.floor(p / 2), lo = state.h - Math.floor((p + h2 - 1) / 2); return lo === hi ? 'U' + hi : 'U' + lo + '–' + hi; }
const GEN_NAMES = { blank: 'Blank panel', vent: 'Vent panel', keystone: 'Keystone panel', shelf: 'Shelf', label: 'Label plate', fan: 'Fan panel', dtype: 'D-type panel', pass: 'Cable pass-through' };
function genLabel(p) {
  if (p.type === 'keystone') return (p.ports || 12) * (p.rows || 1) + ' ports';
  if (p.type === 'shelf') return p.dw + ' × ' + p.dh + ' × ' + p.dd + ' mm';
  if (p.type === 'vent') return p.pattern === 'hex' ? 'hexagon' : 'slots';
  if (p.type === 'label') return '“' + (p.text || '') + '”';
  if (p.type === 'fan') return p.fans + '× ' + p.size + ' mm' + (p.grille === 'open' ? ', open' : '');
  if (p.type === 'dtype') return p.ports * p.u + ' D-type';
  if (p.type === 'pass') return p.width + ' mm ' + (p.style === 'brush' ? 'brush' : 'slot');
  return 'custom';
}
function genFace(p) { return { blank: 'blank', vent: 'vent', keystone: 'ks', shelf: 'cut', label: 'blank', fan: 'fan', dtype: 'd', pass: 'blank' }[p.type] || 'blank'; }
// a generated fan panel holds catalog fans, so the airflow estimate, the shopping list and the fan wiring count them like a catalog fan panel's
const genHardware = p => p.type === 'fan' && CAT.hardware['fan' + p.size] ? [{ part: 'fan' + p.size, qty: p.fans }] : [];

/* ---------- placement ---------- */
/* The 10" hole pattern (6.35 / 22.225 / 38.1 mm) repeats per whole U, so panels of 1U and taller must start on a U boundary; ½U panels fit either half. */
const aligned = (p, h2) => h2 === 1 || p % 2 === 0;
// side: front or back; without it, the side of the part being moved (except), else the side being edited
function isFree(p, h2, except, side) {
  if (p < 0 || p + h2 > slots() || !aligned(p, h2)) return false;
  const sd = side || (except != null && find(except) ? sideOf(find(except)) : rackSide);
  return !placed().some(o => o.id !== except && sideOf(o) === sd && p < o.pos2 + H(o) && o.pos2 < p + h2);
}
function nearest(t, h2, except, side) { const n = slots(); for (let d = 0; d <= n; d++) for (const c of d ? [t - d, t + d] : [t]) if (isFree(c, h2, except, side)) return c; return null; }
function firstFree(h2, side) { for (let p = 0; p + h2 <= slots(); p++) if (isFree(p, h2, undefined, side)) return p; return null; }
function touch() { state.example = false; }
// btn: true for an Undo button, or [act, label] for another action
function say(msg, btn) { const b = btn === true ? ['undo', 'Undo'] : btn; $('#status').innerHTML = esc(msg) + (b ? ' <button type="button" class="lnk" data-act="' + b[0] + '">' + esc(b[1]) + '</button>' : ''); }
function addItem(obj, pos) {
  const sd = obj.side === 'back' || (obj.side == null && rackSide === 'back') ? 'back' : 'front';
  if (sd === 'back') obj.side = 'back'; else delete obj.side;
  const d = info(obj), p = pos == null ? firstClear(obj, d.h2, sd) : nearest(pos, d.h2, undefined, sd);
  if (p == null) { noRoom(d, sd, () => addItem(obj), () => addItem(Object.assign(obj, { side: sd === 'back' ? 'front' : 'back' }))); return false; }
  obj.id = state.nextId++; obj.pos2 = p; state.items.push(obj); sel = obj.id; touch(); render();
  say(fullName(d) + ' (' + uTxt(d) + ') placed at ' + uRange(p, d.h2) + atBack(obj) + '.' + clashText(obj));
  return true;
}
// the lowest rack height, up to 10U, with a free slot of h2 half-units on a side; null when even 10U has none
function heightFor(h2, side) {
  const h0 = state.h;
  try { for (let h = h0 + 1; h <= 10; h++) { state.h = h; if (firstFree(h2, side) != null) return h; } return null; } finally { state.h = h0; }
}
const freeSlots = side => slots() - placed().filter(o => sideOf(o) === side).reduce((n, o) => n + H(o), 0);
// the first free slot where the part doesn't run into a part on the other side (depth) or overlap its neighbour, else the first free slot
function firstClear(obj, h2, sd) {
  let first = null;
  for (let p = 0; p + h2 <= slots(); p++) if (isFree(p, h2, undefined, sd)) { if (first == null) first = p; const o = Object.assign({ id: -1 }, obj, { pos2: p }); if (!clashes(o).length && !overlaps(o).length) return p; }
  return first;
}
// slide the parts on a side up against each other, so their free space is one gap at the bottom; whole-U parts stay on a U
function packSide(side) {
  let p = 0, n = 0;
  placed().filter(o => sideOf(o) === side).sort((x, y) => x.pos2 - y.pos2).forEach(o => { const h = H(o); while (!aligned(p, h)) p++; if (o.pos2 !== p) { o.pos2 = p; n++; } p += h; });
  return n;
}
// would packing the side make a slot for h2? (tried, then put back)
function packHelps(h2, side) { const was = placed().map(o => [o, o.pos2]); packSide(side); const ok = firstFree(h2, side) != null; was.forEach(([o, p]) => { o.pos2 = p; }); return ok; }
// one U lower; ask first when parts would no longer fit
async function shrink(h) {
  if (h < 1) return;
  const out = placed().filter(i => i.pos2 + H(i) > h * 2);
  if (out.length) {
    const names = out.map(i => i.label || fullName(info(i))), list = names.slice(0, 3).join(', ') + (names.length > 3 ? ' and ' + (names.length - 3) + ' more' : ''), many = out.length > 1;
    const v = await askUser('Make the rack ' + h + 'U?', (many ? out.length + ' parts no longer fit' : '1 part no longer fits') + ' in ' + h + 'U: ' + list + '. ' + (many ? 'They move' : 'It moves') + ' to “Doesn’t fit” under the rack, where you can put ' + (many ? 'them' : 'it') + ' back.', [['', 'Cancel'], ['go', 'Make it ' + h + 'U', 'primary']]);
    if (v !== 'go') return;
  }
  const before = JSON.stringify(state); setHeight(h); if (out.length) { undo = before; say($('#status').textContent, true); }
}
// a small dialog with a title, a line of text and buttons [value, label, class]; resolves to the button's value ('' for Esc)
function askUser(title, text, buttons) {
  const dlg = $('#askdlg');
  $('#ask-title').textContent = title; $('#ask-text').textContent = text;
  dlg.querySelector('.ask-actions').innerHTML = buttons.map(([v, label, cls]) => '<button value="' + v + '" class="btn' + (cls ? ' ' + cls : '') + '">' + esc(label) + '</button>').join('');
  dlg.returnValue = '';
  return new Promise(res => { dlg.addEventListener('close', () => res(dlg.returnValue), { once: true }); dlg.showModal(); });
}
/* No slot for a part on side sd: offer the lowest rack height that makes room, or say why it can't go in and offer the other
   side when it fits there. place() puts the part in and returns true when it did; placeOther() tries the other side. */
async function noRoom(d, sd, place, placeOther) {
  const name = fullName(d) + ' (' + fmtU(d.h2) + ')', free = freeSlots(sd), other = sd === 'back' ? 'front' : 'back';
  const grow = heightFor(d.h2, sd), spread = free >= d.h2; // enough room in total, but not in one piece
  const where = 'The ' + sd + ' of this ' + state.h + 'U rack has ' + (free ? fmtU(free) + ' free' + (spread ? ', but not in one piece' : '') : 'no free slots') + '.';
  say('No room for ' + name + ' at the ' + sd + '.');
  if (spread && packHelps(d.h2, sd)) {
    const v = await askUser('Move parts together?', name + ' doesn’t fit in one gap. ' + where + ' Sliding the parts at the ' + sd + ' up against each other makes one gap at the bottom.', [['', 'Cancel']].concat(grow ? [['grow', 'Make it ' + grow + 'U']] : [], [['pack', 'Move parts together', 'primary']]));
    if (v === 'pack') {
      const before = JSON.stringify(state); packSide(sd); touch(); render();
      if (place()) { undo = before; say($('#status').textContent + ' The parts at the ' + sd + ' moved together to make room.', true); } else { state = JSON.parse(before); render(); }
      return;
    }
    if (v !== 'grow') return;
  }
  if (grow) {
    const asked = spread && packHelps(d.h2, sd); // the dialog above already offered the taller rack
    const v = asked ? 'grow' : await askUser('Make the rack ' + grow + 'U?', name + ' doesn’t fit. ' + where + ' At ' + grow + 'U it fits at the bottom; the parts already in stay where they are.', [['', 'Cancel'], ['grow', 'Make it ' + grow + 'U', 'primary']]);
    if (v !== 'grow') return;
    const before = JSON.stringify(state); setHeight(grow);
    if (place()) { undo = before; say($('#status').textContent + ' The rack is now ' + grow + 'U.', true); } else { state = JSON.parse(before); render(); }
    return;
  }
  const otherOk = placeOther && d.h2 <= 20 && (firstFree(d.h2, other) != null || heightFor(d.h2, other) != null);
  const why = d.h2 > 20 ? name + ' is taller than the largest rack (10U).'
    : name + ' doesn’t fit, even at 10U, the largest rack. ' + where + (spread ? ' Move parts together to make one gap, or remove some.' : ' Remove or move parts to make room.');
  const v = await askUser('No room for this part', why, otherOk ? [['', 'OK'], ['other', 'Place it at the ' + other, 'primary']] : [['', 'OK', 'primary']]);
  if (v === 'other') placeOther();
}
// move a part to the other side of the rack, at the same height or the nearest free slot there
function flipSide(id) {
  const it = find(id); if (!it || it.pos2 == null) return;
  const to = sideOf(it) === 'back' ? 'front' : 'back', p = nearest(it.pos2, H(it), undefined, to);
  if (p == null) { noRoom(info(it), to, () => { flipSide(id); return sideOf(find(id)) === to; }); return; }
  state.items = state.items.map(i => i.id === id ? Object.assign({}, i, { pos2: p, side: to }) : i);
  const nw = find(id); if (to === 'front') delete nw.side;
  sel = id; touch(); save(); // setView() only redraws, so save here
  if (view === 'front' || view === 'back') setView(to); else render();
  say(fullName(info(nw)) + ' moved to the ' + to + ', ' + uRange(p, H(nw)) + '.' + clashText(nw));
}
/* Parts at the front and the back share the depth of the rack: a deep shelf at the front and one at the back at the same height
   run into each other. Depth of a part as shapes.js draws it (its shelf or the device behind it), in mm. */
const depthMemo = new Map();
function partDepth(it) {
  const k = it.key === 'gen' ? 'gen' + JSON.stringify(it.params) : it.key === 'custom' ? 'custom' + it.h2 : it.key;
  if (!depthMemo.has(k)) { let v = 0; try { v = LS.scene(info(it), {}).depth || 0; } catch (e) {} depthMemo.set(k, v); }
  return depthMemo.get(k);
}
function clashes(it) {
  if (it.pos2 == null) return [];
  // the panels sit on the outside of the posts, so the two parts share the frame depth plus both 3 mm plates
  const room = ((CAT.frame.dimensions || {}).depth || 240) + (frameMods().depthAdd || 0) + 2 * 3, mine = partDepth(it);
  if (!mine) return [];
  return placed().filter(o => o !== it && o.id !== it.id && sideOf(o) !== sideOf(it) && o.pos2 < it.pos2 + H(it) && it.pos2 < o.pos2 + H(o))
    .map(o => ({ o, d: partDepth(o) })).filter(x => x.d && mine + x.d > room).map(x => Object.assign(x, { mine, room }));
}
/* Parts on the same side whose panels overlap: a ½U Lab Rax panel is 22.6 mm high, more than half a U, and sits on the U's outer
   hole, so it reaches past the middle of its U into the other half (shapes.js). Two ½U parts in one U then overlap: 3.6 mm for two
   Lab Rax panels, 1.4 mm next to an EIA one. Returns [{ o, mm }]. */
function overlaps(it) {
  if (it.pos2 == null) return [];
  const span = o => { const [py, ph] = plateBox(o, info(o)), t = o.pos2 * P.U / 2 + py; return [t, t + ph]; }, [a0, a1] = span(it);
  return placed().filter(o => o.id !== it.id && sideOf(o) === sideOf(it) && Math.abs(o.pos2 - it.pos2) <= 2)
    .map(o => { const [b0, b1] = span(o); return { o, mm: Math.min(a1, b1) - Math.max(a0, b0) }; }).filter(x => x.mm > .05);
}
// would a ½U part fit in slot p, without overlapping the part in the other half of its U? (for filling open slots)
const halfFits = (key, p, side) => !overlaps(Object.assign({ id: 'probe', key, pos2: p }, side === 'back' ? { side } : {})).length;
function clashText(it) {
  const c = clashes(it)[0], v = overlaps(it)[0];
  return (c ? ' It runs into ' + fullName(info(c.o)) + ' at the ' + sideOf(c.o) + ': ' + Math.round(c.mine) + ' + ' + Math.round(c.d) + ' mm is more than the ' + c.room + ' mm inside the rack.' : '') +
    (v ? ' It overlaps ' + fullName(info(v.o)) + ' by ' + v.mm.toFixed(1) + ' mm: two ½U Lab Rax panels don’t fit in one U.' : '');
}
// the selected part's warning: what's wrong in a few words, why in the tooltip, and a button that moves it to a spot without the problem
function warnHTML(it) {
  const c = clashes(it)[0], v = overlaps(it)[0]; if (!c && !v) return '';
  const what = c ? 'Runs into ' + fullName(info(c.o)) + ' at the ' + sideOf(c.o) + ': ' + Math.round(c.mine + c.d) + ' mm deep, the rack has ' + c.room + ' mm'
    : 'Overlaps ' + fullName(info(v.o)) + ' by ' + v.mm.toFixed(1) + ' mm';
  const why = c ? 'A part at the front and one at the back at the same height share the depth of the rack; together these two are too deep.'
    : 'A ½U Lab Rax panel is 22.6 mm high, a bit more than half a U (22.2 mm), and its screw hole sits 1.6 mm off-centre (measured from the model), so two ½U panels in one U overlap. Give one a U of its own, or use one 1U panel instead of two ½U ones.';
  return '<span class="selwarn" title="' + esc(why) + '">⚠ ' + esc(what) + '. <button type="button" class="lnk" data-act="unclash">Move it to a free spot</button></span>';
}
// the nearest free slot on the part's side where it neither overlaps a neighbour nor runs into a part at the other side
function unclash(id) {
  const it = find(id); if (!it) return;
  const h = H(it), a = it.pos2, ok = p => isFree(p, h, id) && !clashes(Object.assign({}, it, { pos2: p })).length && !overlaps(Object.assign({}, it, { pos2: p })).length;
  for (let dd = 1; dd <= slots(); dd++) for (const p of [a - dd, a + dd]) if (p >= 0 && p + h <= slots() && ok(p)) {
    undo = JSON.stringify(state); it.pos2 = p; touch(); render(); say(fullName(info(it)) + ' moved to ' + uRange(p, h) + atBack(it) + ', where it fits.', true); return;
  }
  say('There is no free spot where ' + fullName(info(it)) + ' fits without an overlap. Make the rack taller, or use a 1U panel instead of two ½U ones.');
}
function removeItem(id) {
  const it = find(id); if (!it) return;
  undo = JSON.stringify(state); state.items = state.items.filter(i => i.id !== id); if (sel === id) sel = null;
  touch(); render(); say(fullName(info(it)) + ' removed.', true);
}
/* Move a part to slot t on its side and slide the parts it passes the other way, so a full rack can be reordered. Returns the new
   slot, or null (nothing changed) when sliding would put a whole-U panel off its U or a part outside the rack. */
function reorder(id, t) {
  const it = find(id), h = H(it), sd = sideOf(it), a = it.pos2, others = placed().filter(o => o.id !== id && sideOf(o) === sd);
  const was = others.map(o => [o, o.pos2]); let np;
  if (t < a) { const hit = others.filter(o => o.pos2 < a && o.pos2 + H(o) > t); np = Math.min(t, ...hit.map(o => o.pos2)); hit.forEach(o => { o.pos2 += h; }); }
  else { const end = t + h, hit = others.filter(o => o.pos2 >= a + h && o.pos2 < end); np = Math.max(end, ...hit.map(o => o.pos2 + H(o))) - h; hit.forEach(o => { o.pos2 -= h; }); }
  it.pos2 = np;
  const all = [it, ...others], ok = all.every(o => o.pos2 >= 0 && o.pos2 + H(o) <= slots() && aligned(o.pos2, H(o))) &&
    all.every(o => all.every(q => q === o || q.pos2 >= o.pos2 + H(o) || o.pos2 >= q.pos2 + H(q)));
  if (!ok) { it.pos2 = a; was.forEach(([o, p]) => { o.pos2 = p; }); return null; }
  return np;
}
// one step up (dir < 0) or down: into free space when there is some, else past the neighbouring part, which takes this one's place
function move(id, dir) {
  const it = find(id); if (!it || it.pos2 == null) return;
  const h2 = H(it), a = it.pos2, adj = dir < 0 ? a - 1 : a + h2;
  if (adj < 0 || adj >= slots()) return;
  const nb = placed().find(o => o.id !== id && sideOf(o) === sideOf(it) && o.pos2 <= adj && adj < o.pos2 + H(o));
  if (nb) {
    let t = dir < 0 ? nb.pos2 : nb.pos2 + H(nb) - h2;
    if (h2 % 2 === 0) t += dir < 0 ? -(t % 2) : t % 2; // a whole-U part passes a whole U: both ½U parts in it
    if (reorder(id, t) == null) { say(fullName(info(it)) + ' can’t swap with ' + fullName(info(nb)) + ': a whole-U panel has to start on a U.'); return; }
    touch(); render(); focusSel(); say(fullName(info(it)) + ' moved ' + (dir < 0 ? 'above ' : 'below ') + fullName(info(nb)) + ', now at ' + uRange(it.pos2, h2) + atBack(it) + '.' + clashText(it)); return;
  }
  let p = a + dir;
  while (p >= 0 && p + h2 <= slots()) { if (isFree(p, h2, id)) { it.pos2 = p; touch(); render(); focusSel(); return; } p += Math.sign(dir); }
}
function setHeight(h) {
  h = Math.max(1, Math.min(10, h)); if (h === state.h) return;
  state.h = h; let lost = 0;
  placed().forEach(i => { if (i.pos2 + H(i) > slots()) { i.pos2 = null; lost++; } });
  touch(); render();
  say(lost ? lost + (lost > 1 ? ' parts no longer fit' : ' part no longer fits') + ' in ' + h + 'U. See below.' : 'The rack is now ' + h + 'U (' + mm(h * P.U) + ' inner height).');
}
function fillGaps(keys, noun, side) {
  const [k1, k05] = keys || ['vent1', 'vent05']; noun = noun || 'vent panel';
  const sd = side || rackSide, at = sd === 'back' ? { side: 'back' } : {};
  let n = 0, p = 0, left = 0; // left: half U's beside a ½U part, where the ½U panel would overlap it
  while (p < slots()) {
    if (isFree(p, 2, undefined, sd)) { state.items.push(Object.assign({ id: state.nextId++, key: k1, pos2: p }, at)); n++; p += 2; }
    else if (isFree(p, 1, undefined, sd) && halfFits(k05, p, sd)) { state.items.push(Object.assign({ id: state.nextId++, key: k05, pos2: p }, at)); n++; p += 1; }
    else { if (isFree(p, 1, undefined, sd)) left++; p++; }
  }
  const why = left ? ' ' + (left > 1 ? left + ' half U’s stay' : 'A half U stays') + ' open: ½U Lab Rax panels are 22.6 mm high, more than half a U, so a ½U ' + noun + ' would overlap the ½U part beside it.' : '';
  if (!n) { say((left ? 'Nothing added at the ' + sd + '.' : 'There are no open slots at the ' + sd + '.') + why); return; }
  touch(); render(); say(n + ' ' + noun + (n > 1 ? 's' : '') + ' added to the open slots at the ' + sd + '.' + why);
}
function focusSel() { const el = document.querySelector('.item[data-id="' + sel + '"]'); if (el) el.focus({ preventScroll: true }); }

/* ---------- drawing helpers ---------- */
// a part as it looks from the front (rack view) and as a small 3D-looking drawing (library), drawn by shapes.js from its shape
const colorsFor = c => ({ color: c || state.panel, accent: state.accent, frame: state.frame });
const faceSVG = (d, c, upper) => LS.frontFor(d, Object.assign(colorsFor(c), upper ? { upper } : {}));
// a ½U part in the upper half of a U (pos2 counts half U's from the top); a ½U Lab Rax panel sits there turned over
const upperHalf = it => H(it) === 1 && it.pos2 % 2 === 0;
// where a part's panel sits in its slot: [mm from the top of the slot, height in mm]. Lab Rax panels are lower than EIA ones (shapes.js)
const plateBox = (it, d) => { const f = LS.fit(d, upperHalf(it)); return [d.h2 * P.U / 2 - f.lift - f.h, f.h]; };
const thumbSVG = d => LS.thumbFor(d, d.extra ? { accent: state.accent } : colorsFor());
const frameMods = () => LS.frameMods(state.extras.map(k => LIB[k]));
// seen from the front a handle is the end of an arch along the side edge: 12 mm wide, 34 mm high, centred 23 mm in from the outside;
// stackable handles are flat-topped and lower, side handles sit on the side panels instead
function handleSVG(s, side, kind) {
  if (kind === 'side') return '';
  const hh = kind === 'stackable' ? 26 : 34;
  return '<i class="handle' + (kind === 'stackable' ? ' flat' : '') + '" style="' + side + ':' + (17 * s).toFixed(1) + 'px;width:' + (12 * s).toFixed(1) + 'px;height:' + (hh * s).toFixed(1) + 'px" aria-hidden="true"></i>';
}
function hexSVG(s) {
  const R = Math.max(3, 4.6 * s), W = Math.sqrt(3) * R, r = R * .78;
  const hx = (cx, cy) => { let p = ''; for (let k = 0; k < 6; k++) { const a = Math.PI / 180 * (60 * k - 30); p += (cx + r * Math.cos(a)).toFixed(2) + ',' + (cy + r * Math.sin(a)).toFixed(2) + ' '; } return '<polygon points="' + p + '"/>'; };
  return '<svg class="hexgrill" aria-hidden="true"><defs><pattern id="hexpat" width="' + W.toFixed(2) + '" height="' + (3 * R).toFixed(2) + '" patternUnits="userSpaceOnUse"><g fill="#070809">' + hx(W / 2, R * .5) + hx(0, R * 2) + hx(W, R * 2) + hx(W / 2, R * 3.5) + '</g></pattern></defs><rect width="100%" height="100%" fill="url(#hexpat)"/></svg>';
}
function logoSize(fw, th) { const n = Math.max(4, (state.label || 'Lab Rax').length); return Math.min(th * .64, fw * .8 / (n * .74)); }

/* ---------- render: library ---------- */
/* One compact row per device (its best mount; the other mounts fold out), in groups that fold. While searching every matching
   group is open. Which groups are open, which sections of Your build are open and the Lab Rax filter are remembered per browser. */
const UIKEY = 'labrax-planner-ui';
const ui = (() => { try { return Object.assign({ open: {}, sec: { print: true }, lr: false }, JSON.parse(localStorage.getItem(UIKEY)) || {}); } catch (e) { return { open: {}, sec: { print: true }, lr: false }; } })();
const saveUI = () => { try { localStorage.setItem(UIKEY, JSON.stringify(ui)); } catch (e) {} };
const devOpen = new Set(); // devices whose other mounts are folded out
const where = () => WHERE.some(([k]) => k === ui.where) ? ui.where : 'front';
// an extra's side of the rack, for the Where bar
function extraFace(d) {
  const s = d.shape || {};
  if (s.side || d.at === 'side' || s.handles === 'side' || s.depth) return 'sides';
  if (s.u || s.frame || s.hl || s.wall || s.inside && d.at !== 'top') return 'frame';
  if (s.feet || s.drawer) return 'bottom';
  return 'top'; // logo, corners, edges, handles, fans at the top
}
function setWhere(w) {
  ui.where = w; saveUI();
  if (w === 'front' || w === 'back') { if (!TABS.some(([k]) => k === tab)) tab = 'devices'; if (view === 'front' || view === 'back') { setView(w); return renderLib(); } rackSide = w; }
  if (view === '3d' && window.LRView3D) window.LRView3D.action('face:' + w);
  renderControls(); renderLib();
}
function renderTabs() {
  const w = where(), fb = w === 'front' || w === 'back';
  $('#where').innerHTML = WHERE.map(([k, l]) => '<button type="button" data-act="where" data-v="' + k + '" aria-pressed="' + (w === k) + '">' + l + '</button>').join('');
  $('#tabs').hidden = !fb && w !== 'top';
  if (!fb) { $('#tabs').innerHTML = w === 'top' ? '<button type="button" class="pill lr" data-act="lib-lr" aria-pressed="' + ui.lr + '" title="Only parts made for or tested in Lab Rax">Lab Rax only</button>' : ''; return; }
  $('#tabs').innerHTML = TABS.map(([k, l]) => '<button type="button" class="pill" data-act="tab" data-t="' + k + '" aria-pressed="' + (tab === k) + '">' + l + '</button>').join('') +
    (tab === 'devices' || tab === 'panels' ? '<button type="button" class="pill lr" data-act="lib-lr" aria-pressed="' + ui.lr + '" title="Only parts made for or tested in Lab Rax">Lab Rax only</button>' : '');
}
function miniThumb(d) { return thumbSVG(d); }
const inRack = key => placed().filter(i => i.key === key).length;
function rowHTML(key, name, sub, extra) {
  const d = LIB[key], on = (d.top && state.top === key) || (d.extra && state.extras.includes(key)), n = d.top || d.extra ? 0 : inRack(key);
  const badge = d.top ? (on ? '✓ on top' : 'Top') : d.extra ? (on ? '✓ added' : 'Add') : uTxt(d);
  const hw = heatOf({ key }), kind = d.top ? 'top' : d.extra ? 'extra' : 'item', fan = cfmOf(d) ? fanChip(d, dirFor(d, null, fanPlace(d, kind), kind)) : '';
  if (cfmOf(d)) sub = (sub ? sub + ' · ' : '') + fanLine(d);
  return '<div class="lrow-wrap"><button type="button" class="lrow' + (on || n ? ' on' : '') + '" draggable="' + !(d.top || d.extra) + '" data-act="lib" data-key="' + key + '" title="' + esc(fullName(d)) + (d.author ? ' · by ' + esc(d.author) : '') + '">' +
    '<span class="lthumb">' + miniThumb(d) + '</span><span class="ltx"><b>' + esc(name) + '</b><span class="lmeta"><span class="lchips">' + // the name gets the whole first line
    (n ? '<span class="inrack" title="In your rack">' + n + '×</span>' : '') + '<span class="badge' + (d.est ? ' est' : '') + '"' + (d.est ? ' title="≈: the height is estimated, not yet checked against the model"' : '') + '>' + badge + '</span>' + wChip(hw.w, hw.est) + fan + '</span>' +
    (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span></span></button>' +
    (extra || '') + (d.url ? '<a class="lext" href="' + esc(d.url) + '" target="_blank" rel="noopener" aria-label="Open model page for ' + esc(fullName(d)) + '" title="Open model page">↗</a>' : '') + '</div>';
}
const mountSub = m => m.label + (m.labrax && !/lab ?rax/i.test(m.label) ? ' · Lab Rax' : '') + (m.author ? ' · ' + m.author : '');
const groupOpen = id => !!query || !!ui.open[id];
function groupHTML(id, title, rows, n) { // rows is only built for open groups; n is the count either way
  n = n == null ? rows.length : n;
  if (!n) return '';
  return '<section class="lgroup"><button type="button" class="lghead" data-act="lib-group" data-g="' + esc(id) + '" aria-expanded="' + groupOpen(id) + '"><span>' + esc(title) + '</span><span class="count">' + n + '</span><span class="chev" aria-hidden="true">›</span></button>' +
    (groupOpen(id) ? '<div class="lrows">' + rows.join('') + '</div>' : '') + '</section>';
}
function matches(...s) { if (!query) return true; const q = query.toLowerCase().replace(/[\s-]/g, ''); return s.join(' ').toLowerCase().replace(/[\s-]/g, '').includes(q); }
// library rows of parts that don't fit at the current side get a note: the rack height they need, or "no room"
function markFit() {
  const side = rackSide === 'back' ? 'back' : 'front', memo = {};
  document.querySelectorAll('.lrow[data-key]').forEach(b => {
    const d = LIB[b.dataset.key]; if (!d || d.top || d.extra || !d.h2) return;
    if (!(d.h2 in memo)) { const g = firstFree(d.h2, side) != null ? 0 : heightFor(d.h2, side); memo[d.h2] = g === 0 ? '' : g ? 'needs ' + g + 'U' : 'no room'; }
    const f = memo[d.h2], ch = b.querySelector('.lchips'); if ((b.dataset.fit || '') !== f) { if (f) { b.dataset.fit = f; if (ch) ch.dataset.fit = f; } else { delete b.dataset.fit; if (ch) delete ch.dataset.fit; } }
  });
}
// the library for the top, bottom, sides or frame: choices for that side and the extras that belong there
function faceLibHTML(w) {
  const lr = x => !ui.lr || x.labrax, list = (title, rows) => rows.length ? '<p class="sgroup">' + title + '</p><div class="lrows">' + rows.join('') + '</div>' : '';
  const extras = (CAT.extras || []).flatMap(g => g.items.map(i => [g, i])).filter(([g, i]) => LIB[i.id] && extraFace(LIB[i.id]) === w && matches(i.name, i.label || '', g.group, i.author || ''))
    .map(([g, i]) => rowHTML(i.id, i.name, [i.label, i.author && 'by ' + i.author].filter(Boolean).join(' · ')));
  const opt = (act, v, title, sub, on, thumb) => '<div class="lrow-wrap"><button type="button" class="lrow' + (on ? ' on' : '') + '" data-act="' + act + '" data-v="' + v + '" aria-pressed="' + on + '"><span class="lthumb">' + thumb + '</span><span class="ltx"><b>' + esc(title) + '</b><span class="lmeta"><span class="lchips"><span class="badge">' + (on ? '✓ chosen' : 'Choose') + '</span></span><small>' + esc(sub) + '</small></span></span></button></div>';
  const sheet = (fill, op) => '<svg viewBox="0 0 60 36" width="60" height="36" aria-hidden="true"><path d="M5 22 L30 30 L55 21 L30 14 Z" fill="' + fill + '" fill-opacity="' + op + '" stroke="currentColor" stroke-opacity=".35"/></svg>';
  if (w === 'top') {
    const rows = []; (CAT.devices || []).forEach(g => g.items.forEach(d => d.mounts.forEach(m => { if (m.position === 'top' && LIB[m.id] && lr(m) && matches(d.device, m.label, m.author || '')) rows.push(rowHTML(m.id, d.device, mountSub(m))); })));
    return '<p class="hint lhead">On top of the rack: a top panel with a fan or mesh, a mount for an access point, and extras for the top edge.</p>' + list('Top panels and mounts', rows) + list('Handles, logo, corners and edges', extras);
  }
  if (w === 'bottom') {
    const bs = []; (CAT.devices || []).forEach(g => g.items.forEach(d => d.mounts.forEach(m => { if (LIB[m.id] && canBottom(LIB[m.id])) bs.push(m.id); })));
    return '<p class="hint lhead">The bottom panel: printed, 3 mm acrylic to see inside, or a mesh or fan panel that lets air in from below.</p>' +
      list('Bottom panel', [opt('bottom', '', 'Printed bottom panel', 'Comes with the frame, in the frame colour', !state.bottom, sheet(state.frame, 1)), opt('bottom', 'acrylic', 'Acrylic bottom panel', '3 mm sheet, about 228 × 171.5 mm', state.bottom === 'acrylic', sheet('#9ED3F0', .45))]
        .concat(bs.map(k => opt('bottom', k, LIB[k].label, (cfmOf(LIB[k]) ? 'The fan blows in from below' : 'Lets air in from below') + (LIB[k].author ? ' · by ' + LIB[k].author : ''), state.bottom === k, miniThumb(LIB[k]))))) +
      list('Feet, casters and drawer', extras);
  }
  if (w === 'sides') return '<p class="hint lhead">The side panels: printed or acrylic, or a patterned or fan panel from the list.</p>' +
    list('Side panels', [opt('sides', 'printed', 'Printed side panels', 'Printed with the frame, in the frame colour', state.sides !== 'acrylic', sheet(state.frame, 1)), opt('sides', 'acrylic', 'Acrylic side panels', '3 mm sheets, so you can see inside', state.sides === 'acrylic', sheet('#9ED3F0', .45))]) +
    list('Patterned, fan and deeper side panels', extras);
  const byGroup = (CAT.extras || []).map(g => list(g.group, g.items.filter(i => LIB[i.id] && extraFace(LIB[i.id]) === 'frame' && matches(i.name, i.label || '', g.group, i.author || '')).map(i => rowHTML(i.id, i.name, [i.label, i.author && 'by ' + i.author].filter(Boolean).join(' · '))))).join('');
  return '<p class="hint lhead">The frame itself: other sizes and versions, joining racks, wall mounting and parts that go inside the rack.</p>' + byGroup; // under the catalog's own headings
}
function renderLib() {
  renderTabs();
  if (!CAT) return;
  const w = where(); if (w !== 'front' && w !== 'back') { $('#cards').innerHTML = faceLibHTML(w); return; }
  if (!TABS.some(([k]) => k === tab)) tab = 'devices';
  let h = '', hits = 0;
  const lr = x => !ui.lr || x.labrax;
  if (tab === 'devices') {
    (CAT.devices || []).forEach((g, gi) => {
      const rows = [], gid = 'devices:' + g.group, gOpen = groupOpen(gid);
      let n = 0;
      g.items.forEach((d, di) => {
        const ms = d.mounts.filter(m => m.position !== 'top' && LIB[m.id] && lr(m));
        if (!ms.length || !matches(d.device, g.group, ms.map(m => m.label + ' ' + (m.author || '')).join(' '))) return;
        n++; if (!gOpen) return;
        const id = gi + '.' + di, best = ms.find(m => m.id === bestMount({ mounts: ms })), open = devOpen.has(id);
        const more = ms.length > 1 ? '<button type="button" class="lmore" data-act="lib-more" data-dev="' + id + '" aria-expanded="' + open + '" title="Other mounts for this device">' + ms.length + ' ' + (open ? '▴' : '▾') + '</button>' : '';
        rows.push(rowHTML(best.id, d.device, mountSub(best), more) + (open ? '<div class="lsub">' + ms.filter(m => m !== best).map(m => rowHTML(m.id, m.label, (m.author ? 'by ' + m.author : '') + (m.labrax && !/lab ?rax/i.test(m.label) ? ' · Lab Rax' : ''))).join('') + '</div>' : ''));
      });
      hits += n; h += groupHTML(gid, g.group, rows, n);
    });
  } else if (tab === 'panels') {
    (CAT.panels || []).forEach(g => { const rows = g.items.filter(i => lr(i) && matches(i.name, g.group, i.author || '')).map(i => rowHTML(i.id, i.name, i.author ? 'by ' + i.author : '')); hits += rows.length; h += groupHTML('panels:' + g.group, g.group, rows); });
  } else {
    const gens = state.items.filter(i => i.key === 'gen');
    h = '<p class="hint">Custom parts are generated here as STL, sized to the 10" standard Lab Rax uses. Make one with the button below; it appears in the rack and in your build pack.</p>' +
      (gens.length ? '<div class="lrows">' + gens.map(i => '<div class="lrow-wrap"><button type="button" class="lrow" data-act="edit-gen" data-id="' + i.id + '"><span class="lthumb">' + miniThumb(info(i)) + '</span><span class="ltx"><b>' + esc(i.name) + '</b><small>' + esc(genLabel(i.params)) + ' · edit</small></span><span class="badge">' + fmtU(H(i)) + '</span></button></div>').join('') + '</div>' : '');
    hits = 1;
  }
  if (!hits) h = '<p class="hint">Nothing found' + (query ? ' for “' + esc(query) + '”' : '') + (ui.lr ? ' made for Lab Rax' : '') + '. Make a custom part below, or set up a rack with the wizard.</p>';
  else if (tab === 'devices') h += '<p class="hint lfoot">Click a device to add its best mount; ▾ shows the others. ≈ means the height is estimated.</p>';
  $('#cards').innerHTML = h;
  markFit();
}

/* ---------- render: rack (front view) ---------- */
function renderRack() {
  if (!CAT) return;
  const host = $('#stage'); if (!host) return;
  const air = view === 'air' ? airflow() : null;
  const avail = host.clientWidth - 24 - 34 - 60 - (air ? 56 : 0); // the Airflow view needs room on the right for the temperature scale
  const s = Math.max(.66, Math.min(1.3, avail / 274));
  const UPX = P.U * s, HU = UPX / 2, postW = 26 * s, bayW = 222 * s, frameW = bayW + 2 * postW, bodyH = state.h * UPX;
  const edge = Math.max(10, 14 * s), topH = Math.max(24, 36 * s), holeIn = (236.525 - 222) / 2 * s; // hole centre 7.26 mm from the inner edge
  G = { s, UPX, HU, postW, bayW, frameW };
  let holesL = '', holesR = '';
  for (let i = 0; i < state.h; i++) for (const off of [6.35, 22.225, 38.1]) {
    const top = ((i * P.U + off) * s).toFixed(1);
    holesL += '<i class="hole" style="top:' + top + 'px;left:' + (postW - holeIn).toFixed(1) + 'px"></i>';
    holesR += '<i class="hole" style="top:' + top + 'px;left:' + holeIn.toFixed(1) + 'px"></i>';
  }
  let labels = '';
  for (let i = 0; i < state.h; i++) labels += '<span style="top:' + (i * UPX).toFixed(1) + 'px;height:' + UPX.toFixed(1) + 'px">' + (state.h - i) + '</span>';
  const inset = (137 - P.PANEL_W / 2) * s; // printed panels are 250 mm wide, the frame 274 mm across the posts
  let items = '';
  // the Back view shows the panels on the rear posts, seen from behind; the Front and Airflow views the front ones
  const rear = view === 'back';
  onSide(rear ? 'back' : 'front').forEach(it => {
    // no text on the panels, so the faces show what is placed; the name is in the tooltip and the aria-label
    const d = info(it), c = colorOf(it), clash = clashes(it).length > 0, over = overlaps(it)[0], [py, ph] = plateBox(it, d);
    items += '<div class="item' + (it.id === sel ? ' sel' : '') + (clash || over ? ' clash' : '') + '" data-id="' + it.id + '" role="button" tabindex="0" aria-label="' + esc((it.label ? it.label + ': ' : '') + fullName(d) + ', ' + uTxt(d) + ', ' + uRange(it.pos2, d.h2) + atBack(it) + (clash ? ', runs into a part on the other side' : '') + (over ? ', overlaps ' + fullName(info(over.o)) : '')) + '"' +
      ' style="top:' + (it.pos2 * HU + py * s).toFixed(1) + 'px;height:' + (ph * s).toFixed(1) + 'px;left:' + inset.toFixed(1) + 'px;right:' + inset.toFixed(1) + 'px;--c:' + c + '">' +
      faceSVG(d, c, upperHalf(it)) + '</div>';
  });
  // the top mount, drawn above the frame at the same scale (280 mm across the outside of the frame)
  const tf = state.top ? LS.topFor(LIB[state.top], colorsFor()) : null;
  const ap = tf && tf.h > 1.5 ? '<span class="ap" title="' + esc(fullName(LIB[state.top])) + '" style="width:' + (tf.w * s).toFixed(1) + 'px;height:' + (tf.h * s).toFixed(1) + 'px;margin-left:' + (-tf.w * s / 2).toFixed(1) + 'px' + (rear ? ';transform:scaleX(-1)' : '') + '">' + tf.svg + '</span>' : '';
  const mods = frameMods(), below = (mods.drawer ? 30 : 0) + (mods.feet === 'casters' ? 40 : mods.feet === 'big' ? 8 : 0);
  const marginTop = Math.round(Math.max(ap ? tf.h * s + 4 : 0, frameW * .12 + 6));
  // extras seen from the front: keystones or an LED matrix in the top corner, a lit logo, a switch in the edge, grips on the sides,
  // bigger feet or casters and a drawer under the base. From the back: the hex grille without the name, handles, feet
  const crown = rear ? hexSVG(s)
    : mods.corner === 'matrix' ? '<span class="corner-mx" aria-hidden="true"></span>'
    : mods.corner ? '<span class="corner-ks" aria-hidden="true">' + '<i></i>'.repeat(Math.min(12, mods.corner)) + '</span>'
    : hexSVG(s).replace('class="hexgrill"', 'class="hexgrill' + (mods.logo === 'hexbar' ? ' lit' : '') + '"') + '<span class="logo' + (mods.logo === 'neopixel' ? ' glow' : '') + '" style="font-size:' + logoSize(frameW, topH).toFixed(1) + 'px">' + esc(state.label || 'Lab Rax') + '</span>';
  const feet = mods.feet === 'casters' ? '<i class="caster" style="left:4%;width:' + (32 * s).toFixed(1) + 'px;height:' + (32 * s).toFixed(1) + 'px;top:calc(100% + ' + ((mods.drawer ? 30 : 0) * s + 8 * s).toFixed(1) + 'px)"></i><i class="caster" style="right:4%;width:' + (32 * s).toFixed(1) + 'px;height:' + (32 * s).toFixed(1) + 'px;top:calc(100% + ' + ((mods.drawer ? 30 : 0) * s + 8 * s).toFixed(1) + 'px)"></i>'
    : ['left', 'right'].map(sd => '<i class="foot" style="' + sd + ':3%;height:' + ((mods.feet === 'big' ? 14 : 6) * s).toFixed(1) + 'px' + (mods.drawer ? ';top:calc(100% + ' + (30 * s).toFixed(1) + 'px)' : '') + '"></i>').join('');
  const drawer = mods.drawer && !rear ? '<i class="drawer" style="height:' + (28 * s).toFixed(1) + 'px"><i></i></i>' : '';
  const grips = mods.handles === 'side' ? '<i class="sgrip" style="left:' + (-12 * s).toFixed(1) + 'px;width:' + (12 * s).toFixed(1) + 'px"></i><i class="sgrip" style="right:' + (-12 * s).toFixed(1) + 'px;width:' + (12 * s).toFixed(1) + 'px"></i>' : '';
  $('#rackHost').innerHTML =
    '<div class="rack' + (state.version === 'brass' ? ' brass' : '') + (air ? ' airv' : '') + (rear ? ' backv' : '') + '" id="rack" style="--frame:' + state.frame + ';--acc:' + state.accent + ';--bev:' + (20 * s).toFixed(1) + 'px;--hs:' + Math.max(3.5, 5 * s).toFixed(1) + 'px;grid-template-columns:34px ' + frameW.toFixed(1) + 'px ' + (air ? 90 : 34) + 'px;grid-template-rows:' + topH.toFixed(1) + 'px ' + bodyH.toFixed(1) + 'px ' + edge + 'px auto;margin-top:' + marginTop + 'px">' +
      '<div></div><div class="edge top">' + (state.top ? '' : '<span class="tp-band" style="height:' + Math.round(7 * s) + 'px"></span>') + handleSVG(s, 'left', mods.handles) + handleSVG(s, 'right', mods.handles) + crown +
        (mods.edgeSwitch && !rear ? '<i class="eswitch" style="width:' + (14 * s).toFixed(1) + 'px;height:' + (12 * s).toFixed(1) + 'px"></i>' : '') + ap + (air ? airEnd(air, 'top') : '') + '</div><div></div>' +
      '<div class="ulab">' + labels + '</div>' +
      '<div class="rframe" style="width:' + frameW.toFixed(1) + 'px">' + grips +
        '<div class="post" style="left:0;width:' + postW.toFixed(1) + 'px">' + holesL + '</div>' +
        '<div class="bay" style="left:' + postW.toFixed(1) + 'px;width:' + bayW.toFixed(1) + 'px"></div>' +
        '<div class="post" style="right:0;width:' + postW.toFixed(1) + 'px">' + holesR + '</div>' +
        '<div class="mount" id="mount">' + items + (air ? airLayer(air, inset) : '') + '<div class="dropghost" id="ghost" hidden></div></div>' +
      '</div>' + (air ? airSide(air) : '<div></div>') +
      '<div></div><div class="edge bot">' + drawer + feet + (air ? airEnd(air, 'bottom') : '') + '</div><div></div>' +
      '<div></div><div class="floor"' + (below ? ' style="margin-top:' + (4 + below * s).toFixed(1) + 'px"' : '') + '></div><div></div>' +
    '</div>';
  if (air) $('#meas').innerHTML = airLegend(air);
  else $('#meas').textContent = (rear ? 'Seen from the back · ' : '') + '222 mm usable width · ' + (state.h * P.U).toFixed(1) + ' mm inner height · ' + state.h + 'U';
}
function showGhost(p, h2) {
  const g = $('#ghost'); if (!g) return;
  if (p == null) { g.hidden = true; return; }
  const ins = (137 - P.PANEL_W / 2) * G.s;
  g.hidden = false; g.style.top = (p * G.HU) + 'px'; g.style.height = (h2 * G.HU - 1) + 'px'; g.style.left = ins + 'px'; g.style.right = ins + 'px';
}

/* ---------- Airflow view: air temperature by height, where air comes in and goes out ---------- */
function airLayer(a, inset) { // over the bay: a temperature wash, the in/out markers of the front openings and the neutral plane
  const n = slots(), HU = G.HU, mid = (s0, s1) => ((s0 + s1 + 1) / 2 * HU).toFixed(1);
  let h = '<div class="airfield" style="left:' + inset.toFixed(1) + 'px;right:' + inset.toFixed(1) + 'px;background:linear-gradient(to bottom,' + a.temp.map((t, s) => heatCSS(t - a.room) + ' ' + ((s + .5) / n * 100).toFixed(1) + '%').join(',') + ')"></div>';
  const left = 'left:' + (inset + 16 * G.s).toFixed(1) + 'px';
  a.parts.forEach(p => { if (p.w > 0 && sideOf(p.it) === 'front') h += '<span class="wtag hl' + wLevel(p.w) + '" style="top:' + mid(p.it.pos2, p.it.pos2 + p.d.h2 - 1) + 'px;right:' + (inset + 16 * G.s).toFixed(1) + 'px">' + (p.est ? '≈' : '') + fmtW(p.w) + '</span>'; });
  const mark = (s0, s1, i, o) => { if (i + o >= .5) h += '<span class="amark" style="top:' + mid(s0, s1) + 'px;' + left + '">' + (i >= .5 ? flowPill(i, 1) : '') + (o >= .5 ? flowPill(o, -1) : '') + '</span>'; };
  a.groups.filter(g => g.kind === 'front' || g.kind === 'slot').forEach(g => mark(Math.min(...g.layers), Math.max(...g.layers), g.in, g.out));
  a.fans.filter(f => f.place === 'front').forEach(f => mark(f.it.pos2, f.it.pos2 + f.d.h2 - 1, f.in, f.out));
  if (a.r.neutral != null && a.Q) h += '<i class="nplane" style="left:' + inset.toFixed(1) + 'px;right:' + inset.toFixed(1) + 'px;top:' + ((1 - a.r.neutral / a.r.H) * n * HU).toFixed(1) + 'px" title="Neutral plane: below it air comes in, above it air goes out"></i>';
  return h;
}
function airEnd(a, end) { // what goes in or out through the top or the bottom panel
  let i = 0, o = 0;
  a.groups.filter(g => g.kind === end).forEach(g => { i += g.in; o += g.out; });
  a.fans.filter(f => f.place === 'top').forEach(f => { if (f.dir === 'cross') { if (end === 'top') o += f.out; else i += f.in; } else if (end === 'top') { i += f.in; o += f.out; } });
  return i + o >= .5 ? '<span class="amark ' + end + '">' + (i >= .5 ? flowPill(i, 1) : '') + (o >= .5 ? flowPill(o, -1) : '') + '</span>' : '';
}
function airSide(a) { // right of the rack: back and side openings (in or out per height), then the air temperature with °C per U
  const n = slots(), HU = G.HU, flows = new Array(n).fill(0);
  a.groups.filter(g => g.kind === 'back' || g.kind === 'side').forEach(g => g.layers.forEach((s, k) => { flows[s] += g.flows[k]; }));
  let segs = '', cells = '', labels = '';
  for (let s = 0; s < n;) { // runs of layers where the back and sides take air in, or let it out
    const sg = Math.abs(flows[s]) < .1 ? 0 : Math.sign(flows[s]); let e = s; while (e < n && (Math.abs(flows[e]) < .1 ? 0 : Math.sign(flows[e])) === sg) e++;
    if (sg) { const v = flows.slice(s, e).reduce((x, y) => x + Math.abs(y), 0); segs += '<i class="bseg ' + (sg > 0 ? 'in' : 'out') + '" style="top:' + (s * HU + 1).toFixed(1) + 'px;height:' + ((e - s) * HU - 2).toFixed(1) + 'px" title="Back' + (a.groups.some(g => g.kind === 'side') ? ' and sides' : '') + ': ' + (sg > 0 ? 'in ' : 'out ') + Math.round(v) + ' m³/h">' + (e - s >= 2 ? (sg > 0 ? '↘' : '↗') : '') + '</i>'; }
    s = e;
  }
  let fansAt = ''; // side and back fans: one compact marker each, right of the °C labels
  a.fans.filter(f => f.place === 'side' || f.place === 'back').forEach(f => {
    const c = f.it ? f.it.pos2 + f.d.h2 / 2 : Math.round(n / (f.place === 'back' ? 4 : 2)), cross = f.in >= .5 && f.out >= .5, v = Math.max(f.in, f.out); // rear fan panels at their own height
    fansAt += '<span class="fpill sidefan ' + (cross ? 'both' : f.in >= f.out ? 'in' : 'out') + '" style="top:' + (c * HU).toFixed(1) + 'px">' + (cross ? '⇄ ' : f.in >= f.out ? '↘ ' : '↗ ') + Math.round(v) + '</span>';
  });
  a.temp.forEach((t, s) => { cells += '<i style="top:' + (s * HU).toFixed(1) + 'px;height:' + (HU + .6).toFixed(1) + 'px;background:' + heatCSS(t - a.room) + '"></i>'; });
  for (let u = 0; u < state.h; u++) { const t = (a.temp[2 * u] + a.temp[2 * u + 1]) / 2; labels += '<span' + (t > RATED[1] ? ' class="over" title="Above 40 °C"' : '') + ' style="top:' + ((u + .5) * G.UPX).toFixed(1) + 'px">' + (t > 60 ? '60+' : Math.round(t)) + '°' + (t > RATED[1] ? '!' : '') + '</span>'; }
  return '<div class="airside"><div class="bk" aria-hidden="true">' + segs + '</div><div class="therm" aria-hidden="true">' + cells + '</div><div class="tlab">' + labels + '</div>' + fansAt + '</div>';
}
function airLegend(a) {
  return '<span class="lg-line">' + (a.Q ? 'Hottest air ≈ ' + fmtT(a.maxT) + ' · ' + (a.est ? '≈ ' : '') + fmtW(a.Q) + ' · ' : 'Nothing makes heat yet · ') + fmtF(a.flow) + ' through the rack · room ' + a.room + ' °C</span>' +
    '<span class="lg-line"><span class="lg-scale">' + a.room + '°<i style="background:linear-gradient(to right,' + [0, 1, 2, 3, 4, 5, 6].map(i => 'var(--h' + i + ')').join(',') + ')"></i>' + (a.room + HEAT_SPAN) + '°+</span>' +
    '<span><span class="fpill in">↘ in</span> <span class="fpill out">↗ out</span> m³/h</span><span class="lg-np">neutral plane</span><span>estimate</span></span>';
}

/* ---------- hover tooltip: what a part is, without text on the panels ---------- */
function tipHTML(it) {
  const d = info(it), hw = heatOf(it), a = view === 'air' ? airflow() : null;
  const p = a && a.parts.find(x => x.it.id === it.id), f = a && a.fans.find(x => x.it && x.it.id === it.id), g = a && a.groups.find(x => x.it && x.it.id === it.id);
  const flow = x => [x.in >= .5 ? 'in ' + fmtF(x.in) : '', x.out >= .5 ? 'out ' + fmtF(x.out) : ''].filter(Boolean).join(', ') || 'still';
  return '<b>' + esc(it.label || d.name) + '</b>' +
    (it.label ? '<span>' + esc(fullName(d)) + '</span>' : d.label ? '<span>' + esc(d.label) + '</span>' : '') +
    '<span class="mono">' + uTxt(d) + ' · ' + uRange(it.pos2, d.h2) + atBack(it) + (hw.w ? ' · ' + (hw.est ? '≈ ' : '') + fmtW(hw.w) : '') + '</span>' +
    clashes(it).map(c => '<span class="warn">Runs into ' + esc(fullName(info(c.o))) + ' at the ' + sideOf(c.o) + ' (' + Math.round(c.mine) + ' + ' + Math.round(c.d) + ' mm deep, ' + c.room + ' mm of room)</span>').join('') +
    overlaps(it).map(v => '<span class="warn">Overlaps ' + esc(fullName(info(v.o))) + ' by ' + v.mm.toFixed(1) + ' mm</span>').join('') +
    (p ? '<span class="mono">Air here ≈ ' + fmtT(p.T) + (hw.w ? '' : ' · no heat') + '</span>' : '') +
    (cfmOf(d) ? '<span class="mono">' + esc(fanLine(d)) + '</span>' : '') + (f ? '<span class="mono">' + (f.dir === 'intake' ? 'Blows in' : 'Blows out') + ': ' + flow(f) + '</span>' : '') +
    (g ? '<span class="mono">Vents: ' + flow(g) + '</span>' : '') + (d.author ? '<span>by ' + esc(d.author) + '</span>' : '');
}
function showTip(id, x, y) {
  const it = find(id), t = $('#tip');
  if (!it || it.pos2 == null || drag) { hideTip(); return; }
  if (t.dataset.id !== String(id)) { t.innerHTML = tipHTML(it); t.dataset.id = id; }
  t.hidden = false;
  const r = t.getBoundingClientRect(), vw = document.documentElement.clientWidth;
  t.style.left = Math.max(8, Math.min(x + 14, vw - r.width - 8)) + 'px';
  t.style.top = (y + 20 + r.height > innerHeight ? y - r.height - 12 : y + 20) + 'px';
}
function hideTip() { const t = $('#tip'); if (t && !t.hidden) { t.hidden = true; delete t.dataset.id; } }

/* ---------- render: selection, unplaced, settings ---------- */
function renderSel() {
  const it = sel != null ? find(sel) : null, bar = $('#selbar');
  if (!it || it.pos2 == null) { bar.innerHTML = '<span class="hint">Click a part in the rack to move, label or remove it. Drag it, or use the arrow keys to move by ½U.</span>'; return; }
  const d = info(it), auto = heatOf(Object.assign({}, it, { watts: undefined }));
  bar.innerHTML = '<div class="who"><b>' + esc(fullName(d)) + '</b><span class="hint">' + uTxt(d) + ' · ' + uRange(it.pos2, d.h2) + ' · ' + sideOf(it) + (d.author ? ' · by ' + esc(d.author) : '') + '</span>' + warnHTML(it) + '</div>' +
    '<input class="field" id="sel-label" type="text" maxlength="24" aria-label="Label on the panel" placeholder="Label, e.g. Pi 5" value="' + esc(it.label || '') + '">' +
    '<label class="watts" title="Heat this part gives off, for the cooling estimate. Empty: ' + (auto.w ? (auto.est ? 'about ' : '') + fmtW(auto.w) + ', its typical draw' : 'no heat') + '">Heat <input class="field" id="sel-watts" type="number" min="0" max="500" step="1" inputmode="numeric" placeholder="' + (auto.w ? (auto.est ? '≈' : '') + auto.w : '0') + '" value="' + (typeof it.watts === 'number' ? it.watts : '') + '"> W</label>' +
    (cfmOf(d) ? '<span class="watts" title="' + esc(fanLine(d)) + '">Fans ' + dirSeg({ ref: 'i' + it.id, d, place: fanPlace(d, 'item', it), kind: 'item', dir: dirFor(d, it.dir, fanPlace(d, 'item', it), 'item'), name: fullName(d) }) + '</span>' : '') +
    '<button type="button" class="btn small" data-act="up" aria-label="Move up">↑</button><button type="button" class="btn small" data-act="down" aria-label="Move down">↓</button>' +
    '<button type="button" class="btn small" data-act="flip" title="Screw it to the ' + (sideOf(it) === 'back' ? 'front' : 'rear') + ' posts instead">' + (sideOf(it) === 'back' ? 'Move to the front' : 'Move to the back') + '</button>' +
    (it.key === 'gen' ? '<button type="button" class="btn small" data-act="edit-gen" data-id="' + it.id + '">Edit part</button>' : d.url ? '<a class="btn small" href="' + esc(d.url) + '" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">Model ↗</a>' : '') +
    '<button type="button" class="btn small" data-act="dup">Duplicate</button><button type="button" class="btn small danger" data-act="del">Remove</button>' +
    '<div class="selcolor"><span>Colour</span><div class="swatches">' + FIL.map(([n, c]) => '<button type="button" class="sw" style="--c:' + c + '" data-act="part-color" data-c="' + c + '" aria-label="' + n + '" title="PETG ' + n.toLowerCase() + '" aria-pressed="' + (it.color === c) + '"></button>').join('') + '</div>' +
    '<input type="color" id="sel-color" value="' + colorOf(it) + '" aria-label="Any colour" title="Any colour">' +
    '<button type="button" class="btn small ghost" data-act="part-color" data-c=""' + (it.color ? '' : ' disabled') + '>Use default (' + esc(colorName(state.panel)) + ')</button></div>' + slotsHTML(it);
}
function renderUnplaced() {
  const un = state.items.filter(i => i.pos2 == null), box = $('#unplaced');
  if (!un.length) { box.innerHTML = ''; return; }
  box.innerHTML = '<div class="unplaced"><p>Doesn’t fit in a ' + state.h + 'U rack</p>' + un.map(i => {
    const d = info(i);
    return '<div class="row"><span>' + esc(fullName(d)) + ' · ' + uTxt(d) + atBack(i) + '</span><button type="button" class="btn small" data-act="replace" data-id="' + i.id + '">Place</button><button type="button" class="btn small danger" data-act="rm" data-id="' + i.id + '">Remove</button></div>';
  }).join('') + '</div>';
}
function renderSettings() {
  const sw = (act, cur) => '<div class="swatches">' + FIL.map(([n, c]) => '<button type="button" class="sw" style="--c:' + c + '" data-act="' + act + '" data-c="' + c + '" aria-label="' + n + '" title="PETG ' + n.toLowerCase() + '" aria-pressed="' + (c === cur) + '"></button>').join('') + '</div>';
  const nameFocused = document.activeElement && document.activeElement.id === 'rack-name';
  if (nameFocused) return;
  $('#settings').innerHTML =
    '<div class="set"><span>Frame</span><div class="seg small" role="group" aria-label="Frame version">' + [['brass', 'Heat-set inserts'], ['bolted', 'Bolted']].map(([v, l]) => '<button type="button" data-act="ver" data-v="' + v + '" aria-pressed="' + (state.version === v) + '">' + l + '</button>').join('') + '</div></div>' +
    '<div class="set"><span>Sides</span><div class="seg small" role="group" aria-label="Side panels">' + [['printed', 'Printed'], ['acrylic', 'Acrylic']].map(([v, l]) => '<button type="button" data-act="sides" data-v="' + v + '" aria-pressed="' + (state.sides === v) + '">' + l + '</button>').join('') + '</div></div>' +
    '<div class="set"><span>Frame colour</span>' + sw('frame', state.frame) + '</div>' +
    '<div class="set"><span title="For parts without their own colour; pick a part to give it one">Default panel</span>' + sw('panel', state.panel) + '</div>' +
    '<div class="set"><span>Accent</span>' + sw('acc', state.accent) + '</div>' +
    '<div class="set"><label for="rack-name">Name</label><input class="field" id="rack-name" type="text" maxlength="16" placeholder="Lab Rax" value="' + esc(state.label) + '" style="width:150px"></div>';
}
function renderControls() {
  $('#h-out').textContent = state.h + 'U';
  $('#h-minus').disabled = state.h <= 1; $('#h-plus').disabled = state.h >= 10;
  $('#v-flat').setAttribute('aria-pressed', view === 'front' || view === 'back'); $('#v-flat').textContent = 'Flat · ' + (view === 'back' || (view !== 'front' && rackSide === 'back') ? 'back' : 'front'); $('#v-air').setAttribute('aria-pressed', view === 'air'); $('#v-3d').setAttribute('aria-pressed', view === '3d');
  $('#example').hidden = !state.example;
  renderSettings();
}

/* ---------- parts lists ---------- */
function frameParts() {
  const h = state.h;
  if (h <= 5) return { posts: '4× ' + h + 'U', sides: '2× ' + h + 'U', joiners: 0, b: 0 };
  const b = h - 5; return { posts: '4× 5U + 4× ' + b + 'U', sides: '2× ' + b + 'U + 2× 5U', joiners: 4, b };
}
/* ---------- print bed check ---------- */
/* What each print-list row prints, as flat pieces that printers.js checks against the printer in ui.printer (a browser setting,
   not part of the layout). Sizes in mm; ≈ ones are estimates. The horizontal pieces span the outer width and are as wide as the ring
   (FRAME in view3d.js), which agrees with the Lab Rax article: they only fit a 256 mm bed diagonally and not a 220 mm bed. Posts and
   side panels are as tall as the rack up to 5U ("5U being the largest that fits a 250 mm print bed"), edge pieces and side panels
   are 170 mm deep and the top and bottom panels 228 × 171.5 mm (catalog frame dimensions). Catalog panels and mounts are taken as a
   full 10″ (254 mm) wide; custom parts are as parts.js makes them. */
const PANEL_10 = 254;
const SPLIT_FRAME = 'mw2452007'; // "5U for A1 mini (split parts)" in Frame & extras
const bedPrinter = () => window.LRPrinters.bed(ui.printer);
// ways: the footprints a piece can lie on, [a, b, height it then stands]; size: what the lists show
const piece = (name, ways, est, size) => ({ name, ways, est: !!est, size: size || ways[0].slice(0, 2) });
function framePieces() {
  const F = (window.LRView3D && window.LRView3D.FRAME) || { ring: 32, top: 36, post: 26, postDepth: 20 }, dm = CAT.frame.dimensions || {};
  const n = Math.min(state.h, 5), tall = n * P.U, deep = dm.sideBeam || 170, tp = dm.topPanel || [228, 171.5];
  const sides = (add, always) => always || state.sides !== 'acrylic' ? [piece('side panels (' + n + 'U)', [[tall, deep + add, 3]], true)] : [];
  return {
    ring: [piece('horizontal pieces', [[dm.outerWidth || 280, F.ring, F.top]], true), piece('edge pieces', [[deep, F.ring, F.top]], true),
      ...(!state.top || !state.bottom ? [piece(!state.top && !state.bottom ? 'top and bottom panels' : state.top ? 'bottom panel' : 'top panel', [[tp[0], tp[1], 3]], true)] : [])],
    posts: [piece('posts (' + n + 'U)', [[tall, F.post, F.postDepth]], true), ...sides(0)],
    top: [piece('top', [[tp[0], tp[1], 3]], true)],
    // frame extras: longer edge pieces and side panels for a deeper rack, patterned or fan side panels
    extra: d => { const s = d.shape || {}; return s.depth ? [piece('edge pieces', [[deep + s.depth, F.ring, F.top]], true), ...sides(s.depth)] : s.side || s.fan ? sides(frameMods().depthAdd || 0, true) : []; }
  };
}
function itemPieces(it, d) {
  if (it.key !== 'gen') return [piece(fmtU(d.h2) + (d.tab === 'devices' ? ' mount' : ' panel'), [[PANEL_10, LS.fit(d).h, 3]], true)];
  const p = it.params, h = P.panelH(p.u);
  if (p.type !== 'shelf') return [piece(fmtU(d.h2) + ' ' + GEN_NAMES[p.type].toLowerCase(), [[P.PANEL_W, h, 3]])];
  const dd = p.dd + 5; // front plate and rear stop; it prints face-down, or lying on its floor
  return [piece('shelf', [[P.PANEL_W, h, dd], [P.PANEL_W, dd, h]], false, [P.PANEL_W, h, dd])];
}
const mmTxt = v => String(Math.round(v * 10) / 10);
const sizeTxt = p => (p.est ? '≈' : '') + p.size.map(mmTxt).join(' × ') + ' mm';
const bedName = B => { const s = B.w + ' × ' + B.d + (B.h ? ' × ' + B.h : '') + ' mm'; return B.id === 'custom' ? s + ' bed' : B.name + ' (' + s + ')'; };
function bedText(r, short) { // a print-list row's pieces that don't fit the bed, or only fit diagonally; short where the printer is named above
  if (!r) return '';
  const names = ps => ps.map(p => p.name + ' ' + sizeTxt(p)).join(', ');
  return [r.bad.length ? (short ? 'Too big: ' : 'Too big for your printer: ') + names(r.bad) + '.' : '', r.turned.length ? (short ? 'Only diagonally: ' : 'Fits only diagonally: ') + names(r.turned) + '.' : ''].filter(Boolean).join(' ');
}
const bedBad = pk => pk.filter(x => x.bed && x.bed.bad.length);
function printerPicker(px) { // the printer select, and the bed size when it's your own
  const pr = ui.printer || {}, L = window.LRPrinters, custom = pr.id === 'custom';
  return '<span class="bedset"><select class="field pr-sel" id="' + px + '-printer" aria-label="Your 3D printer"><option value="">' + (px === 'wz' ? 'Skip for now' : 'Pick your printer to check the bed') + '</option>' +
    L.list.map(p => '<option value="' + p.id + '"' + (pr.id === p.id ? ' selected' : '') + '>' + esc(p.name) + ' · ' + p.w + ' × ' + p.d + '</option>').join('') +
    '<option value="custom"' + (custom ? ' selected' : '') + '>Other size…</option></select>' +
    (custom ? '<span class="beddims">' + [['w', 'Bed width'], ['d', 'Bed depth'], ['h', 'Build height (optional)']].map(([k, l]) => '<input class="field pr-dim" id="' + px + '-bed-' + k + '" type="number" min="' + L.MIN + '" max="' + L.MAX + '" step="1" inputmode="numeric" data-k="' + k + '" aria-label="' + l + ' in mm" title="' + l + '" placeholder="' + k.toUpperCase() + '" value="' + (typeof pr[k] === 'number' ? pr[k] : '') + '">').join('×') + ' mm</span>' : '') + '</span>';
}
function setPrinter(id, dims) {
  const L = window.LRPrinters, pr = Object.assign({}, ui.printer); // the custom size stays when switching to a preset and back
  if (dims) Object.keys(dims).forEach(k => { const v = Math.round(dims[k]); if (v >= L.MIN && v <= L.MAX) pr[k] = v; else delete pr[k]; });
  if (id === 'custom' && !dims && !L.bed(Object.assign({}, pr, { id }))) Object.assign(pr, { w: 256, d: 256 });
  pr.id = id || null; ui.printer = pr; saveUI();
  // draw the lists again once the focus has moved on (Tab fires change before it moves), and keep the focus where it is;
  // the wizard only changes when the size fields show or hide
  setTimeout(() => {
    const f = document.activeElement && document.activeElement.id;
    renderBuild();
    if (!dims && wz && $('#wizard').open) renderWizard();
    const el = f && document.getElementById(f); if (el && el !== document.activeElement) el.focus();
  });
}
function printPack() {
  const h = state.h, fr = CAT.frame, br = state.version === 'brass', out = []; let n = 0;
  // one row per model page, since each page is downloaded once; v is the variant printed from it, pieces what is printed (bed check)
  const add = (name, sub, url, qty, kind, v, pieces) => {
    const k = url || ('gen:' + name + sub);
    let ex = out.find(x => x.k === k);
    if (!ex) out.push(ex = { id: n++, k, name, subs: [], url, qty: 0, kind, vars: [], pieces: [] });
    ex.qty += qty; if (sub && !ex.subs.includes(sub)) ex.subs.push(sub);
    if (v) { const e = ex.vars.find(x => x.key === v.key); if (e) e.qty += qty; else ex.vars.push(Object.assign({ qty }, v)); }
    (pieces || []).forEach(p => { if (!ex.pieces.some(q => q.name === p.name && q.size.join() === p.size.join())) ex.pieces.push(p); });
  };
  const fp = framePieces();
  const variant = d => ({ key: d.key, name: d.name, label: d.label || '', h2: d.h2, u: d.top ? 'top' : d.extra ? 'extra' : fmtU(d.h2) });
  const fm = br ? fr.brass : fr.bolted;
  const acr = state.sides === 'acrylic';
  add(fm.name, h === 5 ? 'Complete 5U frame' + (acr ? '; skip the side panels, yours are acrylic' : ' with side panels') : 'Base frame: edges, horizontals, handles, feet', fm.url, 1, 'mw', null, h === 5 ? fp.ring.concat(fp.posts) : fp.ring);
  if (h !== 5) add(fr.sizes.name, 'Posts' + (acr ? '' : ' and side panels') + ' for ' + h + 'U', fr.sizes.url, 1, 'mw', null, fp.posts);
  if (h > 5) add(fr.extension.name, '4 joiners for ' + h + 'U', fr.extension.url, 1, 'mw');
  if (bottomPart()) { const d = bottomPart(); add(fullName(d), 'Replaces the bottom panel', d.url, 1, 'mw', variant(d), fp.top); }
  if (state.top) { const d = LIB[state.top]; add(fullName(d), 'Replaces the top panel', d.url, 1, 'mw', variant(d), fp.top); }
  state.extras.forEach(k => { const d = LIB[k]; add(fullName(d), 'Frame extra', d.url, 1, 'mw', variant(d), fp.extra(d)); });
  let missing = 0;
  byPos().forEach(i => {
    const d = info(i);
    const col = i.color ? ' · ' + colorName(i.color) : '';
    if (i.key === 'gen') { add(i.name, genLabel(i.params) + ' · ' + uRange(i.pos2, d.h2) + atBack(i) + col + ' · in the build pack', null, 1, 'gen', null, itemPieces(i, d)); return; }
    if (!d.url) { if (d.custom) missing++; return; }
    add(fullName(d), (i.label || shortName(d)) + ' · ' + uRange(i.pos2, d.h2) + atBack(i) + col + (slotText(i) ? ' · ' + slotText(i) : ''), d.url, 1, 'mw', variant(d), itemPieces(i, d));
  });
  // a page with several variants lists them, e.g. "½U ×2, 1U ×1", so it's clear which files to print
  out.forEach(x => {
    const vs = x.vars.sort((a, b) => a.h2 - b.h2), differ = f => new Set(vs.map(f)).size > 1;
    x.variants = '';
    if (vs.length < 2) return;
    const names = differ(v => v.name), us = differ(v => v.u);
    x.variants = vs.map(v => (names ? v.name + (us ? ' ' + v.u : '') : us ? v.u : v.label || v.u) + ' ×' + v.qty).join(', ');
    if (names) x.name = [...new Set(vs.map(v => v.name))].join(' / ');
  });
  const B = bedPrinter();
  out.forEach(x => { x.bed = B ? window.LRPrinters.check(x.pieces, B) : null; });
  out.missing = missing; out.printer = B;
  return out;
}
/* ---------- shopping list and build guide ---------- */
/* Everything to buy and every step to build, derived from the layout: filament per colour, screws and inserts in packs,
   fans with safe 5 V power, network, power supplies, acrylic and handy extras (tips.json). Shop links come from
   catalog.json "shops", with the maintainer's affiliate tag or deep-link template when one is set. */
let TIPS = null; // tips.json: { items, tips }, loaded after the catalog when it exists
const SHOP_GROUPS = [['print', 'Filament'], ['fasteners', 'Screws and inserts'], ['tools', 'Tools'], ['cooling', 'Fans and fan power'], ['power', 'Power'], ['network', 'Network'], ['acrylic', 'Acrylic'], ['other', 'Handy extras']];
function shopLinks(q) { return q ? window.LRMarket.links(q,state.market,(CAT && CAT.shops)||{}) : []; }
const shopUrl = q => (shopLinks(q)[0] || {}).url || null;
const affiliate = () => { const S = (CAT && CAT.shops) || {}; return Object.keys(S).some(k => S[k] && (S[k].tag || S[k].wrap)); };
// grams of filament per U, by face: a rough estimate before slicing
const GRAMS_PER_U = { blank: 22, vent: 20, ks: 25, fan: 30, d: 25, sbc: 60, drv2: 70, drv4: 70, switch: 45, shelf: 45, cut: 45 };
function filament() {
  const g = new Map(), add = (c, n) => g.set(c, (g.get(c) || 0) + n), h = state.h;
  add(state.frame, 380 + 40 * h);                                   // frame: about 580 g for 5U (Lab Rax article)
  if (state.sides !== 'acrylic') add(state.frame, 72 * h);          // side panels: about 360 g for 5U
  if (!state.bottom) add(state.frame, 60); else if (bottomPart()) add(state.panel, 120); // bottom panel: printed, a catalog panel or acrylic
  if (state.top) add(state.panel, 120); else add(state.accent, 60); // top mount, or the top panel in the accent colour
  placed().forEach(i => { const d = info(i), face = i.key === 'gen' ? genFace(i.params) : d.face; add(colorOf(i), Math.max(12, (GRAMS_PER_U[face] || 40) * d.h2 / 2)); });
  state.extras.forEach(() => add(state.frame, 60));
  return [...g].map(([c, grams]) => ({ c, grams: Math.round(grams * 1.1 / 10) * 10 })); // +10 % for brims, purge and a failed print
}
function buildEstimate() { return window.LREstimate.calculate(filament(), orderList(), state.costs); }
function estimateHTML(includeSummary = true) {
  const e=buildEstimate(), s=e.s, money=n=>window.LREstimate.money(n,s.currency);
  const field=(key,label,value,step='1')=>'<label style="display:flex;flex-direction:column;gap:3px">'+esc(label)+'<input class="field" data-cost="'+esc(key)+'" type="number" min="'+(key==='gramsHour'?'0.1':'0')+'" step="'+step+'" value="'+(value==null?'':value)+'" placeholder="Estimate"></label>';
  return (includeSummary ? '<p><b>≈ '+e.grams.toFixed(0)+' g · '+e.hours.toFixed(1)+' machine hours · '+money(e.printing)+' print use</b></p><p>Remaining purchase budget: '+(e.unknown.length?'known subtotal ':'≈ ')+money(e.total)+(e.unknown.length?' + '+e.unknown.length+' unpriced items':'')+'</p>' : '')+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+field('kgPrice','Filament / kg ('+s.currency+')',s.kgPrice,'.01')+field('kwhPrice','Electricity / kWh ('+s.currency+')',s.kwhPrice,'.01')+field('watts','Average printer power (W)',s.watts)+field('gramsHour','Rough throughput (g/h)',s.gramsHour,'.1')+field('slicedGrams','Slicer total (g), optional',s.slicedGrams)+field('slicedHours','Slicer total (hours), optional',s.slicedHours,'.1')+'</div>'+
    '<p class="hint">Editable prices in '+s.currency+'; no currency conversion or live quotes. Budget accounts for owned stock, then buys whole spools and hardware packs. Excludes devices, tools and delivery. Blank slicer fields use rough estimates.</p>'+
    '<details><summary>Edit hardware allowances (per pack / item)</summary>'+e.supplies.map(r=>field('price:'+r.key,r.name+(r.pack>1?' / '+r.pack+' pack':''),r.price,'.01')).join('')+'</details>';
}
const modsOf = d => { const s = d && d.shape; return s ? [].concat(...(s.rows || [s.row || []])).filter(m => m && typeof m === 'object') : []; };
function facts() { // what the layout holds, for the shopping list and the guide
  const f = { ks: 0, pi5: 0, pi4: 0, poePi5: 0, poePi4: 0, boards: 0, eth: 0, mains: 0, drives: 0, strip: false, gateway: false, fanParts: [], fans: new Map(), amps: 0 };
  const fanPart = d => { let n = 0; (d.hardware || []).forEach(x => { const hw = CAT.hardware[x.part]; if (hw && hw.mm) { n += x.qty; f.fans.set(x.part, (f.fans.get(x.part) || 0) + x.qty); f.amps += x.qty * (hw.amp || .15); } }); if (n) f.fanParts.push({ name: fullName(d), n }); };
  placed().forEach(i => {
    const d = info(i), mods = modsOf(d), name = fullName(d);
    mods.forEach(m => { if (typeof m.ks === 'number') f.ks += m.ks; });
    if (i.key === 'gen' && i.params.type === 'keystone') f.ks += (i.params.ports || 12) * (i.params.rows || 1);
    let boards = 0, pi5 = 0, pi4 = 0; mods.forEach(m => { if (m.sbc) { const n = typeof m.sbc === 'number' ? m.sbc : 1; boards += n; if (/pi4/.test(m.board || '')) pi4 += n; else if (/pi/.test(m.board || 'pi5')) pi5 += n; } });
    if (!boards && d.tab === 'devices' && /raspberry|\bpi ?[345]\b/i.test(name)) { boards = 1; if (/pi ?4/i.test(name)) pi4++; else pi5++; }
    f.boards += boards; f.pi5 += pi5; f.pi4 += pi4;
    if (onPoe(i, powerOf(d, i))) { f.poePi5 += pi5; f.poePi4 += pi4; } // Pis on PoE get a PoE+ HAT instead of a USB-C supply
    if (/drv/.test(d.face || '') || mods.some(m => m.bay)) f.drives++;
    if (d.group && /gateway/i.test(d.group)) f.gateway = true;
    if (d.tab === 'panels' && /strip|pdu|outlet/i.test(name)) f.strip = true;
    if ((d.tab === 'devices' && !/power/i.test(d.group || '')) || d.custom || (i.key === 'gen' && i.params.type === 'shelf')) { f.eth += boards || 1; if (!boards) f.mains++; }
    fanPart(d);
  });
  if (state.top) fanPart(LIB[state.top]);
  state.extras.forEach(k => fanPart(LIB[k]));
  return f;
}
function orderList() {
  const m = new Map(), add = (p, q) => { if (CAT.hardware[p] && q > 0) m.set(p, (m.get(p) || 0) + q); }, br = state.version === 'brass', f = facts();
  (br ? CAT.frame.brass : CAT.frame.bolted).hardware.forEach(x => add(x.part, x.qty));
  const sc = placed().reduce((n, i) => n + (H(i) === 1 ? 2 : 4), 0);
  if (sc) { add(br ? 'm6x10' : 'm6x12', sc); add(br ? 'insert' : 'nut', sc); }
  placed().forEach(i => (info(i).hardware || []).forEach(x => add(x.part, x.qty)));
  if (state.top) (LIB[state.top].hardware || []).forEach(x => add(x.part, x.qty));
  if (bottomPart()) (bottomPart().hardware || []).forEach(x => add(x.part, x.qty));
  state.extras.forEach(k => (LIB[k].hardware || []).forEach(x => add(x.part, x.qty)));
  if (br) add('inserttip', 1);
  add('hexkey', 1);
  if (f.boards) add('m25kit', 1);
  // fans: each fan part gets a USB-to-fan cable, a splitter when it holds more than one fan, and a USB port
  if (f.fanParts.length) { add('fanusb', f.fanParts.length); add('fansplit', f.fanParts.filter(p => p.n > 1).length); add('usbpower', Math.ceil(f.fanParts.length / 2)); add('fanspeed', 1); }
  if (f.pi5 > f.poePi5) { add('pi5psu', f.pi5 - f.poePi5); add('usbc', f.pi5 - f.poePi5); }
  if (f.pi4 > f.poePi4) { add('pi4psu', f.pi4 - f.poePi4); add('usbc', f.pi4 - f.poePi4); }
  add('poehat5', f.poePi5); add('poehat4', f.poePi4);
  // PoE devices that no switch in the rack can power: an injector each (the Power section also suggests a bigger switch)
  const off = powerModel().poe.unpowered, bt = off.filter(p => p.need === 'bt').length;
  add('poeinj', off.length - bt); add('poeinjbt', bt);
  if (f.mains && !f.strip) add('powerstrip', Math.ceil((f.mains + (f.fanParts.length ? 1 : 0)) / 6));
  if (f.ks) add('keystone', f.ks);
  if (f.eth) add('patch', f.eth + Math.min(f.ks, f.eth));
  add('ties', 1);
  const out = [...m].map(([p, q]) => { const hw = CAT.hardware[p], q2 = hw.search || hw.name, packs = hw.pack > 1 ? Math.ceil(q / hw.pack) : null;
    return { key: p, group: hw.group || 'other', name: hw.name, spec: hw.spec || '', qty: q, pack: hw.pack || null, packs, links: shopLinks(q2), buy: hw.buy || shopUrl(q2),
      models: (hw.models || []).map(([label, s]) => ({ label, name: s, links: shopLinks(s) })) }; });
  out.forEach(r => { if (r.key !== 'poeinj' && r.key !== 'poeinjbt') return; // say which devices the injectors are for
    const who = [...new Set(off.filter(p => (p.need === 'bt') === (r.key === 'poeinjbt')).map(p => p.name))];
    r.spec = (r.spec ? r.spec + '. ' : '') + 'For ' + who.join(', ') + '; or a bigger PoE switch, see Power & network'; });
  const fil = CAT.hardware.filament || { name: 'PETG filament, 1.75 mm', search: 'PETG filament 1.75mm {colour} 1kg' };
  filament().forEach(x => { const cn = colorName(x.c), named = cn[0] !== '#', q2 = fil.search.replace('{colour}', named ? cn.toLowerCase() : '').replace(/\s+/g, ' ');
    out.push({ key: 'filament-' + x.c, group: 'print', name: fil.name.replace('1.75 mm', named ? cn : 'custom ' + cn) + ', 1.75 mm', spec: '≈ ' + x.grams + ' g with 10 % spare; an estimate before slicing', qty: Math.ceil(x.grams / 1000), unit: 'spool', swatch: x.c, links: shopLinks(q2), buy: shopUrl(q2) }); });
  if (state.sides === 'acrylic') { const a = CAT.hardware.acrylic || {};
    out.push({ key: 'acrylic', group: 'acrylic', name: a.name || 'Acrylic sheet, 3 mm, cut to size', spec: (a.spec || '') + '. Take the size from the printed side panel model; the planner has no measured size yet.', qty: 2, links: [], buy: null, cutters: (CAT.acrylic || []).filter(c => ['NL','BE'].includes(state.market) || /worldwide/i.test(c.note || '')) }); }
  if (state.bottom === 'acrylic') { const a = CAT.hardware.acrylic || {}, tp = (CAT.frame.dimensions || {}).topPanel || [228, 171.5];
    out.push({ key: 'acrylic-bottom', group: 'acrylic', name: 'Acrylic bottom panel, 3 mm', spec: tp[0] + ' × ' + tp[1] + ' mm, the size of the printed bottom panel; check it against the frame model before ordering', qty: 1, links: [], buy: null, cutters: (CAT.acrylic || []).filter(c => ['NL', 'BE'].includes(state.market) || /world|eu/i.test(c.note || '')) }); }
  if (state.extras.some(k => LIB[k].shape && LIB[k].shape.wall)) out.push({ key: 'wallfixings', group: 'fasteners', name: 'Wall bracket fixings', spec: 'Choose for the selected bracket, loaded rack and wall', qty: null, links: [], buy: null });
  if (state.h > 5) out.push({ key: 'joiners', group: 'fasteners', name: 'Fasteners for the 4 post joiners', spec: 'Not confirmed yet; check the extension model page', qty: null, links: [], buy: null, check: CAT.frame.extension.url });
  // handy extras from tips.json, when they fit this rack
  const when = { always: true, fans: f.fanParts.length > 0, acrylic: state.sides === 'acrylic' || state.bottom === 'acrylic', brass: br, bolted: !br, network: f.eth > 0 || f.ks > 0, sbc: f.boards > 0, drives: f.drives > 0, tall: state.h > 5, power: f.mains > 0 };
  ((TIPS && TIPS.items) || []).forEach(t => { if (!t || !t.name || !when[t.when || 'always'] || out.some(o => o.key === t.id)) return;
    out.push({ key: t.id, group: t.group || 'other', name: t.name, spec: t.spec || '', why: t.why || '', qty: t.qty || 1, pack: t.pack || null, packs: null, optional: true, links: shopLinks(t.search || t.name), buy: shopUrl(t.search || t.name) }); });
  const order = SHOP_GROUPS.map(g => g[0]);
  return out.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
}
const qtyText = r => r.qty == null ? 'check' : r.unit === 'spool' ? r.qty + (r.qty > 1 ? ' spools' : ' spool') : r.packs ? r.qty + ' · ' + r.packs + (r.packs > 1 ? ' packs' : ' pack') + ' of ' + r.pack : r.qty + '×';
const linksHTML = ls => ls && ls.length ? '<span class="slinks">' + ls.map(l => '<a href="' + esc(l.url) + '" target="_blank" rel="noopener' + (l.aff ? ' sponsored' : '') + '">' + esc(l.shop) + '</a>').join('') + '</span>' : '';
function shopHTML(rows) {
  return SHOP_GROUPS.map(([g, title]) => { const rs = rows.filter(r => r.group === g); if (!rs.length) return '';
    return '<p class="sgroup">' + title + '</p><ul class="slist">' + rs.map(r => '<li class="srow">' +
      '<div class="stx"><b>' + (r.swatch ? '<i class="swatchdot" style="--c:' + r.swatch + '"></i>' : '') + esc(r.name) + (r.optional ? ' <span class="muted">· optional</span>' : '') + '</b>' +
      (r.spec ? '<small>' + esc(r.spec) + '</small>' : '') + (r.why ? '<small>' + esc(r.why) + '</small>' : '') +
      (r.models || []).map(mo => '<small class="smodel">' + esc(mo.label) + ': ' + esc(mo.name) + linksHTML(mo.links) + '</small>').join('') +
      (r.cutters || []).map(c => '<small class="smodel"><a href="' + esc(c.url) + '" target="_blank" rel="noopener">' + esc(c.name) + '</a> · ' + esc(c.note || '') + '</small>').join('') +
      (r.check ? '<small><a href="' + esc(r.check) + '" target="_blank" rel="noopener">Check the model page</a></small>' : '') +
      '</div><span class="sqty">' + qtyText(r) + '</span>' + (r.models && r.models.length ? '' : linksHTML(r.links)) + '</li>').join('') + '</ul>'; }).join('');
}
function guide() {
  const f = facts(), br = state.version === 'brass', acr = state.sides === 'acrylic', fp = frameParts(), screw = br ? 'M6×10 screw' : 'M6×12 screw and nut', S = [];
  const add = (id, title, steps) => S.push({ id, title, steps: steps.filter(Boolean) });
  const fil = filament(), gens = byPos().some(i => i.key === 'gen'), mountScrews = placed().reduce((n, i) => n + (H(i) === 1 ? 2 : 4), 0);
  add('print', 'Print the parts', [
    'Print in PETG; PLA is fine for a rack that stays cool. Download each community model as 3MF from MakerWorld to keep its print profile: the build pack has a download list.',
    'Frame: ' + fp.posts + ' posts, 4 horizontal pieces, 4 edge pieces, 2 handles and 4 feet' + (acr ? '' : ', side panels ' + fp.sides) + '. The horizontal pieces need a print bed of about 250 mm.',
    'Filament: ' + fil.map(x => colorName(x.c) + ' ≈ ' + x.grams + ' g').join(', ') + '.',
    gens ? 'Your custom parts are in custom-parts/ in the build pack. Panels and shelves print face-down, label plates face-up, without supports.' : null]);
  if (br) add('inserts', 'Melt in the inserts', [
    'You need ' + ((CAT.frame.brass.hardware.find(x => x.part === 'insert') || { qty: 24 }).qty + mountScrews) + ' M6 inserts: the frame joints, the handles and feet, and ' + mountScrews + ' in the posts for your parts.',
    'Use an M6 insert tip at about 220–240 °C for PETG. Press straight down until the insert is flush, keep it square, and let it cool before you screw into it.',
    'In the posts, only melt inserts into the holes your parts use: see "Mount the parts" below.']);
  add('frame', 'Build the frame', [
    'Base: put ' + (state.bottom === 'acrylic' ? 'the 3 mm acrylic bottom panel' : bottomPart() ? fullName(bottomPart()) + ' as the bottom panel' : 'the bottom panel') + ' between two edge pieces and two horizontal pieces, one ' + screw + ' per joint.',
    'Stand the four posts on the base, one screw per joint' + (fp.joiners ? ', and join them to ' + state.h + 'U with the post joiners' : '') + '.',
    'Slide the ' + (acr ? '3 mm acrylic ' : '') + 'side panels into the slots between the posts' + (fp.joiners ? '; turn them the opposite way to the posts so the seams don’t line up' : '') + '.',
    'Add the top horizontal pieces, then ' + (state.top ? 'the ' + fullName(LIB[state.top]) : 'the top panel') + ', and close the top with the last two edge pieces.',
    'Screw the handles on top and the feet underneath; they use the same hole pattern.']);
  add('mount', 'Mount the parts, top to bottom', ['Fit each device into its mount first, then screw the panel to the front of the posts: ½U panels take one ' + screw + ' per side, 1U and taller two per side.']
    .concat(byPos().map(i => { const d = info(i); return uRange(i.pos2, d.h2) + atBack(i) + ': ' + (i.label ? i.label + ' – ' : '') + fullName(d) + ' (' + (H(i) === 1 ? 2 : 4) + ' screws' + (sideOf(i) === 'back' ? ', on the rear posts, facing out the back' : '') + ')'; })));
  if (f.eth || f.ks) add('network', 'Connect the network', [
    f.ks ? 'Snap the ' + f.ks + ' keystone jacks into the patch panel and number them.' : null,
    'Run short patch cables from each device to the switch' + (f.gateway ? ', and from the switch to the gateway' : '') + (f.ks ? '; patch the keystone ports you use the same way' : '') + '.',
    'Keep network cables on one side of the rack and power cables on the other, and bundle them with velcro ties.']);
  add('power', 'Connect the power', [
    f.mains ? 'Plug the power supplies of your ' + f.mains + ' device' + (f.mains > 1 ? 's' : '') + ' into ' + (f.strip ? 'the power strip in the rack' : 'one certified power strip with overload protection') + '. Don’t plug one power strip into another.' : null,
    f.pi5 > f.poePi5 ? 'Each Raspberry Pi 5 gets its own 27 W USB-C supply (5.1 V, 5 A); a weaker supply limits the USB ports and can make the Pi unstable.' : null,
    f.pi4 > f.poePi4 ? 'Each Raspberry Pi 4 gets a 15 W USB-C supply (5.1 V, 3 A).' : null,
    f.poePi5 + f.poePi4 > 1 ? 'The ' + (f.poePi5 + f.poePi4) + ' Raspberry Pis on PoE get a PoE+ HAT each and take their power from a PoE+ switch port: no USB-C supply.' :
      f.poePi5 + f.poePi4 ? 'The Raspberry Pi on PoE gets a PoE+ HAT and takes its power from a PoE+ switch port: no USB-C supply.' : null,
    f.pi5 + f.pi4 > 2 ? 'With several Pis, a PoE switch with PoE HATs, or one multi-port USB-C charger with enough watts per port, is tidier than one supply per Pi.' : null,
    'Wiring mains inside the rack (DIY outlets, inlets or switches) is only for someone qualified to do it. A certified power strip in a holder is the safe choice.']);
  if (f.fanParts.length) add('fans', 'Connect the fans safely', [
    'Check the arrow on each fan before you screw it in: fans low in the rack blow in, fans at the top blow out, so the air rises through the rack.',
    'Use 5 V fans. Plug the fans of each panel into a splitter, the splitter into a USB-to-fan cable, and that into a USB charger.',
    'Add up the current printed on the fans: keep it under 1 A per USB port and under the charger’s rating. Your fans draw about ' + f.amps.toFixed(1) + ' A in total.',
    'Never connect 12 V fans to USB, and don’t power several fans from a Raspberry Pi’s GPIO pins.',
    'Too loud? Put a USB speed controller between the charger and the fans.']);
  add('finish', 'Final check', [
    'Close the open slots with blank or vent panels, as the Cooling section suggests.',
    'Bundle the cables at the back with velcro and label both ends.',
    'Switch on one device at a time, and check the temperatures after an hour of normal use.']);
  return S;
}
function guideData() {
  return { h: state.h, version: state.version === 'brass' ? 'Heat-set inserts' : 'Bolted', sides: state.sides,
    frame: state.frame, panel: state.panel, accent: state.accent, top: state.top ? fullName(LIB[state.top]) : null,
    wallMounts: state.extras.filter(k => LIB[k].shape && LIB[k].shape.wall).map(k => ({ name: fullName(LIB[k]), url: LIB[k].url })), frameParts: frameParts(), guide: guide(), items: byPos().map(i => { const d = info(i); return {
      pos: uRange(i.pos2, d.h2), pos2: i.pos2, h2: d.h2, name: fullName(d), label: i.label || '', back: sideOf(i) === 'back', face: faceSVG(d, colorOf(i), upperHalf(i)) }; }) };
}
function guideHTML() { return window.LRGuide.html(guideData()); }
/* build-guide.html in the build pack: the guide and the shopping list with links, on one page that prints well */
function buildGuidePage() {
  const title = (state.label || 'Lab Rax') + ' · ' + state.h + 'U', rows = orderList().filter(r => !r.optional && r.group !== 'tools' && r.key !== 'fanspeed');
  const css = DL_CSS + window.LRGuide.css + 'h2{font-size:18px}.gstep{margin:0 0 14px}.gstep ul{margin:6px 0 0;padding-left:20px}.gstep li{margin:3px 0}.gtip{color:var(--muted)}' +
    '.sgroup{margin:18px 0 6px;font-weight:700}.srow{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid var(--line);list-style:none}.stx{flex:1;display:flex;flex-direction:column}.stx small{color:var(--muted)}' +
    '.sqty{white-space:nowrap;font-size:13px}.slinks{display:flex;flex-direction:row;flex:none;gap:10px}.slinks a{font-size:13px}.smodel{display:flex;flex-wrap:wrap;gap:2px 10px;align-items:center}.smodel .slinks{justify-content:flex-start}.srow{flex-wrap:wrap}.slist{margin:0;padding:0}.swatchdot{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--c);margin-right:6px;box-shadow:0 0 0 1px rgba(127,127,127,.5)}';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Build guide · ' + esc(title) + '</title><style>' + css + '</style></head><body><main>' +
    '<h1>Build guide</h1><p>' + esc(title) + '. Community models: open download-list.html. ' + (affiliate() ? 'Some shop links are affiliate links; the maintainer of the planner may earn a small commission at no cost to you.' : '') + '</p>' +
    '<h2>What to buy</h2>' + shopHTML(rows) + '<h2>Build and wire it</h2>' + guideHTML(guide()) + '</main></body></html>';
}
const JOINER_NOTE = 'Above 5U the posts are joined. How the post joiners are fastened isn’t confirmed yet, so their screws aren’t counted; check the extension model page.';

/* ---------- airflow ---------- */
/* An estimate from typical power use and simple physics; airflow.js holds the model and its assumptions. Here the rack is
   described for it: heat per ½U layer, the openings (open slots, vent panels, an open back, a mesh top, vented sides and the
   seams between panels), the fans with their rated flow and direction, and the walls. */
const RATED = [35, 40];                             // hottest air up to 35 °C is cool, up to 40 °C warm; most gear is rated for 0–40 °C
const HEAT_SPAN = 25;                               // the colour scale runs from room temperature to 25 °C above it
const BAY_W = .222, RACK_D = .24, SIDE_D = .17;     // m: width between the posts, rack depth, side panel depth
const TOP_A = .216 * .176;                          // m², the opening of the top panel
const DIR_BTN = { intake: 'In', exhaust: 'Out', cross: 'In + out' };
const fmtT = t => t > 60 ? '60+ °C' : Math.round(t) + ' °C'; // past 60 °C the exact figure means little: gear shuts down long before
const fmtF = v => Math.round(v) + ' m³/h';
const fmtW = w => (w < 10 && w % 1 ? w.toFixed(1) : Math.round(w)) + ' W';
function heatOf(it) { // { w, est }: what the builder entered, else the catalog, else a guess for own parts
  if (typeof it.watts === 'number') return { w: it.watts, est: false, own: true };
  const d = info(it);
  if (typeof d.watts === 'number') return { w: d.watts, est: !!d.wattsEst };
  if (it.key === 'gen') return it.params.type === 'shelf' ? { w: 10, est: true } : { w: 0, est: false };
  return d.custom ? { w: 10, est: true } : { w: 0, est: false };
}
// fans a part holds, from its hardware: [{ mm, cfm, pa, qty }], rated at full speed in free air
const fanSpecs = d => (d && d.hardware || []).filter(x => CAT.hardware[x.part] && CAT.hardware[x.part].cfm).map(x => Object.assign({ qty: x.qty }, CAT.hardware[x.part]));
const cfmOf = d => fanSpecs(d).reduce((n, f) => n + f.cfm * f.qty, 0);
const toM3h = cfm => cfm * 1.699;
function fanLine(d) { const c = cfmOf(d); return fanSpecs(d).map(f => (f.qty > 1 ? f.qty + '× ' : '') + f.mm + ' mm').join(' + ') + ' · ' + Math.round(c) + ' CFM · ' + fmtF(toM3h(c)); }
// where a part's fans sit and which way they blow: the builder's choice, else the catalog's, else in at the front and sides, out at the top and back.
// A pair in an extra can also go one in, one out: across the side panels, or in at the bottom and out at the top.
const fanPlace = (d, kind, it) => kind === 'item' ? sideOf(it) : kind === 'top' ? 'top' : kind === 'bottom' ? 'bottom' : d.fanAt || d.at || 'side';
const canCross = (d, place, kind) => kind === 'extra' && (place === 'side' || place === 'top') && fanSpecs(d).reduce((n, f) => n + f.qty, 0) >= 2;
function dirFor(d, chosen, place, kind) {
  const ok = v => v === 'intake' || v === 'exhaust' || (v === 'cross' && canCross(d, place, kind));
  // a fan panel on the rear posts blows out by default, so the air goes front to back whatever the catalog suggests for the front
  return ok(chosen) ? chosen : kind === 'bottom' ? 'intake' : kind === 'item' && place === 'back' ? 'exhaust' : ok(d.fanDir) ? d.fanDir : place === 'top' || place === 'back' ? 'exhaust' : 'intake';
}
const dirText = (dir, place) => dir === 'intake' ? 'blows in' : dir === 'exhaust' ? 'blows out' : place === 'top' ? 'blows in at the bottom and out at the top' : 'blows in on one side and out on the other';
function fanParts() { // every part in the rack with fans
  const out = [], add = (ref, d, kind, chosen, name, it) => { const place = fanPlace(d, kind, it); out.push({ ref, d, it, kind, place, dir: dirFor(d, chosen, place, kind), name, where: it ? uRange(it.pos2, d.h2) + atBack(it) : place === 'side' ? 'sides' : place }); };
  byPos().forEach(it => { const d = info(it); if (cfmOf(d)) add('i' + it.id, d, 'item', it.dir, it.label || fullName(d), it); });
  if (state.top && cfmOf(LIB[state.top])) add('top', LIB[state.top], 'top', state.topDir, fullName(LIB[state.top]));
  if (bottomPart() && cfmOf(bottomPart())) add('bottom', bottomPart(), 'bottom', state.bottomDir, fullName(bottomPart()) + ' (bottom)');
  state.extras.forEach(k => { if (cfmOf(LIB[k])) add('x' + k, LIB[k], 'extra', state.xdir[k], fullName(LIB[k])); });
  return out;
}
// reassigns rather than edits, so predict() can put the old values back
function setFanDir(ref, v) {
  if (ref === 'top') state.topDir = v;
  else if (ref === 'bottom') state.bottomDir = v;
  else if (ref[0] === 'x') state.xdir = Object.assign({}, state.xdir, { [ref.slice(1)]: v });
  else state.items = state.items.map(i => 'i' + i.id === ref ? Object.assign({}, i, { dir: v }) : i);
}
function frontVent(it, d) { // m² of free area in a part's front plate
  const ph = d.h2 * P.U / 2 - P.CLEAR; // plate height in mm
  if (it.key === 'gen') {
    const p = it.params, m = d.h2 === 1 ? 4.5 : 6.5;
    if (p.type === 'vent') return (p.pattern === 'hex' ? .64 : .55) * 196 * Math.max(0, ph - 2 * m) / 1e6; // matches parts.js
    if (p.type === 'shelf' && p.open !== false) return .2 * Math.min(p.dw, 212) * Math.min(p.dh, ph) / 1e6;  // the device fills most of the cut-out
    if (p.type === 'pass') { const sh = P.passH(p.u); return (p.style === 'brush' ? .3 * p.width * sh : .5 * ((p.width - sh) * sh + Math.PI * sh * sh / 4)) / 1e6; } // cables fill half the slot; the fingers close most of a brush slot
    return 0; // a fan panel's openings belong to its fans; the D-type cut-outs are filled by their connectors
  }
  if (d.vent) return d.vent * 200 * ph / 1e6;
  return d.face === 'vent' ? .4 * 200 * Math.max(0, ph - 13) / 1e6 : 0; // slots over 200 mm, a 6.5 mm rim, 40 % open
}
function rackModel() {
  const K = window.LRAir.K, n = slots(), dz = P.U / 2000, heat = new Array(n).fill(0), ua = new Array(n).fill(0);
  const openings = [], fans = [], groups = [], parts = [], occ = new Array(n).fill(null), occB = new Array(n).fill(null); // parts at the front, at the back
  const group = (kind, name, where, extra) => { const g = Object.assign({ kind, name, where, ids: [], area: 0, layers: [] }, extra); groups.push(g); return g; };
  const hole = (g, area, layer, at) => { const id = 'o' + openings.length; openings.push(at ? { id, at, area } : { id, layer, area }); g.ids.push(id); g.area += area; if (!at) g.layers.push(layer); };
  byPos().forEach(it => {
    const d = info(it), h = heatOf(it), lay = [], rear = sideOf(it) === 'back';
    for (let s = it.pos2; s < Math.min(n, it.pos2 + d.h2); s++) { lay.push(s); (rear ? occB : occ)[s] = it; }
    lay.forEach(s => { heat[s] += h.w / lay.length; });
    parts.push({ it, d, w: h.w, est: h.est, own: !!h.own, layers: lay });
    const area = frontVent(it, d);
    if (area > 0) { const g = group(rear ? 'back' : 'front', it.label || fullName(d), uRange(it.pos2, d.h2) + atBack(it), { it }); lay.forEach(s => hole(g, area / lay.length, s)); }
  });
  for (let s = 0; s < n;) { // open slots, one group per run
    if (occ[s]) { s++; continue; }
    let e = s; while (e < n && !occ[e]) e++;
    const g = group('slot', 'Open ' + fmtU(e - s), uRange(s, e - s)); for (let k = s; k < e; k++) hole(g, BAY_W * dz, k);
    s = e;
  }
  const back = state.back !== 'closed', top = state.top ? LIB[state.top] : null, topVent = top && top.vent || 0;
  if (back && occB.some(o => !o)) { const g = group('back', occB.some(o => o) ? 'Open part of the back' : 'Open back', 'back'); for (let s = 0; s < n; s++) if (!occB[s]) hole(g, BAY_W * dz, s); }
  if (topVent) hole(group('top', fullName(top), 'top'), TOP_A * topVent, 0, 'top');
  const bot = bottomPart(); if (bot && bot.vent) hole(group('bottom', fullName(bot) + ' (bottom)', 'bottom'), TOP_A * bot.vent, 0, 'bottom');
  state.extras.forEach(k => { const d = LIB[k]; if (d.at === 'side' && d.vent) { const g = group('side', fullName(d), 'both sides'); for (let s = 0; s < n; s++) hole(g, 2 * SIDE_D * dz * d.vent, s); } });
  const seams = group('seams', 'Seams between panels', 'everywhere');
  for (let s = 0; s < n; s++) hole(seams, K.leak, s);
  hole(seams, K.leakTB, 0, 'top'); hole(seams, K.leakTB, 0, 'bottom');
  const fp = fanParts();
  fp.forEach(f => {
    let layers;
    if (f.it) { const lay = [], end = Math.min(n, f.it.pos2 + f.d.h2); for (let s = f.it.pos2; s < end; s++) lay.push(s); layers = lay.map(s => ({ layer: s, share: 1 / lay.length })); } // a fan panel, front or back
    else if (f.place === 'top') layers = [{ at: 'top', share: 1 }];
    else if (f.place === 'bottom') layers = [{ at: 'bottom', share: 1 }];
    else { // side fans sit halfway up, back fans in the upper part; a fan covers as many ½U layers as it is wide
      const mm = Math.max(...fanSpecs(f.d).map(x => x.mm)), c = Math.max(1, Math.min(n, Math.round(mm / 1000 / dz)));
      const s0 = Math.max(0, Math.min(n - c, Math.round((f.place === 'back' ? n / 4 : n / 2) - c / 2)));
      layers = []; for (let s = s0; s < s0 + c; s++) layers.push({ layer: s, share: 1 / c });
    }
    f.ids = [];
    fanSpecs(f.d).forEach((x, k) => {
      const ins = f.dir === 'cross' ? Math.ceil(x.qty / 2) : f.dir === 'intake' ? x.qty : 0;
      [[ins, 1], [x.qty - ins, -1]].forEach(([q, dir], j) => {
        if (!q) return;
        const id = f.ref + ':' + k + ':' + j, at = f.dir === 'cross' && f.place === 'top' && dir > 0 ? [{ at: 'bottom', share: 1 }] : layers; // a top + bottom pair takes air in at the bottom
        f.ids.push(id); fans.push({ id, cfm: x.cfm * q, pa: x.pa, mm: x.mm, dir, layers: at });
      });
    });
  });
  for (let s = 0; s < n; s++) ua[s] = K.uWall * dz * (2 * RACK_D + (occ[s] ? BAY_W : 0) + (back && !occB[s] ? 0 : BAY_W)); // sides, panels, a closed back or rear panels
  ua[0] += K.uWall * BAY_W * RACK_D * (1 - topVent); ua[n - 1] += K.uWall * BAY_W * RACK_D;            // top and bottom panel
  return { model: { n, dz, room: state.room, heat, ua, openings, fans }, groups, parts, fp };
}
const airMemo = new Map();
function airflow() {
  const sig = JSON.stringify([state.bottom, state.bottomDir, state.h, state.items.map(i => [i.key, i.pos2, i.watts, i.dir, i.params, i.side, i.fill]), state.top, state.topDir, state.extras, state.xdir, state.back, state.room]);
  if (airMemo.has(sig)) return airMemo.get(sig);
  const m = rackModel(), r = window.LRAir.solve(m.model), flow = {};
  r.openings.forEach(o => { flow[o.id] = o.flow; }); r.fans.forEach(f => { flow[f.id] = f.flow; });
  const sum = ids => ids.reduce((s, id) => { const v = flow[id] || 0; if (v > 0) s.in += v; else s.out -= v; return s; }, { in: 0, out: 0 });
  m.groups.forEach(g => { Object.assign(g, sum(g.ids)); g.flows = g.ids.map(id => flow[id] || 0); });
  m.fp.forEach(f => Object.assign(f, sum(f.ids), { rated: toM3h(cfmOf(f.d)) }));
  m.parts.forEach(p => { const t = p.layers.map(s => r.temp[s]); p.T = t.length ? t.reduce((x, y) => x + y, 0) / t.length : r.room; });
  const a = { Q: r.Q, est: m.parts.some(p => p.est && p.w > 0), r, room: r.room, temp: r.temp, maxT: r.maxT, rise: r.maxT - r.room, flow: r.flow, exhaustT: r.exhaustT,
    cfm: m.fp.reduce((n, f) => n + cfmOf(f.d), 0), parts: m.parts, groups: m.groups, fans: m.fp, back: state.back !== 'closed',
    openU: m.groups.filter(g => g.kind === 'slot').reduce((n, g) => n + g.layers.length, 0) };
  if (airMemo.size > 100) airMemo.clear();
  airMemo.set(sig, a);
  return a;
}
const airLevel = a => !a.Q ? ['No heat', ''] : a.maxT <= RATED[0] ? ['Cool', ''] : a.maxT <= RATED[1] ? ['Warm', ' est'] : ['Hot', ' hot'];
// the airflow after a change; change() only reassigns fields of state (never edits an item in place), so they can be put back
function predict(change) {
  const keep = {}; ['h', 'top', 'topDir', 'bottom', 'bottomDir', 'back', 'items', 'extras', 'xdir'].forEach(k => { keep[k] = state[k]; });
  try { change(); return airflow(); } finally { Object.assign(state, keep); }
}
function fillInto(k1, k05) { // every open slot filled, on a copy of the items list
  state.items = state.items.slice(); let id = -1;
  for (let p = 0; p < slots();) { if (isFree(p, 2, undefined, 'front')) { state.items.push({ id: id--, key: k1, pos2: p }); p += 2; } else if (isFree(p, 1, undefined, 'front') && halfFits(k05, p)) { state.items.push({ id: id--, key: k05, pos2: p }); p += 1; } else p++; }
}
const blankKeys = () => LIB.mw13855411 && LIB.mw1385541 ? ['mw13855411', 'mw1385541'] : ['vent1', 'vent05'];
function airTips(a) {
  if (!a.Q) return [];
  const tips = [], warm = a.maxT > RATED[0], fans = a.cfm > 0, nm = p => p.it.label || shortName(p.d);
  const test = (text, change, btn) => tips.push(Object.assign({ text, after: predict(change) }, btn));
  if (warm && !state.top && LIB.mw1875867) test('Put a 120 mm fan in the top panel, blowing out. Warm air collects at the top, so it leaves fastest there.', () => { state.top = 'mw1875867'; state.topDir = null; }, { act: 'air-top', key: 'mw1875867', label: 'Use fan top' });
  if (warm && !state.top && LIB.mw1896816) test('Swap the solid top panel for a hex mesh top, so warm air can rise out without a fan.', () => { state.top = 'mw1896816'; }, { act: 'air-top', key: 'mw1896816', label: 'Use mesh top' });
  if (warm && !fans && LIB.fan40) { const p = lowestFree(2); if (p != null) test('Add a 5× 40 mm fan panel low in the rack, at ' + uRange(p, 2) + ', blowing in.', () => { state.items = state.items.concat({ id: -1, key: 'fan40', pos2: p }); }, { act: 'air-add', key: 'fan40', pos: p, label: 'Add fan panel' }); }
  if (warm && !a.back) test('Open the back. With a closed back the air only gets in and out through the panels and their seams.', () => { state.back = 'open'; }, { act: 'air-back', v: 'open', label: 'Open back' });
  a.fans.forEach(f => { if (f.dir === 'cross') return; const v = f.dir === 'intake' ? 'exhaust' : 'intake'; test('Turn ' + f.name + ' around, so it ' + dirText(v, f.place) + '.', () => setFanDir(f.ref, v), { act: 'fan-dir', ref: f.ref, v, label: 'Turn around' }); });
  if (fans && a.openU) test('Close the open ' + fmtU(a.openU) + ' with blank panels, so the fans pull air through the gear instead of around it.', () => fillInto(...blankKeys()), { act: 'air-blank', label: 'Fill with blanks' });
  const out = tips.filter(t => t.after.maxT < a.maxT - 1).sort((x, y) => x.after.maxT - y.after.maxT); // only changes that help, best first
  if (!fans && a.openU) {
    const v = predict(() => fillInto('vent1', 'vent05')), b = predict(() => fillInto(...blankKeys()));
    if (b.maxT - v.maxT >= 1) out.push({ text: 'Closing the open ' + fmtU(a.openU) + ' for a tidy front? With vent panels the hottest air would be about ' + fmtT(v.maxT) + ', with blank panels ' + fmtT(b.maxT) + '.', act: 'fill', label: 'Fill with vents' });
  }
  const ps = a.parts.filter(p => sideOf(p.it) === 'front').sort((x, y) => x.it.pos2 - y.it.pos2);
  for (let i = 0; i + 1 < ps.length; i++) { const x = ps[i], y = ps[i + 1]; if (x.w >= 15 && y.w >= 15 && x.it.pos2 + x.d.h2 === y.it.pos2) out.push({ text: nm(x) + ' and ' + nm(y) + ' both run warm and sit right against each other. A ½U vent panel between them lets each get its own air; the estimate can’t see that difference.' }); }
  ps.filter(p => /drv/.test(p.d.face || '') || /storage/i.test(p.d.group || '')).forEach(p => {
    const below = a.temp.slice(Math.max(...p.layers) + 1), cool = below.length ? Math.min(...below) : Infinity, where = nm(p) + ' (' + uRange(p.it.pos2, p.d.h2) + ')';
    if (p.T - cool >= 3) out.push({ text: 'Drives last longer when they stay well under 40 °C. ' + where + ' sit in air of about ' + fmtT(p.T) + '; lower in the rack it is about ' + fmtT(cool) + '.' });
    else if (p.T > RATED[1]) out.push({ text: 'Drives last longer when they stay well under 40 °C, and ' + where + ' sit in air of about ' + fmtT(p.T) + '. Cool the rack first; the changes above help most.' });
  });
  if (a.parts.some(p => /poe/i.test(fullName(p.d)) && !p.own)) out.push({ text: 'A PoE switch’s heat here is its own draw. Its power supply also turns roughly 10 % of the power it sends out over PoE into heat; add that once you know the load.' });
  if (!out.length) out.push({ text: a.maxT > RATED[1] ? 'This rack runs hot: add fans or more openings.' : 'Cooling looks fine for this layout.' });
  return out;
}

/* colours: air temperature and heat on one warm scale, --h0 (room temperature) to --h6 (25 °C above it) */
function heatCSS(dT) {
  const p = Math.max(0, Math.min(1, dT / HEAT_SPAN)) * 6, i = Math.min(5, Math.floor(p)), f = p - i;
  return 'color-mix(in oklab, var(--h' + i + ') ' + Math.round((1 - f) * 100) + '%, var(--h' + (i + 1) + '))';
}
const wLevel = w => [4, 8, 15, 30, 60].filter(x => w >= x).length + 1;
const wChip = (w, est) => w > 0 ? '<span class="wchip hl' + wLevel(w) + '" title="' + (est ? 'Typical heat, estimated' : 'Typical heat') + '">' + (est ? '≈' : '') + fmtW(w) + '</span>' : '';
const flowPill = (v, dir) => '<span class="fpill ' + (dir > 0 ? 'in' : 'out') + '">' + (dir > 0 ? '↘ in ' : '↗ out ') + Math.round(v) + '</span>';
const fanChip = (d, dir) => '<span class="fchip" title="' + esc(fanLine(d)) + '">' + (dir === 'exhaust' ? '↗ out ' : dir === 'intake' ? '↘ in ' : '⇅ in + out ') + Math.round(toM3h(cfmOf(d))) + ' m³/h</span>';
function dirSeg(f) {
  const opts = ['intake', 'exhaust'].concat(canCross(f.d, f.place, f.kind) ? ['cross'] : []);
  return '<span class="seg small" role="group" aria-label="Which way ' + esc(f.name) + ' blows">' + opts.map(v => '<button type="button" data-act="fan-dir" data-ref="' + f.ref + '" data-v="' + v + '" aria-pressed="' + (f.dir === v) + '">' + DIR_BTN[v] + '</button>').join('') + '</span>';
}
function airParts() { // the Cooling section: a one-line summary and the breakdown
  const a = airflow(), lvl = airLevel(a), tips = airTips(a), acts = tips.filter(t => t.after).length;
  const sub = (id, title, n, list, dflt) => '<details class="abd" data-sec="' + id + '"' + ((ui.sec[id] == null ? dflt : ui.sec[id]) ? ' open' : '') + '><summary>' + title + ' <span class="muted">' + n + '</span></summary>' + list + '</details>';
  const row = (name, sub, right) => '<li class="arow"><span class="an"><b>' + esc(name) + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span>' + right + '</li>';
  const sum = '<span class="badge' + lvl[1] + '">' + lvl[0] + '</span>' + (a.Q ? '<span>hottest air ≈ ' + fmtT(a.maxT) + '</span>' : '') + '<span class="muted">' + fmtF(a.flow) + '</span>' + (acts ? '<span class="muted">' + acts + (acts > 1 ? ' tips' : ' tip') + '</span>' : '');
  let body = '<dl class="kv">' +
    '<dt><label for="air-room">Room temperature</label></dt><dd><input class="field mini" id="air-room" type="number" min="10" max="40" step="1" inputmode="numeric" value="' + a.room + '"> °C</dd>' +
    '<dt>Heat in the rack</dt><dd>' + (a.est ? '≈ ' : '') + fmtW(a.Q) + '</dd>' +
    '<dt>Hottest air</dt><dd>' + (a.Q ? '≈ ' + fmtT(a.maxT) : '–') + '</dd>' +
    '<dt>Air through the rack</dt><dd>' + fmtF(a.flow) + ' · ' + Math.round(a.flow / 1.699) + ' CFM</dd>' +
    (a.Q ? '<dt>Air leaving the rack</dt><dd>≈ ' + fmtT(a.exhaustT) + '</dd>' +
      '<dt>Heat out with the air · through the walls</dt><dd>' + Math.round(a.r.toAir) + ' · ' + Math.round(a.r.toWalls) + ' W</dd>' : '') +
    '<dt>' + (onSide('back').length ? 'Rest of the back' : 'Back of the rack') + '</dt><dd><span class="seg small" role="group" aria-label="' + (onSide('back').length ? 'Back of the rack where no panel sits' : 'Back of the rack') + '">' + [['open', 'Open'], ['closed', 'Closed']].map(([v, l]) => '<button type="button" data-act="air-back" data-v="' + v + '" aria-pressed="' + (state.back === v) + '">' + l + '</button>').join('') + '</span></dd></dl>';
  const src = a.parts.filter(p => p.w > 0).sort((x, y) => y.w - x.w);
  if (src.length) body += sub('air-src', 'Heat sources', src.length + ' · ' + (a.est ? '≈ ' : '') + fmtW(a.Q), '<ul>' +
    src.map(p => row(p.it.label || fullName(p.d), uRange(p.it.pos2, p.d.h2) + atBack(p.it) + (p.own ? ' · your value' : ''), wChip(p.w, p.est) + '<span class="at" title="Air at this height">' + fmtT(p.T) + '</span>')).join('') + '</ul>', false);
  if (a.fans.length) body += sub('air-fans', 'Fans', a.fans.length + ' · ' + fmtF(a.fans.reduce((n, f) => n + f.in + f.out, 0)) + ' moved', '<ul>' +
    a.fans.map(f => row(f.name, esc(f.where) + ' · ' + esc(fanLine(f.d)), dirSeg(f) + '<span class="at" title="Air it moves here, in m³/h; rated ' + Math.round(f.rated) + ' m³/h in free air">' + Math.round(f.in + f.out) + '</span>')).join('') + '</ul>', true);
  const og = a.groups.filter(g => g.kind !== 'seams' || Math.max(g.in, g.out) >= .5);
  body += sub('air-open', 'Openings', og.length, '<ul>' +
    og.map(g => row(g.name, esc(g.where) + ' · ' + Math.round(g.area * 1e4) + ' cm² open', '<span class="fl">' + (g.in >= .5 ? flowPill(g.in, 1) : '') + (g.out >= .5 ? flowPill(g.out, -1) : '') + (g.in < .5 && g.out < .5 ? '<span class="muted">still</span>' : '') + '</span>')).join('') + '</ul>' +
    '<p class="hint">Flows in m³/h. Without fans, warm air rises: low openings take air in and high ones let it out.</p>', false);
  if (a.Q) body += '<ul class="tips">' + tips.map(t => '<li><span>' + esc(t.text) + (t.after ? '<em>Hottest air ' + fmtT(a.maxT) + ' → ' + fmtT(t.after.maxT) + ' · air through ' + fmtF(a.flow) + ' → ' + fmtF(t.after.flow) + '</em>' : '') + '</span>' +
    (t.act ? '<button type="button" class="btn small" data-act="' + t.act + '"' + (t.key ? ' data-key="' + t.key + '"' : '') + (t.ref ? ' data-ref="' + t.ref + '"' : '') + (t.pos != null ? ' data-pos="' + t.pos + '"' : '') + (t.v ? ' data-v="' + t.v + '"' : '') + '>' + t.label + '</button>' : '') + '</li>').join('') + '</ul>';
  body += sub('air-how', 'How the estimate works', '', '<ul class="notes">' +
    '<li>Heat is each part’s typical draw, from spec sheets and measurements; ≈ marks an estimate. Click a part to enter its real value.</li>' +
    '<li>Warm air is lighter and rises (the stack effect): low openings take air in, high ones let it out, and an open back does both. The dashed line in the Airflow view is where in turns into out.</li>' +
    '<li>Fans follow their rated flow and pressure, minus 15 % for the grille, and work against whatever the openings allow.</li>' +
    '<li>The rack is split into ½U layers. The air carries heat upward, warm air under cool air turns over, and about 4 W per m² per °C leaks through the walls.</li>' +
    '<li>Not included: the devices’ own fans, draughts in the room and sun on the rack. The temperatures are of the air around the parts, not of the parts themselves.</li></ul>', false);
  return { sum, body };
}

/* ---------- power and network ---------- */
/* A planning estimate; power.js holds the model and its assumptions. Here the rack is described for it: what each part draws
   (the same watts as the cooling estimate), which parts give PoE and which run on it, and the network ports each part needs
   and offers. The catalog's poe, poeIn and poeOptional count per device; a device's ports and eth too, a mount's for the
   whole mount. */
const SWITCH_GROUP = /switch|gateway|omada/i;        // devices here offer the RJ45 and SFP ports in their io, unless they set ports
const OWN_BOARDS = /^(pi5|pi4)$/;                    // single-board computers that are the mount's own device (they can take a PoE HAT)
const NO_LAN = /^(zero|uno)$/;                       // boards without an Ethernet port
const provPorts = rec => rec.ports != null ? rec.ports : SWITCH_GROUP.test(rec.group || '') ? LS.netPorts(rec.io) : 0;
// what one part means for power and network: { eth: switch ports it needs, provs: ports each switch or router in it offers,
// modem, poe: [one per source], poeIn: { w, n, optional } }
function powerOf(d, it) {
  const r = { eth: 0, provs: [], modem: false, poe: [], poeIn: null };
  if (!d) return r;
  if (d.custom || (d.gen && it && it.params.type === 'shelf')) { r.eth = 1; return r; }
  if (d.gen) return r;
  const dev = d.pwDev || {}, m = d.pw || {}, f = k => m[k] !== undefined ? m[k] : dev[k];
  const mods = modsOf(d), own = mods.filter(x => x.dev === true).reduce((n, x) => n + (x.n || 1), 0), extraProvs = [];
  let boards = 0, extra = 0;
  mods.forEach(x => {
    if (x.sbc) { const n = typeof x.sbc === 'number' ? (x.fill != null ? x.fill : x.sbc) : 1, b = x.board || 'pi5'; if (NO_LAN.test(b)) return; if (!own && OWN_BOARDS.test(b)) boards += n; else extra += n; }
    else if (typeof x.dev === 'string' && PWDEV[x.dev]) { const o = PWDEV[x.dev], n = x.n || 1, p = provPorts(o); for (let k = 0; k < n; k++) if (p) extraProvs.push(p); else extra += o.eth != null ? o.eth : 1; }
  });
  const n = own || boards || 1, isDev = !!d.pwDev, poeIn = f('poeIn'), ports = isDev ? provPorts(dev) : 0;
  const eth = ports ? 0 : dev.eth != null ? dev.eth : !isDev ? 0 : d.top ? (poeIn ? 1 : 0) : 1;
  r.provs = m.ports !== undefined ? (m.ports ? [m.ports] : []) : Array(ports ? n : 0).fill(ports).concat(extraProvs);
  r.eth = m.eth !== undefined ? m.eth : eth * n + extra;
  r.modem = r.provs.length > 0 && /modem/i.test(d.group || '');
  const poe = f('poe'); if (poe) for (let k = 0; k < n; k++) r.poe.push(poe);
  if (poeIn) r.poeIn = { w: poeIn, n, optional: !!f('poeOptional') };
  return r;
}
// a part that can run on PoE does so when the builder says so, else unless the catalog calls PoE optional for it
const onPoe = (chosen, p) => !!(p.poeIn && (typeof chosen === 'boolean' ? chosen : typeof chosen === 'object' && chosen && typeof chosen.poe === 'boolean' ? chosen.poe : !p.poeIn.optional));
function powerModel() {
  const draws = [], sources = [], pds = [], prov = [], rows = [], f = facts(); let need = 0;
  const part = (ref, it, d, where, name, chosen) => {
    const p = powerOf(d, it), hw = heatOf(it || { key: d.key }), on = onPoe(chosen, p), sn = (it && it.label) || shortName(d); // sn: the device's own name, for PoE and ports
    draws.push({ name, w: hw.w, est: hw.est });
    p.poe.forEach((s, k) => sources.push({ id: ref + ':' + k, ref, name: sn + (p.poe.length > 1 ? ' #' + (k + 1) : ''), where, std: s.std || 'at', ports: s.ports, spec: s.budget,
      budget: it && typeof it.poeBudget === 'number' ? it.poeBudget : s.budget }));
    if (on) for (let k = 0; k < p.poeIn.n; k++) pds.push({ id: ref + ':' + k, ref, name: sn, w: p.poeIn.w, typ: hw.w / p.poeIn.n });
    p.provs.forEach((ports, k) => prov.push({ name: sn, ports, modem: p.modem && !k }));
    need += p.eth;
    rows.push({ ref, it, d, name, where, w: hw.w, est: hw.est, own: !!hw.own, p, on });
  };
  byPos().forEach(it => { const d = info(it); part('i' + it.id, it, d, uRange(it.pos2, d.h2) + atBack(it), it.label || fullName(d), it); });
  if (state.top) part('top', null, LIB[state.top], 'top', fullName(LIB[state.top]), state.power.topPoe);
  state.extras.forEach(k => { if (LIB[k].watts > 0) part('x' + k, null, LIB[k], 'frame', fullName(LIB[k])); });
  if (f.amps) draws.push({ name: 'Fans', w: f.amps * 5, est: true });
  const ext = state.power.ext;
  ext.forEach((x, i) => { draws.push({ name: x.name, w: x.n * x.w, est: true }); for (let k = 0; k < x.n; k++) pds.push({ id: 'e' + i + ':' + k, ref: 'e' + i, name: x.name, w: x.w, typ: x.w }); });
  const outside = ext.reduce((n, x) => n + x.n, 0);
  const r = window.LRPower.compute({ draws, sources, pds, net: { need: need + outside, extern: outside, providers: prov, keystones: f.ks }, ups: state.power.ups });
  return Object.assign(r, { rows, fans: f.amps * 5, outside });
}
const fmtMin = m => m >= 90 ? (m / 60).toFixed(1) + ' h' : Math.round(m) + ' min';
const kwhYear = r => r.total * 8.76; // kWh in a year of running all the time
function energyText(r) {
  const s = window.LREstimate.settings(state.costs), kwh = kwhYear(r);
  return '≈ ' + Math.round(kwh) + ' kWh' + (s.kwhPrice != null ? ' · ' + window.LREstimate.money(kwh * s.kwhPrice, s.currency) : '');
}
// PoE devices outside the rack to pick from: the catalog's access points, then common ones (their maximum draw in W)
function poePresets() {
  return Object.values(PWDEV).filter(d => d.poeIn && /access point/i.test(d.group)).map(d => [d.name + ' access point', d.poeIn])
    .concat([['Wi-Fi 6 access point', 13], ['PoE camera', 7], ['VoIP phone', 5], ['Raspberry Pi with PoE+ HAT', 15], ['Other PoE device', 10]]);
}
function powerParts() { // the Power & network section: a one-line summary and the breakdown
  const L = window.LRPower, r = powerModel(), P = r.poe, N = r.ports, iss = L.issues(r);
  const short = iss.some(i => i.level === 'short'), tight = iss.some(i => i.level === 'tight'), any = r.total > 0 || P.sources.length || P.load || N.need;
  const sub = (id, title, n, list, dflt) => '<details class="abd" data-sec="' + id + '"' + ((ui.sec[id] == null ? dflt : ui.sec[id]) ? ' open' : '') + '><summary>' + title + ' <span class="muted">' + n + '</span></summary>' + list + '</details>';
  const row = (name, sub, right) => '<li class="arow"><span class="an"><b>' + esc(name) + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span>' + right + '</li>';
  const sum = (any ? '<span class="badge' + (short ? ' hot' : tight ? ' est' : '') + '">' + (short ? 'Short' : tight ? 'Tight' : 'OK') + '</span>' : '') +
    '<span>' + (r.total ? (r.est ? '≈ ' : '') + fmtW(r.total) : 'Nothing draws power yet') + '</span>' +
    (P.sources.length || P.load ? '<span class="muted">PoE ' + Math.round(P.load) + ' / ' + Math.round(P.budget) + ' W</span>' : '') +
    (N.providers.length ? '<span class="muted">' + (N.need + N.linkPorts) + ' / ' + N.offered + ' ports</span>' : '') + (r.ups ? '<span class="muted">UPS ≈ ' + fmtMin(r.ups.minutes) + '</span>' : '');
  let body = '<dl class="kv"><dt>Draw from the wall</dt><dd>' + (r.est ? '≈ ' : '') + fmtW(r.total) + '</dd>' +
    (r.loss ? '<div class="note">Includes ≈ ' + fmtW(r.loss) + ' lost in the PoE switches’ power supplies.</div>' : '') +
    '<dt>Running all year</dt><dd>' + energyText(r) + '</dd></dl>';
  if (iss.length) body += '<ul class="tips">' + iss.map(i => '<li class="' + i.level + '"><span>' + esc(i.text) + '</span></li>').join('') + '</ul>';
  const src = r.rows.filter(x => x.w > 0).sort((x, y) => y.w - x.w);
  if (src.length || r.fans || r.outside) body += sub('pw-parts', 'Draw per part', (r.est ? '≈ ' : '') + fmtW(r.draw), '<ul>' +
    src.map(x => row(x.name, esc(x.where) + (x.own ? ' · your value' : '') + (x.on ? ' · on PoE' : ''), wChip(x.w, x.est))).join('') +
    (r.fans ? row('Fans', 'at 5 V, the current printed on them', wChip(r.fans, true)) : '') +
    state.power.ext.map(x => row(x.name + (x.n > 1 ? ' ×' + x.n : ''), 'outside the rack, on PoE from it', wChip(x.n * x.w, true))).join('') + '</ul>' +
    '<p class="hint">Typical draw, as in the cooling estimate; click a part in the rack to enter its real value. Devices on PoE count here with their own draw.</p>', false);
  // PoE: the sources with their load, every part that can run on PoE, and devices elsewhere fed from the rack
  const poeRows = r.rows.filter(x => x.p.poeIn), owner = new Map(); P.sources.forEach(s => s.pds.forEach(p => owner.set(p.id, s)));
  const fedBy = ref => [...new Set([...owner].filter(([id]) => id.split(':')[0] === ref).map(([, s]) => s.name))];
  const unp = ref => P.unpowered.filter(p => p.ref === ref).length;
  if (P.sources.length || poeRows.length || state.power.ext.length) {
    const seg = x => '<span class="seg small" role="group" aria-label="How ' + esc(x.name) + ' gets power">' + [[0, 'Adapter'], [1, 'PoE']].map(([v, l]) => '<button type="button" data-act="poe-on" data-ref="' + x.ref + '" data-v="' + v + '" aria-pressed="' + (x.on === !!v) + '">' + l + '</button>').join('') + '</span>';
    const fed = x => !x.on ? 'own power supply' + (x.p.poeIn.optional ? '; PoE needs a PoE HAT or splitter' : '') : unp(x.ref) ? 'no PoE port for it' : 'from ' + fedBy(x.ref).join(', ');
    body += sub('pw-poe', 'PoE', P.sources.length ? Math.round(P.load) + ' of ' + Math.round(P.budget) + ' W · ' + P.used + ' of ' + P.ports + ' ports' : 'no PoE source', '<ul>' +
      P.sources.map(s => { const pct = s.budget ? Math.min(100, s.used / s.budget * 100) : 100, it = s.ref[0] === 'i' ? find(+s.ref.slice(1)) : null;
        return row(s.name, esc(s.where) + ' · ' + s.n + ' of ' + s.ports + ' ' + L.STD[s.std].name + ' port' + (s.ports > 1 ? 's' : '') + ' used', '<span class="minibar" aria-hidden="true"><i style="width:' + pct.toFixed(0) + '%' + (s.used > s.budget * L.K.tight ? ';background:var(--warn)' : '') + '"></i></span><span class="at">' + Math.round(s.used) + ' / ' + Math.round(s.budget) + ' W</span>' +
          (it && s.id.endsWith(':0') ? '<label class="watts" title="PoE budget with your power adapter; empty: ' + s.spec + ' W from the spec sheet. Some switches give more PoE with a bigger adapter.">Budget <input class="field mini" type="number" min="0" max="1000" step="1" inputmode="numeric" data-poe-budget="' + it.id + '" placeholder="' + s.spec + '" value="' + (typeof it.poeBudget === 'number' ? it.poeBudget : '') + '"> W</label>' : '')); }).join('') +
      poeRows.map(x => row(x.name, esc(x.where) + ' · up to ' + fmtW(x.p.poeIn.w) + (x.p.poeIn.n > 1 ? ' each ×' + x.p.poeIn.n : '') + ', ' + L.STD[L.need(x.p.poeIn.w)].name + ' · ' + esc(fed(x)), seg(x))).join('') +
      state.power.ext.map((x, i) => row(x.name, 'outside the rack · ' + L.STD[L.need(x.w)].name + (unp('e' + i) ? ' · ' + unp('e' + i) + ' without a PoE port' : ''),
        '<span class="pwext"><input class="field mini" type="number" min="1" max="48" step="1" inputmode="numeric" data-ext="' + i + '" data-k="n" value="' + x.n + '" aria-label="How many"> × <input class="field mini" type="number" min="0.5" max="100" step="0.5" inputmode="decimal" data-ext="' + i + '" data-k="w" value="' + x.w + '" aria-label="Maximum watts each"> W<button type="button" class="btn small ghost" data-act="poe-ext-rm" data-i="' + i + '" aria-label="Remove ' + esc(x.name) + '">×</button></span>')).join('') + '</ul>' +
      '<label class="pwadd"><select class="field" id="poe-ext-add" aria-label="Add a PoE device outside the rack"><option value="">+ PoE device outside the rack…</option>' + poePresets().map(([n, w], k) => '<option value="' + k + '">' + esc(n) + ' (' + w + ' W)</option>').join('') + '</select></label>' +
      '<p class="hint">Each device takes one PoE port and its maximum draw from the spec sheet, so the budget also holds at full load. PoE gives 15.4 W per port, PoE+ 30 W, PoE++ 60 W. Some switches reserve the full 15.4 or 30 W per port whatever the device draws; check how yours counts.</p>', P.load > 0 || iss.some(i => /PoE/.test(i.text)));
  }
  const pn = N.providers.map(p => p.name + ' ' + p.ports).join(', ');
  body += sub('pw-net', 'Network ports', N.providers.length ? (N.need + N.linkPorts) + ' of ' + N.offered + ' used' : N.need + ' needed', '<dl class="kv">' +
    '<dt>Cables to a switch port</dt><dd>' + N.need + '</dd>' + (N.extern ? '<div class="note">' + N.extern + ' of them for PoE devices outside the rack.</div>' : '') +
    '<dt>Switch and router ports</dt><dd>' + N.offered + '</dd>' + (pn ? '<div class="note">' + esc(pn) + '. Routers without their WAN port.</div>' : '') +
    (N.linkPorts ? '<dt>Used to link them</dt><dd>' + N.linkPorts + '</dd>' : '') +
    (N.providers.length ? '<dt>Free</dt><dd>' + (N.free < 0 ? 'none, ' + N.short + ' short' : N.free) + '</dd>' : '') +
    (N.keystones ? '<dt>Keystone jacks</dt><dd>' + N.keystones + '</dd><div class="note">Pass-throughs to the room; each one you patch takes a switch port too.</div>' : '') + '</dl>', false);
  const u = state.power.ups;
  body += sub('pw-ups', 'UPS runtime', r.ups ? '≈ ' + fmtMin(r.ups.minutes) + ' at ≈ ' + fmtW(r.total) : 'enter its size', '<dl class="kv">' +
    '<dt><label for="ups-size">UPS size</label></dt><dd><input class="field mini" id="ups-size" type="number" min="1" max="100000" step="1" inputmode="numeric" placeholder="600" value="' + (u.size || '') + '"> <span class="seg small" role="group" aria-label="UPS size in">' +
      ['VA', 'Wh'].map(v => '<button type="button" data-act="ups-unit" data-v="' + v + '" aria-pressed="' + (u.unit === v) + '">' + v + '</button>').join('') + '</span></dd>' +
    (r.ups ? '<dt>Battery</dt><dd>' + (r.ups.unit === 'VA' ? '≈ ' : '') + Math.round(r.ups.wh) + ' Wh</dd>' + (r.ups.rating ? '<dt>Watt rating</dt><dd>≈ ' + Math.round(r.ups.rating) + ' W</dd>' : '') +
      '<dt>Runtime</dt><dd>≈ ' + fmtMin(r.ups.minutes) + '</dd>' : '') + '</dl>' +
    '<p class="hint">For a lead-acid UPS at full charge' + (u.unit === 'VA' ? ', with about 0.125 Wh of battery per VA' : '') + '. After a few years the battery lasts about a third less. A lithium (LiFePO4) UPS or power station lasts about Wh × 0.85 ÷ the draw.</p>', !!u.size);
  body += sub('pw-how', 'How the estimate works', '', '<ul class="notes">' +
    '<li>Draw is each part’s typical use, the same as the cooling estimate; ≈ marks an estimate. Start-up and full load can be two to three times higher.</li>' +
    '<li>A PoE switch’s own draw leaves out what it sends over PoE; the devices on PoE count with their own draw, plus about 10 % lost in the switch’s power supply.</li>' +
    '<li>PoE devices are handed out biggest first, each to the switch with the most budget left that has a free port of a high enough standard.</li>' +
    '<li>Every device with a network cable takes a switch port. Each extra switch or router links to another and uses a port at both ends.</li>' +
    '<li>UPS runtime: battery Wh, an 85 % inverter plus 5 W for the UPS, and less capacity at a high load (Peukert, k = 1.2).</li></ul>', false);
  return { sum, body, r, iss };
}

/* ---------- render: build column ---------- */
/* Sections fold to one line each, so the column stays short; the open ones are remembered. */
/* ---------- build readiness and the six steps (ready.js holds the checks) ---------- */
const STEPS = [[1, 'Rack'], [2, 'Hardware'], [3, 'Connect'], [4, 'Check'], [5, 'Print & assemble'], [6, 'Export']];
let READY = [];
function readyFacts(pk) {
  const pl = placed(), cl = pl.filter(i => clashes(i).length), ov = pl.filter(i => overlaps(i).length), a = airflow();
  return {
    parts: pl.length, unplaced: state.items.length - pl.length, clashes: cl.length, clashId: cl[0] && cl[0].id, overlaps: ov.length, overlapId: ov[0] && ov[0].id,
    printer: pk.printer ? { name: bedName(pk.printer), bad: bedBad(pk).length, turned: pk.some(x => x.bed && x.bed.turned.length) } : null,
    cooling: { level: !a.Q ? 'none' : a.maxT <= RATED[0] ? 'cool' : a.maxT <= RATED[1] ? 'warm' : 'hot', maxT: a.maxT },
    power: window.LRPower.issues(powerModel()), estimated: pl.filter(i => info(i).est).length,
    market: (window.LRMarket.regions[state.market] || {}).name
  };
}
function readyHTML(pk) {
  READY = window.LRReady.checks(readyFacts(pk));
  const s = window.LRReady.summary(READY), order = { warn: 0, todo: 1, info: 2, ok: 3 }, icon = { warn: '!', todo: '○', info: 'i', ok: '✓' };
  const head = s.ready ? 'Ready to build' : [s.warn ? s.warn + (s.warn > 1 ? ' problems' : ' problem') : '', s.todo ? s.todo + (s.todo > 1 ? ' things' : ' thing') + ' to do' : ''].filter(Boolean).join(' · ');
  const fix = c => !c.fix ? '' : c.fix.act === 'go-country' ? '<select class="field mini" id="ready-market" aria-label="Country for the shop links">' + Object.entries(window.LRMarket.regions).map(([k, r]) => '<option value="' + k + '"' + (state.market === k ? ' selected' : '') + '>' + esc(r.name) + '</option>').join('') + '</select>'
    : '<button type="button" class="btn small" data-act="' + c.fix.act + '"' + (c.fix.step ? ' data-step="' + c.fix.step + '"' : '') + (c.fix.id != null ? ' data-id="' + c.fix.id + '"' : '') + '>' + esc(c.fix.label) + '</button>';
  return '<section class="ready' + (s.ready ? ' ok' : '') + '" id="ready" aria-labelledby="ready-h"><h3 id="ready-h"><span class="rdot" aria-hidden="true"></span>' + esc(head) + '</h3>' +
    '<p class="hint">' + (s.ready ? 'Everything checks out. The notes below are what the planner can’t confirm for you.' : 'What still stands between this plan and a rack you can build.') + '</p>' +
    '<ul class="rlist">' + READY.slice().sort((x, y) => order[x.state] - order[y.state]).map(c => '<li class="rk rk-' + c.state + '"><span class="rki" aria-hidden="true">' + icon[c.state] + '</span><div class="rkt"><b>' + esc(c.title) + '</b>' + (c.why ? '<small>' + esc(c.why) + '</small>' : '') + '</div>' + fix(c) + '</li>').join('') + '</ul>' +
    '<div class="rexport" id="export"><button type="button" class="btn small primary" data-act="pdf">Build plan PDF</button><button type="button" class="btn small" data-act="pack">Build pack (ZIP)</button><button type="button" class="btn small" data-act="share">Copy share link</button><button type="button" class="btn small" data-act="save-file">Save rack file</button></div></section>';
}
function renderSteps() {
  const el = $('#steps'); if (!el) return;
  el.innerHTML = STEPS.map(([n, label]) => { const sm = window.LRReady.summary(READY), st = n === 6 ? '' : n === 4 ? (sm.warn ? 'warn' : sm.todo ? 'todo' : 'ok') : window.LRReady.stepState(READY, n);
    return '<button type="button" class="step' + (st ? ' s-' + st : '') + '" data-act="go-step" data-step="' + n + '"' + (st ? ' title="' + (st === 'ok' ? 'Done' : st === 'warn' ? 'Needs attention' : 'To do') + '"' : '') + '><span class="sn">' + n + '</span>' + label + '</button>'; }).join('');
}
// jump to where a step's work happens, with a short flash so the eye finds it
function goStep(n) {
  const at = el => { if (!el) return; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); };
  if (n === 1) return at($('#settings'));
  if (n === 2) { if (where() !== 'front' && where() !== 'back') setWhere('front'); at($('.lib')); setTimeout(() => { const q = $('#q'); if (q) q.focus({ preventScroll: true }); }, 400); return; }
  const id = { 3: 'power', 5: 'print' }[n];
  if (id) { ui.sec[id] = true; if (n === 3) ui.sec.air = true; saveUI(); renderBuild(); return at($('[data-sec="' + id + '"]')); }
  at($(n === 6 ? '#export' : '#ready'));
}
// the first visit: four ways in, over the rack
function renderStart() {
  const el = $('#startcard'); if (!el) return;
  const show = !!state.example && !ui.started; el.hidden = !show; if (!show) return;
  const opt = (v, t, d, cls) => '<button type="button" class="sc-opt' + (cls ? ' ' + cls : '') + '" data-act="start" data-v="' + v + '"><b>' + t + '</b><span>' + d + '</span></button>';
  el.innerHTML = '<div class="sc-in"><h2>Plan a 10-inch rack you can actually build</h2><p>Pick your hardware, see it in 3D, check that it fits, stays cool and gets power, then take the print list, shopping list and build plan with you.</p><div class="sc-opts">' +
    opt('guide', 'Guide me', 'A few questions about your hardware, then a suggested layout', 'primary') + opt('empty', 'Start empty', 'A 5U Lab Rax; add the parts yourself') +
    opt('example', 'Explore the example', 'A gateway, a PoE switch, four Pis and a fan') + opt('file', 'Open a build file', 'A .rack.json you saved before') + '</div></div>';
}
const sec = (id, title, sum, body) => '<details class="sec" data-sec="' + id + '"' + (ui.sec[id] ? ' open' : '') + '><summary><span class="sec-t">' + title + '</span><span class="sec-s">' + sum + '</span><span class="chev" aria-hidden="true">›</span></summary><div class="sec-b">' + body + '</div></details>';
function renderBuild() {
  if (!CAT) return;
  const h = state.h, used = onSide(rackSide).reduce((n, i) => n + H(i), 0), free = slots() - used, fp = frameParts(), br = state.version === 'brass';
  const pk = printPack(), done = pk.filter(x => state.done[x.k]).length, count = placed().length + (state.top ? 1 : 0);
  let html = '<div><h2 class="title">Your build</h2><span class="muted">' + h + 'U · ' + count + (count === 1 ? ' part · ' : ' parts · ') + (free ? fmtU(free) + ' open' : 'no open slots') + '</span></div>' + readyHTML(pk);

  const rowAir = {}, ra = url => rowAir[url] || (rowAir[url] = { w: 0, est: false, fans: [] }); // heat and fans per model page
  byPos().forEach(i => { const d = info(i), hw = heatOf(i); if (d.url && hw.w) { const r = ra(d.url); r.w += hw.w; r.est = r.est || hw.est; } });
  airflow().fans.forEach(f => { if (f.d.url) ra(f.d.url).fans.push(f); });
  const airChips = url => { const r = url && rowAir[url]; return r ? '<span class="pchips">' + wChip(r.w, r.est) + r.fans.map(f => fanChip(f.d, f.dir)).join('') + '</span>' : ''; };
  const B = pk.printer, tooBig = bedBad(pk), bedEst = pk.some(x => x.bed && [...x.bed.bad, ...x.bed.turned].some(p => p.est));
  const frameBad = pk.some(x => x.bed && x.bed.bad.length && [CAT.frame.brass.url, CAT.frame.bolted.url, CAT.frame.sizes.url].includes(x.url));
  html += sec('print', 'Print list', '<span>' + done + ' of ' + pk.length + ' printed</span>' + (tooBig.length ? '<span class="badge est" title="Too big for your printer">' + tooBig.length + ' too big</span>' : '') + '<span class="minibar" aria-hidden="true"><i style="width:' + (pk.length ? done / pk.length * 100 : 0) + '%"></i></span>',
    '<div class="bedrow"><label for="bp-printer">Printer</label>' + printerPicker('bp') + '</div>' +
    (B ? '<p class="hint">Checked against your ' + esc(bedName(B)) + ': ' + (tooBig.length ? tooBig.length + (tooBig.length > 1 ? ' prints have parts' : ' print has a part') + ' too big for it.'
      : 'every part fits lying flat' + (pk.some(x => x.bed) ? ', some only diagonally.' : '.')) + (bedEst ? ' ≈ sizes are estimates; check them in your slicer.' : '') + '</p>' : '') +
    '<ul class="plist">' + pk.map(x => {
      const ok = !!state.done[x.k];
      return '<li class="prow"><button type="button" class="tick" data-act="done" data-k="' + esc(x.k) + '" aria-pressed="' + ok + '" aria-label="Mark ' + esc(x.name) + ' as printed">' +
        (ok ? '<svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="var(--accent)" stroke-width="2.2" aria-hidden="true"><path d="M4 9.5l3.2 3L14 5.5"/></svg>'
            : '<svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="var(--muted)" stroke-width="1.7" aria-hidden="true"><path d="M9 3v9M5 8.5l4 4 4-4M4 15h10"/></svg>') + '</button>' +
        '<span class="tx"><b>' + esc(x.name) + '</b>' + (x.variants ? '<small>Variants: ' + esc(x.variants) + '</small>' : '') + '<small>' + esc(x.subs.join(', ')) + '</small>' +
        (x.bed ? '<small class="' + (x.bed.bad.length ? 'bedbad' : 'bedturn') + '">' + esc(bedText(x.bed)) + '</small>' : '') + airChips(x.url) + '</span>' + (x.qty > 1 ? '<span class="q">' + x.qty + '×</span>' : '') +
        (x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">Open</a>' : '<span class="badge">STL</span>') + '</li>';
    }).join('') + '</ul>' +
    (frameBad && LIB[SPLIT_FRAME] ? '<p class="hint">' + (state.extras.includes(SPLIT_FRAME) ? 'You have “' + esc(LIB[SPLIT_FRAME].name) + '” in your build: print the frame from that model instead of the frame pieces marked too big.'
      : 'For small beds, “' + esc(LIB[SPLIT_FRAME].name) + '” in Frame &amp; extras splits the 5U frame into smaller pieces.') + '</p>' : '') +
    (pk.missing ? '<p class="hint">' + pk.missing + ' own device' + (pk.missing > 1 ? 's' : '') + ' without a link.</p>' : '') +
    (placed().some(i => info(i).est) ? '<p class="hint">Parts marked ≈ have an estimated height. Check it in the model before printing.</p>' : '') +
    '<p class="hint">Download community models from MakerWorld as 3MF to keep their print profiles. Your build pack has the custom parts and a download list to click through the rest.</p>');

  html += sec('costs', 'Print time & budget', '<span>Filament · electricity · purchase budget</span>', estimateHTML());
  const air = airParts();
  html += sec('air', 'Cooling', air.sum, air.body);
  const pw = powerParts();
  html += sec('power', 'Power & network', pw.sum, pw.body);

  const ol = orderList(), kg = filament().reduce((n, x) => n + x.grams, 0) / 1000, amazonTag = CAT.shops && CAT.shops.amazon && CAT.shops.amazon.tag;
  html += sec('shop', 'Shopping list', '<span>' + ol.length + ' items · ≈ ' + kg.toFixed(1) + ' kg PETG</span>', shopHTML(ol) +
    '<p class="hint">Mounting screws: 2 per side per panel, 1 per side for ½U panels.' + (br ? ' Inserts max 5 mm long; the hole is 5.5 mm deep.' : '') + (h > 5 ? ' ' + esc(JOINER_NOTE) : '') + '</p>' +
    (affiliate() ? '<p class="hint">Some shop links are affiliate links: the maintainer of this planner may earn a small commission, at no cost to you.' + (amazonTag ? ' As an Amazon Associate the maintainer earns from qualifying purchases.' : '') + '</p>' : ''));
  const G = guide();
  html += sec('guide', 'Build guide', '<span>' + window.LRGuide.cards(guideData()).length + ' illustrated steps</span>', guideHTML(G));

  const top = state.top ? LIB[state.top] : null;
  html += sec('frame', 'Frame parts', '<span>' + (br ? 'Heat-set inserts' : 'Bolted') + ' · ' + (state.sides === 'acrylic' ? 'acrylic' : 'printed') + ' sides</span>', '<dl class="kv">' +
    '<dt>Vertical posts</dt><dd>' + fp.posts + '</dd>' + (fp.joiners ? '<dt>Post joiners</dt><dd>4</dd>' : '') +
    '<dt>Side panels</dt><dd>' + fp.sides + (state.sides === 'acrylic' ? ' acrylic' : '') + '</dd>' + (state.sides === 'acrylic' ? '<div class="note">Acrylic sides: 3 mm, cut to the size of the printed side panel. Take it from that model; the planner has no measured size yet.</div>' : '') + (fp.joiners && fp.b !== 5 ? '<div class="note">Fit the side panels the opposite way to the posts so the seams don’t line up.</div>' : '') +
    '<dt>Horizontal pieces</dt><dd>4</dd><dt>Edge pieces</dt><dd>4</dd><dt>Handles · feet</dt><dd>2 · 4</dd>' +
    (top ? '<dt>Top</dt><dd>' + esc(top.name) + '</dd><div class="note">' + esc(top.label || '') + (top.note ? '. ' + esc(top.note) : '') + ' <button type="button" class="lnk btn small ghost" data-act="top-off">Use regular top panel</button></div><dt>Bottom</dt><dd>' + esc(bottomName()) + '</dd>'
         : state.bottom ? '<dt>Top panel</dt><dd>1</dd><dt>Bottom</dt><dd>' + esc(bottomName()) + '</dd>' : '<dt>Top + bottom panel</dt><dd>1 + 1</dd>') +
    '<div class="note">The horizontal pieces need a print bed of about 250 mm; they don’t fit on 220 mm beds.' + (h > 5 ? ' Above 10U the printed frame gets too weak for a full rack, so the planner stops at 10U.' : '') + '</div></dl>');

  html += '<div class="actions"><button type="button" class="btn small" data-act="copy">Copy list</button><button type="button" class="btn small" data-act="share">Share link</button>' +
    '<button type="button" class="btn small" data-act="save-file" title="Download this layout as a .rack.json file">Save as file</button><button type="button" class="btn small" data-act="open-file" title="Open a .rack.json file">Open file</button><button type="button" class="btn small" data-act="fill"' + (free ? '' : ' disabled') + '>Fill open slots' + (rackSide === 'back' ? ' at the back' : '') + '</button><button type="button" class="btn small danger" data-act="clear"' + (state.items.length ? '' : ' disabled') + '>Clear rack</button></div><div id="copyfall"></div>';
  $('#build').innerHTML = html;
  renderSteps();
}

function listText() {
  const fp = frameParts(), br = state.version === 'brass', L = [];
  L.push((state.label && state.label !== 'Lab Rax' ? state.label + ' – ' : '') + 'Lab Rax ' + state.h + 'U (' + (br ? 'heat-set inserts' : 'bolted') + ')');
  L.push((state.h * P.U).toFixed(1) + ' mm inner height · 222 mm usable width', '', 'Layout (top to bottom)');
  if (state.top) L.push('  top     ' + fullName(LIB[state.top]));
  onSide('front').forEach(i => { const d = info(i); L.push('  ' + uRange(i.pos2, d.h2).padEnd(8) + (i.label ? '[' + i.label + '] ' : '') + fullName(d) + ' (' + uTxt(d) + ')'); });
  const used = onSide('front').reduce((n, i) => n + H(i), 0); if (slots() - used > 0) L.push('  Open: ' + fmtU(slots() - used));
  if (onSide('back').length) { L.push('', 'Back (top to bottom)'); onSide('back').forEach(i => { const d = info(i); L.push('  ' + uRange(i.pos2, d.h2).padEnd(8) + (i.label ? '[' + i.label + '] ' : '') + fullName(d) + ' (' + uTxt(d) + ')'); }); }
  L.push('', 'Frame', '- Vertical posts: ' + fp.posts); if (fp.joiners) L.push('- Post joiners: 4');
  L.push('- Side panels: ' + fp.sides + (state.sides === 'acrylic' ? ' (3 mm acrylic)' : ''), '- Horizontal pieces: 4', '- Edge pieces: 4', '- Handles · feet: 2 · 4', '- Bottom: ' + bottomName(), state.top ? '- Top: ' + fullName(LIB[state.top]) + '\n- Bottom panel: 1' : '- Top + bottom panel: 1 + 1');
  const pk = printPack();
  L.push('', 'Print pack' + (pk.printer ? ', checked against your ' + bedName(pk.printer) : ''));
  pk.forEach(x => { L.push('- ' + x.qty + '× ' + x.name + (x.variants ? ' (' + x.variants + ')' : '') + (x.url ? '  ' + x.url : '  (custom STL in build pack)')); if (x.bed) L.push('  ' + bedText(x.bed)); });
  L.push('', 'Shopping list'); orderList().forEach(x => L.push('- ' + qtyText(x) + ' ' + x.name + (x.spec ? ' (' + x.spec + ')' : '') + (x.check ? ' – ' + x.check : '')));
  guide().forEach((g, n) => { L.push('', (n + 1) + '. ' + g.title); g.steps.forEach(t => L.push('- ' + t)); });
  const a = airflow();
  if (a.Q) {
    L.push('', 'Cooling (estimate, room ' + a.room + ' °C)', '- Heat: ' + (a.est ? '≈ ' : '') + fmtW(a.Q) + ' · air through the rack ' + fmtF(a.flow) + ' · hottest air ≈ ' + fmtT(a.maxT));
    a.fans.forEach(f => L.push('- Fan: ' + f.name + ', ' + fanLine(f.d) + ', ' + dirText(f.dir, f.place)));
    airTips(a).forEach(t => L.push('- ' + t.text + (t.after ? ' (hottest air ' + fmtT(a.maxT) + ' → ' + fmtT(t.after.maxT) + ')' : '')));
  }
  const pw = powerModel(), N = pw.ports;
  if (pw.total || N.need) {
    L.push('', 'Power & network (estimate)', '- Draw from the wall: ' + (pw.est ? '≈ ' : '') + fmtW(pw.total) + ', ' + energyText(pw) + ' a year');
    pw.poe.sources.forEach(s => L.push('- PoE: ' + s.name + ', ' + Math.round(s.used) + ' of ' + Math.round(s.budget) + ' W, ' + s.n + ' of ' + s.ports + ' ports'));
    if (N.providers.length) L.push('- Network ports: ' + N.need + ' cables, ' + N.offered + ' switch and router ports, ' + N.free + ' free');
    if (pw.ups) L.push('- UPS ' + pw.ups.size + ' ' + pw.ups.unit + ': ≈ ' + fmtMin(pw.ups.minutes));
    window.LRPower.issues(pw).forEach(i => L.push('- ' + i.text));
  }
  return L.join('\n');
}
function csv(rows) { return '﻿' + rows.map(r => r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\n'); }

function render() { renderStart(); renderControls(); renderRack(); renderSel(); renderUnplaced(); renderBuild(); renderLib(); save(); if (view === '3d' && window.LRView3D) window.LRView3D.update(snapshot()); }

/* ---------- 3D snapshot for view3d.js ---------- */
function snapshot() {
  return {
    h: state.h, version: state.version, sides: state.sides, frame: state.frame, panel: state.panel, accent: state.accent, label: state.label || 'Lab Rax', top: state.top ? fullName(LIB[state.top]) : null,
    topPart: state.top ? LIB[state.top] : null, bottom: state.bottom, bottomPart: bottomPart(), mods: frameMods(),
    items: byPos().map(i => { const d = info(i); return { id: i.id, pos2: i.pos2, h2: d.h2, name: i.label || shortName(d), face: d.face, look: d, color: colorOf(i), depth: d.depth || (i.key === 'gen' && i.params.type === 'shelf' ? i.params.dd : null), gen: i.key === 'gen' ? i.params : null, sel: i.id === sel, back: sideOf(i) === 'back', upper: upperHalf(i) }; })
  };
}

/* ---------- files out ---------- */
const TOP_WIN = (() => { try { return window.self === window.top; } catch (e) { return false; } })();
async function saveFile(filename, blob) {
  let dl = null;
  try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
  if (dl) {
    try { await dl.save({ filename, data: blob }); say('Saved ' + filename + '.'); return true; }
    catch (e) { say(e && e.code === 'declined' ? 'Download cancelled.' : 'This view can’t save files. Open the planner on its own page to download.'); }
    return false;
  }
  if (TOP_WIN) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    say('Downloaded ' + filename + '.');
    return true;
  }
  say('This view can’t save files. Open the planner on its own page to download.');
  return false;
}
async function genSTL(item) {
  const part = await P.build(item.params);
  return P.toSTL(part.geoms, item.name, part.faceUp);
}
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'part';
/* download-list.html in the build pack: every community model to open, download on its own site and tick off.
   Community files can't be in the pack (most licences forbid redistribution and MakerWorld needs a login), so this is the fast path.
   The page stands alone, with no fonts or scripts from elsewhere, and remembers the ticks in the browser where it can. */
const DL_CSS = ':root{--bg:#F3F4F2;--card:#fff;--ink:#16181B;--muted:#6A6F76;--line:#E3E5E2;--accent:#17824A;--on-accent:#fff;color-scheme:light dark}' +
  '@media (prefers-color-scheme:dark){:root{--bg:#141517;--card:#1B1C1F;--ink:#ECEDEE;--muted:#9A9EA4;--line:#2A2C30;--accent:#3CC27A;--on-accent:#0E1A13}}' +
  '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}' +
  'main{max-width:760px;margin:0 auto;padding:28px 16px 48px}h1{font-size:24px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 8px}p{margin:0 0 14px;color:var(--muted)}' +
  '.top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.bar{height:6px;border-radius:9px;background:var(--line);overflow:hidden;margin:8px 0 18px}.bar i{display:block;height:100%;width:0;background:var(--accent)}' +
  'button{font:inherit;font-weight:700;height:40px;padding:0 18px;border-radius:999px;border:0;background:var(--accent);color:var(--on-accent);cursor:pointer}' +
  'ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}li{display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--card)}' +
  'li label{flex:1;display:flex;gap:12px;align-items:center;min-width:0;cursor:pointer}li input{width:20px;height:20px;accent-color:var(--accent);flex:none}li span{display:flex;flex-direction:column;min-width:0}' +
  'li small{color:var(--muted);font-size:13px}li a{color:var(--accent);font-weight:700;text-decoration:none;white-space:nowrap;font-size:14px}li.opened{border-color:var(--accent)}li.done b{text-decoration:line-through;color:var(--muted)}' +
  '.tag{font:12px ui-monospace,Menlo,monospace;color:var(--muted)}@media (max-width:520px){li{flex-wrap:wrap}li a{margin-left:32px}}@media print{button,.bar{display:none}}';
const DL_JS = '(function(){var K=document.body.dataset.key,done={};try{done=JSON.parse(localStorage.getItem(K))||{}}catch(e){}' +
  'var rows=[].slice.call(document.querySelectorAll("li[data-i]")),next=0;function save(){try{localStorage.setItem(K,JSON.stringify(done))}catch(e){}}' +
  'function update(){var n=rows.filter(function(r){return done[r.dataset.i]}).length;document.getElementById("count").textContent=n+" of "+rows.length+" downloaded";' +
  'document.getElementById("bar").style.width=(rows.length?n/rows.length*100:100)+"%";rows.forEach(function(r){r.classList.toggle("done",!!done[r.dataset.i]);r.querySelector("input").checked=!!done[r.dataset.i]})}' +
  'rows.forEach(function(r){r.querySelector("input").addEventListener("change",function(e){if(e.target.checked)done[r.dataset.i]=1;else delete done[r.dataset.i];save();update()});' +
  'r.querySelector("a").addEventListener("click",function(){r.classList.add("opened");next=rows.indexOf(r)+1})});' +
  'var nb=document.getElementById("next");if(nb)nb.addEventListener("click",function(){var order=rows.slice(next).concat(rows.slice(0,next)),r=order.filter(function(x){return!done[x.dataset.i]})[0];' +
  'if(!r)return;r.classList.add("opened");next=rows.indexOf(r)+1;window.open(r.querySelector("a").href,"_blank","noopener");r.scrollIntoView({block:"center"})});update()})();';
function downloadListHTML(pk) {
  const title = (state.label || 'Lab Rax') + ' · ' + state.h + 'U', models = pk.filter(x => x.url), own = pk.filter(x => !x.url);
  const site = u => /printables\.com/.test(u) ? 'Printables' : /makerworld\.com/.test(u) ? 'MakerWorld' : 'the model page';
  const key = 'labrax-download-list-' + P.crc32(new TextEncoder().encode(models.map(x => x.url).join('\n'))).toString(36);
  const name = x => '<b>' + esc((x.qty > 1 ? x.qty + '× ' : '') + x.name) + '</b>' + (x.variants ? '<small>Variants: ' + esc(x.variants) + '</small>' : '') + '<small>' + esc(x.subs.join(', ')) + '</small>';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Download list · ' + esc(title) + '</title><style>' + DL_CSS + '</style></head>' +
    '<body data-key="' + key + '"><main><h1>Download list</h1><p>' + esc(title) + '. Open each model, download it there (MakerWorld asks you to sign in; the 3MF keeps the print profile) and tick it off. Your ticks are remembered in this browser.</p>' +
    (models.length ? '<div class="top"><strong id="count"></strong><button type="button" id="next">Open next ↗</button></div><div class="bar"><i id="bar"></i></div><ul>' +
      models.map((x, i) => '<li data-i="' + i + '"><label><input type="checkbox"><span>' + name(x) + '</span></label><a href="' + esc(x.url) + '" target="_blank" rel="noopener">Open on ' + site(x.url) + ' ↗</a></li>').join('') + '</ul>'
      : '<p>There are no community models in this layout.</p>') +
    (own.length ? '<h2>Custom parts</h2><p>Already in this pack, in custom-parts/. Panels and shelves print face-down, label plates face-up.</p><ul>' + own.map(x => '<li><span style="flex:1">' + name(x) + '</span><span class="tag">STL</span></li>').join('') + '</ul>' : '') +
    '</main><script>' + DL_JS + '</script></body></html>';
}
async function buildPack() {
  say('Preparing your build pack…');
  const files = [], base = rackName();
  const gens = byPos().filter(i => i.key === 'gen');
  for (const g of gens) files.push({ name: 'custom-parts/' + uRange(g.pos2, H(g)).replace('–', '-') + (sideOf(g) === 'back' ? '-back' : '') + '-' + slug(g.name) + '.stl', data: await genSTL(g) });
  const pk = printPack();
  files.push({ name: 'download-list.html', data: downloadListHTML(pk) });
  const bedCol = x => pk.printer ? [x.pieces.length ? bedText(x.bed) || 'Fits' : ''] : []; // empty: no sizes known for that model
  files.push({ name: 'print-list.csv', data: csv([['Qty', 'Part', 'Variants', 'Where', 'Link', ...(pk.printer ? ['Print bed: ' + bedName(pk.printer)] : [])], ...pk.map(x => [x.qty, x.name, x.variants, x.subs.join('; '), x.url || 'custom-parts/', ...bedCol(x)])]) });
  files.push({ name: base + '.rack.json', data: rackFile() });
  files.push({ name: 'shopping-list.csv', data: csv([['Group', 'Qty', 'Item', 'Spec', ...((shopLinks('x')).map(l => l.shop))], ...orderList().map(x => [(SHOP_GROUPS.find(g => g[0] === x.group) || ['', ''])[1], qtyText(x), x.name, x.spec || '', ...(x.links || []).map(l => l.url)])]) });
  files.push({ name: 'build-guide.html', data: buildGuidePage() });
  files.push({ name: 'README.txt', data: 'Mini Rack Planner build pack — ' + (state.label || 'Lab Rax') + ', ' + state.h + 'U\n\n' + listText() +
    '\n\nCommunity models stay on MakerWorld under their own licenses: open download-list.html, download each model there as 3MF and tick it off.\nCustom parts in custom-parts/ were generated by the Lab Rax Planner (MIT) and print without supports: panels and shelves face-down, label plates face-up.\n' +
    base + '.rack.json is this layout: open it in the planner with Open file (under Your build) to change it later.\n' });
  let pdfErr = window.LRPdf ? null : 'the PDF module is not available';
  if (!pdfErr) try { files.push({ name: base + '-build-plan.pdf', data: await window.LRPdf.make(pdfData()) }); } catch (e) { pdfErr = e && e.message || 'unknown error'; }
  const zip = base + '-build-pack.zip';
  if (await saveFile(zip, P.zip(files)) && pdfErr) say('Downloaded ' + zip + ', but the build plan PDF is missing from it: ' + pdfErr + '.', ['pdf', 'Try the PDF again']);
}
async function downloadPDF() {
  if (!window.LRPdf) { say('The PDF module is not available.'); return; }
  say('Preparing the build plan…');
  try { const bytes = await window.LRPdf.make(pdfData()); await saveFile(slug(state.label || 'lab-rax') + '-' + state.h + 'u-build-plan.pdf', new Blob([bytes], { type: 'application/pdf' })); }
  catch (err) { say('The build plan could not be made: ' + (err && err.message || 'unknown error') + '.'); }
}
function changeCurrency(currency) {
  if(!['EUR','USD','GBP','CAD','AUD'].includes(currency))return;
  state.budgets=state.budgets&&typeof state.budgets==='object'?state.budgets:{};
  const old=window.LREstimate.settings(state.costs);state.budgets[old.currency]=old;
  state.costs=window.LREstimate.settings({...state.budgets[currency],currency,watts:old.watts,gramsHour:old.gramsHour,slicedGrams:old.slicedGrams,slicedHours:old.slicedHours,owned:old.owned,filamentOwned:old.filamentOwned});
}
function updateFinalize() {
  const el=$('#finalize-total');if(!el)return;
  const e=buildEstimate();el.textContent='≈ '+window.LREstimate.money(e.total,e.s.currency)+' left to buy incl. print electricity'+(e.unknown.length?' + '+e.unknown.length+' unpriced item(s)':'')+' · '+e.spools+' filament spool(s) to buy';
}
function openFinalize(format) {
  let dialog=$('#finalize-build');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='finalize-build';dialog.className='finalize-build';document.body.appendChild(dialog);}
  const e=buildEstimate(),input=(key,v,max)=>'<input class="field" type="number" min="0"'+(max?' max="'+max+'"':'')+' step="1" data-cost="'+key+'" aria-label="Already owned quantity" value="'+v+'">';
  dialog.dataset.format=format;
  dialog.innerHTML='<div class="finalize-head"><div><h2>Ready to build?</h2><p>Check what you already have. Your download will show what is still needed.</p></div><button class="btn small" data-act="final-close">Close</button></div><p id="finalize-total" class="finalize-total"></p>'+
    '<div style="display:flex;gap:16px;flex-wrap:wrap"><label>Ship to <select class="field" id="final-market">'+Object.entries(window.LRMarket.regions).map(([k,r])=>'<option value="'+k+'"'+(state.market===k?' selected':'')+'>'+r.name+'</option>').join('')+'</select></label><label>Currency <select class="field" id="final-currency">'+['EUR','USD','GBP','CAD','AUD'].map(k=>'<option'+(e.s.currency===k?' selected':'')+'>'+k+'</option>').join('')+'</select></label></div><p class="hint">Shop links follow your destination. No automatic currency conversion. Enter local prices in Print time &amp; budget; unpriced items stay visible.</p><h3>Filament</h3><div class="owned-row owned-label"><span>Colour</span><span>Needed</span><span>Have (g)</span></div>'+e.colours.map(r=>'<label class="owned-row"><span><i class="swatchdot" style="--c:'+r.c+'"></i>'+esc(colorName(r.c))+'</span><span>≈ '+Math.round(r.grams)+' g</span>'+input('stock:'+r.c,r.owned)+'</label>').join('')+
    '<h3>Essential supplies</h3><div class="owned-row owned-label"><span>Item</span><span>Needed</span><span>Have (pieces)</span></div>'+e.supplies.map(r=>'<label class="owned-row"><span>'+esc(r.name)+'</span><span>'+(r.qty==null?'Check model':r.qty+'×')+'</span>'+input('owned:'+r.key,r.owned)+'</label>').join('')+
    '<details class="finalize-prices"><summary>Print time and local price settings</summary>'+estimateHTML(false)+'</details><p class="hint">Enter pieces, not packs. Unknown bracket or joiner quantities still need checking. Print time and cost assumptions can be changed in Print time & budget.</p><div class="finalize-actions"><button class="btn primary" data-act="final-download">Download '+(format==='pack'?'build pack':'PDF')+'</button></div>';
  updateFinalize();dialog.showModal();
}
function pdfData() {
  const pk = printPack();
  return { title: (state.label || 'Lab Rax') + ' · ' + state.h + 'U', h: state.h, version: state.version === 'brass' ? 'Heat-set inserts' : 'Bolted', frame: state.frame, panel: state.panel, accent: state.accent, label: state.label || 'Lab Rax',
    top: state.top ? fullName(LIB[state.top]) : null, topLook: state.top ? LS.topFor(LIB[state.top], colorsFor()) : null, // the top mount as drawn above the frame
    items: byPos().map(i => { const d = info(i); return { pos: uRange(i.pos2, d.h2) + atBack(i), pos2: i.pos2, h2: d.h2, name: fullName(d), label: i.label || '', u: uTxt(d), url: d.url || '', author: d.author || '', color: colorOf(i), face: faceSVG(d, colorOf(i), upperHalf(i)), plate: plateBox(i, d), depth: partDepth(i), back: sideOf(i) === 'back' }; }),
    print: pk.map(x => ({ qty: x.qty, name: x.name, sub: x.subs.join(', '), vars: x.variants, url: x.url, bed: bedText(x.bed, true), bad: !!(x.bed && x.bed.bad.length) })),
    printer: pk.printer ? { name: bedName(pk.printer), bad: bedBad(pk).length, turned: pk.some(x => x.bed && x.bed.turned.length), est: pk.some(x => x.bed && [...x.bed.bad, ...x.bed.turned].some(q => q.est)) } : null, shop: orderList(), guide: guide(), estimate: buildEstimate(), market: state.market, wallMounts: state.extras.filter(k => LIB[k].shape && LIB[k].shape.wall).map(k => ({ name: fullName(LIB[k]), url: LIB[k].url })), sides: state.sides, dimensions: CAT.frame.dimensions, shareUrl: TOP_WIN ? shareLink() + '&s=shop' : null, frameParts: frameParts(), notes: state.h > 5 ? [JOINER_NOTE] : [],
    cooling: pdfCooling(), power: pdfPower(), shareUrl: TOP_WIN ? shareLink() + '&s=shop' : null }; // the QR code opens this layout with its shopping list
}
function pdfPower() { // the Power & network block for the PDF; null when nothing draws power or needs a port
  const r = powerModel(), P = r.poe, N = r.ports;
  if (!r.total && !P.sources.length && !N.need) return null;
  return { tiles: [['DRAW', (r.est ? '≈ ' : '') + fmtW(r.total)], ['POE', P.sources.length || P.load ? Math.round(P.load) + ' / ' + Math.round(P.budget) + ' W' : 'none'],
      ['NETWORK PORTS', N.providers.length ? (N.need + N.linkPorts) + ' / ' + N.offered : N.need + ' needed'], ['UPS RUNTIME', r.ups ? '≈ ' + fmtMin(r.ups.minutes) : 'no UPS set']],
    lines: [(r.est ? '≈ ' : '') + fmtW(r.total) + ' from the wall, ' + energyText(r) + ' a year running all the time.' + (r.ups ? ' UPS ' + r.ups.size + ' ' + r.ups.unit + ': ≈ ' + fmtMin(r.ups.minutes) + '.' : '')]
      .concat(P.sources.map(s => s.name + ': ' + Math.round(s.used) + ' of ' + Math.round(s.budget) + ' W PoE, ' + s.n + ' of ' + s.ports + ' ports' + (s.pds.length ? ' (' + [...new Set(s.pds.map(p => p.name))].join(', ') + ')' : '') + '.'))
      .concat(window.LRPower.issues(r).map(i => (i.level === 'short' ? '! ' : '') + i.text)),
    short: window.LRPower.issues(r).some(i => i.level === 'short') };
}
function pdfCooling() { // the Cooling section for the PDF; null when nothing in the rack makes heat
  const a = airflow();
  if (!a.Q) return null;
  const perU = []; for (let s = 0; s + 1 < a.temp.length; s += 2) perU.push({ u: uRange(s, 2), t: fmtT((a.temp[s] + a.temp[s + 1]) / 2) });
  return { room: a.room + ' °C', heat: (a.est ? '≈ ' : '') + fmtW(a.Q), hottest: '≈ ' + fmtT(a.maxT), flow: fmtF(a.flow) + ' · ' + Math.round(a.flow / 1.699) + ' CFM', perU,
    fans: a.fans.map(f => ({ name: f.name, where: f.where, spec: fanLine(f.d), dir: dirText(f.dir, f.place) })),
    tips: airTips(a).filter(t => t.after).map(t => ({ text: t.text, before: fmtT(a.maxT), after: fmtT(t.after.maxT) })),
    // the airflow diagram in the PDF: temp is °C per ½U layer, top first; flows are m³/h, positive into the rack
    map: { room: a.room, span: HEAT_SPAN, rated: RATED, maxT: a.maxT, flow: a.flow, Q: a.Q, est: a.est, h: state.h, H: a.r.H, neutral: a.r.neutral, temp: a.temp,
      parts: a.parts.map(p => ({ pos2: p.it.pos2, h2: p.d.h2, w: p.w, est: p.est, t: p.T, name: p.it.label || shortName(p.d), back: sideOf(p.it) === 'back' })),
      openings: a.groups.filter(g => g.kind !== 'seams').map(g => ({ kind: g.kind, name: g.name, layers: g.layers, flows: g.flows, in: g.in, out: g.out })),
      fans: a.fans.map(f => ({ name: f.name, place: f.place, dir: f.dir, pos2: f.it ? f.it.pos2 : null, h2: f.it ? f.d.h2 : null, in: f.in, out: f.out, rated: f.rated, spec: fanLine(f.d) })) } };
}

/* ---------- custom part maker ---------- */
let mkEdit = null, mkTimer = null;
function mkParams() {
  const type = $('#mk-type').value, u = +$('#mk-u').value, p = { type, u };
  const v = id => { const el = $('#' + id); return el ? el.value : null; };
  if (type === 'vent') p.pattern = v('mk-pattern') || 'slots';
  if (type === 'keystone') { p.ports = +(v('mk-ports') || 12); p.rows = +(v('mk-rows') || 1); }
  if (type === 'shelf') { p.dw = +(v('mk-dw') || 120); p.dh = +(v('mk-dh') || 30); p.dd = +(v('mk-dd') || 120); p.open = true; }
  if (type === 'label') p.text = (v('mk-text') || state.label || 'LAB RAX').slice(0, 24);
  const lim = (x, lo, hi, d) => isFinite(x) && x > 0 ? Math.max(lo, Math.min(hi, Math.round(x))) : d;
  if (type === 'fan') { p.size = P.FANS[v('mk-size')] ? +v('mk-size') : 40; const f = P.FANS[p.size]; p.u = f.u; p.fans = lim(+v('mk-fans'), 1, f.max, f.max); p.grille = v('mk-grille') === 'open' ? 'open' : 'hex'; }
  if (type === 'dtype') p.ports = lim(+v('mk-ports'), 1, 7, 6);
  if (type === 'pass') { p.width = lim(+v('mk-width'), 30, 200, 120); p.style = v('mk-style') === 'brush' ? 'brush' : 'slot'; }
  return p;
}
// the heights a part type comes in; a fan panel takes its height from the fan size, a D-type flange needs 1U
function mkHeights(u) {
  const t = $('#mk-type').value, el = $('#mk-u'), cur = u || +el.value, size = $('#mk-size') && +$('#mk-size').value;
  const list = t === 'fan' ? [P.FANS[size] ? P.FANS[size].u : 1] : t === 'dtype' ? [1, 2] : t === 'pass' ? [0.5, 1] : [0.5, 1, 1.5, 2, 3, 4];
  if (list.length > 2 && okU(cur) && !list.includes(cur)) list.push(cur), list.sort((a, b) => a - b); // a shelf that grew to fit its device, e.g. 2½U
  const pick = list.includes(cur) ? cur : list.find(x => x >= 1) || list[0];
  el.innerHTML = list.map(x => '<option value="' + x + '"' + (x === pick ? ' selected' : '') + '>' + P.fmtU(x) + '</option>').join('');
  el.disabled = list.length < 2;
}
function mkOptions(p) {
  const t = $('#mk-type').value, o = $('#mk-opts');
  const inp = (id, label, val, attrs) => '<label for="' + id + '">' + label + '<input id="' + id + '" ' + attrs + ' value="' + esc(val) + '"></label>';
  const sel = (id, label, opts, val) => '<label for="' + id + '">' + label + '<select id="' + id + '">' + opts.map(([v, l]) => '<option value="' + v + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>';
  if (t === 'fan') {
    const size = p && P.FANS[p.size] ? p.size : 40, f = P.FANS[size];
    o.innerHTML = '<div class="mk-row">' + sel('mk-size', 'Fan size', Object.keys(P.FANS).map(k => [k, k + ' mm · ' + P.fmtU(P.FANS[k].u)]), size) + inp('mk-fans', 'Fans', p ? p.fans : f.max, 'type="number" min="1" max="' + f.max + '" step="1"') +
      sel('mk-grille', 'Front', [['hex', 'Grille'], ['open', 'Open ring']], p ? p.grille : 'hex') + '</div><p class="hint" style="margin:0">Counts as a fan in the cooling estimate: in at the front, out at the back, or as you set it.</p>';
  }
  else if (t === 'dtype') o.innerHTML = inp('mk-ports', 'Cut-outs per row (2U has two rows)', p ? p.ports : 6, 'type="number" min="1" max="7" step="1"');
  else if (t === 'pass') o.innerHTML = '<div class="mk-row" style="grid-template-columns:1fr 1fr">' + sel('mk-style', 'Opening', [['slot', 'Slot'], ['brush', 'Brush slot']], p ? p.style : 'slot') + inp('mk-width', 'Width (mm)', p ? p.width : 120, 'type="number" min="30" max="200" step="5"') + '</div>';
  else if (t === 'vent') o.innerHTML = '<label for="mk-pattern">Pattern<select id="mk-pattern"><option value="slots">Slots</option><option value="hex"' + (p && p.pattern === 'hex' ? ' selected' : '') + '>Hexagons</option></select></label>';
  else if (t === 'keystone') o.innerHTML = '<div class="mk-row" style="grid-template-columns:1fr 1fr">' + inp('mk-ports', 'Ports per row', p ? p.ports : 12, 'type="number" min="1" max="12" step="1"') + inp('mk-rows', 'Rows (1U and up)', p ? p.rows : 1, 'type="number" min="1" max="4" step="1"') + '</div>';
  else if (t === 'shelf') o.innerHTML = '<p class="hint" style="margin:0">Device size in mm. The shelf gets a matching front opening, a floor, side walls and a rear stop.</p><div class="mk-row">' + inp('mk-dw', 'Width', p ? p.dw : 120, 'type="number" min="20" max="212" step="1"') + inp('mk-dh', 'Height', p ? p.dh : 30, 'type="number" min="5" max="400" step="1"') + inp('mk-dd', 'Depth', p ? p.dd : 120, 'type="number" min="20" max="240" step="1"') + '</div>';
  else if (t === 'label') o.innerHTML = inp('mk-text', 'Text', p ? p.text : (state.label || 'LAB RAX'), 'type="text" maxlength="24"');
  else o.innerHTML = '';
}
function openMaker(item) {
  mkEdit = item || null;
  const p = item ? item.params : { type: 'blank', u: 1 };
  $('#mk-type').value = p.type;
  mkOptions(p);
  mkHeights(p.u);
  $('#mk-name').value = item ? item.name : '';
  document.querySelector('[data-act="maker-add"]').textContent = item ? 'Update part' : 'Add to rack';
  const dlg = $('#maker'); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  mkPreview();
}
// a field in the part maker changed: a new type brings its own fields and heights, a new fan size its fan count and height
function mkChange(id) {
  if (id === 'mk-type') { mkOptions(null); mkHeights(); }
  if (id === 'mk-size') { const f = P.FANS[$('#mk-size').value], el = $('#mk-fans'); if (f && el) { el.max = f.max; el.value = f.max; } mkHeights(); }
  mkPreview();
}
async function mkPreview() {
  clearTimeout(mkTimer);
  mkTimer = setTimeout(async () => {
    const p = mkParams();
    try {
      const part = await P.build(p);
      $('#mk-dims').textContent = part.size.w.toFixed(0) + ' × ' + part.size.h.toFixed(1) + ' × ' + part.size.d.toFixed(1) + ' mm · ' + P.fmtU(part.u);
      $('#mk-note').textContent = part.note || '';
      if (part.u !== p.u) mkHeights(part.u);
      if (window.LRView3D) window.LRView3D.preview($('#mk-3d'), part.geoms, state.panel);
    } catch (e) { $('#mk-note').textContent = 'The 3D library could not be loaded, so the preview is unavailable. You can still add the part.'; }
  }, 120);
}

/* ---------- set-up wizard ---------- */
/* Five steps: look, build, name, hardware, result. The result is an ordinary layout: patch panel on top, then network, compute
   and storage, power at the bottom; ½U vent gaps between warm parts; the airflow estimate decides on a fan when asked to. */
const PRESETS = [['Lab Rax', '#26282B', '#26282B', '#B5CF2A'], ['Stealth', '#26282B', '#26282B', '#7D848B'], ['Arctic', '#E9EBEC', '#E9EBEC', '#2E5E9E'],
  ['Contrast', '#26282B', '#E9EBEC', '#E07A2E'], ['Forest', '#26282B', '#3E8E5A', '#E9EBEC'], ['Signal', '#7D848B', '#26282B', '#C8372D']];
const WZ_STEPS = ['Look', 'Build', 'Name', 'Hardware', 'Your rack'];
const ROLES = [[/gateway|switch|tp-link|omada|netgear|mikrotik|modem|fibre|firewall/i, 1], [/smart home|kvm|tuner/i, 2], [/mini pc|apple|itx|motherboard/i, 3],
  [/raspberry|single-board/i, 4], [/storage|nas/i, 6], [/power/i, 8]];
const roleOf = group => (ROLES.find(([re]) => re.test(group)) || [0, 5])[1];
let wz = null, DEVS = null;
function wzDevices() { // every device with at least one front mount, flattened
  if (DEVS) return DEVS;
  DEVS = [];
  (CAT.devices || []).forEach((g, gi) => g.items.forEach((d, di) => {
    const mounts = d.mounts.filter(m => m.position !== 'top' && LIB[m.id]);
    if (mounts.length) DEVS.push({ id: gi + '.' + di, group: g.group, device: d.device, mounts });
  }));
  return DEVS;
}
// the mount to suggest: one for this device alone (not a combination with other gear), then made for Lab Rax, a known height, the lowest
const combo = m => /\+|together|with .*(switch|router|kvm|zero|nas)/i.test(m.label);
const bestMount = dev => dev.mounts.slice().sort((a, b) => (combo(a) - combo(b)) || (!!b.labrax - !!a.labrax) || (!!a.estimated - !!b.estimated) || (a.u - b.u))[0].id;
function lowestFree(h2, side) { for (let p = slots() - h2; p >= 0; p--) if (isFree(p, h2, undefined, side || 'front')) return p; return null; }
function planLayout(w) {
  const look = PRESETS[w.preset], half = w.fans === 'none' || !LIB.mw1385541 ? 'vent05' : 'mw1385541', list = [], items = [];
  if (w.patch && LIB.keystone) list.push({ key: 'keystone', role: 0 });
  w.picks.forEach(p => { for (let i = 0; i < p.qty; i++) list.push({ key: p.mount, role: roleOf(p.group) }); });
  if (w.power && LIB.mw2010724) list.push({ key: 'mw2010724', role: 9 });
  list.sort((a, b) => a.role - b.role);
  let p = 0, id = 1, prevHot = false;
  const put = (key, at) => items.push({ id: id++, key, pos2: at });
  list.forEach(x => {
    const h2 = LIB[x.key].h2, hot = heatOf({ key: x.key }).w >= 15;
    let gap = prevHot && hot ? 1 : 0;                                  // let two warm parts breathe
    if (h2 > 1 && (p + gap) % 2) gap++;                                // whole-U parts start on a U boundary
    if (gap === 2 && !(p % 2)) { put('vent1', p); p += 2; }            // one 1U vent rather than two halves
    else for (let i = 0; i < gap; i++) { put(prevHot && hot ? 'vent05' : half, p); p += 1; }
    put(x.key, p); p += h2; prevHot = hot;
  });
  const cand = Object.assign(defaultState(), { h: Math.min(10, Math.max(1, Math.ceil(p / 2) + w.spare)), version: w.version, sides: w.sides, frame: look[1], panel: look[2], accent: look[3],
    label: (w.label || 'Lab Rax').slice(0, 16), top: w.fans === 'top' && LIB.mw1875867 ? 'mw1875867' : null, extras: [], back: 'open', items, nextId: id, example: false, done: {} });
  const keep = state; state = cand;
  try {
    placed().forEach(i => { if (i.pos2 + H(i) > slots()) i.pos2 = null; }); // more than 10U: these wait below the rack
    let a = airflow();
    if (w.fans === 'auto' && a.maxT > RATED[0] && LIB.mw1875867) { state.top = 'mw1875867'; a = airflow(); }
    if (w.fans !== 'none' && a.maxT > RATED[1] && LIB.fan40) {
      if (lowestFree(2) == null && state.h < 10) state.h++;
      const q = lowestFree(2); if (q != null) { state.items.push({ id: state.nextId++, key: 'fan40', pos2: q }); a = airflow(); }
    }
    const [k1, k05] = a.cfm > 0 ? blankKeys() : ['vent1', 'vent05']; // close the rest: blanks with fans, vents without
    for (let s = 0; s < slots();) { if (isFree(s, 2, undefined, 'front')) { state.items.push({ id: state.nextId++, key: k1, pos2: s }); s += 2; } else if (isFree(s, 1, undefined, 'front') && halfFits(k05, s)) { state.items.push({ id: state.nextId++, key: k05, pos2: s }); s += 1; } else s++; }
    a = airflow();
    const pk = printPack();
    return { state: cand, a, unplaced: cand.items.filter(i => i.pos2 == null).length, tooBig: bedBad(pk).length, printer: pk.printer };
  } finally { state = keep; }
}
function openWizard() {
  if (!CAT) return;
  if (!wz) {
    const pi = PRESETS.findIndex(p => p[1] === state.frame && p[2] === state.panel && p[3] === state.accent);
    wz = { step: 0, preset: Math.max(0, pi), version: state.version, sides: state.sides, fans: 'auto', label: state.label || 'Lab Rax', q: '', picks: [], patch: true, power: false, spare: 1 };
  }
  wz.step = 0; renderWizard();
  const dlg = $('#wizard'); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
}
function closeWizard() { const dlg = $('#wizard'); if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
function miniRack(st) { // a small static front view of a layout
  const s = 10;
  return '<div class="wz-rack" style="--frame:' + st.frame + ';--acc:' + st.accent + '"><span class="wz-rack-top">' + esc(st.label || 'Lab Rax') + '</span><div class="wz-rack-body" style="height:' + st.h * 2 * s + 'px">' +
    st.items.filter(i => i.pos2 != null).map(i => { const d = LIB[i.key], c = i.color || st.panel;
      return '<div class="item" style="top:' + i.pos2 * s + 'px;height:' + (d.h2 * s - 1) + 'px;left:5px;right:5px;cursor:default;--c:' + c + '">' + LS.frontFor(d, { color: c, accent: st.accent, frame: st.frame }) + '</div>'; }).join('') + '</div></div>';
}
function wzOption(key, title, opts) {
  return '<fieldset class="wz-opt"><legend>' + title + '</legend><div class="wz-cards">' + opts.map(([v, l, t]) =>
    '<button type="button" class="wz-card" data-act="wz-set" data-k="' + key + '" data-v="' + v + '" aria-pressed="' + (wz[key] === v) + '"><b>' + l + '</b><span>' + t + '</span></button>').join('') + '</div></fieldset>';
}
function wzResults() {
  const q = wz.q.toLowerCase().replace(/[\s-]/g, ''), picked = new Set(wz.picks.map(p => p.dev));
  const hits = wzDevices().filter(d => !picked.has(d.id) && (!q || (d.device + d.group + d.mounts.map(m => m.label).join('')).toLowerCase().replace(/[\s-]/g, '').includes(q)));
  if (!hits.length) return '<p class="hint">No device found for “' + esc(wz.q) + '”. You can add your own later with a custom shelf.</p>';
  let h = '', last = '';
  hits.forEach(d => { if (d.group !== last) { h += '<p class="grouphead">' + esc(d.group) + '</p>'; last = d.group; } h += '<button type="button" class="wz-dev" data-act="wz-add" data-dev="' + d.id + '">+ ' + esc(d.device) + '</button>'; });
  return h;
}
function wzPicked() {
  if (!wz.picks.length) return '<p class="hint">Nothing picked yet. Search below and add your devices.</p>';
  return wz.picks.map((p, i) => { const dev = wzDevices().find(d => d.id === p.dev);
    return '<div class="wz-pick"><b>' + esc(dev.device) + '</b><select data-i="' + i + '" class="wz-mount" aria-label="Mount for ' + esc(dev.device) + '">' +
      dev.mounts.map(m => '<option value="' + m.id + '"' + (m.id === p.mount ? ' selected' : '') + '>' + esc(m.label) + ' · ' + uTxt(LIB[m.id]) + (m.labrax && !/lab ?rax/i.test(m.label) ? ' · Lab Rax' : '') + '</option>').join('') + '</select>' +
      '<span class="stepper small"><button type="button" data-act="wz-qty" data-i="' + i + '" data-d="-1" aria-label="One less">−</button><output>' + p.qty + '</output><button type="button" data-act="wz-qty" data-i="' + i + '" data-d="1" aria-label="One more">+</button></span></div>'; }).join('');
}
function renderWizard() {
  const st = wz.step, look = PRESETS[wz.preset];
  let body = '';
  if (st === 0) body = '<h3 class="wz-h">Pick a look</h3><p class="hint">Frame, panels and accent. You can change every colour later, also per part.</p><div class="wz-presets">' +
    PRESETS.map((p, i) => '<button type="button" class="wz-preset" data-act="wz-preset" data-i="' + i + '" aria-pressed="' + (wz.preset === i) + '"><span class="wz-mini" style="--f:' + p[1] + ';--p:' + p[2] + ';--a:' + p[3] + '"><i></i><i></i><i></i></span><b>' + p[0] + '</b></button>').join('') + '</div>';
  else if (st === 1) body = '<h3 class="wz-h">How do you build it?</h3>' +
    wzOption('version', 'Frame', [['brass', 'Heat-set inserts', 'Brass inserts you melt in with a soldering iron. Neat, and the screws go straight in.'], ['bolted', 'Bolted', 'M6 or #10-32 screws with nuts. No inserts, no soldering iron.']]) +
    wzOption('sides', 'Side panels', [['printed', 'Printed', 'Printed with the frame, in the frame colour.'], ['acrylic', 'Acrylic', '3 mm acrylic cut to size, so you can see inside.']]) +
    wzOption('fans', 'Fans', [['auto', 'Only if needed', 'The planner checks the airflow and adds a fan when the rack would get warm.'], ['top', 'Top fan', 'A 120 mm fan in the top panel, blowing out.'], ['none', 'No fans', 'Quiet: vent panels instead of fans.']]) +
    '<fieldset class="wz-opt"><legend>Printer</legend>' + printerPicker('wz') + '<p class="hint" style="margin-top:6px">The print list then marks parts too big for your bed. Remembered in this browser, not saved with the layout.</p></fieldset>';
  else if (st === 2) body = '<h3 class="wz-h">Give it a name</h3><p class="hint">It goes on the front of the rack, like the Lab Rax logo.</p>' +
    '<input class="field wz-name" id="wz-name" type="text" maxlength="16" value="' + esc(wz.label) + '" placeholder="Lab Rax" aria-label="Rack name">' +
    '<div class="wz-logo" style="--f:' + look[1] + ';--a:' + look[3] + '"><span id="wz-logo">' + esc(wz.label || 'Lab Rax') + '</span></div>';
  else if (st === 3) body = '<h3 class="wz-h">What goes in it?</h3><p class="hint">Add your devices. For each one the planner picks a mount, preferring ones made for Lab Rax; you can change it.</p>' +
    '<div id="wz-picked" class="wz-picked">' + wzPicked() + '</div>' +
    '<label class="search" for="wz-q"><input id="wz-q" type="search" placeholder="Search devices, e.g. UCG-Max, Pi 5, Mac mini" autocomplete="off" value="' + esc(wz.q) + '"></label>' +
    '<div id="wz-results" class="wz-results">' + wzResults() + '</div>' +
    '<div class="wz-extras"><label><input type="checkbox" id="wz-patch"' + (wz.patch ? ' checked' : '') + '> Keystone patch panel on top (½U, 12 ports)</label>' +
    '<label><input type="checkbox" id="wz-power"' + (wz.power ? ' checked' : '') + '> Power strip at the bottom (1U PDU)</label>' +
    '<label>Room to grow <select id="wz-spare">' + [0, 1, 2].map(n => '<option value="' + n + '"' + (wz.spare === n ? ' selected' : '') + '>' + (n ? n + 'U' : 'none') + '</option>').join('') + '</select></label></div>';
  else {
    const r = planLayout(wz), a = r.a, lvl = airLevel(a)[0].toLowerCase(), s = r.state;
    body = '<h3 class="wz-h">Your rack</h3><div class="wz-result">' + miniRack(s) + '<div class="wz-sum">' +
      '<p><b>' + s.h + 'U</b> · ' + s.items.filter(i => i.pos2 != null).length + ' parts · ' + (s.version === 'brass' ? 'heat-set inserts' : 'bolted') + ' · ' + s.sides + ' sides</p>' +
      (a.Q ? '<p>Hottest air ≈ ' + fmtT(a.maxT) + ' in a ' + a.room + ' °C room (' + lvl + ')' + (s.top ? ', with a 120 mm fan in the top' : '') + (s.items.some(i => i.key === 'fan40') ? ' and a fan panel' : '') + '.</p>' : '') +
      (r.tooBig ? '<p class="wz-warn">' + r.tooBig + (r.tooBig > 1 ? ' prints have parts' : ' print has a part') + ' too big for your ' + esc(bedName(r.printer)) + '. The print list shows which.</p>' : '') +
      (r.unplaced ? '<p class="wz-warn">' + r.unplaced + (r.unplaced > 1 ? ' parts don’t' : ' part doesn’t') + ' fit in 10U. Take some hardware out, or place them later.</p>' : '') +
      (wz.picks.length ? '' : '<p class="wz-warn">No hardware picked, so this is an empty frame with panels.</p>') +
      '<ul class="wz-list">' + wz.picks.map(p => { const d = LIB[p.mount]; return '<li>' + (p.qty > 1 ? p.qty + '× ' : '') + esc(fullName(d)) + ' <span class="muted">' + uTxt(d) + '</span>' + (d.url ? ' <a href="' + esc(d.url) + '" target="_blank" rel="noopener">↗</a>' : '') + '</li>'; }).join('') + '</ul>' +
      '<p class="hint">After you create it, everything stays editable: move, swap, recolour or remove parts. Undo brings back your current layout.</p></div></div>';
  }
  $('#wz-steps').innerHTML = WZ_STEPS.map((l, i) => '<li' + (i === st ? ' aria-current="step"' : '') + (i < st ? ' class="done"' : '') + '>' + (i + 1) + ' ' + l + '</li>').join('');
  $('#wz-body').innerHTML = body;
  $('#wz-foot').innerHTML = (st ? '<button type="button" class="btn" data-act="wz-back">Back</button>' : '<span></span>') +
    (st < 4 ? '<button type="button" class="btn primary" data-act="wz-next">' + (st === 3 ? 'Show my rack' : 'Next') + '</button>' : '<button type="button" class="btn primary" data-act="wz-create">Create rack</button>');
}
function wzCreate() {
  const r = planLayout(wz);
  undo = JSON.stringify(state); state = r.state; sel = null; sanitize();
  closeWizard(); render(); renderLib();
  say('Your rack is ready. Change anything you like.', true);
}

/* ---------- events ---------- */
document.addEventListener('click', async e => {
  const a = e.target.closest('[data-act]');
  if (!a) { if (e.target.closest('#rackHost') && !e.target.closest('.item') && sel != null) { sel = null; render(); } return; }
  const act = a.dataset.act;
  if (!CAT && !['theme', 'maker-close'].includes(act)) return;
  switch (act) {
    case 'theme': cycleTheme(); break;
    case 'tab': tab = a.dataset.t; renderLib(); break;
    case 'where': setWhere(a.dataset.v); break;
    case 'go-step': goStep(+a.dataset.step); break;
    case 'go-printer': ui.sec.print = true; saveUI(); renderBuild(); { const p = document.querySelector('#build select[id$="-printer"]'); if (p) { p.scrollIntoView({ behavior: 'smooth', block: 'center' }); p.focus({ preventScroll: true }); } } break;
    case 'go-unplaced': { const u = $('#unplaced'); if (u) u.scrollIntoView({ behavior: 'smooth', block: 'center' }); } break;
    case 'go-part': { const id = +a.dataset.id; if (find(id)) { sel = id; if (view === '3d' || view === 'air') await setView(sideOf(find(id))); render(); const el = document.querySelector('#rack .item[data-id="' + id + '"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } } break;
    case 'start': { ui.started = true; saveUI(); const v = a.dataset.v;
      if (v === 'guide') openWizard();
      else if (v === 'empty') { undo = JSON.stringify(state); state = Object.assign(defaultState(), { items: [], nextId: 1, example: false }); sel = null; sanitize(); renderLib(); render(); say('An empty 5U rack. Add your hardware from the library.', true); goStep(2); }
      else if (v === 'file') $('#rackfile').click();
      renderStart(); break; }
    case 'bottom': state.bottom = a.dataset.v || null; if (!bottomPart()) state.bottomDir = null; touch(); render(); say('Bottom: ' + bottomName() + '.'); break;
    case 'lib-group': { const g = a.dataset.g; if (ui.open[g]) delete ui.open[g]; else ui.open[g] = true; saveUI(); renderLib(); break; }
    case 'lib-more': { const d = a.dataset.dev; if (devOpen.has(d)) devOpen.delete(d); else devOpen.add(d); renderLib(); break; }
    case 'lib-lr': ui.lr = !ui.lr; saveUI(); renderLib(); break;
    case 'view': setView(a.dataset.v); break;
    case 'h-': shrink(state.h - 1); break;
    case 'hist-undo': histGo(-1); break;
    case 'unclash': unclash(sel); break;
    case 'fill': { const it = find(sel), md = it && modOf(LIB[it.key]); if (!md) break; const k = Math.max(0, Math.min(md.n, (it.fill != null ? it.fill : md.n) + +a.dataset.d)); if (k === md.n) delete it.fill; else it.fill = k; touch(); render(); say(fullName(LIB[it.key]) + ': ' + (slotText(it) || 'all ' + md.n + ' ' + SLOT_NOUN[md.kind][1]) + '.'); break; }
    case 'hist-redo': histGo(1); break;
    case 'h+': setHeight(state.h + 1); break;
    case 'ver': state.version = a.dataset.v; touch(); render(); break;
    case 'frame': state.frame = a.dataset.c; touch(); render(); break;
    case 'panel': state.panel = a.dataset.c; touch(); render(); break;
    case 'part-color': { const it = find(sel); if (!it) break; if (a.dataset.c) it.color = a.dataset.c; else delete it.color; touch(); render(); break; }
    case 'acc': state.accent = a.dataset.c; touch(); render(); break;
    case 'lib': {
      const k = a.dataset.key, d = LIB[k];
      if (d.top) { const on = state.top !== k; state.top = on ? k : null; touch(); render(); renderLib(); say(on ? fullName(d) + ' now sits on top of the rack, replacing the top panel.' : 'Regular top panel restored.'); }
      else if (d.extra) { const i = state.extras.indexOf(k); if (i < 0) state.extras.push(k); else state.extras.splice(i, 1); touch(); render(); renderLib(); say(i < 0 ? fullName(d) + ' added to your build.' : fullName(d) + ' removed from your build.'); }
      else addItem({ key: k });
      break;
    }
    case 'top-off': state.top = null; touch(); render(); renderLib(); say('Regular top panel restored.'); break;
    case 'up': move(sel, -1); break;
    case 'down': move(sel, 1); break;
    case 'dup': { const it = find(sel); if (it) { const c = JSON.parse(JSON.stringify(it)); delete c.id; c.side = sideOf(it); addItem(c); } break; }
    case 'flip': flipSide(sel); break;
    case 'del': removeItem(sel); break;
    case 'rm': removeItem(+a.dataset.id); break;
    case 'replace': {
      const it = find(+a.dataset.id), p = firstFree(H(it), sideOf(it));
      const put = () => { const q = firstFree(H(it), sideOf(it)); if (q == null) return false; it.pos2 = q; sel = it.id; touch(); render(); say(fullName(info(it)) + ' placed back at ' + uRange(q, H(it)) + atBack(it) + '.'); return true; };
      if (p == null) noRoom(info(it), sideOf(it), put); else put();
      break;
    }
    case 'done': { const k = a.dataset.k; if (state.done[k]) delete state.done[k]; else state.done[k] = true; renderBuild(); save(); break; }
    case 'fill': fillGaps(); break;
    case 'sides': state.sides = a.dataset.v === 'acrylic' ? 'acrylic' : 'printed'; touch(); render(); break;
    case 'wizard': openWizard(); break;
    case 'wz-close': closeWizard(); break;
    case 'wz-next': wz.step = Math.min(4, wz.step + 1); renderWizard(); break;
    case 'wz-back': wz.step = Math.max(0, wz.step - 1); renderWizard(); break;
    case 'wz-preset': wz.preset = +a.dataset.i; renderWizard(); break;
    case 'wz-set': wz[a.dataset.k] = a.dataset.v; renderWizard(); break;
    case 'wz-add': { const dev = wzDevices().find(d => d.id === a.dataset.dev); if (dev) wz.picks.push({ dev: dev.id, group: dev.group, mount: bestMount(dev), qty: 1 }); $('#wz-picked').innerHTML = wzPicked(); $('#wz-results').innerHTML = wzResults(); break; }
    case 'wz-qty': { const i = +a.dataset.i, p = wz.picks[i]; p.qty = Math.min(8, p.qty + +a.dataset.d); if (p.qty < 1) wz.picks.splice(i, 1); $('#wz-picked').innerHTML = wzPicked(); $('#wz-results').innerHTML = wzResults(); break; }
    case 'wz-create': wzCreate(); break;
    case 'air-blank': fillGaps(blankKeys(), 'blank panel', 'front'); break;
    case 'air-add': addItem({ key: a.dataset.key, side: 'front' }, +a.dataset.pos); break;
    case 'fan-dir': if (FAN_DIRS.includes(a.dataset.v)) { setFanDir(a.dataset.ref, a.dataset.v); touch(); render(); hideTip(); } break;
    case 'air-top': if (LIB[a.dataset.key]) { state.top = a.dataset.key; state.topDir = null; touch(); render(); renderLib(); say(fullName(LIB[a.dataset.key]) + ' now sits on top of the rack.'); } break;
    case 'air-back': state.back = a.dataset.v === 'closed' ? 'closed' : 'open'; touch(); render(); break;
    case 'poe-on': { const v = a.dataset.v === '1', ref = a.dataset.ref;
      if (ref === 'top') state.power = Object.assign({}, state.power, { topPoe: v });
      else state.items = state.items.map(i => 'i' + i.id === ref ? Object.assign({}, i, { poe: v }) : i);
      touch(); render(); break; }
    case 'poe-ext-rm': state.power = Object.assign({}, state.power, { ext: state.power.ext.filter((x, i) => i !== +a.dataset.i) }); touch(); render(); break;
    case 'ups-unit': state.power = Object.assign({}, state.power, { ups: Object.assign({}, state.power.ups, { unit: a.dataset.v === 'Wh' ? 'Wh' : 'VA' }) }); touch(); render(); break;
    case 'clear': undo = JSON.stringify(state); state.items = []; state.top = null; state.extras = []; sel = null; touch(); render(); renderLib(); say('Rack cleared.', true); break;
    case 'undo': if (undo) { state = JSON.parse(undo); undo = null; render(); renderLib(); say('Restored.'); } break;
    case 'copy': copyText(listText(), 'List copied.'); break;
    case 'save-file': saveFile(rackName() + '.rack.json', new Blob([rackFile()], { type: 'application/json' })); break;
    case 'open-file': $('#rackfile').click(); break;
    case 'share': if (TOP_WIN) copyText(shareLink(), 'Share link copied. Anyone who opens it sees this layout.'); else say('Open the planner on its own page to share a link.'); break;
    case 'maker': openMaker(null); break;
    case 'edit-gen': openMaker(find(+a.dataset.id)); break;
    case 'maker-close': $('#maker').close ? $('#maker').close() : $('#maker').removeAttribute('open'); break;
    case 'maker-add': {
      const p = mkParams(); let part = null; try { part = await P.build(p); } catch (err) {}
      if (part) p.u = part.u;
      const name = $('#mk-name').value.trim() || GEN_NAMES[p.type];
      if (mkEdit) {
        const it = mkEdit, oldH = H(it); it.params = p; it.name = name;
        let lost = false;
        if (H(it) !== oldH && !isFree(it.pos2, H(it), it.id)) { const np = nearest(it.pos2, H(it), it.id); it.pos2 = np; lost = np == null; }
        touch(); render(); renderLib(); say(name + ' updated.');
        if (lost) noRoom(info(it), sideOf(it), () => { const q = firstFree(H(it), sideOf(it)); if (q == null) return false; it.pos2 = q; sel = it.id; touch(); render(); say(name + ' updated and placed at ' + uRange(q, H(it)) + atBack(it) + '.'); return true; });
      } else addItem({ key: 'gen', name, params: p });
      $('#maker').close ? $('#maker').close() : $('#maker').removeAttribute('open');
      break;
    }
    case 'maker-stl': {
      const p = mkParams(), name = $('#mk-name').value.trim() || GEN_NAMES[p.type];
      try { const part = await P.build(p); await saveFile(slug(name) + '-' + slug(P.fmtU(part.u).replace('½', '-half')) + '.zip', P.zip([{ name: slug(name) + '.stl', data: P.toSTL(part.geoms, name, part.faceUp) }])); }
      catch (err) { say('The part could not be generated here.'); }
      break;
    }
    case 'pack': openFinalize('pack'); break;
    case 'final-download': { const format = $('#finalize-build').dataset.format; $('#finalize-build').close(); if (format === 'pack') buildPack(); else downloadPDF(); break; }
    case 'final-close': $('#finalize-build').close(); break;
    case 'pdf': openFinalize('pdf'); break;
    case 'v3d': if (window.LRView3D) window.LRView3D.action(a.dataset.v); break;
  }
});
// the shop country, from the readiness list
document.addEventListener('change', e => { if (e.target.id === 'ready-market' && own(window.LRMarket.regions, e.target.value)) { state.market = e.target.value; touch(); render(); } });
document.addEventListener('change', e => {
  if(e.target.id!=='final-market'&&e.target.id!=='final-currency')return;
  const dialog=$('#finalize-build'),format=dialog.dataset.format;
  if(e.target.id==='final-market'){state.market=e.target.value;changeCurrency(window.LRMarket.regions[state.market].currency);}
  else changeCurrency(e.target.value);
  save();renderBuild();dialog.close();openFinalize(format);
});
document.addEventListener('change', e => {
  const key=e.target.dataset.cost;if(!key)return;
  ui.sec.costs = true; saveUI();
  state.costs=window.LREstimate.settings(state.costs);
  const value=e.target.value.trim()===''?null:Number(e.target.value);
  if(key.startsWith('owned:') || key.startsWith('stock:')) { const name=key.startsWith('owned:')?'owned':'filamentOwned'; const id=key.slice(key.indexOf(':')+1); if(value===null)delete state.costs[name][id];else if(Number.isFinite(value)&&value>=0)state.costs[name][id]=Math.floor(value); }
  else if(key.startsWith('price:')) { if(value===null)delete state.costs.prices[key.slice(6)];else if(Number.isFinite(value)&&value>=0)state.costs.prices[key.slice(6)]=value; }
  else state.costs[key]=value;
  state.costs=window.LREstimate.settings(state.costs);save();renderBuild(); updateFinalize();
});
document.addEventListener('input', e => {
  const id = e.target.id;
  if (id === 'q') { query = e.target.value.trim(); renderLib(); return; }
  if (id === 'rack-name') { state.label = e.target.value.slice(0, 16); touch(); renderRack(); save(); if (view === '3d' && window.LRView3D) window.LRView3D.update(snapshot()); return; }
  if (id === 'wz-q') { wz.q = e.target.value.trim(); $('#wz-results').innerHTML = wzResults(); return; }
  if (id === 'wz-name') { wz.label = e.target.value.slice(0, 16); $('#wz-logo').textContent = wz.label || 'Lab Rax'; return; }
  if (id === 'sel-color') { const it = find(sel); if (!it || !HEX.test(e.target.value)) return; it.color = e.target.value; touch(); renderRack(); save(); if (view === '3d' && window.LRView3D) window.LRView3D.update(snapshot()); return; }
  if (id === 'sel-watts') { const it = find(sel); if (!it) return; const v = e.target.value.trim(); if (v === '' || isNaN(+v)) delete it.watts; else it.watts = Math.max(0, Math.min(500, Math.round(+v))); touch(); save(); renderBuild(); if (view === 'air') renderRack(); hideTip(); return; }
  if (e.target.dataset && e.target.dataset.slot != null) { const it = find(sel); if (!it) return; const i = +e.target.dataset.slot, names = (it.names || []).slice(); for (let j = 0; j < i; j++) if (names[j] == null) names[j] = ''; names[i] = e.target.value.slice(0, 16); while (names.length && !names[names.length - 1]) names.pop(); if (names.length) it.names = names; else delete it.names; touch(); renderRack(); save(); return; }
  if (id === 'sel-label') { const it = find(sel); if (!it) return; it.label = e.target.value.slice(0, 24) || undefined; touch(); renderRack(); save(); return; }
  if (id && id.indexOf('mk-') === 0 && id !== 'mk-name') mkChange(id);
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'wz-patch' || t.id === 'wz-power') { wz[t.id.slice(3)] = t.checked; return; }
  if (t.id === 'wz-spare') { wz.spare = +t.value; return; }
  if (t.classList.contains('pr-sel')) { setPrinter(t.value || null); return; }
  if (t.classList.contains('pr-dim')) { setPrinter('custom', { [t.dataset.k]: t.value.trim() === '' ? NaN : +t.value }); return; }
  if (t.id === 'rackfile') { openRackFile(t.files && t.files[0]); t.value = ''; return; }
  if (t.classList.contains('wz-mount')) { wz.picks[+t.dataset.i].mount = t.value; return; }
  if (t.id === 'air-room') { const v = Math.round(+t.value); if (v >= 10 && v <= 40) { state.room = v; render(); } else t.value = state.room; return; }
  // Power & network: PoE devices outside the rack, a switch's PoE budget, the UPS size (cleanPower() checks the values)
  const setPower = o => { state.power = cleanPower(Object.assign({}, state.power, o)); touch(); render(); };
  if (t.id === 'poe-ext-add') { const p = poePresets()[+t.value]; if (p) setPower({ ext: state.power.ext.concat({ name: p[0], n: 1, w: p[1] }) }); return; }
  if (t.dataset.ext != null) { const i = +t.dataset.ext, v = +t.value; setPower({ ext: state.power.ext.map((x, k) => k === i && t.value !== '' && Number.isFinite(v) ? Object.assign({}, x, { [t.dataset.k]: v }) : x) }); return; }
  if (t.id === 'ups-size') { setPower({ ups: Object.assign({}, state.power.ups, { size: t.value.trim() === '' ? null : +t.value }) }); return; }
  if (t.dataset.poeBudget != null) { const id = +t.dataset.poeBudget, v = t.value.trim() === '' ? null : Math.round(+t.value);
    state.items = state.items.map(i => { if (i.id !== id) return i; const c = Object.assign({}, i); if (v != null && v >= 0 && v <= 1000) c.poeBudget = v; else delete c.poeBudget; return c; });
    touch(); render(); return; }
  if (e.target.id === 'sel-color') { render(); return; } if (/^mk-(type|u|pattern|size|grille|style)$/.test(e.target.id)) mkChange(e.target.id); });
document.addEventListener('toggle', e => { const d = e.target; if (d.matches && d.matches('details.sec, details.abd')) { ui.sec[d.dataset.sec] = d.open; saveUI(); } }, true);
document.addEventListener('focusout', e => { if (e.target.id === 'rack-name') renderSettings(); });

const host = $('#rackHost');
host.addEventListener('pointerdown', e => {
  const el = e.target.closest('.item'); if (!el || e.button !== 0) return;
  drag = { id: +el.dataset.id, el, y0: e.clientY, top0: parseFloat(el.style.top), moved: false, p: null }; el.setPointerCapture(e.pointerId);
});
host.addEventListener('pointermove', e => {
  if (!drag) return; const dy = e.clientY - drag.y0; if (!drag.moved && Math.abs(dy) < 4) return;
  drag.moved = true; drag.el.classList.add('drag'); drag.el.style.transform = 'translateY(' + dy + 'px)';
  const it = find(drag.id), h = H(it); let t = Math.max(0, Math.min(slots() - h, Math.round((drag.top0 + dy) / G.HU))); if (h % 2 === 0) t -= t % 2;
  drag.p = t; drag.free = isFree(t, h, it.id); showGhost(t, h); // a taken spot: the parts in between slide over on drop
});
host.addEventListener('pointerup', () => {
  if (!drag) return; const d = drag; drag = null;
  if (!d.moved) { sel = d.id; render(); focusSel(); return; }
  const it = find(d.id);
  if (d.p != null && d.p !== it.pos2) {
    const p = d.free ? d.p : reorder(it.id, d.p);
    if (p == null) say(fullName(info(it)) + ' can’t go there: the parts in between can’t slide without putting a whole-U panel off its U.');
    else { if (d.free) it.pos2 = p; touch(); say(fullName(info(it)) + ' moved to ' + uRange(it.pos2, H(it)) + atBack(it) + (d.free ? '' : '; the parts in between moved over') + '.' + clashText(it)); }
  }
  sel = d.id; render();
});
host.addEventListener('pointercancel', () => { if (drag) { drag = null; render(); } });
// a click on the stage beside the parts lets go of the selected part
$('#stage').addEventListener('click', e => { if (sel != null && !e.target.closest('.item, button, a, input, select, label, textarea, canvas')) { sel = null; hideTip(); render(); } }); // the 3D view picks parts on its canvas itself
host.addEventListener('pointermove', e => { const el = e.pointerType === 'mouse' && e.target.closest('.item'); if (el) showTip(+el.dataset.id, e.clientX, e.clientY); else hideTip(); });
host.addEventListener('pointerleave', hideTip);
host.addEventListener('focusin', e => { const el = e.target.closest('.item'); if (el && el.matches(':focus-visible')) { const r = el.getBoundingClientRect(); showTip(+el.dataset.id, r.left + r.width / 2, r.bottom - 14); } });
host.addEventListener('focusout', hideTip);
/* library: a larger drawing of the part while the pointer rests on its row, with the device's real size */
const lprev = $('#lprev');
let lpKey = null;
function hidePreview() { lpKey = null; if (lprev) lprev.hidden = true; }
function previewHTML(d) {
  const size = d.device && d.device.size ? d.device.size.map(v => Math.round(v)).join(' × ') + ' mm' : '';
  let front = '';
  if (d.top) { const t = LS.topFor(d, colorsFor()); if (t.h > 1.5) front = '<div class="lp-front" style="aspect-ratio:' + t.w + '/' + t.h.toFixed(1) + '">' + t.svg + '</div>'; }
  else if (!d.extra) front = '<div class="lp-front" style="aspect-ratio:250/' + LS.fit(d).h.toFixed(1) + '">' + faceSVG(d) + '</div>';
  return '<div class="lp-3d">' + thumbSVG(d) + '</div>' + front + (size ? '<span class="mono">' + esc(d.name) + ' · ' + size + '</span>' : '');
}
$('#cards').addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || !lprev || drag) return;
  const row = e.target.closest('.lrow[data-key]');
  if (!row || !LIB[row.dataset.key]) { hidePreview(); return; }
  if (row.dataset.key === lpKey && !lprev.hidden) return;
  lpKey = row.dataset.key; lprev.innerHTML = previewHTML(LIB[lpKey]); lprev.hidden = false;
  const r = row.getBoundingClientRect(), w = lprev.offsetWidth, h = lprev.offsetHeight;
  let x = r.right + 12; if (x + w > innerWidth - 8) x = r.left - w - 12;
  if (x < 8) { x = Math.max(8, Math.min(innerWidth - w - 8, r.left)); lprev.style.top = Math.min(innerHeight - h - 8, r.bottom + 6) + 'px'; }
  else lprev.style.top = Math.max(8, Math.min(innerHeight - h - 8, r.top + r.height / 2 - h / 2)) + 'px';
  lprev.style.left = x + 'px';
});
$('#cards').addEventListener('pointerleave', hidePreview);
$('#cards').addEventListener('pointerdown', hidePreview);
window.addEventListener('scroll', hidePreview, true);
host.addEventListener('keydown', e => { const el = e.target.closest('.item'); if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); sel = +el.dataset.id; render(); focusSel(); } });
document.addEventListener('dragstart', e => {
  const b = e.target.closest('[data-act="lib"]'); if (!b || !CAT) return; const d = LIB[b.dataset.key]; if (d.top || d.extra) return;
  libKey = b.dataset.key; try { e.dataTransfer.setData('text/plain', libKey); e.dataTransfer.effectAllowed = 'copy'; } catch (err) {}
});
document.addEventListener('dragend', () => { libKey = null; dropP = null; showGhost(null); });
host.addEventListener('dragover', e => {
  if (!libKey) return; const m = $('#mount'); if (!m) return; e.preventDefault();
  const r = m.getBoundingClientRect(), h2 = LIB[libKey].h2; dropP = nearest(Math.round((e.clientY - r.top) / G.HU - h2 / 2), h2); showGhost(dropP, h2);
});
host.addEventListener('dragleave', e => { if (!host.contains(e.relatedTarget)) showGhost(null); });
host.addEventListener('drop', e => {
  if (!libKey) return; e.preventDefault(); const k = libKey, p = dropP; libKey = null; dropP = null;
  showGhost(null); addItem({ key: k }, p); // no slot anywhere: addItem offers a taller rack
});
document.addEventListener('keydown', e => { // Cmd/Ctrl+Z undo, Shift+Cmd+Z or Ctrl+Y redo; text fields keep their own undo
  if (!(e.metaKey || e.ctrlKey) || e.altKey || e.target.closest('input,select,textarea,[contenteditable]') || document.querySelector('dialog[open]')) return;
  const k = e.key.toLowerCase();
  if (k === 'z') { e.preventDefault(); histGo(e.shiftKey ? 1 : -1); } else if (k === 'y') { e.preventDefault(); histGo(1); }
});
document.addEventListener('keydown', e => {
  if (sel == null || e.metaKey || e.ctrlKey || e.target.closest('input,select,textarea,dialog')) return;
  if (e.key === 'ArrowUp') { e.preventDefault(); move(sel, e.shiftKey ? -2 : -1); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); move(sel, e.shiftKey ? 2 : 1); }
  else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeItem(sel); }
  else if (e.key === 'Escape') { sel = null; render(); }
});

function copyText(text, okMsg) {
  const fb = () => { $('#copyfall').innerHTML = '<p class="hint">Copying doesn’t work here. Select the text below.</p><textarea class="copybox" id="copybox" readonly></textarea>'; const ta = $('#copybox'); ta.value = text; ta.focus(); ta.select(); };
  try { navigator.clipboard.writeText(text).then(() => say(okMsg), fb); } catch (e) { fb(); }
}

/* ---------- view switching ---------- */
async function setView(v) {
  if (v === 'flat') v = where() === 'back' ? 'back' : 'front';
  const from = view; ui.lastView = v === 'back' ? 'front' : v; saveUI();
  view = v; if (v !== '3d') rackSide = v === 'back' ? 'back' : 'front';
  if (sel != null && (v === 'front' || v === 'back') && find(sel) && sideOf(find(sel)) !== v) sel = null; // the selected part is on the other side
  renderControls(); renderSel(); if (CAT) renderBuild(); hideTip();
  const on3d = v === '3d';
  if (!on3d && CAT) renderRack();
  $('#view3d').hidden = !on3d; $('#rackHost').style.visibility = on3d ? 'hidden' : ''; $('#meas').style.visibility = on3d ? 'hidden' : '';
  if (on3d) {
    if (!window.LRView3D) { $('#view3d').innerHTML = '<div class="v3d-msg">The 3D view is not available.</div>'; return; }
    try { await window.LRView3D.mount($('#view3d'), snapshot()); window.LRView3D.action(from === 'back' ? 'back' : 'face:' + where()); } // look at the side chosen in the Where bar
    catch (e) { $('#view3d').innerHTML = '<div class="v3d-msg">The 3D library could not be loaded. Check your connection and try again.</div>'; }
  } else if (window.LRView3D) window.LRView3D.pause();
}

/* ---------- theme ---------- */
const THEMES = ['system', 'light', 'dark'];
let theme = (() => { try { return localStorage.getItem(THEMEKEY) || 'system'; } catch (e) { return 'system'; } })();
function applyTheme() {
  const r = document.documentElement;
  if (theme === 'system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', theme);
  const icon = { system: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="2.5" y="3" width="13" height="9" rx="1.5"/><path d="M6.5 15h5M9 12v3"/></svg>',
    light: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="9" cy="9" r="3.2"/><path d="M9 1.8v2M9 14.2v2M1.8 9h2M14.2 9h2M3.9 3.9l1.4 1.4M12.7 12.7l1.4 1.4M3.9 14.1l1.4-1.4M12.7 5.3l1.4-1.4"/></svg>',
    dark: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M14.5 11.2A6 6 0 0 1 6.8 3.5a6 6 0 1 0 7.7 7.7z"/></svg>' }[theme];
  const b = $('#themebtn'); b.innerHTML = icon; b.setAttribute('aria-label', 'Theme: ' + theme + '. Click to change.'); b.title = 'Theme: ' + theme;
  if (window.LRView3D) window.LRView3D.theme();
}
function cycleTheme() { theme = THEMES[(THEMES.indexOf(theme) + 1) % 3]; try { localStorage.setItem(THEMEKEY, theme); } catch (e) {} applyTheme(); }

/* ---------- share link (own page only) and rack file ---------- */
// share links: "#c=" + base64url of the compact layout, [settings that differ from the defaults, parts as [key, pos2, other fields]],
// short enough for a QR code; old "#l=" links (the whole state) still open. A rack file holds the same compact layout.
const SHARE_KEYS = ['h', 'version', 'frame', 'panel', 'accent', 'label', 'top', 'topDir', 'extras', 'xdir', 'market', 'costs', 'back', 'sides', 'room', 'power', 'bottom', 'bottomDir'];
function compactLayout() {
  const d = Object.assign(defaultState(), { market: 'NL', costs: window.LREstimate.settings() }), same = (x, y) => JSON.stringify(x) === JSON.stringify(y), st = {}; // sanitize() fills in the defaults
  SHARE_KEYS.forEach(k => { if (state[k] !== undefined && !same(state[k], d[k])) st[k] = state[k]; });
  const items = state.items.map(i => { const { id, key, pos2, ...rest } = i; return Object.keys(rest).length ? [key, pos2, rest] : [key, pos2]; });
  return [st, items];
}
function expandLayout(st, items) { // a compact layout as a state, before sanitize(); null when it can't be one
  const list = Array.isArray(items) ? items : [], o = {};
  if (st && typeof st === 'object') SHARE_KEYS.forEach(k => { if (own(st, k)) o[k] = st[k]; }); // settings this planner knows
  Object.assign(o, { items: list.map((x, n) => Object.assign({}, Array.isArray(x) && x[2] && typeof x[2] === 'object' ? x[2] : {}, { id: n + 1, key: Array.isArray(x) ? x[0] : null, pos2: Array.isArray(x) ? x[1] : null })), nextId: list.length + 1 });
  const s2 = Object.assign(defaultState(), o, { example: false, done: {} });
  return s2.h >= 1 && s2.h <= 10 ? s2 : null;
}
function shareLink() {
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(compactLayout())))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return location.origin + location.pathname + location.search + '#c=' + b64;
}
// replace the layout with one from a link or a file; Undo brings the current one back
function applyLayout(s2, msg) {
  const count = s => (Array.isArray(s.items) ? s.items.length : 0) + (Array.isArray(s.extras) ? s.extras.length : 0) + (s.top ? 1 : 0), n = count(s2);
  undo = JSON.stringify(state); state = s2; sel = null;
  sanitize(); renderLib(); render();
  const lost = n - count(state);
  say(msg + (lost ? ' ' + lost + (lost > 1 ? ' parts in it aren’t' : ' part in it isn’t') + ' in this catalog and ' + (lost > 1 ? 'were' : 'was') + ' left out.' : ''), true);
}
function loadShared() {
  const shared = decodeShared(); if (!shared) return false;
  applyLayout(shared, 'Layout loaded from a shared link.');
  return true;
}
/* Rack file (<name>-<h>u.rack.json): the compact layout with a format name and version, written one part per line.
   A newer version still opens; what this planner doesn't know is left out. */
const RACK_FORMAT = 'mini-rack-planner', RACK_VERSION = 1;
const rackName = () => slug(state.label || 'lab-rax') + '-' + state.h + 'u';
function rackFile() {
  const [settings, parts] = compactLayout();
  return '{\n  "format": "' + RACK_FORMAT + '",\n  "version": ' + RACK_VERSION + ',\n  "settings": ' + JSON.stringify(settings) + ',\n  "parts": [' +
    parts.map(x => '\n    ' + JSON.stringify(x)).join(',') + (parts.length ? '\n  ' : '') + ']\n}\n';
}
function readRackFile(text) { // { state, newer }, or null when the text isn't a rack file
  let o = null; try { o = JSON.parse(String(text).replace(/^\uFEFF/, '')); } catch (e) {}
  if (!o || o.format !== RACK_FORMAT || !Number.isInteger(o.version) || o.version < 1) return null;
  const s2 = expandLayout(o.settings, o.parts);
  return s2 ? { state: s2, newer: o.version > RACK_VERSION } : null;
}
async function openRackFile(file) {
  if (!file || !CAT) return;
  let text = null;
  if (file.size <= 1e6) try { text = await file.text(); } catch (e) {}
  const r = text == null ? null : readRackFile(text);
  if (!r) { say(file.name + ' isn’t a rack file from this planner.'); return; }
  applyLayout(r.state, 'Opened ' + file.name + '.' + (r.newer ? ' It was saved by a newer version of the planner, so some settings may be left out.' : ''));
}
function decodeShared() {
  const m = location.hash.match(/^#([lc])=([^&]*)(.*)$/); // l: the whole state (older links), c: compact
  if (!m) return null;
  try {
    if (/&s=shop\b/.test(m[3])) { ui.sec.shop = true; setTimeout(() => { const b = $('#build'); if (b) b.scrollIntoView({ block: 'start' }); }, 300); }
    const raw = JSON.parse(decodeURIComponent(escape(atob(m[2].replace(/-/g, '+').replace(/_/g, '/')))));
    history.replaceState(null, '', location.pathname + location.search);
    if (m[1] === 'c') { const [st, items] = Array.isArray(raw) ? raw : [{}, []]; return expandLayout(st, items); }
    const o = raw;
    if (o && Array.isArray(o.items)) { const s2 = Object.assign(defaultState(), o, { example: false, done: {} }); if (s2.h >= 1 && s2.h <= 10) return s2; }
  } catch (e) {}
  return null;
}

/* ---------- start ---------- */
applyTheme();
$('#footer').innerHTML = 'Mini Rack Planner is an independent planner, not an official Lab Rax tool. Based on the <a href="https://the-diy-life.com/introducing-lab-rax-a-3d-printable-modular-10-rack-system/" target="_blank" rel="noopener">Lab Rax</a> design by Michael Klements. Community mounts belong to their makers and stay on MakerWorld under their own licenses; this planner links to them. Custom parts are generated here and are yours to print. Your layout is saved in this browser.' +
  (REPO_URL ? ' <a href="' + REPO_URL + '" target="_blank" rel="noopener">Contribute on GitHub</a>.' : '');
renderTabs(); renderControls();
fetch('catalog.json', { cache: 'no-cache' })
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(c => {
    buildCatalog(c);
    fetch('tips.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(t => { if (t && (Array.isArray(t.items) || Array.isArray(t.tips))) { TIPS = t; renderBuild(); } }).catch(() => {});
    sanitize();
    if (!loadShared()) { renderLib(); render(); }
    setView(ui.lastView === 'front' || ui.lastView === 'air' ? ui.lastView : '3d'); // 3D the first time
    window.addEventListener('hashchange', loadShared);
    let rw = 0;
    try { new ResizeObserver(en => { const w = Math.round(en[0].contentRect.width); if (w !== rw) { rw = w; renderRack(); } }).observe($('#stage')); }
    catch (e) { window.addEventListener('resize', renderRack); }
  })
  .catch(e => { console.error(e); $('#cards').innerHTML = '<p class="hint">The parts catalog could not be loaded. Reload the page to try again.</p>'; });

window.LRApp = { snapshot, select: id => { sel = id; render(); }, say, toggleSides: () => { state.sides = state.sides === 'acrylic' ? 'printed' : 'acrylic'; touch(); render(); }, tip: (id, x, y) => id == null ? hideTip() : showTip(id, x, y) };
})();
