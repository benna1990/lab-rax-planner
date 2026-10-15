// Checks codec.js: share links and rack files round-trip a layout. Run: node tools/test-codec.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const win = {};
new Function('window', readFileSync(new URL('../codec.js', import.meta.url), 'utf8'))(win);
const C = win.LRCodec;
const KEYS = ['h', 'version', 'frame', 'panel', 'accent', 'label', 'top', 'topDir', 'extras', 'xdir', 'market', 'costs', 'back', 'sides', 'room', 'power', 'bottom', 'bottomDir'];
const defaults = () => ({ h: 5, version: 'brass', frame: '#26282B', panel: '#26282B', accent: '#B5CF2A', label: 'Lab Rax', top: null, topDir: null, bottom: null, bottomDir: null, extras: [], xdir: {}, back: 'open', room: 25, sides: 'printed', power: { ups: {} }, market: 'NL', items: [], nextId: 1, example: true, done: {} });

// a realistic build: settings off the defaults and parts with every kind of extra field
const state = Object.assign(defaults(), { h: 7, label: 'Homelab ✓', sides: 'acrylic', bottom: 'acrylic', top: 'mw1875867', topDir: 'exhaust', extras: ['mw3212396'], market: 'DE', example: false,
  items: [{ id: 4, key: 'ucgmax1', pos2: 0 }, { id: 7, key: 'sbc7', pos2: 2, fill: 3, names: ['k3s-1', '', 'nas'], label: 'Cluster', color: '#E2E3DF' },
    { id: 9, key: 'fan40', pos2: 12, side: 'back', dir: 'exhaust' }, { id: 11, key: 'gen', pos2: null, name: 'Fan panel', params: { type: 'fan', u: 1, size: 40, fans: 5 } }] });
const layout = C.compact(state, defaults(), KEYS);

// only what differs from the defaults is stored; ids are left out and come back in order
assert.deepEqual(Object.keys(layout[0]).sort(), ['bottom', 'extras', 'h', 'label', 'market', 'sides', 'top', 'topDir']);
assert.deepEqual(layout[1][0], ['ucgmax1', 0]);

// share link: base64 survives non-ASCII text and decodes to the same layout
const b64 = C.toB64(layout);
assert.match(b64, /^[A-Za-z0-9_-]+$/, 'url-safe, no padding');
const back = C.fromB64(b64);
assert.deepEqual(back, layout);
const s2 = C.expand(back[0], back[1], defaults(), KEYS);
assert.equal(s2.h, 7); assert.equal(s2.label, 'Homelab ✓'); assert.equal(s2.bottom, 'acrylic'); assert.equal(s2.example, false);
assert.deepEqual(s2.items.map(i => [i.id, i.key, i.pos2]), [[1, 'ucgmax1', 0], [2, 'sbc7', 2], [3, 'fan40', 12], [4, 'gen', null]]);
assert.deepEqual(s2.items[1].names, ['k3s-1', '', 'nas']); assert.equal(s2.items[1].fill, 3);
assert.equal(s2.items[2].side, 'back'); assert.equal(s2.items[3].params.type, 'fan');
assert.equal(s2.nextId, 5);

// rack file: one part per line, the same layout back, a newer version is flagged
const text = C.fileText(layout);
assert.equal(text.split('\n').filter(l => l.startsWith('    [')).length, 4);
const f = C.readFile(text, defaults(), KEYS);
assert.deepEqual(f.state.items, s2.items); assert.equal(f.newer, false);
assert.equal(C.readFile(text.replace('"version": 1', '"version": 2'), defaults(), KEYS).newer, true);
assert.ok(C.readFile('﻿' + text, defaults(), KEYS), 'a byte order mark is fine');

// bad input is refused, not half-loaded
assert.equal(C.fromB64('%%%'), undefined);
assert.equal(C.readFile('not json', defaults(), KEYS), null);
assert.equal(C.readFile(text.replace('"mini-rack-planner"', '"other"'), defaults(), KEYS), null);
assert.equal(C.expand({ h: 11 }, [], defaults(), KEYS), null, 'no 11U rack');
assert.equal(C.expand({ h: 'x' }, [], defaults(), KEYS), null);
const odd = C.expand({ h: 5, notASetting: 1 }, [['vent1'], 'junk'], defaults(), KEYS);
assert.equal(odd.notASetting, undefined, 'unknown settings are dropped');
assert.deepEqual(odd.items.map(i => [i.key, i.pos2]), [['vent1', null], [null, null]], 'odd parts come back for sanitize() to drop');

console.log('Codec checks passed: share links, rack files, defaults, non-ASCII text, bad input.');
