/* Lab Rax Planner — 3D view (three.js r128). MIT licensed.
   Units are millimetres. x = width, y = height, z = depth (front face at z = 0, rack extends to −z).
   FRAME holds the Lab Rax frame dimensions used for the model; adjust them here when they are re-measured. */
(function () {
'use strict';
const P = window.LRParts;

/* Sources (see README): clear width 222 and hole spacing 236.525 from the Lab Rax article; total depth ≈240 mm from the depth-spacer
   remix; outer width ≈280 mm from the LowProfile remix. The shape follows the photos in the Lab Rax article: top and bottom rings of
   horizontal and edge pieces with 45° bevels and mitred corners, the hex grille and logo on the front bevel, arched handles on the side
   edges, posts with a column of inserts (three per U) and tinted acrylic side panels. Sections marked "estimate" are read from photos
   until they are measured from the original files. */
const FRAME = {
  clear: 222,          // clear width between the posts (10" standard)
  outer: 280,          // outer width = 222 + 2·26 posts + 2·3 side panels
  depth: 240,          // outer depth front to back
  ring: 32,            // width of the top and bottom rings seen from above (estimate)
  top: 36,             // top ring height (estimate)
  topBevel: 20,        // 45° bevel along the top ring; the front one carries the hex grille and logo (estimate)
  bottom: 14,          // bottom ring height (estimate)
  bottomBevel: 8,      // 45° bevel along the bottom ring (estimate)
  post: 26,            // post width seen from the front; the holes sit 7.26 mm from its inner edge
  postDepth: 20,       // post depth (estimate)
  side: 3,             // side, top and bottom panels: 3 mm acrylic, plywood or print
  handleLen: 0.53,     // handle length as a share of the depth (≈127 mm)
  handleH: 34,         // handle height above the top (estimate)
  handleW: 12,         // handle thickness; it sits on the flat strip of the top ring (estimate)
  foot: 8              // foot height (estimate)
};
const HOLE_X = 236.525 / 2, HOLE_Y = [6.35, 22.225, 38.1];

let T = null, R = null;            // three namespace, main view state
const previews = new Map();         // container -> preview state
const fileModels = new Map();       // item id -> { mesh, rot:[x,y,z] }
const genCache = new Map();         // params json -> geometries

function themeColors() {
  const cs = getComputedStyle(document.documentElement);
  return { stage: cs.getPropertyValue('--stage').trim() || '#FFFFFF', line: cs.getPropertyValue('--line').trim() || '#E3E5E2', ink: cs.getPropertyValue('--ink').trim() || '#16181B' };
}
// colours are picked as sRGB hex; three.js r128 expects linear colours when the output is sRGB
const lin = c => new T.Color(c).convertSRGBToLinear();
function mat(color, opts) { return new T.MeshStandardMaterial(Object.assign({ color: lin(color), roughness: .82, metalness: .02 }, opts || {})); }
function boxMesh(w, h, d, x, y, z, m) { const g = new T.BoxGeometry(w, h, d); const me = new T.Mesh(g, m); me.position.set(x + w / 2, y + h / 2, z - d / 2); return me; }

/* A closed rectangular ring with one cross-section all the way round and 45° mitred corners, like the printed horizontal and edge pieces.
   profile: [[out, up], …] in mm; out is measured outward from the hw × hd rectangle, up from the ring's bottom. */
function ringGeom(profile, hw, hd) {
  const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]], pos = [];
  const at = (c, p) => [c[0] * (hw + p[0]), p[1], c[1] * (hd + p[0])];
  for (let i = 0; i < profile.length; i++) {
    const a = profile[i], b = profile[(i + 1) % profile.length];
    for (let k = 0; k < 4; k++) {
      const c0 = corners[k], c1 = corners[(k + 1) % 4], q = [at(c0, a), at(c1, a), at(c1, b), at(c0, b)];
      pos.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]);
    }
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}

