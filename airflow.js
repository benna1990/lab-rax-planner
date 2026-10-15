/* Lab Rax Planner — airflow and air temperature in the rack, by height. MIT licensed.
   An estimate, not CFD. The rack is cut into ½U layers, each a well-mixed air zone. app.js describes the rack
   (heat per layer, openings, fans, wall losses); solve() finds the flows and the air temperature in every layer.

   Pressure    Inside minus outside at height z: Δp(z) = P + g·∫₀ᶻ (ρ_room − ρ_rack) dz'. Warm air is lighter, so Δp
               grows with height (stack effect): low openings take air in, high ones let it out. P is set so that as
               much air leaves as comes in.
   Openings    Orifice flow, m = Cd·A·√(2·ρ·|Δp|), Cd = 0.6. Every face also leaks a little through the panel seams.
   Fans        A straight fan curve from the rated free-air flow V₀ and maximum static pressure p₀:
               V = V₀·k·(1 − Δp_against / p₀), with k = 0.85 for the printed grille. Past p₀ air flows back through it.
   Heat        Each layer: the heat of the parts in it, the air coming in (from outside or a neighbour layer), the air going
               out, the walls (U ≈ 4 W/m²K through thin plastic) and mixing with the layer above. Warm air below cool air
               turns over (strong mixing); warm air above cool air stays put (weak mixing).
   The temperature field and the stack pressure depend on each other, so the two are solved in turn until they settle. */
