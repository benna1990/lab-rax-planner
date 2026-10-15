/* Lab Rax Planner — plan a 3D-printed 10" Lab Rax rack. MIT licensed.
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
const TABS = [['devices', 'Devices'], ['panels', 'Panels'], ['top', 'Top mounts'], ['extras', 'Frame & extras'], ['custom', 'Custom']];

/* ---------- catalog ---------- */
let CAT = null, LIB = {}, SIZES = {};
const LS = window.LRShapes; // how parts look: shapes.js
function buildCatalog(c) {
  CAT = c; LIB = {}; SIZES = {};
  // src: the catalog entry, for its heat and airflow fields
  const add = (id, o, src) => { LIB[id] = Object.assign({ key: id, h2: o.u ? Math.round(o.u * 2) : 0 }, o, { watts: src.watts, wattsEst: !!src.wattsEstimated, fanDir: src.fanDir, vent: src.vent, at: src.at, fanAt: src.fanAt }); };
  (c.panels || []).forEach(g => g.items.forEach(i => add(i.id, { name: i.name, label: null, u: i.u, est: !!i.estimated, face: i.face || 'blank', shape: i.shape, url: i.url || null, author: i.author || '', hardware: i.hardware || [], group: g.group, tab: 'panels' }, i)));
  (c.devices || []).forEach(g => g.items.forEach(d => {
    const dev = d.size ? { device: d.device, size: d.size, color: d.color, io: d.io } : null;
    if (dev) SIZES[d.device] = dev;
    d.mounts.forEach(m => {
      if (m.ref) { m.key = m.ref; return; }
      m.key = m.id;
      const top = m.position === 'top';
      add(m.id, { name: d.device, label: m.label, u: top ? 0 : m.u, top, est: !!m.estimated, face: m.face || 'shelf', shape: m.shape, device: dev, url: m.url || null, author: m.author || '', hardware: m.hardware || [], note: m.note, depth: m.depth, group: g.group, tab: top ? 'top' : 'devices' }, m);
    });
  }));
  (c.extras || []).forEach(g => g.items.forEach(i => add(i.id, { name: i.name, label: i.label || null, u: 0, extra: true, shape: i.shape, url: i.url, author: i.author || '', hardware: i.hardware || [], note: i.note, group: g.group, tab: 'extras' }, i)));
  LS.devices(n => SIZES[n] || null);
}

/* ---------- state ---------- */
function defaultState() {
  let n = 1; const m = (k, p) => ({ id: n++, key: k, pos2: p });
  return { h: 5, version: 'brass', frame: '#26282B', panel: '#26282B', accent: '#B5CF2A', label: 'Lab Rax', top: null, topDir: null, extras: [], xdir: {}, back: 'open', room: 25, sides: 'printed', done: {}, example: true,
    items: [m('keystone', 0), m('flexmini05', 1), m('ucgmax1', 2), m('tiny1', 4), m('sbc7', 6)], nextId: n };
}
function load() {
  try { const s = JSON.parse(localStorage.getItem(STORE)); if (s && Array.isArray(s.items) && s.h >= 1 && s.h <= 10 && s.nextId) return Object.assign({ accent: '#B5CF2A', label: 'Lab Rax', top: null, extras: [], done: {} }, s); } catch (e) {}
  return null;
}
function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} }
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
    if (i.dir != null && !FAN_DIRS.includes(i.dir)) delete i.dir;
    if (i.pos2 != null && !Number.isInteger(i.pos2)) i.pos2 = 0;
    if (!Number.isInteger(i.id) || i.id < 1 || ids.has(i.id)) i.id = null; else ids.add(i.id);
  });
  state.nextId = Math.max(Number.isInteger(state.nextId) ? state.nextId : 1, ...[...ids].map(n => n + 1));
  state.items.forEach(i => { if (i.id == null) i.id = state.nextId++; });
  if (state.top && !(own(LIB, state.top) && LIB[state.top].top)) state.top = null;
  state.extras = (Array.isArray(state.extras) ? state.extras : []).filter(k => own(LIB, k) && LIB[k].extra);
  if (!FAN_DIRS.includes(state.topDir)) state.topDir = null;
  const xd = state.xdir && typeof state.xdir === 'object' ? state.xdir : {}; state.xdir = {};
  state.extras.forEach(k => { if (FAN_DIRS.includes(xd[k])) state.xdir[k] = xd[k]; });
  if (!state.done || typeof state.done !== 'object') state.done = {};
  // older layouts could place whole-U panels on a half U, and a shared link could overlap parts; move them onto free slots
  byPos().forEach(i => { const p = i.pos2; i.pos2 = null; i.pos2 = isFree(p, H(i), i.id) ? p : nearest(p, H(i), i.id); });
}

let state = load() || defaultState();
let sel = null, undo = null, G = {}, drag = null, libKey = null, dropP = null, tab = 'devices', query = '', view = 'front';

const info = it => {
  if (it.key === 'custom') return { custom: true, name: it.name, h2: it.h2, face: 'custom', url: it.url || null, hardware: [] };
  if (it.key === 'gen') return { gen: true, name: it.name, label: genLabel(it.params), h2: Math.round(it.params.u * 2), face: genFace(it.params), params: it.params, url: null, hardware: [] };
  return LIB[it.key];
};
const H = it => info(it).h2;
const slots = () => state.h * 2;
const placed = () => state.items.filter(i => i.pos2 != null);
const byPos = () => placed().sort((a, b) => a.pos2 - b.pos2);
const find = id => state.items.find(i => i.id === id);
const colorOf = it => it.color || state.panel; // a part's own colour, or the default panel colour
const colorName = c => (FIL.find(f => f[1].toLowerCase() === c.toLowerCase()) || [c.toUpperCase()])[0];
function fmtU(h2) { const w = Math.floor(h2 / 2), h = h2 % 2; return (w || !h ? w : '') + (h ? '½' : '') + 'U'; }
const uTxt = d => (d.est ? '≈' : '') + fmtU(d.h2);
const shortName = d => d.name;
const fullName = d => d.label ? d.name + ' – ' + d.label : d.name;
function uRange(p, h2) { const hi = state.h - Math.floor(p / 2), lo = state.h - Math.floor((p + h2 - 1) / 2); return lo === hi ? 'U' + hi : 'U' + lo + '–' + hi; }
const GEN_NAMES = { blank: 'Blank panel', vent: 'Vent panel', keystone: 'Keystone panel', shelf: 'Shelf', label: 'Label plate' };
function genLabel(p) {
  if (p.type === 'keystone') return (p.ports || 12) * (p.rows || 1) + ' ports';
  if (p.type === 'shelf') return p.dw + ' × ' + p.dh + ' × ' + p.dd + ' mm';
  if (p.type === 'vent') return p.pattern === 'hex' ? 'hexagon' : 'slots';
  if (p.type === 'label') return '“' + (p.text || '') + '”';
  return 'custom';
}
function genFace(p) { return { blank: 'blank', vent: 'vent', keystone: 'ks', shelf: 'cut', label: 'blank' }[p.type] || 'blank'; }