/* ---------- textures ---------- */
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.anisotropy = 4; if (T.sRGBEncoding) t.encoding = T.sRGBEncoding; return t;
}
function grilleTex(frameColor, accent, label) {
  return canvasTex(1024, 112, (ctx, w, h) => {
    ctx.fillStyle = frameColor; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#070809';
    const R0 = 12, W0 = Math.sqrt(3) * R0;
    for (let row = 0, y = 15; y < h - 8; row++, y += R0 * 1.5)
      for (let x = 22 + (row % 2) * W0 / 2; x < w - 16; x += W0) { ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k + Math.PI / 6; ctx.lineTo(x + R0 * .8 * Math.cos(a), y + R0 * .8 * Math.sin(a)); } ctx.fill(); }
    if (!label) return;
    const fs = Math.min(74, 860 / Math.max(4, label.length) / .74);
    ctx.font = fs + 'px Audiowide, "Plus Jakarta Sans", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 7; ctx.strokeStyle = frameColor; ctx.strokeText(label, w / 2, h / 2 + 2); ctx.fillStyle = accent; ctx.fillText(label, w / 2, h / 2 + 2);
  });
}
function faceTex(item, accent) {
  const hpx = Math.max(32, Math.round(item.h2 * 48));
  return canvasTex(1000, hpx, (ctx, w, h) => {
    ctx.fillStyle = item.color; ctx.fillRect(0, 0, w, h);
    const lightFace = (parseInt(item.color.slice(1), 16) >> 16) > 140;
    const hole = lightFace ? 'rgba(0,0,0,.32)' : 'rgba(0,0,0,.55)';
    // screws
    for (const x of [28, w - 28]) { const g = ctx.createRadialGradient(x - 4, h / 2 - 4, 1, x, h / 2, 13); g.addColorStop(0, '#F5F6F7'); g.addColorStop(1, '#6E747A'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, h / 2, 11, 0, Math.PI * 2); ctx.fill(); }
    // no text on the face: the name shows in the tooltip, the face shows what is mounted, centred between the screws
    const cx = w / 2, row = (n, step, draw) => { for (let i = 0; i < n; i++) draw(cx + (i - (n - 1) / 2) * step); };
    ctx.fillStyle = hole;
    const f = item.face;
    if (f === 'vent') for (let x = 70; x < w - 76; x += 22) ctx.fillRect(x, h * .25, 10, h * .5);
    else if (f === 'fan') row(5, 150, x => { ctx.beginPath(); ctx.arc(x, h / 2, Math.min(h * .4, 66), 0, Math.PI * 2); ctx.fill(); });
    else if (f === 'ks') row(12, 64, x => ctx.fillRect(x - 21, h * .22, 42, h * .56));
    else if (f === 'sbc') row(7, 96, x => ctx.fillRect(x - 7, h * .12, 14, h * .76));
    else if (f === 'drv2' || f === 'drv4') { const n = f === 'drv2' ? 2 : 4, bw = 760 / n; row(n, bw, x => ctx.fillRect(x - bw / 2 + 8, h * .2, bw - 16, h * .6)); }
    else if (f === 'switch' || f === 'shelf' || f === 'cut') {
      const x0 = 150, x1 = w - 150; ctx.fillRect(x0, h * .16, x1 - x0, h * .68);
      if (f === 'switch') { ctx.fillStyle = item.color; row(8, 48, x => ctx.fillRect(x - 14, h * .32, 28, h * .36)); }
      ctx.fillStyle = '#4ADE80'; ctx.beginPath(); ctx.arc(x1 - 22, h / 2, 6, 0, 7); ctx.fill();
    }
  });
}

