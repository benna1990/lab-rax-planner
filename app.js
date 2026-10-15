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
let CAT = null, LIB = {};
function buildCatalog(c) {
  CAT = c; LIB = {};
  const add = (id, o) => { LIB[id] = Object.assign({ key: id, h2: o.u ? Math.round(o.u * 2) : 0 }, o); };
  (c.panels || []).forEach(g => g.items.forEach(i => add(i.id, { name: i.name, label: null, u: i.u, est: !!i.estimated, face: i.face || 'blank', url: i.url || null, author: i.author || '', hardware: i.hardware || [], group: g.group, tab: 'panels' })));
  (c.devices || []).forEach(g => g.items.forEach(d => d.mounts.forEach(m => {
    if (m.ref) { m.key = m.ref; return; }
    m.key = m.id;
    const top = m.position === 'top';
    add(m.id, { name: d.device, label: m.label, u: top ? 0 : m.u, top, est: !!m.estimated, face: m.face || 'shelf', url: m.url || null, author: m.author || '', hardware: m.hardware || [], note: m.note, depth: m.depth, group: g.group, tab: top ? 'top' : 'devices' });
  })));
  (c.extras || []).forEach(g => g.items.forEach(i => add(i.id, { name: i.name, label: i.label || null, u: 0, extra: true, url: i.url, author: i.author || '', note: i.note, group: g.group, tab: 'extras' })));
}

/* ---------- state ---------- */
function defaultState() {
  let n = 1; const m = (k, p) => ({ id: n++, key: k, pos2: p });
  return { h: 5, version: 'brass', frame: '#26282B', panel: '#26282B', accent: '#B5CF2A', label: 'Lab Rax', top: null, extras: [], done: {}, example: true,
    items: [m('keystone', 0), m('flexmini05', 1), m('ucgmax1', 2), m('tiny1', 4), m('sbc7', 6)], nextId: n };
}
function load() {
  try { const s = JSON.parse(localStorage.getItem(STORE)); if (s && Array.isArray(s.items) && s.h >= 1 && s.h <= 10 && s.nextId) return Object.assign({ accent: '#B5CF2A', label: 'Lab Rax', top: null, extras: [], done: {} }, s); } catch (e) {}
  return null;
}
function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} }
const HEX = /^#[0-9a-f]{6}$/i;
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
  for (const k of ['frame', 'panel', 'accent']) if (!HEX.test(state[k])) state[k] = d[k];
  state.label = typeof state.label === 'string' ? state.label.slice(0, 16) : d.label;
  state.items = (Array.isArray(state.items) ? state.items : []).filter(i => i && typeof i === 'object' && (
    i.key === 'gen' ? i.params && own(GEN_NAMES, i.params.type) && okU(i.params.u) :
    i.key === 'custom' ? Number.isInteger(i.h2) && i.h2 >= 1 && i.h2 <= 20 :
    own(LIB, i.key) && !LIB[i.key].top && !LIB[i.key].extra));
  const ids = new Set();
  state.items.forEach(i => {
    if (i.key === 'gen') { i.params = cleanParams(i.params); i.name = String(i.name || GEN_NAMES[i.params.type]).slice(0, 24); }
    if (i.key === 'custom') { i.name = String(i.name || 'Own device').slice(0, 40); if (!HEX.test(i.color)) i.color = state.panel; if (typeof i.url !== 'string' || !/^https:\/\//.test(i.url)) delete i.url; }
    if (i.label != null && typeof i.label !== 'string') delete i.label;
    if (i.pos2 != null && !Number.isInteger(i.pos2)) i.pos2 = 0;
    if (!Number.isInteger(i.id) || i.id < 1 || ids.has(i.id)) i.id = null; else ids.add(i.id);
  });
  state.nextId = Math.max(Number.isInteger(state.nextId) ? state.nextId : 1, ...[...ids].map(n => n + 1));
  state.items.forEach(i => { if (i.id == null) i.id = state.nextId++; });
  if (state.top && !(own(LIB, state.top) && LIB[state.top].top)) state.top = null;
  state.extras = (Array.isArray(state.extras) ? state.extras : []).filter(k => own(LIB, k) && LIB[k].extra);
  if (!state.done || typeof state.done !== 'object') state.done = {};
  // older layouts could place whole-U panels on a half U, and a shared link could overlap parts; move them onto free slots
  byPos().forEach(i => { const p = i.pos2; i.pos2 = null; i.pos2 = isFree(p, H(i), i.id) ? p : nearest(p, H(i), i.id); });
}

let state = load() || defaultState();
let sel = null, undo = null, G = {}, drag = null, libKey = null, dropP = null, tab = 'devices', query = '', view = 'front';

const info = it => {
  if (it.key === 'custom') return { custom: true, name: it.name, h2: it.h2, face: 'custom', url: it.url || null, hardware: [] };
  if (it.key === 'gen') return { gen: true, name: it.name, label: genLabel(it.params), h2: Math.round(it.params.u * 2), face: genFace(it.params), url: null, hardware: [] };
  return LIB[it.key];
};
const H = it => info(it).h2;
const slots = () => state.h * 2;
const placed = () => state.items.filter(i => i.pos2 != null);
const byPos = () => placed().sort((a, b) => a.pos2 - b.pos2);
const find = id => state.items.find(i => i.id === id);
const colorOf = it => it.key === 'custom' ? it.color : state.panel;
function fmtU(h2) { const w = Math.floor(h2 / 2), h = h2 % 2; return (w || !h ? w : '') + (h ? '½' : '') + 'U'; }
const uTxt = d => (d.est ? '≈' : '') + fmtU(d.h2);
const shortName = d => d.name;
const fullName = d => d.label ? d.name + ' – ' + d.label : d.name;
function uRange(p, h2) { const hi = state.h - Math.floor(p / 2), lo = state.h - Math.floor((p + h2 - 1) / 2); return lo === hi ? 'U' + hi : 'U' + lo + '–' + hi; }
function lum(hex) { const n = parseInt(hex.slice(1), 16); return .2126 * (n >> 16) + .7152 * (n >> 8 & 255) + .0722 * (n & 255); }
const dark = hex => lum(hex) < 140;
const holeFor = hex => dark(hex) ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.30)';
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
function say(msg, undoable) { $('#status').innerHTML = esc(msg) + (undoable ? ' <button type="button" class="lnk" data-act="undo">Undo</button>' : ''); }
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
function fillGaps() {
  let n = 0, p = 0;
  while (p < slots()) {
    if (isFree(p, 2)) { state.items.push({ id: state.nextId++, key: 'vent1', pos2: p }); n++; p += 2; }
    else if (isFree(p, 1)) { state.items.push({ id: state.nextId++, key: 'vent05', pos2: p }); n++; p += 1; }
    else p++;
  }
  if (!n) { say('There are no open slots.'); return; }
  touch(); render(); say(n + (n > 1 ? ' vent panels' : ' vent panel') + ' added to the open slots.');
}
function focusSel() { const el = document.querySelector('.item[data-id="' + sel + '"]'); if (el) el.focus({ preventScroll: true }); }

