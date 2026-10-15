/* Saving and loading a layout: the compact form ([settings that differ from the defaults, parts as [key, pos2, other fields]]),
   url-safe base64 for share links, and the .rack.json file. Pure, so it runs in Node too (tools/test-codec.mjs); app.js passes
   in its defaults and the setting names it shares. */
(function () {
const FORMAT = 'mini-rack-planner', VERSION = 1; // saved files carry these: never change the name
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y), own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
function compact(state, defaults, keys) {
  const st = {};
  keys.forEach(k => { if (state[k] !== undefined && !same(state[k], defaults[k])) st[k] = state[k]; });
  const items = (state.items || []).map(i => { const { id, key, pos2, ...rest } = i; return Object.keys(rest).length ? [key, pos2, rest] : [key, pos2]; });
  return [st, items];
}
// a compact layout as a state (before the app's sanitize()), or null when it can't be one
function expand(st, items, defaults, keys) {
  const list = Array.isArray(items) ? items : [], o = {};
  if (st && typeof st === 'object') keys.forEach(k => { if (own(st, k)) o[k] = st[k]; }); // only settings this planner knows
  o.items = list.map((x, n) => Object.assign({}, Array.isArray(x) && x[2] && typeof x[2] === 'object' ? x[2] : {}, { id: n + 1, key: Array.isArray(x) ? x[0] : null, pos2: Array.isArray(x) && x[1] != null ? x[1] : null }));
  o.nextId = list.length + 1;
  const s2 = Object.assign({}, defaults, o, { example: false, done: {} });
  return Number.isInteger(s2.h) && s2.h >= 1 && s2.h <= 10 ? s2 : null;
}
const toB64 = v => btoa(unescape(encodeURIComponent(JSON.stringify(v)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function fromB64(s) { try { return JSON.parse(decodeURIComponent(escape(atob(String(s).replace(/-/g, '+').replace(/_/g, '/'))))); } catch (e) { return undefined; } }
// the rack file: one part per line, so it diffs and reads well
function fileText(layout) {
  const [settings, parts] = layout;
  return '{\n  "format": "' + FORMAT + '",\n  "version": ' + VERSION + ',\n  "settings": ' + JSON.stringify(settings) + ',\n  "parts": [' +
    parts.map(x => '\n    ' + JSON.stringify(x)).join(',') + (parts.length ? '\n  ' : '') + ']\n}\n';
}
// { state, newer } from a rack file's text, or null when it isn't one
function readFile(text, defaults, keys) {
  let o = null; try { o = JSON.parse(String(text).replace(/^﻿/, '')); } catch (e) {}
  if (!o || o.format !== FORMAT || !Number.isInteger(o.version) || o.version < 1) return null;
  const s2 = expand(o.settings, o.parts, defaults, keys);
  return s2 ? { state: s2, newer: o.version > VERSION } : null;
}
window.LRCodec = { FORMAT, VERSION, compact, expand, toB64, fromB64, fileText, readFile };
})();
