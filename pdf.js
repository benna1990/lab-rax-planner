/* Lab Rax Planner — build plan PDF (jsPDF 2.5.1, loaded on demand). MIT licensed. */
(function () {
'use strict';
let jsp = null;
function load() {
  if (!jsp) {
    jsp = (window.jspdf ? Promise.resolve() : window.LRParts.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')).then(() => window.jspdf.jsPDF);
    jsp.catch(() => { jsp = null; });
  }
  return jsp;
}
// built-in PDF fonts only cover WinAnsi; map the few characters the planner uses that fall outside it
const clean = s => String(s == null ? '' : s).replace(/≈/g, '~').replace(/→/g, '->').replace(/″/g, '"').replace(/✓/g, '').replace(/[^\x00-\xFF–—‘’“”•…×½]/g, '');
const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const lum = c => { const [r, g, b] = hex(c); return .2126 * r + .7152 * g + .0722 * b; };
const rgbHex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
// the planner's heat scale (light theme): room temperature to `span` °C above it. It only gets darker, so it survives greyscale printing.
const HEAT = ['#F6F1EC', '#FCE1CB', '#F8C29C', '#F19A66', '#C9531F', '#A33F15', '#7A2A0B'].map(hex);
function heatRGB(dT, span) { const p = Math.max(0, Math.min(1, dT / span)) * 6, i = Math.min(5, Math.floor(p)), f = p - i; return HEAT[i].map((v, k) => Math.round(v + (HEAT[i + 1][k] - v) * f)); }
const tC = (t, short) => (t > 60 ? '60+' : Math.round(t)) + (short ? '°' : ' °C'); // past 60 °C the exact figure means little
// a part's face as drawn by shapes.js (an SVG string, w × h mm) turned into an image for jsPDF, ppm pixels per mm
function raster(svg, w, h, ppm, type) {
  return new Promise((res, rej) => {
    const pw = Math.max(1, Math.round(w * ppm)), ph = Math.max(1, Math.round(h * ppm)), img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = pw; c.height = ph; c.getContext('2d').drawImage(img, 0, 0, pw, ph); res(c.toDataURL(type, .9)); };
    img.onerror = () => rej(new Error('could not draw a part'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg width="' + pw + '" height="' + ph + '" '));
  });
}

async function make(d) {
  const JsPDF = await load();
  const doc = new JsPDF({ unit: 'mm', format: 'a4' }), W = 210, M = 16, BOT = 297 - M; // BOT: lowest baseline for content
  const ink = [22, 24, 27], muted = [106, 111, 118], line = [218, 221, 216], green = [23, 130, 74];
  const text = (s, x, y, o) => doc.text(Array.isArray(s) ? s.map(clean) : clean(s), x, y, o); // arrays are wrapped lines
  const wrap = (s, w) => doc.splitTextToSize(clean(s), w);
  const head = (s, y) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...ink); text(s, M, y); doc.setDrawColor(...line); doc.line(M, y + 2, W - M, y + 2); return y + 8; };
  const page = () => { doc.addPage(); return M + 4; };
  // measure a block before drawing it, and start a new page when it doesn't fit
  const fit = (y, h) => y + h > BOT ? page() : y;

  // ---- page 1: title, rack drawing, layout ----
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...ink); text('Lab Rax build plan', M, M + 6);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...muted);
  text(d.title + '  ·  ' + d.version + '  ·  ' + new Date().toISOString().slice(0, 10), M, M + 13);

  // rack drawing at 1:2.5 (1 mm on paper = 2.5 mm real), smaller when a tall top mount would push it off the page
  const U = 44.45, tl = d.topLook && d.topLook.h > 1.5 ? d.topLook : null;
  const k = Math.min(1 / 2.5, (BOT - M - 48) / ((tl ? tl.h : 0) + 28 + d.h * U + 12)), post = 18 * k, bay = 222 * k, fw = bay + 2 * post, bodyH = d.h * U * k;
  const x0 = M + 8, top = M + 30 + (tl ? tl.h * k : 0), topH = 28 * k;
  // the parts' faces as images, one per distinct face; JPEG for panels, PNG for the top mount (it stands on the paper)
  const faces = new Map(), img = async (key, make) => { if (!faces.has(key)) faces.set(key, await make().catch(() => null)); return faces.get(key); };
  for (const it of d.items) if (it.face) it.img = await img(it.face, () => raster(it.face, 250, it.h2 * U / 2 - .79, 4, 'image/jpeg'));
  const topImg = tl ? await img(tl.svg, () => raster(tl.svg, tl.w, tl.h, 4, 'image/png')) : null;
  if (topImg) doc.addImage(topImg, 'PNG', x0 + fw / 2 - tl.w * k / 2, top - tl.h * k, tl.w * k, tl.h * k, 'top', 'FAST');
  doc.setFillColor(...hex(d.frame)); doc.roundedRect(x0, top, fw, topH, 1.2, 1.2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(Math.min(14, 120 / Math.max(4, d.label.length))); doc.setTextColor(...hex(d.accent)); text(d.label, x0 + fw / 2, top + topH / 2 + 1.6, { align: 'center' });
  const by = top + topH;
  doc.setFillColor(...hex(d.frame)); doc.rect(x0, by, post, bodyH, 'F'); doc.rect(x0 + post + bay, by, post, bodyH, 'F');
  doc.setFillColor(12, 13, 15); doc.rect(x0 + post, by, bay, bodyH, 'F');
  doc.setFillColor(...hex(d.frame)); doc.roundedRect(x0, by + bodyH, fw, 12 * k, 1, 1, 'F');
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...muted);
  for (let i = 0; i < d.h; i++) text(String(d.h - i), x0 - 2.5, by + (i + .5) * U * k + 1, { align: 'right' });
  for (const it of d.items) {
    const y = by + it.pos2 * U / 2 * k, h = it.h2 * U / 2 * k - .3, c = hex(it.color);
    // the part as it looks (no text on it, like the planner's front view; the layout lists what sits where)
    if (it.img) { doc.addImage(it.img, 'JPEG', x0 + fw / 2 - 125 * k, y, 250 * k, h, 'face' + [...faces.keys()].indexOf(it.face), 'FAST'); continue; }
    doc.setFillColor(...c); doc.rect(x0 + post * .25, y, fw - post * .5, h, 'F');
    doc.setFontSize(Math.min(7.5, h * 2.4)); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(lum(it.color) < 140 ? hex(d.accent) : ink));
    text((it.label || it.name).slice(0, 34), x0 + post + 2, y + h / 2 + 1.1);
  }
  doc.setDrawColor(...muted); doc.setLineWidth(.2);
  const dimY = by + bodyH + 12 * k + 5; doc.line(x0 + post, dimY, x0 + post + bay, dimY); doc.line(x0 + post, dimY - 1.2, x0 + post, dimY + 1.2); doc.line(x0 + post + bay, dimY - 1.2, x0 + post + bay, dimY + 1.2);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...muted); text('222 mm clear · scale 1:' + +(1 / k).toFixed(1), x0 + fw / 2, dimY + 4, { align: 'center' });
  const dimX = x0 + fw + 4; doc.line(dimX, by, dimX, by + bodyH); doc.line(dimX - 1.2, by, dimX + 1.2, by); doc.line(dimX - 1.2, by + bodyH, dimX + 1.2, by + bodyH);
  text((d.h * U).toFixed(1) + ' mm', dimX + 2, by + bodyH / 2, { angle: 90 });

  // layout table to the right; when it runs past the page it continues full width on the next one
  let tx = x0 + fw + 16, tw = W - M - tx - 14, y = top + 2;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...ink); text('Layout, top to bottom', tx, y); y += 6;
  doc.setFontSize(8.5);
  const row = (pos, s) => {
    let lines = wrap(s, tw);
    if (y + (lines.length - 1) * 3.8 > BOT) {
      y = page(); tx = M; tw = W - 2 * M - 14;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...ink); text('Layout, continued', tx, y); y += 6;
      doc.setFontSize(8.5); lines = wrap(s, tw);
    }
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...ink); text(pos, tx, y);
    doc.setFont('helvetica', 'normal'); text(lines, tx + 14, y); y += lines.length * 3.8 + 2.2;
  };
  if (d.top) row('Top', d.top);
  for (const it of d.items) row(it.pos, (it.label ? '[' + it.label + '] ' : '') + it.name + ' (' + it.u + ')');
  const used = d.items.reduce((n, i) => n + i.h2, 0), free = d.h * 2 - used;
  if (free > 0) { if (y > BOT) { y = page(); tx = M; } doc.setFont('helvetica', 'normal'); doc.setTextColor(...muted); text('Open: ' + (free / 2) + 'U', tx, y); y += 6; }

  // frame table below the drawing, or below the layout once that has moved to a later page
  const fp = d.frameParts;
  const rows = [['Vertical posts', fp.posts], fp.joiners ? ['Post joiners', '4'] : null, ['Side panels', fp.sides], ['Horizontal pieces', '4'], ['Edge pieces', '4'], ['Handles · feet', '2 · 4'],
    ...(d.top ? [['Top', d.top], ['Bottom panel', '1']] : [['Top + bottom panel', '1 + 1']])].filter(Boolean);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  const cells = rows.map(([a, b]) => [a, wrap(b, W - 2 * M - 40)]);
  let y2 = doc.getNumberOfPages() > 1 ? y + 6 : Math.max(y + 6, by + bodyH + 24);
  y2 = fit(y2, 8 + cells.reduce((n, c) => n + c[1].length * 3.8 + 1.2, 0));
  y2 = head('Frame parts', y2);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...ink);
  for (const [a, b] of cells) { text(a, M, y2); text(b, W - M, y2, { align: 'right' }); y2 += b.length * 3.8 + 1.2; }

  // cooling estimate: moves to a new page as one block when it doesn't fit, and row by row only when it is longer than a page
  const c = d.cooling;
  if (c) {
    const fw2 = W - 2 * M, cw = Math.min(17.8, fw2 / c.perU.length), cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    const note = wrap('An estimate from typical power use and simple physics: the air around the parts, not the parts themselves.', fw2);
    const fans = c.fans.map(f => { // h runs from the first baseline to the next row's
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); const name = wrap(f.name, fw2);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); const sub = wrap(cap(f.where) + ' · ' + f.spec + ' · ' + f.dir, fw2);
      return { name, sub, h: name.length * 3.8 + (sub.length - 1) * 3.6 + 6 };
    });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const tips = c.tips.map(t => { const tx = wrap(t.text, fw2); return { t, tx, h: tx.length * 3.8 + 6 }; });
    const list = rows => rows.length ? 5 + rows.reduce((n, r) => n + r.h, 0) : 0;
    const lead = 8 + note.length * 3.5 + 1.5 + 4 * 5 + 3 + 5 + 10, all = lead + list(fans) + list(tips) - 6;
    const sub = s => { doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...ink); text(s, M, y2); y2 += 5; };
    y2 = fit(y2 + 6, all <= BOT - M - 4 ? all : lead - 6);
    y2 = head('Cooling (estimate)', y2);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...muted); text(note, M, y2); y2 += note.length * 3.5 + 1.5;
    doc.setFontSize(9); doc.setTextColor(...ink);
    for (const [a, b] of [['Room temperature', c.room], ['Heat in the rack', c.heat], ['Hottest air', c.hottest], ['Air through the rack', c.flow]]) { text(a, M, y2); text(b, W - M, y2, { align: 'right' }); y2 += 5; }
    y2 += 3; sub('Air temperature per U, top to bottom');
    c.perU.forEach((u, i) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...muted); text(u.u, M + i * cw, y2);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...ink); text(u.t, M + i * cw, y2 + 4);
    });
    y2 += 10;
    if (fans.length) {
      y2 = fit(y2, 5 + fans[0].h - 6); sub('Fans');
      for (const f of fans) {
        y2 = fit(y2, f.h - 6);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...ink); text(f.name, M, y2);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...muted); text(f.sub, M, y2 + f.name.length * 3.8); y2 += f.h;
      }
    }
    if (tips.length) {
      y2 = fit(y2, 5 + tips[0].h - 6); sub('What would help');
      for (const { t, tx, h } of tips) {
        y2 = fit(y2, h - 6);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...ink); text(tx, M, y2);
        doc.setFontSize(8); doc.setTextColor(...muted); text('Hottest air ' + t.before + ' → ' + t.after, M, y2 + tx.length * 3.8); y2 += h;
      }
    }
  }
  if (c && c.map) y2 = airMap(c.map, y2 + 8);

  // airflow diagram: the rack front-on with every ½U layer in the colour of its air, where air comes in and goes out (front openings
  // on the left, the open back and the sides on the right, the top above), and the heat of each part. It prints in greyscale too:
  // the colour scale only gets darker, and every colour has its number or word next to it.
  function airMap(m, y) {
    const n = m.temp.length, kk = Math.min(.35, 128 / (m.h * U)), postW = 18 * kk, bayW = 222 * kk, frW = bayW + 2 * postW, HU = U / 2 * kk, bodyH = n * HU, edgeH = 22 * kk;
    const FA = 36, TL = 13, xF = M, xr = M + FA + TL, xB = xr + frW + 4, BA = W - M - xB, IN = [37, 99, 201], OUT = [181, 70, 26];
    const viaTop = m.openings.some(o => o.kind === 'top' && o.in + o.out >= .5) || m.fans.some(f => f.place === 'top'), gapTop = viaTop ? 14 : 5;
    const total = 8 + 18 + 9 + gapTop + edgeH + bodyH + 12 * kk + 12 + 24;
    y = fit(y, total);
    y = head('Airflow (estimate)', y);
    // headline numbers
    const fans = m.fans.reduce((s, f) => s + f.in + f.out, 0), stats = [['Hottest air', '~ ' + tC(m.maxT)], ['Air through the rack', Math.round(m.flow) + ' m³/h'], ['Heat in the rack', (m.est ? '~ ' : '') + Math.round(m.Q) + ' W'],
      ['Fans', m.fans.length ? m.fans.length + (m.fans.length > 1 ? ' parts, ' : ' part, ') + Math.round(fans) + ' m³/h' : 'none']];
    stats.forEach(([a, b], i) => {
      const x = M + i * (W - 2 * M) / 4;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...muted); text(a, x, y);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5); doc.setTextColor(...(i === 0 && m.maxT > m.rated[1] ? OUT : ink)); text(b, x, y + 6);
    });
    y += 18;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...muted);
    text('Front', xF, y); text('Back and sides', xB + 3, y); text('°C', xr - 1.5, y, { align: 'right' });
    const top = y + gapTop, by = top + edgeH, layerY = s => by + s * HU, mid = (s0, s1) => by + (s0 + s1 + 1) / 2 * HU;
    // frame in light grey (no big black areas on paper), the bay as layers of air
    doc.setFillColor(214, 217, 212); doc.roundedRect(xr, top, frW, edgeH, .8, .8, 'F'); doc.rect(xr, by, postW, bodyH, 'F'); doc.rect(xr + postW + bayW, by, postW, bodyH, 'F'); doc.roundedRect(xr, by + bodyH, frW, 8 * kk, .6, .6, 'F');
    m.temp.forEach((t, s) => { doc.setFillColor(...heatRGB(t - m.room, m.span)); doc.rect(xr + postW, layerY(s), bayW, HU + .05, 'F'); });
    // °C per U and the U numbers
    for (let u = 0; u < m.h; u++) {
      const t = (m.temp[2 * u] + m.temp[2 * u + 1]) / 2, yy = by + (u + .5) * U * kk + 1.1, hot = t > m.rated[1];
      doc.setFont('helvetica', hot ? 'bold' : 'normal'); doc.setFontSize(7.5); doc.setTextColor(...(hot ? OUT : ink)); text(tC(t, true) + (hot ? '!' : ''), xr - 1.5, yy, { align: 'right' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...muted); text('U' + (m.h - u), xr - TL + .5, yy);
    }
    // neutral plane: below it air comes in, above it goes out (drawn under the parts' labels)
    if (m.neutral != null) {
      const yn = by + (1 - m.neutral / m.H) * bodyH;
      doc.setDrawColor(...ink); doc.setLineWidth(.3); doc.setLineDashPattern([1.2, 1], 0); doc.line(xr + postW, yn, xr + postW + bayW, yn); doc.setLineDashPattern([], 0);
    }
    // parts: an outline, the name and the heat; open slots say so
    const used = new Array(n).fill(false);
    m.parts.forEach(p => {
      for (let s = p.pos2; s < p.pos2 + p.h2 && s < n; s++) used[s] = true;
      const y0 = layerY(p.pos2) + .25, hh = p.h2 * HU - .5, cy = y0 + hh / 2, fs = Math.min(6.5, hh * 2.1), bh = Math.min(hh - .6, fs * .48);
      doc.setDrawColor(70, 74, 79); doc.setLineWidth(.2); doc.rect(xr + postW + .6, y0, bayW - 1.2, hh, 'S');
      const box = (s, x, align, bold) => { // text on a white box, x is its left or right edge
        doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(fs); const tw = doc.getTextWidth(s) + 2, bx = align === 'right' ? x - tw : x;
        doc.setFillColor(255, 255, 255); doc.setDrawColor(190, 193, 189); doc.roundedRect(bx, cy - bh / 2, tw, bh, .5, .5, 'FD');
        doc.setTextColor(...ink); text(s, bx + 1, cy + fs * .125); return tw;
      };
      const wTxt = p.w > 0 ? (p.est ? '~' : '') + (p.w < 10 && p.w % 1 ? p.w.toFixed(1) : Math.round(p.w)) + ' W' : '';
      const ww = wTxt ? box(wTxt, xr + postW + bayW - 1.6, 'right', true) + 1.5 : 0;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(fs); let nm = clean(p.name); while (nm.length > 3 && doc.getTextWidth(nm) + 2 > bayW - 4.5 - ww) nm = nm.slice(0, -2);
      box(nm === clean(p.name) ? nm : nm + '…', xr + postW + 1.6, 'left');
    });
    doc.setFont('helvetica', 'italic'); doc.setFontSize(6); doc.setTextColor(...ink);
    for (let s = 0; s < n;) { if (used[s]) { s++; continue; } let e = s; while (e < n && !used[e]) e++; text('open', xr + frW / 2, mid(s, e - 1) + .8, { align: 'center' }); s = e; }
    // arrows: towards the rack is air coming in, away from it air going out; every arrow carries its word and m³/h
    const arrow = (x1, y1, x2, y2, col) => {
      const a = Math.atan2(y2 - y1, x2 - x1), L = 1.8, Wd = 1.1;
      doc.setDrawColor(...col); doc.setFillColor(...col); doc.setLineWidth(.45); doc.line(x1, y1, x2 - Math.cos(a) * L * .8, y2 - Math.sin(a) * L * .8);
      doc.triangle(x2, y2, x2 - Math.cos(a) * L - Math.sin(a) * Wd, y2 - Math.sin(a) * L + Math.cos(a) * Wd, x2 - Math.cos(a) * L + Math.sin(a) * Wd, y2 - Math.sin(a) * L - Math.cos(a) * Wd, 'F');
    };
    const label = (s, x, yy, col, align) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...col); text(s, x, yy, { align: align || 'left' }); };
    const f3 = v => Math.round(v) + ' m³/h';
    const side = (yy, i, o, what, right) => { // one or two arrows beside the rack at height yy
      const pairs = [i >= .5 ? [i, 1] : null, o >= .5 ? [o, -1] : null].filter(Boolean), dy = pairs.length > 1 ? 1.9 : 0;
      pairs.forEach(([v, dir], k) => {
        const yk = yy + (k ? dy : -dy) + (pairs.length > 1 ? 0 : 0), col = dir > 0 ? IN : OUT, word = (what ? what + ' ' : '') + (dir > 0 ? 'in ' : 'out ') + f3(v);
        if (!right) { const a1 = xF + 1, a2 = xr - TL - 2; dir > 0 ? arrow(a1, yk, a2, yk, col) : arrow(a2, yk, a1, yk, col); label(word, a1, yk - .9, col); }
        else { const a1 = xB + 1, a2 = Math.min(W - M, xB + 26); dir > 0 ? arrow(a2, yk, a1, yk, col) : arrow(a1, yk, a2, yk, col); label(word, a1 + 1.5, yk - .9, col); }
      });
    };
    m.openings.filter(o => (o.kind === 'front' || o.kind === 'slot') && o.layers.length).forEach(o => side(mid(Math.min(...o.layers), Math.max(...o.layers)), o.in, o.out, o.kind === 'slot' ? 'open' : 'vent'));
    m.fans.filter(f => f.place === 'front' && f.pos2 != null).forEach(f => side(mid(f.pos2, f.pos2 + f.h2 - 1), f.in, f.out, 'fan'));
    // back and sides: per height, in or out; one bracket and arrow per run
    const fl = new Array(n).fill(0), sides = m.openings.some(o => o.kind === 'side');
    m.openings.filter(o => o.kind === 'back' || o.kind === 'side').forEach(o => o.layers.forEach((s, k) => { fl[s] += o.flows[k]; }));
    for (let s = 0; s < n;) {
      const sg = Math.abs(fl[s]) < .1 ? 0 : Math.sign(fl[s]); let e = s; while (e < n && (Math.abs(fl[e]) < .1 ? 0 : Math.sign(fl[e])) === sg) e++;
      if (sg) {
        const v = fl.slice(s, e).reduce((a, b) => a + Math.abs(b), 0), col = sg > 0 ? IN : OUT;
        doc.setDrawColor(...col); doc.setLineWidth(.8); doc.line(xB - 1.5, layerY(s) + .6, xB - 1.5, layerY(e) - .6);
        side(mid(s, e - 1), sg > 0 ? v : 0, sg < 0 ? v : 0, sides ? 'back+sides' : 'back', true);
      }
      s = e;
    }
    m.fans.filter(f => f.place === 'side' || f.place === 'back').forEach(f => side(by + bodyH * (f.place === 'back' ? .25 : .5) + 6, f.in, f.out, f.place === 'side' ? 'side fans' : 'back fans', true));
    if (!fl.some(v => Math.abs(v) >= .1) && !m.fans.some(f => f.place === 'side' || f.place === 'back')) { doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(...muted); text('Back closed: no air through it', xB + 1, by + bodyH / 2); }
    // top and bottom
    const ends = (end, yy, up) => {
      let i = 0, o = 0;
      m.openings.filter(x => x.kind === end).forEach(x => { i += x.in; o += x.out; });
      m.fans.filter(f => f.place === 'top').forEach(f => { if (f.dir === 'cross') { if (end === 'top') o += f.out; else i += f.in; } else if (end === 'top') { i += f.in; o += f.out; } });
      const cx = xr + frW / 2, parts = [i >= .5 ? [i, 1] : null, o >= .5 ? [o, -1] : null].filter(Boolean);
      parts.forEach(([v, dir], k) => {
        const x = cx + (parts.length > 1 ? (k ? 8 : -8) : 0), col = dir > 0 ? IN : OUT, far = up ? yy - 8 : yy + 8;
        dir > 0 ? arrow(x, far, x, yy, col) : arrow(x, yy, x, far, col);
        label((end === 'top' ? 'top ' : 'bottom ') + (dir > 0 ? 'in ' : 'out ') + f3(v), x + 2, up ? far + 2.2 : far - .4, col);
      });
    };
    ends('top', top - 1, true); ends('bottom', by + bodyH + 8 * kk + 1, false);
    // colour scale and key
    let ly = by + bodyH + 8 * kk + 14;
    const sx = M, sw = 76;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...ink); text('Air temperature', sx, ly);
    for (let i = 0; i < 38; i++) { doc.setFillColor(...heatRGB(i / 37 * m.span, m.span)); doc.rect(sx + i * sw / 38, ly + 2, sw / 38 + .05, 3.5, 'F'); }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...muted);
    for (let d5 = 0; d5 <= m.span; d5 += 5) text(Math.round(m.room + d5) + (d5 === m.span ? '+ °C' : ''), sx + d5 / m.span * sw, ly + 9, { align: d5 === 0 ? 'left' : d5 === m.span ? 'right' : 'center' });
    const kx = sx + sw + 12;
    arrow(kx, ly + 1, kx + 9, ly + 1, IN); label('in: air coming in, m³/h', kx + 11, ly + 2, IN);
    arrow(kx, ly + 6, kx + 9, ly + 6, OUT); label('out: air going out, m³/h', kx + 11, ly + 7, OUT);
    doc.setDrawColor(...ink); doc.setLineWidth(.3); doc.setLineDashPattern([1.2, 1], 0); doc.line(kx, ly + 11, kx + 9, ly + 11); doc.setLineDashPattern([], 0);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...ink); text('neutral plane: in below, out above', kx + 11, ly + 12);
    ly += 16;
    doc.setFontSize(7); doc.setTextColor(...muted);
    const note = wrap('An estimate at ' + Math.round(m.room) + ' °C in the room, from typical power use and simple physics. Left: openings in the front panels; right: the open back and the side panels; ~ marks estimated heat. Most network gear and mini PCs are rated for air up to ' + m.rated[1] + ' °C.', W - 2 * M);
    text(note, M, ly);
    return ly + note.length * 3.2;
  }

  // ---- print pack and shopping list: on page 2, or straight on when page 1 already ran over ----
  y = doc.getNumberOfPages() > 1 ? y2 + 6 : page();
  const prints = d.print.map(p => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    const name = wrap((p.qty > 1 ? p.qty + '× ' : '') + p.name, W - 2 * M - 6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    const sub = wrap((p.vars ? 'Variants: ' + p.vars + '  ·  ' : '') + p.sub + (p.url ? '  ·  ' + p.url : '  ·  custom STL in the build pack'), W - 2 * M - 6);
    return { p, name, sub, nameH: name.length * 3.8 + .2, h: name.length * 3.8 + .2 + (sub.length - 1) * 3.6 };
  });
  y = fit(y, 8 + (prints.length ? prints[0].h : 0));
  y = head('Print pack', y);
  for (const { p, name, sub, nameH, h } of prints) {
    y = fit(y, h);
    doc.setDrawColor(...muted); doc.rect(M, y - 3, 3.4, 3.4);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...ink); text(name, M + 6, y);
    if (p.url) doc.link(M + 6, y - 3.2, Math.max(...name.map(l => doc.getTextWidth(l))), name.length * 3.8, { url: p.url });
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...muted); doc.setFontSize(8);
    text(sub, M + 6, y + nameH); y += h + 6.8;
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  const shops = d.shop.map(s => ({ s, name: wrap(s.name, W - 2 * M - 42) }));
  y += 4; y = fit(y, 8 + (shops.length ? (shops[0].name.length - 1) * 3.8 : 0));
  y = head('Shopping list', y);
  for (const { s, name } of shops) {
    y = fit(y, (name.length - 1) * 3.8);
    doc.setFontSize(9); doc.setTextColor(...ink); doc.setFont('helvetica', 'normal'); text(name, M, y);
    doc.setFont('helvetica', 'bold'); text(s.qty == null ? 'unknown' : s.qty + '×', W - M, y, { align: 'right' });
    const link = s.buy ? ['Buy', s.buy] : s.check ? ['Check', s.check] : null;
    if (link) { doc.setTextColor(...green); doc.setFont('helvetica', 'normal'); doc.textWithLink(link[0], W - M - 26, y, { url: link[1] }); }
    y += (name.length - 1) * 3.8 + 5.5;
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...muted);
  const foot = wrap('Community models belong to their makers and stay on MakerWorld under their own licenses; download them there as 3MF. Custom parts were generated by the Lab Rax Planner (MIT). Lab Rax is designed by Michael Klements.', W - 2 * M);
  if (d.notes && d.notes.length) foot.unshift(...d.notes.flatMap(n => wrap(n, W - 2 * M)), '');
  y = fit(y + 4, (foot.length - 1) * 3.5);
  text(foot, M, y);
  const pages = doc.getNumberOfPages();
  if (pages > 1) for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(...muted); text(i + ' / ' + pages, W - M, 297 - 8, { align: 'right' }); }
  return new Uint8Array(doc.output('arraybuffer'));
}
window.LRPdf = { make };
})();
