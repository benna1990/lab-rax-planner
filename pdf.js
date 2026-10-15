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

async function make(d) {
  const JsPDF = await load();
  const doc = new JsPDF({ unit: 'mm', format: 'a4' }), W = 210, M = 16;
  const ink = [22, 24, 27], muted = [106, 111, 118], line = [218, 221, 216], green = [23, 130, 74];
  const text = (s, x, y, o) => doc.text(clean(s), x, y, o);
  const head = (s, y) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...ink); text(s, M, y); doc.setDrawColor(...line); doc.line(M, y + 2, W - M, y + 2); return y + 8; };

  // ---- page 1: title, rack drawing, layout ----
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...ink); text('Lab Rax build plan', M, M + 6);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...muted);
  text(d.title + '  ·  ' + d.version + '  ·  ' + new Date().toISOString().slice(0, 10), M, M + 13);

  // rack drawing at 1:2.5 (1 mm on paper = 2.5 mm real)
  const k = 1 / 2.5, U = 44.45, post = 18 * k, bay = 222 * k, fw = bay + 2 * post, bodyH = d.h * U * k;
  const x0 = M + 8, top = M + 30, topH = 28 * k;
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
    doc.setFillColor(...c); doc.rect(x0 + post * .25, y, fw - post * .5, h, 'F');
    doc.setFontSize(Math.min(7.5, h * 2.4)); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(lum(it.color) < 140 ? hex(d.accent) : ink));
    text((it.label || it.name).slice(0, 34), x0 + post + 2, y + h / 2 + 1.1);
  }
  doc.setDrawColor(...muted); doc.setLineWidth(.2);
  const dimY = by + bodyH + 12 * k + 5; doc.line(x0 + post, dimY, x0 + post + bay, dimY); doc.line(x0 + post, dimY - 1.2, x0 + post, dimY + 1.2); doc.line(x0 + post + bay, dimY - 1.2, x0 + post + bay, dimY + 1.2);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...muted); text('222 mm clear · scale 1:2.5', x0 + fw / 2, dimY + 4, { align: 'center' });
  const dimX = x0 + fw + 4; doc.line(dimX, by, dimX, by + bodyH); doc.line(dimX - 1.2, by, dimX + 1.2, by); doc.line(dimX - 1.2, by + bodyH, dimX + 1.2, by + bodyH);
  text((d.h * U).toFixed(1) + ' mm', dimX + 2, by + bodyH / 2, { angle: 90 });

  // layout table to the right
  const tx = x0 + fw + 16; let y = top + 2;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...ink); text('Layout, top to bottom', tx, y); y += 6;
  doc.setFontSize(8.5);
  if (d.top) { doc.setFont('helvetica', 'bold'); text('Top', tx, y); doc.setFont('helvetica', 'normal'); text(doc.splitTextToSize(clean(d.top), W - M - tx - 14), tx + 14, y); y += 6; }
  for (const it of d.items) {
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...ink); text(it.pos, tx, y);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(clean((it.label ? '[' + it.label + '] ' : '') + it.name + ' (' + it.u + ')'), W - M - tx - 14);
    text(lines, tx + 14, y); y += lines.length * 3.8 + 2.2;
  }
  const used = d.items.reduce((n, i) => n + i.h2, 0), free = d.h * 2 - used;
  if (free > 0) { doc.setTextColor(...muted); text('Open: ' + (free / 2) + 'U', tx, y); y += 6; }

  let y2 = Math.max(y + 6, by + bodyH + 24);
  y2 = head('Frame parts', y2);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...ink);
  const fp = d.frameParts;
  const rows = [['Vertical posts', fp.posts], fp.joiners ? ['Post joiners', '4'] : null, ['Side panels', fp.sides], ['Horizontal pieces', '4'], ['Edge pieces', '4'], ['Handles · feet', '2 · 4'], d.top ? ['Top', d.top] : ['Top + bottom panel', '1 + 1']].filter(Boolean);
  for (const [a, b] of rows) { text(a, M, y2); text(b, W - M, y2, { align: 'right' }); y2 += 5; }

  // ---- page 2: print pack and shopping list ----
  doc.addPage(); y = M + 4;
  y = head('Print pack', y);
  doc.setFontSize(9);
  for (const p of d.print) {
    if (y > 270) { doc.addPage(); y = M + 4; }
    doc.setDrawColor(...muted); doc.rect(M, y - 3, 3.4, 3.4);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...ink);
    const name = (p.qty > 1 ? p.qty + '× ' : '') + p.name;
    if (p.url) doc.textWithLink(clean(name), M + 6, y, { url: p.url }); else text(name, M + 6, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...muted); doc.setFontSize(8);
    const sub = doc.splitTextToSize(clean(p.sub + (p.url ? '  ·  ' + p.url : '  ·  custom STL in the build pack')), W - 2 * M - 6);
    text(sub, M + 6, y + 4); y += 4 + sub.length * 3.6 + 3.2; doc.setFontSize(9);
  }
  y += 4; y = head('Shopping list', y);
  doc.setFontSize(9);
  for (const s of d.shop) {
    if (y > 278) { doc.addPage(); y = M + 4; }
    doc.setTextColor(...ink); doc.setFont('helvetica', 'normal'); text(s.name, M, y);
    doc.setFont('helvetica', 'bold'); text(s.qty + '×', W - M, y, { align: 'right' });
    if (s.buy) { doc.setTextColor(...green); doc.setFont('helvetica', 'normal'); doc.textWithLink('Buy', W - M - 22, y, { url: s.buy }); }
    y += 5.5;
  }
  y += 4; doc.setFontSize(8); doc.setTextColor(...muted);
  const foot = doc.splitTextToSize('Community models belong to their makers and stay on MakerWorld under their own licenses; download them there as 3MF. Custom parts were generated by the Lab Rax Planner (MIT). Lab Rax is designed by Michael Klements.', W - 2 * M);
  text(foot, M, Math.min(y, 282 - foot.length * 3.5));
  return new Uint8Array(doc.output('arraybuffer'));
}
window.LRPdf = { make };
})();
