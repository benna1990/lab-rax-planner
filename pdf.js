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
const clean = s => String(s == null ? '' : s).replace(/≈/g, '~').replace(/″/g, '"').replace(/✓/g, '').replace(/[^\x00-\xFF–—‘’“”•…×½]/g, '');
const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const lum = c => { const [r, g, b] = hex(c); return .2126 * r + .7152 * g + .0722 * b; };
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
