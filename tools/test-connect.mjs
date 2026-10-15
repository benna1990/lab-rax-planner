// Checks connect.js, the Connect cards. Run: node tools/test-connect.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const win = {};
new Function('window', readFileSync(new URL('../connect.js', import.meta.url), 'utf8'))(win);
const C = win.LRConnect;
const ids = f => C.cards(f).map(c => c.id);

// an empty build has nothing to connect
assert.deepEqual(ids({}), []);

// cards appear only for what the build has
assert.deepEqual(ids({ devices: [{ name: 'UCG-Max', poe: null }] }), ['power']);
const full = C.cards({ devices: [{ name: 'UCG-Max', poe: null }, { name: 'U7 Pro', poe: 'USW-Lite-8-PoE' }], pi5: 4, boards: 4,
  fans: [{ name: 'Fan panel', qty: 5, mm: 40, volt: 5, amp: 0.1 }, { name: 'Top', qty: 1, mm: 120, volt: 5, amp: 0.2 }],
  poe: { budget: 52, load: 21.4, sources: ['USW-Lite-8-PoE'] }, logo: 'neopixel', ups: { size: 600, unit: 'VA' } });
assert.deepEqual(full.map(c => c.id), ['power', 'pi5', 'fans', 'poe', 'logo', 'ups']);

// numbers come from the build
const fans = full.find(c => c.id === 'fans');
assert.match(fans.lead, /^6 fans at 5 V, about 0\.7 A together/);
assert.match(full.find(c => c.id === 'pi5').lead, /^4 Pi 5 boards need 4 supplies of 5\.1 V, 5 A/);
assert.match(full.find(c => c.id === 'poe').lead, /52 W of PoE from USW-Lite-8-PoE and needs about 21\.4 W/);
assert.match(full.find(c => c.id === 'power').items[1], /U7 Pro: PoE from USW-Lite-8-PoE/);

assert.match(full.find(c => c.id === 'power').lead, /^1 device uses its own adapter; 1 runs on PoE\.$/);
assert.match(C.cards({ poe: { budget: 52, load: 0, sources: ['S'] } })[0].lead, /nothing in this build uses it yet/);

// facts carry sources; an undocumented light says so instead of guessing
assert.ok(full.filter(c => c.id !== 'power').every(c => c.sources.length && c.sources.every(([t, u]) => t && /^https:\/\//.test(u))));
const hex = C.cards({ logo: 'hexbar' })[0];
assert.equal(hex.id, 'logo'); assert.match(hex.lead, /No documented wiring/); assert.equal(hex.steps.length, 0);

// a fan without a listed current is said to be left out of the total
assert.match(C.cards({ fans: [{ name: 'A', qty: 2, mm: 80, volt: 5, amp: 0.1 }, { name: 'B', qty: 1, mm: 140, volt: 12 }] })[0].lead, /3 fans at 5 and 12 V, about 0\.2 A together for the ones with a listed current/);

// the general guides: every card, no build numbers
const g = C.guides();
assert.deepEqual(g.map(x => x.id), ['power', 'pi5', 'fans', 'poe', 'logo', 'ups']);
assert.ok(g.every(x => !/a device|a fan panel/.test(x.lead + x.items.join(' '))), 'no placeholder names');

console.log('Connect checks passed: cards only when needed, build numbers, sources, no guessed wiring.');
