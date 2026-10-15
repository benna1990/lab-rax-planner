/* Mini Rack Planner — power budget: what the rack draws, the PoE budget and ports, network ports and UPS runtime. MIT licensed.
   A planning estimate. app.js describes the rack (what draws power, which parts give PoE and which take it, the switch
   ports) and compute() adds it up.

   Draw     Each part's typical draw in a home lab: the same watts the cooling estimate uses (the catalog, the builder's own
            value, or a rule of thumb, marked ≈). A PoE switch's own draw leaves out what it sends over PoE; the devices on
            PoE count with their own draw, plus about 10 % lost in the switch's power supply.
   PoE      Each powered device takes one PoE port and up to its maximum draw from the spec sheet, so the budget also holds at
            full load. Devices are handed out biggest first, each to the source with the most budget left that has a free
            port of a high enough standard: PoE (802.3af) gives 15.4 W at the port and 12.95 W at the device, PoE+ (802.3at)
            30 and 25.5 W, PoE++ (802.3bt) 60 and 51 W.
   Ports    Every device with a network cable takes a switch port. Switches and routers offer their ports (a router without
            its WAN port); each extra one links to another and uses a port at both ends, a modem's link to the router one.
   UPS      A lead-acid battery of about 0.125 Wh per VA, an 85 % inverter plus 5 W for the UPS itself, and Peukert's law
            (k = 1.2) for the shorter runtime at a higher load: t = 20 h · (Wh / (20 h · P))^k. Its watt rating is about
            0.6 W per VA. */
