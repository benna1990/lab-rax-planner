// Import only page-confirmed source records. Never infer dimensions or hardware from names/photos.
import { readFileSync, writeFileSync } from 'node:fs';
const catPath = new URL('../catalog.json', import.meta.url), original = readFileSync(catPath, 'utf8'), cat = JSON.parse(original);
const source = JSON.parse(readFileSync(new URL('../docs/audit/model-pages.json', import.meta.url), 'utf8'));
const entries = [...cat.panels.flatMap(g => g.items), ...cat.devices.flatMap(g => g.items.flatMap(d => d.mounts)), ...cat.extras.flatMap(g => g.items)];
const changed = [];
for (const page of source.pages || []) {
  if (page.confidence !== 'page') continue;
  const part = entries.find(p => p.id === page.id); if (!part) throw new Error('Unknown model id ' + page.id);
  if (!/^https:\/\//.test(page.url || '') || !/^\d{4}-\d{2}-\d{2}$/.test(page.date || '')) throw new Error('Missing source/date for ' + page.id);
  if (page.license) part.license = page.license;
  part.evidence ||= {};
  if (page.fitsLabRax === 'stated') part.evidence.fit = { state: 'documented', source: page.url, date: page.date, note: page.fitNote || 'Creator states Lab Rax compatibility' };
  part.evidence.look = { state: page.look === 'ok' ? 'documented' : 'estimated', source: page.url, date: page.date, note: page.lookNote || 'Drawing not yet compared with the source' };
  if (page.attaches && part.shape) part.shape.at = page.attaches;
  if (page.profiles?.length) part.options = page.profiles.map(p => ({ id: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name: p.name, shape: {}, note: [p.prints, p.plates != null ? p.plates + ' plates in this profile' : null, /all options/i.test(p.name) ? 'Bundle of alternatives: print only the variant matching your build.' : null].filter(Boolean).join('. ') }));
  // Hardware prose cannot safely be converted into catalog IDs or inferred quantities.
  changed.push(part.id);
}
let output = original;
for (const id of changed) {
  const at = output.indexOf('"id": "' + id + '"'), start = output.lastIndexOf('{', at);
  if (at < 0 || start < 0) throw new Error('Cannot locate record ' + id);
  let end = start, depth = 0, quoted = false, escaped = false;
  for (; end < output.length; end++) {
    const c = output[end];
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; }
    else if (c === '"') quoted = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) { end++; break; }
  }
  const old = JSON.parse(output.slice(start, end));
  if (old.id !== id) throw new Error('Wrong record boundary for ' + id);
  const indent = output.slice(output.lastIndexOf('\n', start) + 1, start);
  const replacement = JSON.stringify(entries.find(p => p.id === id), null, 1).replace(/\n/g, '\n' + indent);
  output = output.slice(0, start) + replacement + output.slice(end);
}
writeFileSync(catPath, output);
console.log('Imported page-confirmed records: ' + changed.join(', '));
