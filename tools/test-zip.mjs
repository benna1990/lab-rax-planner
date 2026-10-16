// Checks the build pack's ZIP writer in parts.js: CRC-32 and a stored ZIP that reads back. Run: node tools/test-zip.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const win = {};
new Function('window', readFileSync(new URL('../rack.js', import.meta.url), 'utf8'))(win);
new Function('window', readFileSync(new URL('../parts.js', import.meta.url), 'utf8'))(win);
const P = win.LRParts;
const enc = new TextEncoder(), dec = new TextDecoder();

// the standard CRC-32 check value
assert.equal(P.crc32(enc.encode('123456789')), 0xCBF43926);

// a build pack: a text file with non-ASCII text, an empty file, a binary STL-like file
const stl = new Uint8Array(134); new DataView(stl.buffer).setUint32(80, 1, true); stl[84] = 0x3f;
const files = [{ name: 'README.txt', data: 'Mini Rack Planner · 5U ✓\n' }, { name: 'empty.csv', data: '' }, { name: 'custom/fan-panel.stl', data: stl }];
const buf = new Uint8Array(await P.zip(files).arrayBuffer()), v = new DataView(buf.buffer);

// end of central directory: the count and where the directory starts
const eo = buf.length - 22;
assert.equal(v.getUint32(eo, true), 0x06054b50);
assert.equal(v.getUint16(eo + 10, true), files.length);
let cd = v.getUint32(eo + 16, true);
for (const f of files) {
  assert.equal(v.getUint32(cd, true), 0x02014b50, 'central directory entry');
  const crc = v.getUint32(cd + 16, true), size = v.getUint32(cd + 20, true), nl = v.getUint16(cd + 28, true), lo = v.getUint32(cd + 42, true);
  const name = dec.decode(buf.subarray(cd + 46, cd + 46 + nl));
  assert.equal(name, f.name);
  // the local header it points to, and the data behind it, stored as is
  assert.equal(v.getUint32(lo, true), 0x04034b50, 'local header');
  assert.equal(v.getUint16(lo + 8, true), 0, 'stored, not compressed');
  const ln = v.getUint16(lo + 26, true), data = buf.subarray(lo + 30 + ln, lo + 30 + ln + size);
  const want = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
  assert.deepEqual(Array.from(data), Array.from(want));
  assert.equal(P.crc32(data), crc);
  assert.equal(v.getUint16(lo + 6, true) & 0x0800, 0x0800, 'names flagged as UTF-8');
  cd += 46 + nl;
}
assert.equal(cd, eo, 'the directory ends where the end record starts');

console.log('ZIP checks passed: CRC-32, stored entries, UTF-8 names, offsets.');