/* ---------- rack model ---------- */
async function genGeoms(params) {
  const k = JSON.stringify(params);
  if (!genCache.has(k)) genCache.set(k, (await P.build(params)).geoms);
  return genCache.get(k);
}
function handleMesh(m) {
  // an arch along the side edge: two sloping legs and a grip, open underneath
  const L = FRAME.depth * FRAME.handleLen, H = FRAME.handleH, leg = 14, bar = 10, sl = .35, s = new T.Shape();
  s.moveTo(0, 0); s.lineTo(leg, 0); s.lineTo(leg + (H - bar) * sl, H - bar); s.lineTo(L - leg - (H - bar) * sl, H - bar); s.lineTo(L - leg, 0);
  s.lineTo(L, 0); s.lineTo(L - H * sl, H); s.lineTo(H * sl, H); s.lineTo(0, 0);
  const g = new T.ExtrudeGeometry(s, { depth: FRAME.handleW - 2, bevelEnabled: true, bevelThickness: 1, bevelSize: 1, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 1, 1); g.rotateY(Math.PI / 2);
  return new T.Mesh(g, m);
}
function postHoles(g, snap, y0, inner) {
  // three holes per U in every post; the heat-set version shows the brass inserts
  const n = snap.h * 3 * 4, holes = new T.InstancedMesh(new T.CircleGeometry(3.3, 20), new T.MeshBasicMaterial({ color: 0x060708 }), n);
  const brass = snap.version === 'bolted' ? null : new T.InstancedMesh(new T.RingGeometry(3.3, 4.3, 20), mat('#C9A55A', { metalness: .55, roughness: .38 }), n);
  const m = new T.Matrix4(), one = new T.Vector3(1, 1, 1), front = new T.Quaternion(), back = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), Math.PI);
  let k = 0;
  for (const sx of [-1, 1]) for (const isFront of [true, false]) for (let u = 0; u < snap.h; u++) for (const off of HOLE_Y) {
    m.compose(new T.Vector3(sx * HOLE_X, y0 + inner - u * P.U - off, isFront ? .15 : -FRAME.depth - .15), isFront ? front : back, one);
    holes.setMatrixAt(k, m); if (brass) brass.setMatrixAt(k, m); k++;
  }
  g.add(holes); if (brass) g.add(brass);
}
async function buildRack(snap) {
  const g = new T.Group(), F = FRAME, inner = snap.h * P.U, hw = F.outer / 2, hd = F.depth / 2, t = F.ring;
  const frameM = mat(snap.frame, { side: T.DoubleSide }), postM = mat(snap.frame);
  const y0 = F.foot + F.bottom, yTop = y0 + inner, topY = yTop + F.top;
  // bottom and top rings: front and back horizontal pieces plus the side edge pieces, bevelled and mitred at the corners
  const bottom = new T.Mesh(ringGeom([[0, F.bottom], [0, F.bottomBevel], [-F.bottomBevel, 0], [-t, 0], [-t, F.bottom]], hw, hd), frameM);
  bottom.position.set(0, F.foot, -hd); g.add(bottom);
  const top = new T.Mesh(ringGeom([[0, 0], [0, F.top - F.topBevel], [-F.topBevel, F.top], [-t, F.top], [-t, 0]], hw, hd), frameM);
  top.position.set(0, yTop, -hd); g.add(top);
  // hex grille on the front and back bevels, with the rack's name at the front
  for (const isFront of [true, false]) {
    const c = F.topBevel, n = .25 / Math.SQRT2;
    const grille = new T.Mesh(new T.PlaneGeometry(F.outer - 2 * c - 10, c * Math.SQRT2 - 3), new T.MeshStandardMaterial({ map: grilleTex(snap.frame, snap.accent, isFront ? snap.label : ''), roughness: .8 }));
    grille.position.set(0, topY - c / 2 + n, isFront ? -c / 2 + n : -F.depth + c / 2 - n);
    grille.rotation.set(isFront ? -Math.PI / 4 : Math.PI / 4, isFront ? 0 : Math.PI, 0);
    g.add(grille);
  }
  // posts with their holes
  for (const sx of [-1, 1]) for (const z of [0, -(F.depth - F.postDepth)]) g.add(boxMesh(F.post, inner, F.postDepth, sx < 0 ? -F.clear / 2 - F.post : F.clear / 2, y0, z, postM));
  postHoles(g, snap, y0, inner);
  // top and bottom panels sit in a rebate inside the rings
  const pw = F.outer - 2 * t + 6, pd = F.depth - 2 * t + 6, pz = -(F.depth - pd) / 2;
  if (!snap.top) g.add(boxMesh(pw, F.side, pd, -pw / 2, topY - 6, pz, mat(snap.accent)));
  else {
    const disc = new T.Mesh(new T.CylinderGeometry(103, 103, 46, 48), mat('#F2F3F4', { roughness: .5 }));
    disc.rotation.x = -Math.PI / 4; disc.position.set(0, topY + 70, -hd + 10); g.add(disc);
    for (const sx of [-1, 1]) g.add(boxMesh(14, 63, 14, sx * 50 - 7, topY - 3, -hd + 7, mat(snap.frame)));
  }
  g.add(boxMesh(pw, F.side, pd, -pw / 2, y0 - 4, pz, mat(snap.frame)));
  // side panels: tinted acrylic you can see through, or printed panels in the frame colour
  const sideM = R && R.sides ? mat(snap.frame) : mat('#1C2127', { transparent: true, opacity: .4, roughness: .12, metalness: .1, depthWrite: false });
  for (const sx of [-1, 1]) g.add(boxMesh(F.side, inner + 8, F.depth - 2 * F.postDepth + 8, sx < 0 ? -hw : hw - F.side, y0 - 4, -F.postDepth + 4, sideM));
  // handles on the flat strip of the side edges, feet under the bottom edges
  const hx = hw - (t + F.topBevel) / 2 - F.handleW / 2;
  for (const sx of [-1, 1]) { const hm = handleMesh(frameM); hm.position.set(sx < 0 ? -hx - F.handleW : hx, topY, -F.depth * (1 - F.handleLen) / 2); g.add(hm); }
  for (const sx of [-1, 1]) for (const z of [-8, -(F.depth - 30)]) g.add(boxMesh(28, F.foot, 22, sx < 0 ? -hw + 4 : hw - 32, 0, z, mat('#1A1B1D')));
  // equipment, screwed to the front of the posts
  for (const it of snap.items) {
    const yBottom = y0 + inner - (it.pos2 + it.h2) * P.U / 2 + P.CLEAR / 2, ph = it.h2 * P.U / 2 - P.CLEAR;
    const holder = new T.Group(); holder.userData.id = it.id;
    if (it.gen) {
      const geoms = await genGeoms(it.gen), m = mat(it.color);
      geoms.forEach(gg => { const me = new T.Mesh(gg, m); me.userData.cached = true; holder.add(me); });
    } else {
      const face = new T.Mesh(new T.BoxGeometry(P.PANEL_W, ph, 3), [mat(it.color), mat(it.color), mat(it.color), mat(it.color), new T.MeshStandardMaterial({ map: faceTex(it, snap.accent), roughness: .8 }), mat(it.color)]);
      face.position.set(0, ph / 2, -1.5); holder.add(face);
      const dep = Math.min(it.depth || (it.face === 'vent' || it.face === 'fan' || it.face === 'ks' || it.face === 'blank' ? 0 : 120), F.depth - 25);
      if (dep > 0) holder.add(boxMesh(Math.min(200, F.clear - 14), Math.max(4, ph - 8), dep, -Math.min(100, F.clear / 2 - 7), 4, -3, mat('#3A3D42', { roughness: .6 })));
    }
    holder.position.set(0, yBottom, 3);
    if (it.sel) { const sel = new T.BoxHelper(holder, 0x3CC27A); holder.userData.helper = sel; }
    const fm = fileModels.get(it.id);
    if (fm) { const c = fm.mesh.clone(); c.traverse(o => { o.userData.cached = true; }); placeFileMesh(c, fm, ph); holder.add(c); holder.children.forEach(ch => { if (ch !== c && !ch.userData.keep) ch.visible = false; }); }
    g.add(holder);
    if (holder.userData.helper) g.add(holder.userData.helper);
  }
  return g;
}