/* ---------- drawing helpers ---------- */
function faceHTML(f) {
  const r = (n, h) => Array(n).fill(h).join('');
  switch (f) {
    case 'vent': return '<i class="f-vent"></i>';
    case 'fan': return r(5, '<i class="f-fan"></i>');
    case 'ks': return r(12, '<i class="f-ks"></i>');
    case 'd': return r(4, '<i class="f-fan" style="aspect-ratio:2;border-radius:3px"></i>');
    case 'switch': return '<span class="f-dev">' + r(8, '<i class="f-port"></i>') + '<i class="f-led"></i></span>';
    case 'shelf': return '<span class="f-dev"><i class="f-led"></i></span>';
    case 'sbc': return r(7, '<i class="f-sbc"></i>');
    case 'drv2': return r(2, '<i class="f-drv"></i>');
    case 'drv4': return r(4, '<i class="f-drv"></i>');
    case 'cut': return '<i class="f-cut"></i>';
    default: return '';
  }
}
// seen from the front a handle is the end of an arch along the side edge: 12 mm wide, 34 mm high, centred 23 mm in from the outside
function handleSVG(s, side) { return '<i class="handle" style="' + side + ':' + (17 * s).toFixed(1) + 'px;width:' + (12 * s).toFixed(1) + 'px;height:' + (34 * s).toFixed(1) + 'px" aria-hidden="true"></i>'; }
function hexSVG(s) {
  const R = Math.max(3, 4.6 * s), W = Math.sqrt(3) * R, r = R * .78;
  const hx = (cx, cy) => { let p = ''; for (let k = 0; k < 6; k++) { const a = Math.PI / 180 * (60 * k - 30); p += (cx + r * Math.cos(a)).toFixed(2) + ',' + (cy + r * Math.sin(a)).toFixed(2) + ' '; } return '<polygon points="' + p + '"/>'; };
  return '<svg class="hexgrill" aria-hidden="true"><defs><pattern id="hexpat" width="' + W.toFixed(2) + '" height="' + (3 * R).toFixed(2) + '" patternUnits="userSpaceOnUse"><g fill="#070809">' + hx(W / 2, R * .5) + hx(0, R * 2) + hx(W, R * 2) + hx(W / 2, R * 3.5) + '</g></pattern></defs><rect width="100%" height="100%" fill="url(#hexpat)"/></svg>';
}
function thumbHTML(d) {
  if (d.top) return '<span style="width:96px;height:18px;border-radius:50%;background:#F2F3F4;box-shadow:inset 0 -4px 0 #CBD0D4,0 0 0 1px rgba(0,0,0,.12)"></span>';
  if (d.extra) return '<svg width="54" height="40" viewBox="0 0 54 40" fill="none" stroke="var(--muted)" stroke-width="1.6" aria-hidden="true"><rect x="6" y="4" width="42" height="32" rx="3"/><path d="M12 4v32M42 4v32"/></svg>';
  const h = Math.max(10, Math.min(56, d.h2 * 11));
  return '<span class="item" style="position:relative;width:132px;height:' + h + 'px;cursor:inherit;--c:#26282B;--hole:rgba(255,255,255,.16);padding:0 6px">' + '<span class="face" style="justify-content:center">' + faceHTML(d.face) + '</span></span>';
}
function logoSize(fw, th) { const n = Math.max(4, (state.label || 'Lab Rax').length); return Math.min(th * .64, fw * .8 / (n * .74)); }

