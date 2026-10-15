import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context = { window: {} }; vm.runInNewContext(readFileSync(new URL('../power.js', import.meta.url), 'utf8'), context);
const P = context.window.LRPower;
const lite8 = { id: 's', name: 'USW-Lite-8-PoE', budget: 52, ports: 4, std: 'at' }, ap = n => ({ id: 'a' + n, name: 'U7 Pro', w: 21, typ: 13 });
const net = { need: 3, extern: 0, providers: [{ name: 'USW-Lite-8-PoE', ports: 8 }, { name: 'UCG-Max', ports: 4 }], keystones: 0 };

// a PoE switch with two access points: 42 of 52 W, 2 of 4 ports, tight (over 80 %)
const ok = P.compute({ draws: [{ name: 'switch', w: 5 }, { name: 'ap', w: 13 }, { name: 'ap', w: 13 }], sources: [lite8], pds: [ap(1), ap(2)], net });
assert.equal(ok.poe.load, 42); assert.equal(ok.poe.used, 2); assert.equal(ok.poe.unpowered.length, 0); assert.equal(ok.poe.tight.length, 1);
assert.equal(ok.draw, 31); assert(Math.abs(ok.loss - 2.6) < 1e-9); assert(Math.abs(ok.total - 33.6) < 1e-9);
assert.equal(ok.ports.offered, 12); assert.equal(ok.ports.linkPorts, 2); assert.equal(ok.ports.free, 7);
assert.equal(P.issues(ok).map(i => i.level).join(), 'tight');

// a third access point runs over the budget; a fifth device has no port
const over = P.compute({ draws: [], sources: [lite8], pds: [ap(1), ap(2), ap(3)], net });
assert.equal(over.poe.unpowered.length, 1); assert.equal(over.poe.unpowered[0].why, 'budget');
assert(P.issues(over).some(i => i.level === 'short' && /PoE\+ injector/.test(i.text) && /80 W/.test(i.text)));
const cams = Array.from({ length: 5 }, (_, n) => ({ id: 'c' + n, name: 'Camera', w: 7, typ: 7 }));
const full = P.compute({ sources: [lite8], pds: cams, net });
assert.equal(full.poe.unpowered.length, 1); assert.equal(full.poe.unpowered[0].why, 'ports');

// standards: PoE+ devices don't run on 802.3af ports; nothing at all gives 'none'
const af = P.compute({ sources: [{ id: 'u', name: 'US-8-60W', budget: 48, ports: 4, std: 'af' }], pds: [ap(1), { id: 'c', name: 'Camera', w: 7 }] });
assert.equal(af.poe.unpowered.length, 1); assert.equal(af.poe.unpowered[0].why, 'std'); assert.equal(af.poe.unpowered[0].need, 'at');
assert.equal(P.compute({ pds: [ap(1)] }).poe.unpowered[0].why, 'none');
assert.equal(P.need(12.95), 'af'); assert.equal(P.need(21), 'at'); assert.equal(P.need(40), 'bt');

// network ports: short when the devices outnumber the free ports; a modem's link costs one counted port
const tight = P.compute({ net: { need: 9, providers: [{ name: 'Flex Mini', ports: 5 }, { name: 'UCG-Ultra', ports: 4 }], keystones: 0 } });
assert.equal(tight.ports.short, 2); assert(P.issues(tight).some(i => /at least 4 ports/.test(i.text)));
assert.equal(P.compute({ net: { need: 0, providers: [{ name: 'FRITZ!Box', ports: 4, modem: true }, { name: 'UCG-Max', ports: 4 }] } }).ports.linkPorts, 1);

// UPS: a 600 VA unit at 50 W lasts about 40 minutes; 330 W is over its ≈ 360 W rating at 80 %
const u = P.ups({ size: 600, unit: 'VA' }, 50);
assert(u.minutes > 35 && u.minutes < 45, 'runtime ' + u.minutes); assert.equal(u.rating, 360); assert.equal(u.over, false);
assert(P.ups({ size: 600, unit: 'VA' }, 330).tight); assert(P.ups({ size: 600, unit: 'VA' }, 400).over);
assert.equal(P.ups({ size: 200, unit: 'Wh' }, 50).rating, null); assert.equal(P.ups({ size: 0 }, 50), null);
console.log('Power checks passed: PoE budget, ports and standards, network ports, UPS runtime.');