/* ---------- loaded model files ---------- */
function placeFileMesh(mesh, fm) {
  mesh.rotation.set(fm.rot[0] * Math.PI / 2, fm.rot[1] * Math.PI / 2, fm.rot[2] * Math.PI / 2);
  mesh.updateMatrixWorld(true);
  const b = new T.Box3().setFromObject(mesh), c = new T.Vector3(); b.getCenter(c);
  mesh.position.set(-c.x, -b.min.y, -b.max.z);
}
async function loadFiles(files) {
  const snap = window.LRApp.snapshot(), target = snap.items.find(i => i.sel);
  if (!target) { window.LRApp.say('Select a part in the rack first, then load its STL or 3MF file to see it in place.'); return; }
  const f = files[0], ext = f.name.split('.').pop().toLowerCase();
  try {
    let obj;
    if (ext === 'stl') {
      if (!T.STLLoader) await P.loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js');
      const geo = new T.STLLoader().parse(await f.arrayBuffer()); geo.computeVertexNormals();
      obj = new T.Mesh(geo, mat(snap.panel));
    } else if (ext === '3mf') {
      if (!window.fflate) await P.loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/fflate.min.js');
      if (!T.ThreeMFLoader) await P.loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/3MFLoader.js');
      obj = new T.ThreeMFLoader().parse(await f.arrayBuffer());
      obj.traverse(o => { if (o.isMesh) o.material = mat(snap.panel); });
    } else { window.LRApp.say('Load an .stl or .3mf file.'); return; }
    obj.userData.keep = true;
    fileModels.set(target.id, { mesh: obj, rot: [1, 0, 0], name: f.name });
    window.LRApp.say(f.name + ' shown on ' + target.name + '. It stays in your browser only. Use Rotate if it faces the wrong way.');
    await rebuild(snap);
  } catch (e) { window.LRApp.say('Could not read ' + f.name + '. Try exporting it as STL.'); }
}