/* ---------- render: library ---------- */
function renderTabs() {
  $('#tabs').innerHTML = TABS.map(([k, l]) => '<button type="button" class="pill" data-act="tab" data-t="' + k + '" aria-pressed="' + (tab === k) + '">' + l + '</button>').join('');
}
function cardHTML(key, name, label) {
  const d = LIB[key], placedHere = (d.top && state.top === key) || (d.extra && state.extras.includes(key));
  const badge = d.top ? (state.top === key ? '✓ on top' : 'Top') : d.extra ? (placedHere ? '✓ added' : 'Add') : uTxt(d);
  return '<div style="position:relative"><button type="button" class="card' + (placedHere ? ' on' : '') + '" draggable="' + !(d.top || d.extra) + '" data-act="lib" data-key="' + key + '" style="width:100%">' +
    '<span class="thumb">' + thumbHTML(d) + '</span><span class="nm">' + esc(name) + '</span>' + (label ? '<span class="mt">' + esc(label) + '</span>' : '') +
    '<span class="ft"><span class="by">' + (d.author ? 'by ' + esc(d.author) : '&nbsp;') + '</span><span class="badge' + (d.est ? ' est' : '') + '"' + (d.est ? ' title="Height estimated; check the model"' : '') + '>' + badge + '</span></span></button>' +
    (d.url ? '<a class="ext" href="' + esc(d.url) + '" target="_blank" rel="noopener" aria-label="Open model page for ' + esc(fullName(d)) + '" title="Open model page">↗</a>' : '') + '</div>';
}
function matches(...s) { if (!query) return true; const q = query.toLowerCase().replace(/[\s-]/g, ''); return s.join(' ').toLowerCase().replace(/[\s-]/g, '').includes(q); }
function renderLib() {
  renderTabs();
  if (!CAT) return;
  let h = '', hits = 0;
  const group = (title, cards) => { if (!cards.length) return; hits += cards.length; h += '<p class="grouphead">' + esc(title) + '</p><div class="cards">' + cards.join('') + '</div>'; };
  if (tab === 'devices' || tab === 'top') {
    (CAT.devices || []).forEach(g => {
      const cards = [];
      g.items.forEach(d => d.mounts.forEach(m => {
        const it = LIB[m.key]; if (!it) return;
        if ((tab === 'top') !== !!it.top) return;
        if (!matches(d.device, g.group, m.ref ? it.name : m.label, it.author)) return;
        cards.push(cardHTML(m.key, d.device, m.ref ? it.name : m.label));
      }));
      group(g.group, cards);
    });
  } else if (tab === 'panels') {
    (CAT.panels || []).forEach(g => group(g.group, g.items.filter(i => matches(i.name, g.group, i.author)).map(i => cardHTML(i.id, i.name, null))));
  } else if (tab === 'extras') {
    (CAT.extras || []).forEach(g => group(g.group, g.items.filter(i => matches(i.name, i.label || '', g.group, i.author)).map(i => cardHTML(i.id, i.name, i.label))));
  } else {
    const gens = state.items.filter(i => i.key === 'gen');
    h = '<p class="hint">Custom parts are generated here as STL, sized to the 10" standard Lab Rax uses. Make one with the button below; it appears in the rack and in your build pack.</p>' +
      (gens.length ? '<div class="cards" style="margin-top:10px">' + gens.map(i => '<button type="button" class="card" data-act="edit-gen" data-id="' + i.id + '"><span class="thumb">' + thumbHTML(info(i)) + '</span><span class="nm">' + esc(i.name) + '</span><span class="mt">' + esc(genLabel(i.params)) + '</span><span class="ft"><span class="by">Edit</span><span class="badge">' + fmtU(H(i)) + '</span></span></button>').join('') + '</div>' : '');
    hits = 1;
  }
  if (!hits) h = '<p class="hint">Nothing found for “' + esc(query) + '”. Make a custom part below, or add your own device from the Custom tab.</p>';
  else if (tab === 'devices') h += '<p class="hint" style="margin-top:10px">≈ means the height is estimated from the device. Check the model before printing.</p>';
  $('#cards').innerHTML = h;
}

