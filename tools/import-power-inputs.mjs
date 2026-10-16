// Import reviewed device input specs; never turn maximum/adapter watts into typical consumption.
import { readFileSync, writeFileSync } from 'node:fs';
const path = new URL('../catalog.json', import.meta.url), original = readFileSync(path, 'utf8'), catalog = JSON.parse(original);
const source = JSON.parse(readFileSync(new URL('../docs/audit/power-inputs.json', import.meta.url), 'utf8'));
const devices = catalog.devices.flatMap(g => g.items), changed = [];
for (const record of source.devices || []) {
  if (record.confidence !== 'page') continue;
  const device = devices.find(d => d.device === record.device);
  if (!device || !/^https:\/\//.test(record.source || '') || !/^\d{4}-\d{2}-\d{2}$/.test(source.date || '')) throw new Error('Unmatched or unsourced device: ' + record.device);
  device.input = { ...record.input, ...(record.alt ? { alt: record.alt } : {}) };
  device.evidence ||= {};
  device.evidence.power = { state: 'documented', source: record.source, date: source.date, note: 'Power input specification only; typical consumption and mount compatibility are not verified by this record.' };
  changed.push(device.device);
}
let output = original;
for (const name of changed) {
  const at = output.indexOf('"device": ' + JSON.stringify(name)), start = output.lastIndexOf('{', at);
  if (at < 0 || start < 0) throw new Error('Cannot locate device ' + name);
  let end = start, depth = 0, quoted = false, escaped = false;
  for (; end < output.length; end++) {
    const c = output[end];
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; }
    else if (c === '"') quoted = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) { end++; break; }
  }
  const old = JSON.parse(output.slice(start, end)); if (old.device !== name) throw new Error('Wrong device boundary: ' + name);
  const indent = output.slice(output.lastIndexOf('\n', start) + 1, start);
  let block = output.slice(start, end);
  const device = devices.find(d => d.device === name);
  for (const key of ['input', 'evidence']) {
    const marker = '\n' + indent + ' "' + key + '":', found = block.indexOf(marker);
    const value = JSON.stringify(device[key], null, 1).replace(/\n/g, '\n' + indent + ' ');
    if (found < 0) { const tail = block.lastIndexOf('\n' + indent + '}'); block = block.slice(0, tail) + ',' + marker + ' ' + value + block.slice(tail); }
    else {
      const begin = block.indexOf('{', found + marker.length); let finish = begin, level = 0, inString = false, slash = false;
      for (; finish < block.length; finish++) { const c = block[finish]; if (inString) { if (slash) slash = false; else if (c === '\\') slash = true; else if (c === '"') inString = false; } else if (c === '"') inString = true; else if (c === '{') level++; else if (c === '}' && --level === 0) { finish++; break; } }
      block = block.slice(0, begin) + value + block.slice(finish);
    }
  }
  output = output.slice(0, start) + block + output.slice(end);
}
writeFileSync(path, output);
console.log('Imported ' + changed.length + ' page-confirmed power inputs; no consumption fields changed.');