/* ---------- placement ---------- */
/* The 10" hole pattern (6.35 / 22.225 / 38.1 mm) repeats per whole U, so panels of 1U and taller must start on a U boundary; ½U panels fit either half. */
const aligned = (p, h2) => h2 === 1 || p % 2 === 0;
function isFree(p, h2, except) { if (p < 0 || p + h2 > slots() || !aligned(p, h2)) return false; return !placed().some(o => o.id !== except && p < o.pos2 + H(o) && o.pos2 < p + h2); }
function nearest(t, h2, except) { const n = slots(); for (let d = 0; d <= n; d++) for (const c of d ? [t - d, t + d] : [t]) if (isFree(c, h2, except)) return c; return null; }
function firstFree(h2) { for (let p = 0; p + h2 <= slots(); p++) if (isFree(p, h2)) return p; return null; }
function touch() { state.example = false; }
// btn: true for an Undo button, or [act, label] for another action
function say(msg, btn) { const b = btn === true ? ['undo', 'Undo'] : btn; $('#status').innerHTML = esc(msg) + (b ? ' <button type="button" class="lnk" data-act="' + b[0] + '">' + esc(b[1]) + '</button>' : ''); }
function addItem(obj, pos) {
  const d = info(obj), p = pos == null ? firstFree(d.h2) : nearest(pos, d.h2);
  if (p == null) { say('No room for ' + fullName(d) + ' (' + fmtU(d.h2) + '). Make the rack taller or remove something.'); return false; }
  obj.id = state.nextId++; obj.pos2 = p; state.items.push(obj); sel = obj.id; touch(); render();
  say(fullName(d) + ' (' + uTxt(d) + ') placed at ' + uRange(p, d.h2) + '.');
  return true;
}
function removeItem(id) {
  const it = find(id); if (!it) return;
  undo = JSON.stringify(state); state.items = state.items.filter(i => i.id !== id); if (sel === id) sel = null;
  touch(); render(); say(fullName(info(it)) + ' removed.', true);
}
function move(id, dir) {
  const it = find(id); if (!it || it.pos2 == null) return;
  const h2 = H(it); let p = it.pos2 + dir;
  while (p >= 0 && p + h2 <= slots()) { if (isFree(p, h2, id)) { it.pos2 = p; touch(); render(); focusSel(); return; } p += Math.sign(dir); }
}
function setHeight(h) {
  h = Math.max(1, Math.min(10, h)); if (h === state.h) return;
  state.h = h; let lost = 0;
  placed().forEach(i => { if (i.pos2 + H(i) > slots()) { i.pos2 = null; lost++; } });
  touch(); render();
  say(lost ? lost + (lost > 1 ? ' parts no longer fit' : ' part no longer fits') + ' in ' + h + 'U. See below.' : 'The rack is now ' + h + 'U (' + mm(h * P.U) + ' inner height).');
}
function fillGaps(keys, noun) {
  const [k1, k05] = keys || ['vent1', 'vent05']; noun = noun || 'vent panel';
  let n = 0, p = 0;
  while (p < slots()) {
    if (isFree(p, 2)) { state.items.push({ id: state.nextId++, key: k1, pos2: p }); n++; p += 2; }
    else if (isFree(p, 1)) { state.items.push({ id: state.nextId++, key: k05, pos2: p }); n++; p += 1; }
    else p++;
  }
  if (!n) { say('There are no open slots.'); return; }
  touch(); render(); say(n + ' ' + noun + (n > 1 ? 's' : '') + ' added to the open slots.');
}
function focusSel() { const el = document.querySelector('.item[data-id="' + sel + '"]'); if (el) el.focus({ preventScroll: true }); }