(function () {
'use strict';

const K = {
  cp: 1005,          // J/(kg·K), air
  g: 9.81,
  cd: 0.6,           // discharge coefficient of a sharp-edged opening or a perforated plate
  grille: 0.85,      // share of a fan's rated flow left after a printed grille or finger guard
  uWall: 4,          // W/(m²·K) through a 2–3 mm printed or acrylic panel, still air on both sides
  mixUp: 4,          // W/K between two layers when the lower one is warmer (the air turns over)
  mixStable: 0.4,    // W/K when the upper one is warmer (stratified, mostly conduction)
  leak: 1.5e-4,      // m² of seams per ½U layer (panel gaps, side panels), all faces together
  leakTB: 2e-4,      // m² of seams in the top and in the bottom panel
  cfm: 0.000471947   // m³/s per CFM
};
const rhoAt = T => 353.0 / T; // kg/m³ of air at T kelvin (sea level)

/* m: { n, dz, room (°C), heat[n] (W, top layer first), ua[n] (W/K, walls of each layer, top and bottom panel included),
        openings: [{ id, layer | at: 'top' | 'bottom', area (m²), cd? }],
        fans: [{ id, cfm, pa, dir: 1 in / −1 out, layers: [{ layer | at, share }] }] }
   Layers count from the top, like the planner's slots. */
function solve(m) {
  const n = m.n, dz = m.dz, To = m.room + 273.15, H = n * dz, rhoO = rhoAt(To);
  const Q = m.heat.reduce((a, b) => a + b, 0);
  const lay = o => o.at === 'top' ? 0 : o.at === 'bottom' ? n - 1 : o.layer;
  const zOf = o => o.at === 'top' ? H : o.at === 'bottom' ? 0 : (n - o.layer - .5) * dz;
  const ops = m.openings.filter(o => o.area > 0).map(o => ({ id: o.id, L: lay(o), z: zOf(o), ca: (o.cd || K.cd) * o.area, area: o.area, at: o.at || 'layer' }));
  const fans = m.fans.filter(f => f.cfm > 0).map(f => ({ id: f.id, dir: f.dir, v0: f.cfm * K.cfm * K.grille, p0: f.pa, area: Math.PI * Math.pow((f.mm || 80) / 2000, 2),
    parts: f.layers.map(p => ({ L: lay(p), z: zOf(p), share: p.share })) }));

  let dT = new Array(n).fill(0), P = 0, flows = null;
  // inside minus outside pressure at height z, for the temperatures in dT (layers top first)
  const stack = () => { // cumulative ∫(ρo − ρi)dz from the bottom, at each layer's lower boundary
    const c = new Array(n + 1).fill(0);
    for (let b = 0; b < n; b++) { const i = n - 1 - b; c[b + 1] = c[b] + (rhoO - rhoAt(To + dT[i])) * dz; }
    return z => { if (z >= H) return K.g * c[n]; const b = Math.min(n - 1, Math.floor(z / dz)), i = n - 1 - b; return K.g * (c[b] + (rhoO - rhoAt(To + dT[i])) * (z - b * dz)); };
  };
  // mass flow into the rack (kg/s) through an opening or a fan at pressure difference d (inside − outside)
  const orifice = (ca, d, rhoIn) => d > 0 ? -ca * Math.sqrt(2 * rhoIn * d) : ca * Math.sqrt(2 * rhoO * -d);
  const fanFlow = (f, d, rhoIn) => {
    const against = f.dir > 0 ? d : -d, x = against / f.p0; // pressure the fan pushes against, as a share of its maximum
    if (x <= 1) { const v = f.v0 * (1 - x); return f.dir > 0 ? v * rhoO : -v * rhoIn; }
    return orifice(K.cd * f.area, f.dir > 0 ? d - f.p0 : d + f.p0, rhoIn); // overpowered: air leaks back through the fan
  };
  function balance() { // find P so that inflow = outflow; returns per-item mass flows (kg/s, + into the rack)
    const s = stack(), rhoL = dT.map(t => rhoAt(To + t));
    const net = p => {
      let sum = 0;
      for (const o of ops) sum += orifice(o.ca, p + s(o.z), rhoL[o.L]);
      for (const f of fans) for (const q of f.parts) sum += q.share * fanFlow(f, p + s(q.z), rhoL[q.L]);
      return sum;
    };
    let lo = -2000, hi = 2000; // net() falls as P rises
    for (let k = 0; k < 90; k++) { const mid = (lo + hi) / 2; if (net(mid) > 0) lo = mid; else hi = mid; }
    P = (lo + hi) / 2;
    return {
      ops: ops.map(o => orifice(o.ca, P + s(o.z), rhoL[o.L])),
      fans: fans.map(f => f.parts.map(q => q.share * fanFlow(f, P + s(q.z), rhoL[q.L]))),
      dp: z => P + s(z)
    };
  }
  function temperatures(fl) {
    // exchange with outside per layer, then the vertical flow through each boundary (bottom up)
    const inn = new Array(n).fill(0), out = new Array(n).fill(0);
    ops.forEach((o, k) => { const v = fl.ops[k]; if (v > 0) inn[o.L] += v; else out[o.L] -= v; });
    fans.forEach((f, k) => f.parts.forEach((q, j) => { const v = fl.fans[k][j]; if (v > 0) inn[q.L] += v; else out[q.L] -= v; }));
    const up = new Array(n).fill(0); // up[i]: mass flow from layer i into layer i−1 (the one above); negative is downward
    let F = 0;
    for (let i = n - 1; i >= 1; i--) { F += inn[i] - out[i]; up[i] = F; }
    const t = dT.slice();
    const mix = i => { const d = t[i] - t[i - 1]; return K.mixStable + (K.mixUp - K.mixStable) / (1 + Math.exp(-d / .3)); }; // i below i−1
    for (let sweep = 0; sweep < 60; sweep++) {
      let change = 0;
      const one = i => {
        const fromBelow = i < n - 1 ? Math.max(up[i + 1], 0) : 0, fromAbove = i > 0 ? Math.max(-up[i], 0) : 0;
        const toAbove = i > 0 ? Math.max(up[i], 0) : 0, toBelow = i < n - 1 ? Math.max(-up[i + 1], 0) : 0;
        const gB = i < n - 1 ? mix(i + 1) : 0, gA = i > 0 ? mix(i) : 0;
        const num = K.cp * (fromBelow * (i < n - 1 ? t[i + 1] : 0) + fromAbove * (i > 0 ? t[i - 1] : 0)) + m.heat[i] + gB * (i < n - 1 ? t[i + 1] : 0) + gA * (i > 0 ? t[i - 1] : 0);
        const den = K.cp * (out[i] + toAbove + toBelow) + m.ua[i] + gB + gA;
        const v = den > 0 ? num / den : 0; change = Math.max(change, Math.abs(v - t[i])); t[i] = v;
      };
      for (let i = n - 1; i >= 0; i--) one(i);
      for (let i = 0; i < n; i++) one(i);
      if (change < 1e-4) break;
    }
    return { t, inn, out, up };
  }

  let th = null, it = 0;
  for (; it < 150; it++) {
    flows = balance();
    th = temperatures(flows);
    let d = 0; for (let i = 0; i < n; i++) { const v = dT[i] + .5 * (th.t[i] - dT[i]); d = Math.max(d, Math.abs(v - dT[i])); dT[i] = v; }
    if (d < .005 && it > 2) break;
  }
  flows = balance(); th = temperatures(flows); dT = th.t;

  const vol = mass => mass / rhoO * 3600; // m³/h, at room air density
  let inflow = 0, outE = 0, outM = 0;
  const opRes = ops.map((o, k) => { const v = flows.ops[k]; if (v > 0) inflow += v; else { outE -= v * dT[o.L]; outM -= v; } return { id: o.id, at: o.at, layer: o.L, area: o.area, flow: vol(v) }; });
  const fanRes = fans.map((f, k) => { const v = flows.fans[k].reduce((a, b) => a + b, 0); if (v > 0) inflow += v; else { f.parts.forEach((q, j) => { const w = -flows.fans[k][j]; outE += w * dT[q.L]; }); outM -= v; } return { id: f.id, flow: vol(v), rated: f.cfm * K.cfm * 3600 }; });
  const toAir = K.cp * outE, toWalls = m.ua.reduce((a, u, i) => a + u * dT[i], 0);
  // neutral plane: the height where inside and outside pressure are equal, if it lies inside the rack
  let neutral = null; const d0 = flows.dp(0), dH = flows.dp(H);
  if (d0 < 0 && dH > 0) { let lo = 0, hi = H; for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (flows.dp(mid) < 0) lo = mid; else hi = mid; } neutral = (lo + hi) / 2; }
  return {
    room: m.room, Q, dT, temp: dT.map(t => m.room + t), maxT: m.room + Math.max(0, ...dT), meanT: m.room + dT.reduce((a, b) => a + b, 0) / n,
    exhaustT: outM > 0 ? m.room + outE / outM : m.room, flow: vol(inflow), openings: opRes, fans: fanRes,
    toAir, toWalls, P, neutral, H, iterations: it
  };
}

window.LRAir = { K, solve };
})();