/* ---------- main view ---------- */
function makeRenderer(container) {
  const r = new T.WebGLRenderer({ antialias: true, alpha: true });
  r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.setClearColor(0x000000, 0);
  if (T.sRGBEncoding) r.outputEncoding = T.sRGBEncoding;
  container.appendChild(r.domElement); return r;
}
function lights(scene) {
  scene.add(new T.HemisphereLight(0xffffff, 0x444444, .75));
  const d1 = new T.DirectionalLight(0xffffff, .7); d1.position.set(300, 500, 400); scene.add(d1);
  const d2 = new T.DirectionalLight(0xffffff, .35); d2.position.set(-400, 200, -200); scene.add(d2);
}
function fit() {
  // frame the whole rack from the front right, whatever the shape of the view
  if (!R || !R.rack) return;
  const box = new T.Box3().setFromObject(R.rack), c = new T.Vector3(), s = new T.Vector3(); box.getCenter(c); box.getSize(s);
  const v = Math.tan(R.camera.fov * Math.PI / 360), across = Math.max(s.x, s.z) * .62;
  const dist = Math.max(s.y / 2 / v, across / (v * R.camera.aspect)) * 1.3 + s.z / 2;
  R.camera.position.copy(c).addScaledVector(new T.Vector3(.5, .34, .8).normalize(), dist);
  R.controls.target.copy(c).add(new T.Vector3(0, -s.y * .06, 0)); R.controls.update(); // a little low, so the buttons don't cover the feet
}
async function mount(container, snap) {
  T = await P.loadThree();
  if (!R) {
    container.innerHTML = '';
    const renderer = makeRenderer(container), scene = new T.Scene(), camera = new T.PerspectiveCamera(32, 1, 5, 6000);
    lights(scene);
    const ground = new T.Mesh(new T.CircleGeometry(420, 64), new T.MeshBasicMaterial({ color: lin(themeColors().line), transparent: true, opacity: .55 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.5, -FRAME.depth / 2); scene.add(ground);
    const controls = new T.OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.minDistance = 200; controls.maxDistance = 2600;
    const ui = document.createElement('div'); ui.className = 'v3d-ui';
    ui.innerHTML = '<button type="button" class="btn small" data-act="v3d" data-v="reset">Reset view</button><button type="button" class="btn small" data-act="v3d" data-v="sides">Side panels</button>' +
      '<button type="button" class="btn small" data-act="v3d" data-v="rotate">Rotate model</button><label class="btn small" style="cursor:pointer">Load STL/3MF<input type="file" accept=".stl,.3mf" hidden id="v3d-file"></label>';
    container.appendChild(ui);
    ui.querySelector('#v3d-file').addEventListener('change', e => { if (e.target.files.length) loadFiles(e.target.files); e.target.value = ''; });
    R = { container, renderer, scene, camera, controls, ground, rack: null, running: false, sides: false, fitted: false, down: null };
    if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(container); else window.addEventListener('resize', resize);
    // a click selects a part; a drag that orbits the view does not. Hovering a part shows its name.
    renderer.domElement.addEventListener('pointerdown', e => { R.down = [e.clientX, e.clientY]; window.LRApp.tip(null); });
    renderer.domElement.addEventListener('click', e => { if (R.down && Math.hypot(e.clientX - R.down[0], e.clientY - R.down[1]) < 5) pick(e); });
    renderer.domElement.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || e.buttons) return;
      R.hover = e; if (R.hoverQueued) return; R.hoverQueued = true;
      requestAnimationFrame(() => { R.hoverQueued = false; if (R.hover) window.LRApp.tip(hitId(R.hover), R.hover.clientX, R.hover.clientY); });
    });
    renderer.domElement.addEventListener('pointerleave', () => { R.hover = null; window.LRApp.tip(null); });
  }
  R.container.hidden = false;
  resize();
  await rebuild(snap);
  if (!R.fitted) { fit(); R.fitted = true; }
  if (!R.running) { R.running = true; loop(); }
}
function resize() { if (!R) return; const w = R.container.clientWidth || 600, h = R.container.clientHeight || 500; R.renderer.setSize(w, h, false); R.camera.aspect = w / h; R.camera.updateProjectionMatrix(); }
function loop() { if (!R || !R.running) return; R.controls.update(); R.renderer.render(R.scene, R.camera); requestAnimationFrame(loop); }
let building = null;
function dispose(root) {
  root.traverse(o => {
    if (o.userData.cached) return; // shared with the part cache or a loaded model file
    if (o.geometry) o.geometry.dispose();
    [].concat(o.material || []).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
  });
}
async function rebuild(snap) {
  if (!R) return;
  const my = building = {};
  const g = await buildRack(snap);
  if (building !== my) { dispose(g); return; }
  if (R.rack) { R.scene.remove(R.rack); dispose(R.rack); }
  R.rack = g; R.scene.add(g);
}
function hitId(e) {
  if (!R.rack) return null;
  const r = R.renderer.domElement.getBoundingClientRect(), m = new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  const ray = new T.Raycaster(); ray.setFromCamera(m, R.camera);
  const hit = ray.intersectObjects(R.rack.children, true)[0];
  let o = hit && hit.object; while (o && o.userData.id == null && o.parent) o = o.parent;
  return o && o.userData.id != null ? o.userData.id : null;
}
function pick(e) { const id = hitId(e); if (id != null) window.LRApp.select(id); }
function update(snap) { if (R && R.running) rebuild(snap); }
function pause() { if (R) { R.running = false; R.hover = null; } }
function theme() { if (R) R.ground.material.color.copy(lin(themeColors().line)); }
async function action(v) {
  if (!R) return;
  if (v === 'reset') fit();
  if (v === 'sides') { R.sides = !R.sides; await rebuild(window.LRApp.snapshot()); }
  if (v === 'rotate') {
    const snap = window.LRApp.snapshot(), t = snap.items.find(i => i.sel), fm = t && fileModels.get(t.id);
    if (!fm) { window.LRApp.say('Load a model file on the selected part first.'); return; }
    fm.rot[0] = (fm.rot[0] + 1) % 4; if (fm.rot[0] === 0) fm.rot[1] = (fm.rot[1] + 1) % 4;
    await rebuild(snap);
  }
}