/* ---------- drawing helpers ---------- */
// a part as it looks from the front (rack view) and as a small 3D-looking drawing (library), drawn by shapes.js from its shape
const colorsFor = c => ({ color: c || state.panel, accent: state.accent, frame: state.frame });
const faceSVG = (d, c) => LS.frontFor(d, colorsFor(c));
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
function renderTabs() {
  $('#tabs').innerHTML = TABS.map(([k, l]) => '<button type="button" class="pill" data-act="tab" data-t="' + k + '" aria-pressed="' + (tab === k) + '">' + l + '</button>').join('') +
    (tab === 'devices' || tab === 'panels' || tab === 'top' ? '<button type="button" class="pill lr" data-act="lib-lr" aria-pressed="' + ui.lr + '" title="Only parts made for or tested in Lab Rax">Lab Rax only</button>' : '');
}
function miniThumb(d) { return thumbSVG(d); }
const inRack = key => placed().filter(i => i.key === key).length;
function rowHTML(key, name, sub, extra) {
  const d = LIB[key], on = (d.top && state.top === key) || (d.extra && state.extras.includes(key)), n = d.top || d.extra ? 0 : inRack(key);
  const badge = d.top ? (on ? '✓ on top' : 'Top') : d.extra ? (on ? '✓ added' : 'Add') : uTxt(d);
  const hw = heatOf({ key }), kind = d.top ? 'top' : d.extra ? 'extra' : 'item', fan = cfmOf(d) ? fanChip(d, dirFor(d, null, fanPlace(d, kind), kind)) : '';
  if (cfmOf(d)) sub = (sub ? sub + ' · ' : '') + fanLine(d);
  return '<div class="lrow-wrap"><button type="button" class="lrow' + (on || n ? ' on' : '') + '" draggable="' + !(d.top || d.extra) + '" data-act="lib" data-key="' + key + '" title="' + esc(fullName(d)) + (d.author ? ' · by ' + esc(d.author) : '') + '">' +
    '<span class="lthumb">' + miniThumb(d) + '</span><span class="ltx"><b>' + esc(name) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>' +
    (n ? '<span class="inrack" title="In your rack">' + n + '×</span>' : '') + fan + wChip(hw.w, hw.est) + '<span class="badge' + (d.est ? ' est' : '') + '"' + (d.est ? ' title="Height estimated; check the model"' : '') + '>' + badge + '</span></button>' +
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
function renderLib() {
  renderTabs();
  if (!CAT) return;
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
  } else if (tab === 'top') {
    const rows = [];
    (CAT.devices || []).forEach(g => g.items.forEach(d => d.mounts.forEach(m => { if (m.position === 'top' && LIB[m.id] && lr(m) && matches(d.device, m.label, m.author || '')) rows.push(rowHTML(m.id, d.device, mountSub(m))); })));
    hits = rows.length; h = rows.length ? '<div class="lrows">' + rows.join('') + '</div>' : '';
  } else if (tab === 'panels') {
    (CAT.panels || []).forEach(g => { const rows = g.items.filter(i => lr(i) && matches(i.name, g.group, i.author || '')).map(i => rowHTML(i.id, i.name, i.author ? 'by ' + i.author : '')); hits += rows.length; h += groupHTML('panels:' + g.group, g.group, rows); });
  } else if (tab === 'extras') {
    (CAT.extras || []).forEach(g => { const rows = g.items.filter(i => matches(i.name, i.label || '', g.group, i.author || '')).map(i => rowHTML(i.id, i.name, [i.label, i.author && 'by ' + i.author].filter(Boolean).join(' · '))); hits += rows.length; h += groupHTML('extras:' + g.group, g.group, rows); });
  } else {
    const gens = state.items.filter(i => i.key === 'gen');
    h = '<p class="hint">Custom parts are generated here as STL, sized to the 10" standard Lab Rax uses. Make one with the button below; it appears in the rack and in your build pack.</p>' +
      (gens.length ? '<div class="lrows">' + gens.map(i => '<div class="lrow-wrap"><button type="button" class="lrow" data-act="edit-gen" data-id="' + i.id + '"><span class="lthumb">' + miniThumb(info(i)) + '</span><span class="ltx"><b>' + esc(i.name) + '</b><small>' + esc(genLabel(i.params)) + ' · edit</small></span><span class="badge">' + fmtU(H(i)) + '</span></button></div>').join('') + '</div>' : '');
    hits = 1;
  }
  if (!hits) h = '<p class="hint">Nothing found' + (query ? ' for “' + esc(query) + '”' : '') + (ui.lr ? ' made for Lab Rax' : '') + '. Make a custom part below, or set up a rack with the wizard.</p>';
  else if (tab === 'devices') h += '<p class="hint lfoot">Click a device to add its best mount; ▾ shows the others. ≈ means the height is estimated.</p>';
  $('#cards').innerHTML = h;
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
  byPos().forEach(it => {
    // no text on the panels, so the faces show what is placed; the name is in the tooltip and the aria-label
    const d = info(it), c = colorOf(it);
    items += '<div class="item' + (it.id === sel ? ' sel' : '') + '" data-id="' + it.id + '" role="button" tabindex="0" aria-label="' + esc((it.label ? it.label + ': ' : '') + fullName(d) + ', ' + uTxt(d) + ', ' + uRange(it.pos2, d.h2)) + '"' +
      ' style="top:' + (it.pos2 * HU).toFixed(1) + 'px;height:' + (d.h2 * HU - 1).toFixed(1) + 'px;left:' + inset.toFixed(1) + 'px;right:' + inset.toFixed(1) + 'px;--c:' + c + '">' +
      faceSVG(d, c) + '</div>';
  });
  // the top mount, drawn above the frame at the same scale (280 mm across the outside of the frame)
  const tf = state.top ? LS.topFor(LIB[state.top], colorsFor()) : null;
  const ap = tf && tf.h > 1.5 ? '<span class="ap" title="' + esc(fullName(LIB[state.top])) + '" style="width:' + (tf.w * s).toFixed(1) + 'px;height:' + (tf.h * s).toFixed(1) + 'px;margin-left:' + (-tf.w * s / 2).toFixed(1) + 'px">' + tf.svg + '</span>' : '';
  const mods = frameMods(), below = (mods.drawer ? 30 : 0) + (mods.feet === 'casters' ? 40 : mods.feet === 'big' ? 8 : 0);
  const marginTop = Math.round(Math.max(ap ? tf.h * s + 4 : 0, frameW * .12 + 6));
  // extras seen from the front: keystones or an LED matrix in the top corner, a lit logo, a switch in the edge, grips on the sides,
  // bigger feet or casters and a drawer under the base
  const crown = mods.corner === 'matrix' ? '<span class="corner-mx" aria-hidden="true"></span>'
    : mods.corner ? '<span class="corner-ks" aria-hidden="true">' + '<i></i>'.repeat(Math.min(12, mods.corner)) + '</span>'
    : hexSVG(s).replace('class="hexgrill"', 'class="hexgrill' + (mods.logo === 'hexbar' ? ' lit' : '') + '"') + '<span class="logo' + (mods.logo === 'neopixel' ? ' glow' : '') + '" style="font-size:' + logoSize(frameW, topH).toFixed(1) + 'px">' + esc(state.label || 'Lab Rax') + '</span>';
  const feet = mods.feet === 'casters' ? '<i class="caster" style="left:4%;width:' + (32 * s).toFixed(1) + 'px;height:' + (32 * s).toFixed(1) + 'px;top:calc(100% + ' + ((mods.drawer ? 30 : 0) * s + 8 * s).toFixed(1) + 'px)"></i><i class="caster" style="right:4%;width:' + (32 * s).toFixed(1) + 'px;height:' + (32 * s).toFixed(1) + 'px;top:calc(100% + ' + ((mods.drawer ? 30 : 0) * s + 8 * s).toFixed(1) + 'px)"></i>'
    : ['left', 'right'].map(sd => '<i class="foot" style="' + sd + ':3%;height:' + ((mods.feet === 'big' ? 14 : 6) * s).toFixed(1) + 'px' + (mods.drawer ? ';top:calc(100% + ' + (30 * s).toFixed(1) + 'px)' : '') + '"></i>').join('');
  const drawer = mods.drawer ? '<i class="drawer" style="height:' + (28 * s).toFixed(1) + 'px"><i></i></i>' : '';
  const grips = mods.handles === 'side' ? '<i class="sgrip" style="left:' + (-12 * s).toFixed(1) + 'px;width:' + (12 * s).toFixed(1) + 'px"></i><i class="sgrip" style="right:' + (-12 * s).toFixed(1) + 'px;width:' + (12 * s).toFixed(1) + 'px"></i>' : '';
  $('#rackHost').innerHTML =
    '<div class="rack' + (state.version === 'brass' ? ' brass' : '') + (air ? ' airv' : '') + '" id="rack" style="--frame:' + state.frame + ';--acc:' + state.accent + ';--bev:' + (20 * s).toFixed(1) + 'px;--hs:' + Math.max(3.5, 5 * s).toFixed(1) + 'px;grid-template-columns:34px ' + frameW.toFixed(1) + 'px ' + (air ? 90 : 34) + 'px;grid-template-rows:' + topH.toFixed(1) + 'px ' + bodyH.toFixed(1) + 'px ' + edge + 'px auto;margin-top:' + marginTop + 'px">' +
      '<div></div><div class="edge top">' + (state.top ? '' : '<span class="tp-band" style="height:' + Math.round(7 * s) + 'px"></span>') + handleSVG(s, 'left', mods.handles) + handleSVG(s, 'right', mods.handles) + crown +
        (mods.edgeSwitch ? '<i class="eswitch" style="width:' + (14 * s).toFixed(1) + 'px;height:' + (12 * s).toFixed(1) + 'px"></i>' : '') + ap + (air ? airEnd(air, 'top') : '') + '</div><div></div>' +
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
  else $('#meas').textContent = '222 mm usable width · ' + (state.h * P.U).toFixed(1) + ' mm inner height · ' + state.h + 'U';
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
  a.parts.forEach(p => { if (p.w > 0) h += '<span class="wtag hl' + wLevel(p.w) + '" style="top:' + mid(p.it.pos2, p.it.pos2 + p.d.h2 - 1) + 'px;right:' + (inset + 16 * G.s).toFixed(1) + 'px">' + (p.est ? '≈' : '') + fmtW(p.w) + '</span>'; });
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
    const c = Math.round(n / (f.place === 'back' ? 4 : 2)), cross = f.in >= .5 && f.out >= .5, v = Math.max(f.in, f.out);
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
    '<span class="mono">' + uTxt(d) + ' · ' + uRange(it.pos2, d.h2) + (hw.w ? ' · ' + (hw.est ? '≈ ' : '') + fmtW(hw.w) : '') + '</span>' +
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
  bar.innerHTML = '<div class="who"><b>' + esc(fullName(d)) + '</b><span class="hint">' + uTxt(d) + ' · ' + uRange(it.pos2, d.h2) + (d.author ? ' · by ' + esc(d.author) : '') + '</span></div>' +
    '<input class="field" id="sel-label" type="text" maxlength="24" aria-label="Label on the panel" placeholder="Label, e.g. Pi 5" value="' + esc(it.label || '') + '">' +
    '<label class="watts" title="Heat this part gives off, for the cooling estimate. Empty: ' + (auto.w ? (auto.est ? 'about ' : '') + fmtW(auto.w) + ', its typical draw' : 'no heat') + '">Heat <input class="field" id="sel-watts" type="number" min="0" max="500" step="1" inputmode="numeric" placeholder="' + (auto.w ? (auto.est ? '≈' : '') + auto.w : '0') + '" value="' + (typeof it.watts === 'number' ? it.watts : '') + '"> W</label>' +
    (cfmOf(d) ? '<span class="watts" title="' + esc(fanLine(d)) + '">Fans ' + dirSeg({ ref: 'i' + it.id, d, place: 'front', kind: 'item', dir: dirFor(d, it.dir, 'front', 'item'), name: fullName(d) }) + '</span>' : '') +
    '<button type="button" class="btn small" data-act="up" aria-label="Move up">↑</button><button type="button" class="btn small" data-act="down" aria-label="Move down">↓</button>' +
    (it.key === 'gen' ? '<button type="button" class="btn small" data-act="edit-gen" data-id="' + it.id + '">Edit part</button>' : d.url ? '<a class="btn small" href="' + esc(d.url) + '" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">Model ↗</a>' : '') +
    '<button type="button" class="btn small" data-act="dup">Duplicate</button><button type="button" class="btn small danger" data-act="del">Remove</button>' +
    '<div class="selcolor"><span>Colour</span><div class="swatches">' + FIL.map(([n, c]) => '<button type="button" class="sw" style="--c:' + c + '" data-act="part-color" data-c="' + c + '" aria-label="' + n + '" title="PETG ' + n.toLowerCase() + '" aria-pressed="' + (it.color === c) + '"></button>').join('') + '</div>' +
    '<input type="color" id="sel-color" value="' + colorOf(it) + '" aria-label="Any colour" title="Any colour">' +
    '<button type="button" class="btn small ghost" data-act="part-color" data-c=""' + (it.color ? '' : ' disabled') + '>Use default (' + esc(colorName(state.panel)) + ')</button></div>';
}
function renderUnplaced() {
  const un = state.items.filter(i => i.pos2 == null), box = $('#unplaced');
  if (!un.length) { box.innerHTML = ''; return; }
  box.innerHTML = '<div class="unplaced"><p>Doesn’t fit in a ' + state.h + 'U rack</p>' + un.map(i => {
    const d = info(i);
    return '<div class="row"><span>' + esc(fullName(d)) + ' · ' + uTxt(d) + '</span><button type="button" class="btn small" data-act="replace" data-id="' + i.id + '">Place</button><button type="button" class="btn small danger" data-act="rm" data-id="' + i.id + '">Remove</button></div>';
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
  $('#v-front').setAttribute('aria-pressed', view === 'front'); $('#v-air').setAttribute('aria-pressed', view === 'air'); $('#v-3d').setAttribute('aria-pressed', view === '3d');
  $('#example').hidden = !state.example;
  renderSettings();
}

/* ---------- parts lists ---------- */
function frameParts() {
  const h = state.h;
  if (h <= 5) return { posts: '4× ' + h + 'U', sides: '2× ' + h + 'U', joiners: 0, b: 0 };
  const b = h - 5; return { posts: '4× 5U + 4× ' + b + 'U', sides: '2× ' + b + 'U + 2× 5U', joiners: 4, b };
}
function printPack() {
  const h = state.h, fr = CAT.frame, br = state.version === 'brass', out = []; let n = 0;
  // one row per model page, since each page is downloaded once; v is the variant printed from it
  const add = (name, sub, url, qty, kind, v) => {
    const k = url || ('gen:' + name + sub);
    let ex = out.find(x => x.k === k);
    if (!ex) out.push(ex = { id: n++, k, name, subs: [], url, qty: 0, kind, vars: [] });
    ex.qty += qty; if (sub && !ex.subs.includes(sub)) ex.subs.push(sub);
    if (v) { const e = ex.vars.find(x => x.key === v.key); if (e) e.qty += qty; else ex.vars.push(Object.assign({ qty }, v)); }
  };
  const variant = d => ({ key: d.key, name: d.name, label: d.label || '', h2: d.h2, u: d.top ? 'top' : d.extra ? 'extra' : fmtU(d.h2) });
  const fm = br ? fr.brass : fr.bolted;
  const acr = state.sides === 'acrylic';
  add(fm.name, h === 5 ? 'Complete 5U frame' + (acr ? '; skip the side panels, yours are acrylic' : ' with side panels') : 'Base frame: edges, horizontals, handles, feet', fm.url, 1, 'mw');
  if (h !== 5) add(fr.sizes.name, 'Posts' + (acr ? '' : ' and side panels') + ' for ' + h + 'U', fr.sizes.url, 1, 'mw');
  if (h > 5) add(fr.extension.name, '4 joiners for ' + h + 'U', fr.extension.url, 1, 'mw');
  if (state.top) { const d = LIB[state.top]; add(fullName(d), 'Replaces the top panel', d.url, 1, 'mw', variant(d)); }
  state.extras.forEach(k => { const d = LIB[k]; add(fullName(d), 'Frame extra', d.url, 1, 'mw', variant(d)); });
  let missing = 0;
  byPos().forEach(i => {
    const d = info(i);
    const col = i.color ? ' · ' + colorName(i.color) : '';
    if (i.key === 'gen') { add(i.name, genLabel(i.params) + ' · ' + uRange(i.pos2, d.h2) + col + ' · in the build pack', null, 1, 'gen'); return; }
    if (!d.url) { if (d.custom) missing++; return; }
    add(fullName(d), (i.label || shortName(d)) + ' · ' + uRange(i.pos2, d.h2) + col, d.url, 1, 'mw', variant(d));
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
  out.missing = missing;
  return out;
}
function shopUrl(search) {
  const a = CAT.shops && CAT.shops.amazon, c = a && (a.en || null);
  if (!c || !search) return null;
  const q = typeof search === 'string' ? search : search.en;
  return 'https://' + c.domain + '/s?k=' + encodeURIComponent(q) + (c.tag ? '&tag=' + encodeURIComponent(c.tag) : '');
}
function orderList() {
  const m = new Map(), add = (p, q) => m.set(p, (m.get(p) || 0) + q), br = state.version === 'brass';
  (br ? CAT.frame.brass : CAT.frame.bolted).hardware.forEach(x => add(x.part, x.qty));
  const sc = placed().reduce((n, i) => n + (H(i) === 1 ? 2 : 4), 0);
  if (sc) { add(br ? 'm6x10' : 'm6x12', sc); add(br ? 'insert' : 'nut', sc); }
  placed().forEach(i => (info(i).hardware || []).forEach(x => add(x.part, x.qty)));
  if (state.top) (LIB[state.top].hardware || []).forEach(x => add(x.part, x.qty));
  state.extras.forEach(k => (LIB[k].hardware || []).forEach(x => add(x.part, x.qty)));
  const out = [...m].map(([p, q]) => { const hw = CAT.hardware[p] || {}; return { name: hw.name || p, qty: q, buy: hw.buy || shopUrl(hw.search) }; });
  // qty null: needed, but the number isn't confirmed
  if (state.h > 5) out.push({ name: 'Fasteners for the 4 post joiners', qty: null, buy: null, check: CAT.frame.extension.url });
  return out;
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
const fanPlace = (d, kind) => kind === 'item' ? 'front' : kind === 'top' ? 'top' : d.fanAt || d.at || 'side';
const canCross = (d, place, kind) => kind === 'extra' && (place === 'side' || place === 'top') && fanSpecs(d).reduce((n, f) => n + f.qty, 0) >= 2;
function dirFor(d, chosen, place, kind) {
  const ok = v => v === 'intake' || v === 'exhaust' || (v === 'cross' && canCross(d, place, kind));
  return ok(chosen) ? chosen : ok(d.fanDir) ? d.fanDir : place === 'top' || place === 'back' ? 'exhaust' : 'intake';
}
const dirText = (dir, place) => dir === 'intake' ? 'blows in' : dir === 'exhaust' ? 'blows out' : place === 'top' ? 'blows in at the bottom and out at the top' : 'blows in on one side and out on the other';
function fanParts() { // every part in the rack with fans
  const out = [], add = (ref, d, kind, chosen, name, it) => { const place = fanPlace(d, kind); out.push({ ref, d, it, kind, place, dir: dirFor(d, chosen, place, kind), name, where: it ? uRange(it.pos2, d.h2) : place === 'side' ? 'sides' : place }); };
  byPos().forEach(it => { const d = info(it); if (cfmOf(d)) add('i' + it.id, d, 'item', it.dir, it.label || fullName(d), it); });
  if (state.top && cfmOf(LIB[state.top])) add('top', LIB[state.top], 'top', state.topDir, fullName(LIB[state.top]));
  state.extras.forEach(k => { if (cfmOf(LIB[k])) add('x' + k, LIB[k], 'extra', state.xdir[k], fullName(LIB[k])); });
  return out;
}
// reassigns rather than edits, so predict() can put the old values back
function setFanDir(ref, v) {
  if (ref === 'top') state.topDir = v;
  else if (ref[0] === 'x') state.xdir = Object.assign({}, state.xdir, { [ref.slice(1)]: v });
  else state.items = state.items.map(i => 'i' + i.id === ref ? Object.assign({}, i, { dir: v }) : i);
}
function frontVent(it, d) { // m² of free area in a part's front plate
  const ph = d.h2 * P.U / 2 - P.CLEAR; // plate height in mm
  if (it.key === 'gen') {
    const p = it.params, m = d.h2 === 1 ? 4.5 : 6.5;
    if (p.type === 'vent') return (p.pattern === 'hex' ? .64 : .55) * 196 * Math.max(0, ph - 2 * m) / 1e6; // matches parts.js
    if (p.type === 'shelf' && p.open !== false) return .2 * Math.min(p.dw, 212) * Math.min(p.dh, ph) / 1e6;  // the device fills most of the cut-out
    return 0;
  }
  if (d.vent) return d.vent * 200 * ph / 1e6;
  return d.face === 'vent' ? .4 * 200 * Math.max(0, ph - 13) / 1e6 : 0; // slots over 200 mm, a 6.5 mm rim, 40 % open
}
function rackModel() {
  const K = window.LRAir.K, n = slots(), dz = P.U / 2000, heat = new Array(n).fill(0), ua = new Array(n).fill(0);
  const openings = [], fans = [], groups = [], parts = [], occ = new Array(n).fill(null);
  const group = (kind, name, where, extra) => { const g = Object.assign({ kind, name, where, ids: [], area: 0, layers: [] }, extra); groups.push(g); return g; };
  const hole = (g, area, layer, at) => { const id = 'o' + openings.length; openings.push(at ? { id, at, area } : { id, layer, area }); g.ids.push(id); g.area += area; if (!at) g.layers.push(layer); };
  byPos().forEach(it => {
    const d = info(it), h = heatOf(it), lay = [];
    for (let s = it.pos2; s < Math.min(n, it.pos2 + d.h2); s++) { lay.push(s); occ[s] = it; }
    lay.forEach(s => { heat[s] += h.w / lay.length; });
    parts.push({ it, d, w: h.w, est: h.est, own: !!h.own, layers: lay });
    const area = frontVent(it, d);
    if (area > 0) { const g = group('front', it.label || fullName(d), uRange(it.pos2, d.h2), { it }); lay.forEach(s => hole(g, area / lay.length, s)); }
  });
  for (let s = 0; s < n;) { // open slots, one group per run
    if (occ[s]) { s++; continue; }
    let e = s; while (e < n && !occ[e]) e++;
    const g = group('slot', 'Open ' + fmtU(e - s), uRange(s, e - s)); for (let k = s; k < e; k++) hole(g, BAY_W * dz, k);
    s = e;
  }
  const back = state.back !== 'closed', top = state.top ? LIB[state.top] : null, topVent = top && top.vent || 0;
  if (back) { const g = group('back', 'Open back', 'back'); for (let s = 0; s < n; s++) hole(g, BAY_W * dz, s); }
  if (topVent) hole(group('top', fullName(top), 'top'), TOP_A * topVent, 0, 'top');
  state.extras.forEach(k => { const d = LIB[k]; if (d.at === 'side' && d.vent) { const g = group('side', fullName(d), 'both sides'); for (let s = 0; s < n; s++) hole(g, 2 * SIDE_D * dz * d.vent, s); } });
  const seams = group('seams', 'Seams between panels', 'everywhere');
  for (let s = 0; s < n; s++) hole(seams, K.leak, s);
  hole(seams, K.leakTB, 0, 'top'); hole(seams, K.leakTB, 0, 'bottom');
  const fp = fanParts();
  fp.forEach(f => {
    let layers;
    if (f.place === 'front') { const lay = [], end = Math.min(n, f.it.pos2 + f.d.h2); for (let s = f.it.pos2; s < end; s++) lay.push(s); layers = lay.map(s => ({ layer: s, share: 1 / lay.length })); }
    else if (f.place === 'top') layers = [{ at: 'top', share: 1 }];
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
  for (let s = 0; s < n; s++) ua[s] = K.uWall * dz * (2 * RACK_D + (occ[s] ? BAY_W : 0) + (back ? 0 : BAY_W)); // sides, panels, a closed back
  ua[0] += K.uWall * BAY_W * RACK_D * (1 - topVent); ua[n - 1] += K.uWall * BAY_W * RACK_D;            // top and bottom panel
  return { model: { n, dz, room: state.room, heat, ua, openings, fans }, groups, parts, fp };
}
const airMemo = new Map();
function airflow() {
  const sig = JSON.stringify([state.h, state.items.map(i => [i.key, i.pos2, i.watts, i.dir, i.params]), state.top, state.topDir, state.extras, state.xdir, state.back, state.room]);
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
  const keep = {}; ['h', 'top', 'topDir', 'back', 'items', 'extras', 'xdir'].forEach(k => { keep[k] = state[k]; });
  try { change(); return airflow(); } finally { Object.assign(state, keep); }
}
function fillInto(k1, k05) { // every open slot filled, on a copy of the items list
  state.items = state.items.slice(); let id = -1;
  for (let p = 0; p < slots();) { if (isFree(p, 2)) { state.items.push({ id: id--, key: k1, pos2: p }); p += 2; } else if (isFree(p, 1)) { state.items.push({ id: id--, key: k05, pos2: p }); p += 1; } else p++; }
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
  const ps = a.parts.slice().sort((x, y) => x.it.pos2 - y.it.pos2);
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
    '<dt>Back of the rack</dt><dd><span class="seg small" role="group" aria-label="Back of the rack">' + [['open', 'Open'], ['closed', 'Closed']].map(([v, l]) => '<button type="button" data-act="air-back" data-v="' + v + '" aria-pressed="' + (state.back === v) + '">' + l + '</button>').join('') + '</span></dd></dl>';
  const src = a.parts.filter(p => p.w > 0).sort((x, y) => y.w - x.w);
  if (src.length) body += sub('air-src', 'Heat sources', src.length + ' · ' + (a.est ? '≈ ' : '') + fmtW(a.Q), '<ul>' +
    src.map(p => row(p.it.label || fullName(p.d), uRange(p.it.pos2, p.d.h2) + (p.own ? ' · your value' : ''), wChip(p.w, p.est) + '<span class="at" title="Air at this height">' + fmtT(p.T) + '</span>')).join('') + '</ul>', false);
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

/* ---------- render: build column ---------- */
/* Sections fold to one line each, so the column stays short; the open ones are remembered. */
const sec = (id, title, sum, body) => '<details class="sec" data-sec="' + id + '"' + (ui.sec[id] ? ' open' : '') + '><summary><span class="sec-t">' + title + '</span><span class="sec-s">' + sum + '</span><span class="chev" aria-hidden="true">›</span></summary><div class="sec-b">' + body + '</div></details>';
function renderBuild() {
  if (!CAT) return;
  const h = state.h, used = placed().reduce((n, i) => n + H(i), 0), free = slots() - used, fp = frameParts(), br = state.version === 'brass';
  const pk = printPack(), done = pk.filter(x => state.done[x.k]).length, count = placed().length + (state.top ? 1 : 0);
  let html = '<div><h2 class="title">Your build</h2><span class="muted">' + h + 'U · ' + count + (count === 1 ? ' part · ' : ' parts · ') + (free ? fmtU(free) + ' open' : 'no open slots') + '</span></div>';

  const rowAir = {}, ra = url => rowAir[url] || (rowAir[url] = { w: 0, est: false, fans: [] }); // heat and fans per model page
  byPos().forEach(i => { const d = info(i), hw = heatOf(i); if (d.url && hw.w) { const r = ra(d.url); r.w += hw.w; r.est = r.est || hw.est; } });
  airflow().fans.forEach(f => { if (f.d.url) ra(f.d.url).fans.push(f); });
  const airChips = url => { const r = url && rowAir[url]; return r ? '<span class="pchips">' + wChip(r.w, r.est) + r.fans.map(f => fanChip(f.d, f.dir)).join('') + '</span>' : ''; };
  html += sec('print', 'Print list', '<span>' + done + ' of ' + pk.length + ' printed</span><span class="minibar" aria-hidden="true"><i style="width:' + (pk.length ? done / pk.length * 100 : 0) + '%"></i></span>',
    '<ul class="plist">' + pk.map(x => {
      const ok = !!state.done[x.k];
      return '<li class="prow"><button type="button" class="tick" data-act="done" data-k="' + esc(x.k) + '" aria-pressed="' + ok + '" aria-label="Mark ' + esc(x.name) + ' as printed">' +
        (ok ? '<svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="var(--accent)" stroke-width="2.2" aria-hidden="true"><path d="M4 9.5l3.2 3L14 5.5"/></svg>'
            : '<svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="var(--muted)" stroke-width="1.7" aria-hidden="true"><path d="M9 3v9M5 8.5l4 4 4-4M4 15h10"/></svg>') + '</button>' +
        '<span class="tx"><b>' + esc(x.name) + '</b>' + (x.variants ? '<small>Variants: ' + esc(x.variants) + '</small>' : '') + '<small>' + esc(x.subs.join(', ')) + '</small>' + airChips(x.url) + '</span>' + (x.qty > 1 ? '<span class="q">' + x.qty + '×</span>' : '') +
        (x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">Open</a>' : '<span class="badge">STL</span>') + '</li>';
    }).join('') + '</ul>' +
    (pk.missing ? '<p class="hint">' + pk.missing + ' own device' + (pk.missing > 1 ? 's' : '') + ' without a link.</p>' : '') +
    (placed().some(i => info(i).est) ? '<p class="hint">Parts marked ≈ have an estimated height. Check it in the model before printing.</p>' : '') +
    '<p class="hint">Download community models from MakerWorld as 3MF to keep their print profiles. Your build pack has the custom parts and a download list to click through the rest.</p>');

  const air = airParts();
  html += sec('air', 'Cooling', air.sum, air.body);

  const ol = orderList(), tagged = CAT.shops && CAT.shops.amazon && CAT.shops.amazon.en && CAT.shops.amazon.en.tag;
  html += sec('shop', 'Shopping list', '<span>' + ol.length + (ol.length === 1 ? ' item' : ' items') + '</span>', '<dl class="kv">' +
    ol.map(x => '<dt>' + esc(x.name) + '</dt><dd>' + (x.qty == null ? 'unknown' : x.qty + '×') + (x.buy ? '<a class="buy" href="' + esc(x.buy) + '" target="_blank" rel="noopener sponsored">Buy</a>' : x.check ? '<a class="buy" href="' + esc(x.check) + '" target="_blank" rel="noopener">Check</a>' : '') + '</dd>').join('') +
    '<div class="note">Mounting screws: 2 per side per panel, 1 per side for ½U panels.' + (br ? ' Inserts max 5 mm long; the hole is 5.5 mm deep.' : '') + '</div>' + (h > 5 ? '<div class="note">' + esc(JOINER_NOTE) + '</div>' : '') +
    (tagged ? '<div class="note">As an Amazon Associate the maintainer of this planner earns from qualifying purchases.</div>' : '') + '</dl>');

  const top = state.top ? LIB[state.top] : null;
  html += sec('frame', 'Frame parts', '<span>' + (br ? 'Heat-set inserts' : 'Bolted') + ' · ' + (state.sides === 'acrylic' ? 'acrylic' : 'printed') + ' sides</span>', '<dl class="kv">' +
    '<dt>Vertical posts</dt><dd>' + fp.posts + '</dd>' + (fp.joiners ? '<dt>Post joiners</dt><dd>4</dd>' : '') +
    '<dt>Side panels</dt><dd>' + fp.sides + (state.sides === 'acrylic' ? ' acrylic' : '') + '</dd>' + (state.sides === 'acrylic' ? '<div class="note">Acrylic sides: 3 mm, cut to the size of the printed side panel. Take it from that model; the planner has no measured size yet.</div>' : '') + (fp.joiners && fp.b !== 5 ? '<div class="note">Fit the side panels the opposite way to the posts so the seams don’t line up.</div>' : '') +
    '<dt>Horizontal pieces</dt><dd>4</dd><dt>Edge pieces</dt><dd>4</dd><dt>Handles · feet</dt><dd>2 · 4</dd>' +
    (top ? '<dt>Top</dt><dd>' + esc(top.name) + '</dd><div class="note">' + esc(top.label || '') + (top.note ? '. ' + esc(top.note) : '') + ' <button type="button" class="lnk btn small ghost" data-act="top-off">Use regular top panel</button></div><dt>Bottom panel</dt><dd>1</dd>'
         : '<dt>Top + bottom panel</dt><dd>1 + 1</dd>') +
    '<div class="note">The horizontal pieces need a print bed of about 250 mm; they don’t fit on 220 mm beds.' + (h > 5 ? ' Above 10U the printed frame gets too weak for a full rack, so the planner stops at 10U.' : '') + '</div></dl>');

  html += '<div class="actions"><button type="button" class="btn small" data-act="copy">Copy list</button><button type="button" class="btn small" data-act="share">Share link</button><button type="button" class="btn small" data-act="fill"' + (free ? '' : ' disabled') + '>Fill open slots</button><button type="button" class="btn small danger" data-act="clear"' + (state.items.length ? '' : ' disabled') + '>Clear rack</button></div><div id="copyfall"></div>';
  $('#build').innerHTML = html;
}

function listText() {
  const fp = frameParts(), br = state.version === 'brass', L = [];
  L.push((state.label && state.label !== 'Lab Rax' ? state.label + ' – ' : '') + 'Lab Rax ' + state.h + 'U (' + (br ? 'heat-set inserts' : 'bolted') + ')');
  L.push((state.h * P.U).toFixed(1) + ' mm inner height · 222 mm usable width', '', 'Layout (top to bottom)');
  if (state.top) L.push('  top     ' + fullName(LIB[state.top]));
  byPos().forEach(i => { const d = info(i); L.push('  ' + uRange(i.pos2, d.h2).padEnd(8) + (i.label ? '[' + i.label + '] ' : '') + fullName(d) + ' (' + uTxt(d) + ')'); });
  const used = placed().reduce((n, i) => n + H(i), 0); if (slots() - used > 0) L.push('  Open: ' + fmtU(slots() - used));
  L.push('', 'Frame', '- Vertical posts: ' + fp.posts); if (fp.joiners) L.push('- Post joiners: 4');
  L.push('- Side panels: ' + fp.sides + (state.sides === 'acrylic' ? ' (3 mm acrylic)' : ''), '- Horizontal pieces: 4', '- Edge pieces: 4', '- Handles · feet: 2 · 4', state.top ? '- Top: ' + fullName(LIB[state.top]) + '\n- Bottom panel: 1' : '- Top + bottom panel: 1 + 1');
  L.push('', 'Print pack'); printPack().forEach(x => L.push('- ' + x.qty + '× ' + x.name + (x.variants ? ' (' + x.variants + ')' : '') + (x.url ? '  ' + x.url : '  (custom STL in build pack)')));
  L.push('', 'Shopping list'); orderList().forEach(x => L.push('- ' + (x.qty == null ? 'unknown number of ' + x.name.toLowerCase() + ' (not confirmed; ' + x.check + ')' : x.qty + '× ' + x.name)));
  const a = airflow();
  if (a.Q) {
    L.push('', 'Cooling (estimate, room ' + a.room + ' °C)', '- Heat: ' + (a.est ? '≈ ' : '') + fmtW(a.Q) + ' · air through the rack ' + fmtF(a.flow) + ' · hottest air ≈ ' + fmtT(a.maxT));
    a.fans.forEach(f => L.push('- Fan: ' + f.name + ', ' + fanLine(f.d) + ', ' + dirText(f.dir, f.place)));
    airTips(a).forEach(t => L.push('- ' + t.text + (t.after ? ' (hottest air ' + fmtT(a.maxT) + ' → ' + fmtT(t.after.maxT) + ')' : '')));
  }
  return L.join('\n');
}
function csv(rows) { return '﻿' + rows.map(r => r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\n'); }

function render() { renderControls(); renderRack(); renderSel(); renderUnplaced(); renderBuild(); renderLib(); save(); if (view === '3d' && window.LRView3D) window.LRView3D.update(snapshot()); }

/* ---------- 3D snapshot for view3d.js ---------- */
function snapshot() {
  return {
    h: state.h, version: state.version, sides: state.sides, frame: state.frame, panel: state.panel, accent: state.accent, label: state.label || 'Lab Rax', top: state.top ? fullName(LIB[state.top]) : null,
    topPart: state.top ? LIB[state.top] : null, mods: frameMods(),
    items: byPos().map(i => { const d = info(i); return { id: i.id, pos2: i.pos2, h2: d.h2, name: i.label || shortName(d), face: d.face, look: d, color: colorOf(i), depth: d.depth || (i.key === 'gen' && i.params.type === 'shelf' ? i.params.dd : null), gen: i.key === 'gen' ? i.params : null, sel: i.id === sel }; })
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
  const files = [], base = slug(state.label || 'lab-rax') + '-' + state.h + 'u';
  const gens = byPos().filter(i => i.key === 'gen');
  for (const g of gens) files.push({ name: 'custom-parts/' + uRange(g.pos2, H(g)).replace('–', '-') + '-' + slug(g.name) + '.stl', data: await genSTL(g) });
  const pk = printPack();
  files.push({ name: 'download-list.html', data: downloadListHTML(pk) });
  files.push({ name: 'print-list.csv', data: csv([['Qty', 'Part', 'Variants', 'Where', 'Link'], ...pk.map(x => [x.qty, x.name, x.variants, x.subs.join('; '), x.url || 'custom-parts/'])]) });
  files.push({ name: 'shopping-list.csv', data: csv([['Qty', 'Item', 'Buy'], ...orderList().map(x => [x.qty == null ? 'unknown' : x.qty, x.name, x.buy || x.check || ''])]) });
  files.push({ name: 'README.txt', data: 'Lab Rax build pack — ' + (state.label || 'Lab Rax') + ', ' + state.h + 'U\n\n' + listText() +
    '\n\nCommunity models stay on MakerWorld under their own licenses: open download-list.html, download each model there as 3MF and tick it off.\nCustom parts in custom-parts/ were generated by the Lab Rax Planner (MIT) and print without supports: panels and shelves face-down, label plates face-up.\n' });
  let pdfErr = window.LRPdf ? null : 'the PDF module is not available';
  if (!pdfErr) try { files.push({ name: base + '-build-plan.pdf', data: await window.LRPdf.make(pdfData()) }); } catch (e) { pdfErr = e && e.message || 'unknown error'; }
  const zip = base + '-build-pack.zip';
  if (await saveFile(zip, P.zip(files)) && pdfErr) say('Downloaded ' + zip + ', but the build plan PDF is missing from it: ' + pdfErr + '.', ['pdf', 'Try the PDF again']);
}
function pdfData() {
  return { title: (state.label || 'Lab Rax') + ' · ' + state.h + 'U', h: state.h, version: state.version === 'brass' ? 'Heat-set inserts' : 'Bolted', frame: state.frame, panel: state.panel, accent: state.accent, label: state.label || 'Lab Rax',
    top: state.top ? fullName(LIB[state.top]) : null, topLook: state.top ? LS.topFor(LIB[state.top], colorsFor()) : null, // the top mount as drawn above the frame
    items: byPos().map(i => { const d = info(i); return { pos: uRange(i.pos2, d.h2), pos2: i.pos2, h2: d.h2, name: fullName(d), label: i.label || '', u: uTxt(d), url: d.url || '', author: d.author || '', color: colorOf(i), face: faceSVG(d, colorOf(i)) }; }),
    print: printPack().map(x => ({ qty: x.qty, name: x.name, sub: x.subs.join(', '), vars: x.variants, url: x.url })), shop: orderList(), frameParts: frameParts(), notes: state.h > 5 ? [JOINER_NOTE] : [] };
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
  return p;
}
function mkOptions(p) {
  const t = $('#mk-type').value, o = $('#mk-opts');
  const inp = (id, label, val, attrs) => '<label for="' + id + '">' + label + '<input id="' + id + '" ' + attrs + ' value="' + esc(val) + '"></label>';
  if (t === 'vent') o.innerHTML = '<label for="mk-pattern">Pattern<select id="mk-pattern"><option value="slots">Slots</option><option value="hex"' + (p && p.pattern === 'hex' ? ' selected' : '') + '>Hexagons</option></select></label>';
  else if (t === 'keystone') o.innerHTML = '<div class="mk-row" style="grid-template-columns:1fr 1fr">' + inp('mk-ports', 'Ports per row', p ? p.ports : 12, 'type="number" min="1" max="12" step="1"') + inp('mk-rows', 'Rows (1U and up)', p ? p.rows : 1, 'type="number" min="1" max="4" step="1"') + '</div>';
  else if (t === 'shelf') o.innerHTML = '<p class="hint" style="margin:0">Device size in mm. The shelf gets a matching front opening, a floor, side walls and a rear stop.</p><div class="mk-row">' + inp('mk-dw', 'Width', p ? p.dw : 120, 'type="number" min="20" max="212" step="1"') + inp('mk-dh', 'Height', p ? p.dh : 30, 'type="number" min="5" max="400" step="1"') + inp('mk-dd', 'Depth', p ? p.dd : 120, 'type="number" min="20" max="240" step="1"') + '</div>';
  else if (t === 'label') o.innerHTML = inp('mk-text', 'Text', p ? p.text : (state.label || 'LAB RAX'), 'type="text" maxlength="24"');
  else o.innerHTML = '';
}
function openMaker(item) {
  mkEdit = item || null;
  const p = item ? item.params : { type: 'blank', u: 1 };
  $('#mk-type').value = p.type;
  $('#mk-u').innerHTML = [0.5, 1, 1.5, 2, 3, 4].map(u => '<option value="' + u + '"' + (u === p.u ? ' selected' : '') + '>' + P.fmtU(u) + '</option>').join('');
  mkOptions(p);
  $('#mk-name').value = item ? item.name : '';
  document.querySelector('[data-act="maker-add"]').textContent = item ? 'Update part' : 'Add to rack';
  const dlg = $('#maker'); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
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
      if (part.u !== p.u) $('#mk-u').value = String(part.u);
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
function lowestFree(h2) { for (let p = slots() - h2; p >= 0; p--) if (isFree(p, h2)) return p; return null; }
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
    for (let s = 0; s < slots();) { if (isFree(s, 2)) { state.items.push({ id: state.nextId++, key: k1, pos2: s }); s += 2; } else if (isFree(s, 1)) { state.items.push({ id: state.nextId++, key: k05, pos2: s }); s += 1; } else s++; }
    a = airflow();
    return { state: cand, a, unplaced: cand.items.filter(i => i.pos2 == null).length };
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
    wzOption('fans', 'Fans', [['auto', 'Only if needed', 'The planner checks the airflow and adds a fan when the rack would get warm.'], ['top', 'Top fan', 'A 120 mm fan in the top panel, blowing out.'], ['none', 'No fans', 'Quiet: vent panels instead of fans.']]);
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
    case 'lib-group': { const g = a.dataset.g; if (ui.open[g]) delete ui.open[g]; else ui.open[g] = true; saveUI(); renderLib(); break; }
    case 'lib-more': { const d = a.dataset.dev; if (devOpen.has(d)) devOpen.delete(d); else devOpen.add(d); renderLib(); break; }
    case 'lib-lr': ui.lr = !ui.lr; saveUI(); renderLib(); break;
    case 'view': setView(a.dataset.v); break;
    case 'h-': setHeight(state.h - 1); break;
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
    case 'dup': { const it = find(sel); if (it) { const c = JSON.parse(JSON.stringify(it)); delete c.id; addItem(c); } break; }
    case 'del': removeItem(sel); break;
    case 'rm': removeItem(+a.dataset.id); break;
    case 'replace': {
      const it = find(+a.dataset.id), p = firstFree(H(it));
      if (p == null) say('There is no free ' + fmtU(H(it)) + ' slot.');
      else { it.pos2 = p; sel = it.id; touch(); render(); say(fullName(info(it)) + ' placed back at ' + uRange(p, H(it)) + '.'); }
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
    case 'air-blank': fillGaps(blankKeys(), 'blank panel'); break;
    case 'air-add': addItem({ key: a.dataset.key }, +a.dataset.pos); break;
    case 'fan-dir': if (FAN_DIRS.includes(a.dataset.v)) { setFanDir(a.dataset.ref, a.dataset.v); touch(); render(); hideTip(); } break;
    case 'air-top': if (LIB[a.dataset.key]) { state.top = a.dataset.key; state.topDir = null; touch(); render(); renderLib(); say(fullName(LIB[a.dataset.key]) + ' now sits on top of the rack.'); } break;
    case 'air-back': state.back = a.dataset.v === 'closed' ? 'closed' : 'open'; touch(); render(); break;
    case 'clear': undo = JSON.stringify(state); state.items = []; state.top = null; state.extras = []; sel = null; touch(); render(); renderLib(); say('Rack cleared.', true); break;
    case 'undo': if (undo) { state = JSON.parse(undo); undo = null; render(); renderLib(); say('Restored.'); } break;
    case 'copy': copyText(listText(), 'List copied.'); break;
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
        if (H(it) !== oldH && !isFree(it.pos2, H(it), it.id)) { const np = nearest(it.pos2, H(it), it.id); it.pos2 = np; }
        touch(); render(); renderLib(); say(name + ' updated.');
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
    case 'pack': buildPack(); break;
    case 'pdf': {
      if (!window.LRPdf) { say('The PDF module is not available.'); break; }
      say('Preparing the build plan…');
      try { const bytes = await window.LRPdf.make(pdfData()); await saveFile(slug(state.label || 'lab-rax') + '-' + state.h + 'u-build-plan.pdf', new Blob([bytes], { type: 'application/pdf' })); }
      catch (err) { say('The build plan could not be made: ' + (err && err.message || 'unknown error') + '.'); }
      break;
    }
    case 'v3d': if (window.LRView3D) window.LRView3D.action(a.dataset.v); break;
  }
});
document.addEventListener('input', e => {
  const id = e.target.id;
  if (id === 'q') { query = e.target.value.trim(); renderLib(); return; }
  if (id === 'rack-name') { state.label = e.target.value.slice(0, 16); touch(); renderRack(); save(); if (view === '3d' && window.LRView3D) window.LRView3D.update(snapshot()); return; }
  if (id === 'wz-q') { wz.q = e.target.value.trim(); $('#wz-results').innerHTML = wzResults(); return; }
  if (id === 'wz-name') { wz.label = e.target.value.slice(0, 16); $('#wz-logo').textContent = wz.label || 'Lab Rax'; return; }
  if (id === 'sel-color') { const it = find(sel); if (!it || !HEX.test(e.target.value)) return; it.color = e.target.value; touch(); renderRack(); save(); if (view === '3d' && window.LRView3D) window.LRView3D.update(snapshot()); return; }
  if (id === 'sel-watts') { const it = find(sel); if (!it) return; const v = e.target.value.trim(); if (v === '' || isNaN(+v)) delete it.watts; else it.watts = Math.max(0, Math.min(500, Math.round(+v))); touch(); save(); renderBuild(); if (view === 'air') renderRack(); hideTip(); return; }
  if (id === 'sel-label') { const it = find(sel); if (!it) return; it.label = e.target.value.slice(0, 24) || undefined; touch(); renderRack(); save(); return; }
  if (id && id.indexOf('mk-') === 0 && id !== 'mk-name') { if (id === 'mk-type') mkOptions(null); mkPreview(); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'wz-patch' || t.id === 'wz-power') { wz[t.id.slice(3)] = t.checked; return; }
  if (t.id === 'wz-spare') { wz.spare = +t.value; return; }
  if (t.classList.contains('wz-mount')) { wz.picks[+t.dataset.i].mount = t.value; return; }
  if (t.id === 'air-room') { const v = Math.round(+t.value); if (v >= 10 && v <= 40) { state.room = v; render(); } else t.value = state.room; return; }
  if (e.target.id === 'sel-color') { render(); return; } if (e.target.id === 'mk-type' || e.target.id === 'mk-u' || e.target.id === 'mk-pattern') { if (e.target.id === 'mk-type') mkOptions(null); mkPreview(); } });
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
  const it = find(drag.id); drag.p = nearest(Math.round((drag.top0 + dy) / G.HU), H(it), it.id); showGhost(drag.p, H(it));
});
host.addEventListener('pointerup', () => {
  if (!drag) return; const d = drag; drag = null;
  if (!d.moved) { sel = d.id; render(); focusSel(); return; }
  const it = find(d.id); if (d.p != null && d.p !== it.pos2) { it.pos2 = d.p; touch(); say(fullName(info(it)) + ' moved to ' + uRange(d.p, H(it)) + '.'); }
  sel = d.id; render();
});
host.addEventListener('pointercancel', () => { if (drag) { drag = null; render(); } });
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
  else if (!d.extra) front = '<div class="lp-front" style="aspect-ratio:250/' + LS.panelH(d.h2 / 2).toFixed(1) + '">' + faceSVG(d) + '</div>';
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
  if (p == null) { say('There is no room there for ' + fullName(LIB[k]) + '.'); showGhost(null); return; }
  addItem({ key: k }, p);
});
document.addEventListener('keydown', e => {
  if (sel == null || e.target.closest('input,select,textarea,dialog')) return;
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
  view = v; renderControls(); hideTip();
  const on3d = v === '3d';
  if (!on3d && CAT) renderRack();
  $('#view3d').hidden = !on3d; $('#rackHost').style.visibility = on3d ? 'hidden' : ''; $('#meas').style.visibility = on3d ? 'hidden' : '';
  if (on3d) {
    if (!window.LRView3D) { $('#view3d').innerHTML = '<div class="v3d-msg">The 3D view is not available.</div>'; return; }
    try { await window.LRView3D.mount($('#view3d'), snapshot()); }
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

/* ---------- share link (own page only) ---------- */
function shareLink() {
  const o = { h: state.h, version: state.version, frame: state.frame, panel: state.panel, accent: state.accent, label: state.label, top: state.top, extras: state.extras, back: state.back, sides: state.sides, items: state.items, nextId: state.nextId };
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return location.origin + location.pathname + location.search + '#l=' + b64;
}
function loadShared() {
  const shared = decodeShared(); if (!shared) return false;
  undo = JSON.stringify(state); state = shared; sel = null;
  sanitize(); renderLib(); render(); say('Layout loaded from a shared link.', true);
  return true;
}
function decodeShared() {
  if (location.hash.indexOf('#l=') !== 0) return null;
  try {
    const o = JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(3).replace(/-/g, '+').replace(/_/g, '/')))));
    history.replaceState(null, '', location.pathname + location.search);
    if (o && Array.isArray(o.items) && o.h >= 1 && o.h <= 10) return Object.assign(defaultState(), o, { example: false, done: {} });
  } catch (e) {}
  return null;
}

/* ---------- start ---------- */
applyTheme();
$('#footer').innerHTML = 'Based on the <a href="https://the-diy-life.com/introducing-lab-rax-a-3d-printable-modular-10-rack-system/" target="_blank" rel="noopener">Lab Rax</a> design by Michael Klements. Community mounts belong to their makers and stay on MakerWorld under their own licenses; this planner links to them. Custom parts are generated here and are yours to print. Your layout is saved in this browser.' +
  (REPO_URL ? ' <a href="' + REPO_URL + '" target="_blank" rel="noopener">Contribute on GitHub</a>.' : '');
renderTabs(); renderControls();
fetch('catalog.json', { cache: 'no-cache' })
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(c => {
    buildCatalog(c);
    sanitize();
    if (!loadShared()) { renderLib(); render(); }
    window.addEventListener('hashchange', loadShared);
    let rw = 0;
    try { new ResizeObserver(en => { const w = Math.round(en[0].contentRect.width); if (w !== rw) { rw = w; renderRack(); } }).observe($('#stage')); }
    catch (e) { window.addEventListener('resize', renderRack); }
  })
  .catch(e => { console.error(e); $('#cards').innerHTML = '<p class="hint">The parts catalog could not be loaded. Reload the page to try again.</p>'; });

window.LRApp = { snapshot, select: id => { sel = id; render(); }, say, toggleSides: () => { state.sides = state.sides === 'acrylic' ? 'printed' : 'acrylic'; touch(); render(); }, tip: (id, x, y) => id == null ? hideTip() : showTip(id, x, y) };
})();