/* ---------- render: rack (front view) ---------- */
function renderRack() {
  if (!CAT) return;
  const host = $('#stage'), avail = host.clientWidth - 24 - 34 - 60;
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
    const d = info(it), c = colorOf(it), fc = dark(c) ? '#F1F3F4' : '#16191C', lc = Math.abs(lum(state.accent) - lum(c)) > 70 ? state.accent : fc;
    items += '<div class="item' + (it.id === sel ? ' sel' : '') + '" data-id="' + it.id + '" role="button" tabindex="0" aria-label="' + esc(fullName(d) + ', ' + uTxt(d) + ', ' + uRange(it.pos2, d.h2)) + '"' +
      ' style="top:' + (it.pos2 * HU).toFixed(1) + 'px;height:' + (d.h2 * HU - 1).toFixed(1) + 'px;left:' + inset.toFixed(1) + 'px;right:' + inset.toFixed(1) + 'px;padding:0 ' + (5 * s).toFixed(1) + 'px;--c:' + c + ';--fc:' + fc + ';--lc:' + lc + ';--hole:' + holeFor(c) + '">' +
      '<i class="screw"></i><span class="lbl"><b>' + esc(it.label || shortName(d)) + '</b><small>' + uTxt(d) + '</small></span><span class="face">' + faceHTML(d.face) + '</span><i class="screw"></i></div>';
  });
  const ap = state.top ? '<span class="ap" title="' + esc(fullName(LIB[state.top])) + '"><i class="disc"></i><i class="leg" style="left:30%"></i><i class="leg" style="right:30%"></i></span>' : '';
  const marginTop = Math.round(state.top ? Math.max(66 * s, frameW * .12 + 6) : frameW * .12 + 6);
  $('#rackHost').innerHTML =
    '<div class="rack' + (state.version === 'brass' ? ' brass' : '') + '" id="rack" style="--frame:' + state.frame + ';--acc:' + state.accent + ';--bev:' + (20 * s).toFixed(1) + 'px;--hs:' + Math.max(3.5, 5 * s).toFixed(1) + 'px;grid-template-columns:34px ' + frameW.toFixed(1) + 'px 34px;grid-template-rows:' + topH.toFixed(1) + 'px ' + bodyH.toFixed(1) + 'px ' + edge + 'px auto;margin-top:' + marginTop + 'px">' +
      '<div></div><div class="edge top">' + (state.top ? '' : '<span class="tp-band" style="height:' + Math.round(7 * s) + 'px"></span>') + handleSVG(s, 'left') + handleSVG(s, 'right') + hexSVG(s) +
        '<span class="logo" style="font-size:' + logoSize(frameW, topH).toFixed(1) + 'px">' + esc(state.label || 'Lab Rax') + '</span>' + ap + '</div><div></div>' +
      '<div class="ulab">' + labels + '</div>' +
      '<div class="rframe" style="width:' + frameW.toFixed(1) + 'px">' +
        '<div class="post" style="left:0;width:' + postW.toFixed(1) + 'px">' + holesL + '</div>' +
        '<div class="bay" style="left:' + postW.toFixed(1) + 'px;width:' + bayW.toFixed(1) + 'px"></div>' +
        '<div class="post" style="right:0;width:' + postW.toFixed(1) + 'px">' + holesR + '</div>' +
        '<div class="mount" id="mount">' + items + '<div class="ghost" id="ghost" hidden></div></div>' +
      '</div><div></div>' +
      '<div></div><div class="edge bot"><i class="foot" style="left:3%"></i><i class="foot" style="right:3%"></i></div><div></div>' +
      '<div></div><div class="floor"></div><div></div>' +
    '</div>';
  $('#meas').textContent = '222 mm usable width · ' + (state.h * P.U).toFixed(1) + ' mm inner height · ' + state.h + 'U';
}
function showGhost(p, h2) {
  const g = $('#ghost'); if (!g) return;
  if (p == null) { g.hidden = true; return; }
  const ins = (137 - P.PANEL_W / 2) * G.s;
  g.hidden = false; g.style.top = (p * G.HU) + 'px'; g.style.height = (h2 * G.HU - 1) + 'px'; g.style.left = ins + 'px'; g.style.right = ins + 'px';
}