(function () {
'use strict';

const STD = {
  af: { rank: 1, pse: 15.4, pd: 12.95, name: 'PoE', full: 'PoE (802.3af)' },
  at: { rank: 2, pse: 30, pd: 25.5, name: 'PoE+', full: 'PoE+ (802.3at)' },
  bt: { rank: 3, pse: 60, pd: 51, name: 'PoE++', full: 'PoE++ (802.3bt)' }
};
const K = { loss: .1, whPerVA: .125, wPerVA: .6, inverter: .85, idle: 5, peukert: 1.2, tight: .8, spare: 1.25 };
const need = w => w <= STD.af.pd ? 'af' : w <= STD.at.pd ? 'at' : 'bt';
const sum = (a, f) => a.reduce((n, x) => n + f(x), 0);
const W = w => (w < 10 && w % 1 ? w.toFixed(1) : Math.round(w)) + ' W';

// biggest device first, to the source with the most budget left that has a free port of a high enough standard
function allocate(sources, pds) {
  const src = sources.map(s => Object.assign({}, s, { std: STD[s.std] ? s.std : 'at', used: 0, n: 0, pds: [] })), unpowered = [];
  pds.slice().sort((a, b) => b.w - a.w).forEach(p => {
    const nd = need(p.w), fit = src.filter(s => STD[s.std].rank >= STD[nd].rank), free = fit.filter(s => s.n < s.ports);
    const s = free.filter(x => x.budget - x.used >= p.w - 1e-9).sort((x, y) => (y.budget - y.used) - (x.budget - x.used))[0];
    if (s) { s.used += p.w; s.n++; s.pds.push(p); }
    else unpowered.push(Object.assign({}, p, { need: nd, why: !src.length ? 'none' : !fit.length ? 'std' : !free.length ? 'ports' : 'budget' }));
  });
  return { sources: src, unpowered };
}

function ups(u, load) {
  if (!u || !(u.size > 0) || !(load > 0)) return null;
  const va = u.unit !== 'Wh', wh = va ? u.size * K.whPerVA : u.size, rating = va ? u.size * K.wPerVA : null;
  const p = load / K.inverter + K.idle, hours = 20 * Math.pow(wh / (20 * p), K.peukert);
  return { size: u.size, unit: va ? 'VA' : 'Wh', wh, rating, minutes: Math.min(24 * 60, hours * 60), over: rating != null && load > rating, tight: rating != null && load > rating * K.tight };
}

/* d: { draws: [{ name, w, est }]                    typical draw of everything, the devices on PoE included (W)
        sources: [{ id, name, budget, ports, std }]  PoE outputs: switches, gateways, injectors
        pds: [{ id, name, w, typ }]                  devices on PoE, one per port: w = maximum draw, typ = typical (W)
        net: { need, extern, providers: [{ name, ports, modem }], keystones }
        ups: { size, unit: 'VA' | 'Wh' } } */
function compute(d) {
  const draws = d.draws || [], pds = d.pds || [], net = d.net || { need: 0, extern: 0, providers: [], keystones: 0 };
  const loss = sum(pds, p => p.typ || 0) * K.loss, draw = sum(draws, x => x.w), total = draw + loss;
  const al = allocate(d.sources || [], pds), load = sum(pds, p => p.w);
  const poe = { load, budget: sum(al.sources, s => s.budget), ports: sum(al.sources, s => s.ports), used: sum(al.sources, s => s.n),
    sources: al.sources, unpowered: al.unpowered, tight: al.sources.filter(s => s.used > s.budget * K.tight) };
  const prov = net.providers || [], offered = sum(prov, p => p.ports), links = Math.max(0, prov.length - 1);
  const linkPorts = links ? 2 * links - (prov.some(p => p.modem) ? 1 : 0) : 0, free = offered - linkPorts - net.need;
  const ports = { need: net.need, extern: net.extern || 0, offered, providers: prov, links, linkPorts, free, short: Math.max(0, -free), keystones: net.keystones || 0,
    ksShort: Math.max(0, (net.keystones || 0) - Math.max(0, free) - (net.extern || 0)) };
  return { draw, loss, total, est: draws.some(x => x.est && x.w > 0) || loss > 0, draws, poe, ports, ups: ups(d.ups, total) };
}

// what needs attention, worst first: [{ level: 'short' | 'tight' | 'info', text }]
function issues(r) {
  const out = [], P = r.poe, names = list => { const m = new Map(); list.forEach(p => m.set(p.name, (m.get(p.name) || 0) + 1)); return [...m].map(([n, k]) => k > 1 ? n + ' ×' + k : n).join(', '); };
  const injector = list => { const bt = list.filter(p => p.need === 'bt').length, at = list.length - bt;
    return [at ? at + (at > 1 ? ' PoE+ injectors' : ' PoE+ injector') + ' (30 W)' : '', bt ? bt + (bt > 1 ? ' PoE++ injectors' : ' PoE++ injector') + ' (60 W)' : ''].filter(Boolean).join(' and '); };
  const bigger = () => { const w = Math.ceil(P.load * K.spare / 10) * 10, n = P.used + P.unpowered.length; return 'a PoE switch with at least ' + n + (n > 1 ? ' PoE ports' : ' PoE port') + ' and ' + w + ' W'; };
  const by = why => P.unpowered.filter(p => p.why === why);
  if (by('none').length) out.push({ level: 'short', text: names(by('none')) + ' run' + (by('none').length > 1 ? '' : 's') + ' on PoE, but nothing in the rack gives PoE. Add ' + injector(by('none')) + ', or ' + bigger() + '.' });
  if (by('std').length) out.push({ level: 'short', text: names(by('std')) + ' need' + (by('std').length > 1 ? '' : 's') + ' ' + STD[by('std')[0].need].full + ', more than the PoE ports here give. Add ' + injector(by('std')) + ', or a switch with ' + STD[by('std')[0].need].name + ' ports.' });
  if (by('ports').length) out.push({ level: 'short', text: 'No free PoE port for ' + names(by('ports')) + ': all ' + P.ports + ' PoE ports are taken. Add ' + injector(by('ports')) + ', or ' + bigger() + '.' });
  if (by('budget').length) out.push({ level: 'short', text: 'The PoE budget runs short: ' + W(P.load) + ' needed at full load, ' + W(P.budget) + ' available, so ' + names(by('budget')) + ' won’t get power. Add ' + injector(by('budget')) + ', or ' + bigger() + '.' });
  P.tight.forEach(s => out.push({ level: 'tight', text: s.name + ' gives ' + W(s.used) + ' of its ' + W(s.budget) + ' PoE (' + Math.round(s.used / s.budget * 100) + ' %) at full load. Keep about 20 % spare for start-up peaks.' }));
  const N = r.ports;
  if (N.need && !N.providers.length) out.push({ level: 'info', text: N.need + (N.need > 1 ? ' devices need' : ' device needs') + ' a network port, and there is no switch or router in the rack. Plan their cables to a switch elsewhere.' });
  else if (N.short) out.push({ level: 'short', text: N.need + (N.need > 1 ? ' devices need' : ' device needs') + ' a switch port, but only ' + Math.max(0, N.offered - N.linkPorts) + ' are free' + (N.linkPorts ? ' after linking the switches and router' : '') + '. Add a switch with at least ' + (N.short + 2) + ' ports (two of them link it in).' });
  if (N.ksShort && N.providers.length && !N.short) out.push({ level: 'info', text: 'Not every keystone jack can be patched to a switch port: ' + N.keystones + ' jacks, ' + Math.max(0, N.free) + ' free ports.' });
  if (r.ups && r.ups.over) out.push({ level: 'short', text: 'The UPS gives about ' + W(r.ups.rating) + ', less than the rack draws (≈ ' + W(r.total) + '). Take a bigger one.' });
  else if (r.ups && r.ups.tight) out.push({ level: 'tight', text: 'The rack uses more than 80 % of the UPS’s ≈ ' + W(r.ups.rating) + '. Start-up peaks can trip it; a bigger one is safer.' });
  return out;
}

window.LRPower = { STD, K, need, compute, issues, ups };
})();