/* ---------- part preview (maker dialog) ---------- */
async function preview(container, geoms, color) {
  T = await P.loadThree();
  let pv = previews.get(container);
  if (!pv) {
    const renderer = makeRenderer(container), scene = new T.Scene(), camera = new T.PerspectiveCamera(30, 1, 5, 5000);
    lights(scene);
    const controls = new T.OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
    pv = { renderer, scene, camera, controls, group: null, alive: true };
    previews.set(container, pv);
    const ro = window.ResizeObserver && new ResizeObserver(() => { const w = container.clientWidth || 400, h = container.clientHeight || 360; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); });
    if (window.ResizeObserver) ro.observe(container); else { renderer.setSize(container.clientWidth || 400, container.clientHeight || 360, false); }
    const tick = () => { if (!container.isConnected) return; controls.update(); renderer.render(scene, camera); requestAnimationFrame(tick); }; tick();
  }
  if (pv.group) pv.scene.remove(pv.group);
  const g = new T.Group(), m = mat(color && color !== '#26282B' ? color : '#3A3D42');
  geoms.forEach(gg => g.add(new T.Mesh(gg, m)));
  const box = new T.Box3().setFromObject(g), c = new T.Vector3(), s = new T.Vector3(); box.getCenter(c); box.getSize(s);
  g.position.sub(c); pv.group = g; pv.scene.add(g);
  const dist = Math.max(s.x, s.y, s.z) * 1.6 + 60;
  pv.camera.position.set(dist * .45, dist * .35, dist * .9); pv.controls.target.set(0, 0, 0); pv.controls.update();
}

window.LRView3D = { FRAME, mount, update, pause, theme, action, preview };
})();