/* ---------- render: selection, unplaced, settings ---------- */
function renderSel() {
  const it = sel != null ? find(sel) : null, bar = $('#selbar');
  if (!it || it.pos2 == null) { bar.innerHTML = '<span class="hint">Click a part in the rack to move, label or remove it. Drag it, or use the arrow keys to move by ½U.</span>'; return; }
  const d = info(it);
  bar.innerHTML = '<div class="who"><b>' + esc(fullName(d)) + '</b><span class="hint">' + uTxt(d) + ' · ' + uRange(it.pos2, d.h2) + (d.author ? ' · by ' + esc(d.author) : '') + '</span></div>' +
    '<input class="field" id="sel-label" type="text" maxlength="24" aria-label="Label on the panel" placeholder="Label, e.g. Pi 5" value="' + esc(it.label || '') + '">' +
    '<button type="button" class="btn small" data-act="up" aria-label="Move up">↑</button><button type="button" class="btn small" data-act="down" aria-label="Move down">↓</button>' +
    (it.key === 'gen' ? '<button type="button" class="btn small" data-act="edit-gen" data-id="' + it.id + '">Edit part</button>' : d.url ? '<a class="btn small" href="' + esc(d.url) + '" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">Model ↗</a>' : '') +
    '<button type="button" class="btn small" data-act="dup">Duplicate</button><button type="button" class="btn small danger" data-act="del">Remove</button>';
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
    '<div class="set"><span>Frame colour</span>' + sw('frame', state.frame) + '</div>' +
    '<div class="set"><span>Panels</span>' + sw('panel', state.panel) + '</div>' +
    '<div class="set"><span>Accent</span>' + sw('acc', state.accent) + '</div>' +
    '<div class="set"><label for="rack-name">Name</label><input class="field" id="rack-name" type="text" maxlength="16" placeholder="Lab Rax" value="' + esc(state.label) + '" style="width:150px"></div>';
}
function renderControls() {
  $('#h-out').textContent = state.h + 'U';
  $('#h-minus').disabled = state.h <= 1; $('#h-plus').disabled = state.h >= 10;
  $('#v-front').setAttribute('aria-pressed', view === 'front'); $('#v-3d').setAttribute('aria-pressed', view === '3d');
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
  const add = (name, sub, url, qty, kind) => {
    const k = url || ('gen:' + name + sub);
    const ex = out.find(x => x.k === k);
    if (ex) { ex.qty += qty; if (sub && !ex.subs.includes(sub)) ex.subs.push(sub); return; }
    out.push({ id: n++, k, name, subs: sub ? [sub] : [], url, qty, kind });
  };
  const fm = br ? fr.brass : fr.bolted;
  add(fm.name, h === 5 ? 'Complete 5U frame with side panels' : 'Base frame: edges, horizontals, handles, feet', fm.url, 1, 'mw');
  if (h !== 5) add(fr.sizes.name, 'Posts and side panels for ' + h + 'U', fr.sizes.url, 1, 'mw');
  if (h > 5) add(fr.extension.name, '4 joiners for ' + h + 'U', fr.extension.url, 1, 'mw');
  if (state.top) { const d = LIB[state.top]; add(fullName(d), 'Replaces the top panel', d.url, 1, 'mw'); }
  state.extras.forEach(k => { const d = LIB[k]; add(fullName(d), 'Frame extra', d.url, 1, 'mw'); });
  let missing = 0;
  byPos().forEach(i => {
    const d = info(i);
    if (i.key === 'gen') { add(i.name, genLabel(i.params) + ' · ' + uRange(i.pos2, d.h2) + ' · in the build pack', null, 1, 'gen'); return; }
    if (!d.url) { if (d.custom) missing++; return; }
    add(fullName(d), (i.label || shortName(d)) + ' · ' + uRange(i.pos2, d.h2), d.url, 1, 'mw');
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
  return [...m].map(([p, q]) => { const hw = CAT.hardware[p] || {}; return { name: hw.name || p, qty: q, buy: hw.buy || shopUrl(hw.search) }; });
}

/* ---------- render: build column ---------- */
function renderBuild() {
  if (!CAT) return;
  const h = state.h, used = placed().reduce((n, i) => n + H(i), 0), free = slots() - used, fp = frameParts(), br = state.version === 'brass';
  const pk = printPack(), done = pk.filter(x => state.done[x.k]).length, count = placed().length + (state.top ? 1 : 0);
  let html = '<div><h2 class="title">Your build</h2><span class="muted">' + h + 'U · ' + count + (count === 1 ? ' part · ' : ' parts · ') + (free ? fmtU(free) + ' open' : 'no open slots') + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;font-size:13px" class="muted"><span>Print progress</span><span>' + done + ' of ' + pk.length + ' printed</span></div>' +
    '<div class="progress" aria-hidden="true"><i style="width:' + (pk.length ? done / pk.length * 100 : 0) + '%"></i></div>' +
    '<ul class="plist">' + pk.map(x => {
      const ok = !!state.done[x.k];
      return '<li class="prow"><button type="button" class="tick" data-act="done" data-k="' + esc(x.k) + '" aria-pressed="' + ok + '" aria-label="Mark ' + esc(x.name) + ' as printed">' +
        (ok ? '<svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="var(--accent)" stroke-width="2.2" aria-hidden="true"><path d="M4 9.5l3.2 3L14 5.5"/></svg>'
            : '<svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="var(--muted)" stroke-width="1.7" aria-hidden="true"><path d="M9 3v9M5 8.5l4 4 4-4M4 15h10"/></svg>') + '</button>' +
        '<span class="tx"><b>' + esc(x.name) + '</b><small>' + esc(x.subs.join(', ')) + '</small></span>' + (x.qty > 1 ? '<span class="q">' + x.qty + '×</span>' : '') +
        (x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">Open</a>' : '<span class="badge">STL</span>') + '</li>';
    }).join('') + '</ul>' +
    (pk.missing ? '<p class="hint">' + pk.missing + ' own device' + (pk.missing > 1 ? 's' : '') + ' without a link.</p>' : '') +
    '<p class="hint">Download community models from MakerWorld as 3MF to keep their print profiles. Custom parts are in your build pack.</p>';

  const ol = orderList(), tagged = CAT.shops && CAT.shops.amazon && CAT.shops.amazon.en && CAT.shops.amazon.en.tag;
  html += '<div class="boxcard"><h3 class="sub">Shopping list</h3><dl class="kv">' +
    ol.map(x => '<dt>' + esc(x.name) + '</dt><dd>' + x.qty + '×' + (x.buy ? '<a class="buy" href="' + esc(x.buy) + '" target="_blank" rel="noopener sponsored">Buy</a>' : '') + '</dd>').join('') +
    '<div class="note">Mounting screws: 2 per side per panel, 1 per side for ½U panels.' + (br ? ' Inserts max 5 mm long; the hole is 5.5 mm deep.' : '') + '</div>' +
    (tagged ? '<div class="note">As an Amazon Associate the maintainer of this planner earns from qualifying purchases.</div>' : '') + '</dl></div>';

  const top = state.top ? LIB[state.top] : null;
  html += '<details class="boxcard"><summary style="cursor:pointer;font-weight:700">Frame parts</summary><dl class="kv" style="margin-top:8px">' +
    '<dt>Vertical posts</dt><dd>' + fp.posts + '</dd>' + (fp.joiners ? '<dt>Post joiners</dt><dd>4</dd>' : '') +
    '<dt>Side panels</dt><dd>' + fp.sides + '</dd>' + (fp.joiners && fp.b !== 5 ? '<div class="note">Fit the side panels the opposite way to the posts so the seams don’t line up.</div>' : '') +
    '<dt>Horizontal pieces</dt><dd>4</dd><dt>Edge pieces</dt><dd>4</dd><dt>Handles · feet</dt><dd>2 · 4</dd>' +
    (top ? '<dt>Top</dt><dd>' + esc(top.name) + '</dd><div class="note">' + esc(top.label || '') + (top.note ? '. ' + esc(top.note) : '') + ' <button type="button" class="lnk btn small ghost" data-act="top-off">Use regular top panel</button></div><dt>Bottom panel</dt><dd>1</dd>'
         : '<dt>Top + bottom panel</dt><dd>1 + 1</dd>') + '</dl></details>';

  const notes = [];
  if (placed().some(i => info(i).est)) notes.push('Parts marked ≈ have an estimated height. Check it in the model before printing.');
  if (free > 0) notes.push(fmtU(free) + ' is still open. Close it with blanking or vent panels for clean airflow.');
  if (h > 5) notes.push('Above 10U the printed frame gets too weak for a full rack, so the planner stops at 10U.');
  notes.push('The horizontal pieces need a print bed of about 250 mm; they don’t fit on 220 mm beds.');
  html += '<ul class="notes">' + notes.map(n => '<li>' + esc(n) + '</li>').join('') + '</ul>' +
    '<div class="actions"><button type="button" class="btn small" data-act="copy">Copy list</button><button type="button" class="btn small" data-act="share">Share link</button><button type="button" class="btn small" data-act="fill"' + (free ? '' : ' disabled') + '>Fill open slots</button><button type="button" class="btn small danger" data-act="clear"' + (state.items.length ? '' : ' disabled') + '>Clear rack</button></div><div id="copyfall"></div>';
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
  L.push('- Side panels: ' + fp.sides, '- Horizontal pieces: 4', '- Edge pieces: 4', '- Handles · feet: 2 · 4', state.top ? '- Top: ' + fullName(LIB[state.top]) + '\n- Bottom panel: 1' : '- Top + bottom panel: 1 + 1');
  L.push('', 'Print pack'); printPack().forEach(x => L.push('- ' + x.qty + '× ' + x.name + (x.url ? '  ' + x.url : '  (custom STL in build pack)')));
  L.push('', 'Shopping list'); orderList().forEach(x => L.push('- ' + x.qty + '× ' + x.name));
  return L.join('\n');
}
function csv(rows) { return '﻿' + rows.map(r => r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\n'); }

function render() { renderControls(); renderRack(); renderSel(); renderUnplaced(); renderBuild(); save(); if (view === '3d' && window.LRView3D) window.LRView3D.update(snapshot()); }

/* ---------- 3D snapshot for view3d.js ---------- */
function snapshot() {
  return {
    h: state.h, version: state.version, frame: state.frame, panel: state.panel, accent: state.accent, label: state.label || 'Lab Rax', top: state.top ? fullName(LIB[state.top]) : null,
    items: byPos().map(i => { const d = info(i); return { id: i.id, pos2: i.pos2, h2: d.h2, name: i.label || shortName(d), face: d.face, color: colorOf(i), depth: d.depth || (i.key === 'gen' && i.params.type === 'shelf' ? i.params.dd : null), gen: i.key === 'gen' ? i.params : null, sel: i.id === sel }; })
  };
}

/* ---------- files out ---------- */
const TOP_WIN = (() => { try { return window.self === window.top; } catch (e) { return false; } })();
async function saveFile(filename, blob) {
  let dl = null;
  try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
  if (dl) {
    try { await dl.save({ filename, data: blob }); say('Saved ' + filename + '.'); }
    catch (e) { say(e && e.code === 'declined' ? 'Download cancelled.' : 'This view can’t save files. Open the planner on its own page to download.'); }
    return;
  }
  if (TOP_WIN) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    say('Downloaded ' + filename + '.');
    return;
  }
  say('This view can’t save files. Open the planner on its own page to download.');
}
async function genSTL(item) {
  const part = await P.build(item.params);
  return P.toSTL(part.geoms, item.name, part.faceUp);
}
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'part';
async function buildPack() {
  say('Preparing your build pack…');
  const files = [], base = slug(state.label || 'lab-rax') + '-' + state.h + 'u';
  const gens = byPos().filter(i => i.key === 'gen');
  for (const g of gens) files.push({ name: 'custom-parts/' + uRange(g.pos2, H(g)).replace('–', '-') + '-' + slug(g.name) + '.stl', data: await genSTL(g) });
  const pk = printPack();
  files.push({ name: 'print-list.csv', data: csv([['Qty', 'Part', 'Where', 'Link'], ...pk.map(x => [x.qty, x.name, x.subs.join('; '), x.url || 'custom-parts/'])]) });
  files.push({ name: 'shopping-list.csv', data: csv([['Qty', 'Item', 'Buy'], ...orderList().map(x => [x.qty, x.name, x.buy || ''])]) });
  files.push({ name: 'README.txt', data: 'Lab Rax build pack — ' + (state.label || 'Lab Rax') + ', ' + state.h + 'U\n\n' + listText() +
    '\n\nCommunity models stay on MakerWorld under their own licenses: open each link in print-list.csv and download the 3MF there.\nCustom parts in custom-parts/ were generated by the Lab Rax Planner (MIT) and print without supports: panels and shelves face-down, label plates face-up.\n' });
  try { if (window.LRPdf) files.push({ name: base + '-build-plan.pdf', data: await window.LRPdf.make(pdfData()) }); } catch (e) { /* PDF is optional in the pack */ }
  await saveFile(base + '-build-pack.zip', P.zip(files));
}
function pdfData() {
  return { title: (state.label || 'Lab Rax') + ' · ' + state.h + 'U', h: state.h, version: state.version === 'brass' ? 'Heat-set inserts' : 'Bolted', frame: state.frame, panel: state.panel, accent: state.accent, label: state.label || 'Lab Rax',
    top: state.top ? fullName(LIB[state.top]) : null,
    items: byPos().map(i => { const d = info(i); return { pos: uRange(i.pos2, d.h2), pos2: i.pos2, h2: d.h2, name: fullName(d), label: i.label || '', u: uTxt(d), url: d.url || '', author: d.author || '', color: colorOf(i) }; }),
    print: printPack().map(x => ({ qty: x.qty, name: x.name, sub: x.subs.join(', '), url: x.url })), shop: orderList(), frameParts: frameParts(), notes: [] };
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

/* ---------- events ---------- */
document.addEventListener('click', async e => {
  const a = e.target.closest('[data-act]');
  if (!a) { if (e.target.closest('#rackHost') && !e.target.closest('.item') && sel != null) { sel = null; render(); } return; }
  const act = a.dataset.act;
  if (!CAT && !['theme', 'maker-close'].includes(act)) return;
  switch (act) {
    case 'theme': cycleTheme(); break;
    case 'tab': tab = a.dataset.t; renderLib(); break;
    case 'view': setView(a.dataset.v); break;
    case 'h-': setHeight(state.h - 1); break;
    case 'h+': setHeight(state.h + 1); break;
    case 'ver': state.version = a.dataset.v; touch(); render(); break;
    case 'frame': state.frame = a.dataset.c; touch(); render(); break;
    case 'panel': state.panel = a.dataset.c; touch(); render(); break;
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
  if (id === 'sel-label') { const it = find(sel); if (!it) return; it.label = e.target.value.slice(0, 24) || undefined; touch(); renderRack(); save(); return; }
  if (id && id.indexOf('mk-') === 0 && id !== 'mk-name') { if (id === 'mk-type') mkOptions(null); mkPreview(); }
});
document.addEventListener('change', e => { if (e.target.id === 'mk-type' || e.target.id === 'mk-u' || e.target.id === 'mk-pattern') { if (e.target.id === 'mk-type') mkOptions(null); mkPreview(); } });
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
  view = v; renderControls();
  const on3d = v === '3d';
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
  const o = { h: state.h, version: state.version, frame: state.frame, panel: state.panel, accent: state.accent, label: state.label, top: state.top, extras: state.extras, items: state.items, nextId: state.nextId };
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
  .catch(() => { $('#cards').innerHTML = '<p class="hint">The parts catalog could not be loaded. Reload the page to try again.</p>'; });

window.LRApp = { snapshot, select: id => { sel = id; render(); }, say };
})();
