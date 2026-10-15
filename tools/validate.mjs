// Checks catalog.json for mistakes. Run: node tools/validate.mjs
import { readFileSync } from 'node:fs';

const cat = JSON.parse(readFileSync(new URL('../catalog.json', import.meta.url), 'utf8'));
// shapes.js knows the shape spec (how a part looks); it is a browser script, so give it a window to attach to
const win = {};
new Function('window', readFileSync(new URL('../shapes.js', import.meta.url), 'utf8'))(win);
const LS = win.LRShapes, deviceNames = new Set((cat.devices || []).flatMap(g => (g.items || []).map(d => d.device)));
const look = (kind, o, where) => { if (o.shape != null) LS.check(kind, o.shape, n => deviceNames.has(n)).forEach(e => errors.push(`${where}: ${e}`)); };
const errors = [], ids = new Set(), urls = new Map();
const FACES = new Set(['shelf', 'switch', 'vent', 'fan', 'ks', 'd', 'sbc', 'drv2', 'drv4', 'blank', 'cut']);
const text = v => typeof v === 'string' && v.trim() !== '';
const okUrl = u => typeof u === 'string' && /^https:\/\/\S+$/.test(u);
const okU = u => typeof u === 'number' && u >= 0.5 && u <= 10 && Number.isInteger(u * 2);
const DIRS = new Set(['intake', 'exhaust', 'cross']), PLACES = new Set(['side', 'back', 'top']);
const isFan = part => typeof cat.hardware?.[part]?.cfm === 'number';
// heat and airflow: typical heat in W (wattsEstimated marks a guess), fan direction, free area of an opening, where an extra sits
function air(o, where, needWatts) {
  if (o.watts == null) { if (needWatts) errors.push(`${where}: needs watts, the typical heat in W (add "wattsEstimated": true when it's a guess)`); }
  else if (!(typeof o.watts === 'number' && o.watts >= 0 && o.watts <= 500)) errors.push(`${where}: watts must be a number from 0 to 500`);
  if (o.wattsEstimated != null && (o.wattsEstimated !== true || o.watts == null)) errors.push(`${where}: wattsEstimated can only be true, next to watts`);
  const fans = (o.hardware || []).some(h => isFan(h.part));
  if (o.fanDir != null && (!DIRS.has(o.fanDir) || !fans)) errors.push(`${where}: fanDir must be intake, exhaust or cross, on a part whose hardware has fans`);
  if (o.fanDir === 'cross' && !['side', 'top'].includes(o.at)) errors.push(`${where}: fanDir cross is only for a pair of fans in the side panels (one in, one out) or in the top and bottom panel (in at the bottom, out at the top)`);
  if (o.vent != null && !(typeof o.vent === 'number' && o.vent > 0 && o.vent <= 1)) errors.push(`${where}: vent is the open share of the opening, more than 0 and at most 1`);
  for (const k of ['at', 'fanAt']) if (o[k] != null && !PLACES.has(o[k])) errors.push(`${where}: ${k} must be side, back or top`);
}

function claim(id, where) {
  if (typeof id !== 'string' || !/^[a-z0-9]+$/.test(id)) errors.push(`${where}: id "${id}" must be lowercase letters and digits only`);
  else if (ids.has(id)) errors.push(`${where}: duplicate id "${id}"`);
  else ids.add(id);
}
function hardware(list, where) {
  if (list == null) return;
  if (!Array.isArray(list)) return errors.push(`${where}: hardware must be a list`);
  for (const h of list) {
    if (!cat.hardware[h.part]) errors.push(`${where}: unknown hardware part "${h.part}"`);
    if (!Number.isInteger(h.qty) || h.qty < 1) errors.push(`${where}: hardware qty must be a whole number of 1 or more`);
  }
}
function url(u, where, required) {
  if (u == null) { if (required) errors.push(`${where}: needs a url`); return; }
  if (!okUrl(u)) errors.push(`${where}: url must start with https://`);
}

for (const [k, h] of Object.entries(cat.hardware || {})) {
  if (!text(h.name)) errors.push(`hardware.${k}: needs a name`);
  if (h.cfm != null && !['mm', 'cfm', 'pa'].every(f => typeof h[f] === 'number' && h[f] > 0)) errors.push(`hardware.${k}: a fan needs mm, cfm and pa (size, rated flow, maximum static pressure), all above 0`);
}
for (const v of ['brass', 'bolted']) { const f = cat.frame?.[v]; if (!f) errors.push(`frame.${v} is missing`); else { url(f.url, `frame.${v}`, true); hardware(f.hardware, `frame.${v}`); } }

for (const g of cat.panels || []) {
  if (!text(g.group)) errors.push('panels: every group needs a name');
  for (const p of g.items || []) {
    const w = `panel ${p.id}`; claim(p.id, w);
    if (!text(p.name)) errors.push(`${w}: needs a name`);
    if (!okU(p.u)) errors.push(`${w}: u must be 0.5–10 in steps of 0.5`);
    if (p.face && !FACES.has(p.face)) errors.push(`${w}: unknown face "${p.face}"`);
    url(p.url, w, false); hardware(p.hardware, w); air(p, w, false); look('part', p, w);
  }
}
for (const g of cat.devices || []) {
  if (!text(g.group)) errors.push('devices: every group needs a name');
  for (const d of g.items || []) {
    if (!text(d.device)) errors.push('devices: every item needs a device name');
    if (!Array.isArray(d.mounts) || !d.mounts.length) errors.push(`${d.device}: needs at least one mount`);
    LS.checkDevice(d, d.device).forEach(e => errors.push(e));
    for (const m of d.mounts || []) {
      const w = `${d.device} / ${m.id}`; claim(m.id, w);
      if (!text(m.label)) errors.push(`${w}: needs a label`);
      url(m.url, w, true);
      if (m.position && m.position !== 'top') errors.push(`${w}: position can only be "top"`);
      if (m.position !== 'top' && !okU(m.u)) errors.push(`${w}: u must be 0.5–10 in steps of 0.5`);
      if (m.face && !FACES.has(m.face)) errors.push(`${w}: unknown face "${m.face}"`);
      hardware(m.hardware, w); air(m, w, true); look(m.position === 'top' ? 'top' : 'part', m, w);
      if (m.url) { const k = m.url.replace(/^https:\/\/(www\.)?/, '').replace(/\/en\//, '/'); if (urls.has(k + d.device)) errors.push(`${w}: same model listed twice for this device`); urls.set(k + d.device, 1); }
    }
  }
}
for (const g of cat.extras || []) {
  if (!text(g.group)) errors.push('extras: every group needs a name');
  for (const x of g.items || []) { const w = `extra ${x.id}`; claim(x.id, w); if (!text(x.name)) errors.push(`${w}: needs a name`); url(x.url, w, true); hardware(x.hardware, w); air(x, w, false); look('extra', x, w); }
}

if (errors.length) { console.error(`catalog.json has ${errors.length} problem(s):\n- ` + errors.join('\n- ')); process.exit(1); }
console.log(`catalog.json is valid: ${ids.size} parts, mounts and extras.`);
