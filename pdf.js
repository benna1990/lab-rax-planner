/* Mini Rack Planner — build plan PDF (jsPDF 2.5.1, loaded on demand). MIT licensed. */
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
const clean = s => String(s == null ? '' : s).replace(/€/g, 'EUR ').replace(/≈/g, '~').replace(/→/g, '->').replace(/″/g, '"').replace(/✓/g, '').replace(/[^\x00-\xFF–—‘’“”•…×½]/g, '');
const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
// the planner's heat scale (light theme): room temperature to `span` °C above it. It only gets darker, so it survives greyscale printing.
const HEAT = ['#EFF5F0', '#E3EFDF', '#F0EDCC', '#F5DFB7', '#F2C999', '#E7AB83', '#D99075'].map(hex);
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
  const doc = new JsPDF({ unit: 'mm', format: 'a4' }), W = 210, M = 16, BOT = 275; // BOT: lowest baseline for content
  const ink = [22, 24, 27], muted = [106, 111, 118], line = [218, 221, 216], green = [23, 130, 74];
  const text = (s, x, y, o) => doc.text(Array.isArray(s) ? s.map(clean) : clean(s), x, y, o); // arrays are wrapped lines
  const wrap = (s, w) => doc.splitTextToSize(clean(s), w);
  const head = (s, y) => {
    doc.setFillColor(227, 242, 232); doc.roundedRect(M, y - 5, W - 2 * M, 11, 2, 2, 'F');
    doc.setFillColor(...green); doc.roundedRect(M, y - 5, 1.2, 11, .5, .5, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...ink); text(s, M + 5, y + 2);
    return y + 13;
  };
  const page = () => { doc.addPage(); return 35; };
  // measure a block before drawing it, and start a new page when it doesn't fit
  const fit = (y, h) => y + h + 5 > BOT ? page() : y;
  const continued = (y, h, title) => y + h + 5 > BOT ? head(title + ' / continued', page()) : y;

  const faces = new Map(), img = async (key, make) => { if (!faces.has(key)) faces.set(key, await make().catch(() => null)); return faces.get(key); };
  for (const it of d.items) if (it.face) it.img = await img(it.face, () => raster(it.face, 250, it.h2 * 44.45 / 2 - .79, 4, 'image/jpeg'));
  // A useful first page: budget, material and navigation rather than a decorative cover.
  const navigation=[];
  const section=(title,detail)=>navigation.push({title,detail,page:doc.getNumberOfPages()});
  const date=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(new Date());
  const e=d.estimate, money=n=>window.LREstimate.money(n,e?e.s.currency:'EUR');
  doc.setProperties({title:d.title+' / Build plan',author:'Mini Rack Planner',subject:'Compact rack build plan'});
  doc.setFillColor(243,245,242);doc.rect(0,0,W,297,'F');doc.setFillColor(...green);doc.rect(0,0,W,3,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(...green);text('MINI RACK PLANNER',M,22);
  doc.setFontSize(8);doc.setTextColor(...muted);text(((window.LRMarket.regions[d.market] || {}).name || 'International')+' / '+date.toUpperCase(),W-M,22,{align:'right'});
  doc.setFontSize(30);doc.setTextColor(...ink);text('Your build plan',M,45);
  doc.setFont('helvetica','normal');doc.setFontSize(12);text(d.title+' / '+d.version,M,55);
  const metrics=e?[[Math.round(e.grams)+' g','FILAMENT'],[e.hours.toFixed(1)+' h','MACHINE TIME'],[money(e.total),e.unknown.length?'KNOWN BUDGET':'LEFT TO BUY']]:[[d.h+'U','HEIGHT'],[String(d.items.length),'PARTS'],['Lab Rax','SYSTEM']];
  metrics.forEach(([v,l],i)=>{const x=M+i*61;doc.setFillColor(255,255,255);doc.roundedRect(x,65,56,25,2.5,2.5,'F');doc.setFont('helvetica','bold');doc.setFontSize(19);doc.setTextColor(...ink);text(v,x+4,77);doc.setFontSize(7);doc.setTextColor(...muted);text(l,x+4,85);});
  if(e){
    let yy=104;doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(...green);text('PRINT & PURCHASE BUDGET',M,yy);yy+=9;
    const costs=[['Filament used',money(e.material)],['Printing electricity / '+e.kwh.toFixed(1)+' kWh',money(e.electricity)],['Print-use cost',money(e.printing)],['Buy '+e.spools+' additional 1 kg spools',money(e.spoolCost)],['Essential hardware / packs',money(e.hardware)]];
    costs.forEach(([a,b],i)=>{doc.setFont('helvetica',i===2?'bold':'normal');doc.setFontSize(9);doc.setTextColor(...ink);text(a,M,yy);text(b,111,yy,{align:'right'});yy+=7;});
    doc.setFont('helvetica','bold');doc.setTextColor(...green);text(e.unknown.length?'Known remaining subtotal':'Left to buy incl. print power',M,yy+2);text(money(e.total),111,yy+2,{align:'right'});
    doc.setFontSize(10);text('FILAMENT / COLOUR',124,104);let fy=114;
    e.colours.forEach(r=>{doc.setFillColor(...hex(r.c));doc.roundedRect(124,fy-3,4,4,.7,.7,'F');doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...ink);text(Math.round(r.grams)+' g need / '+r.spools+' buy',131,fy);fy+=5;doc.setFontSize(7);doc.setTextColor(...muted);text(Math.round(r.owned)+' g already owned',131,fy);fy+=7;});
    let note='Assumptions: '+money(e.s.kgPrice)+'/kg; '+money(e.s.kwhPrice)+'/kWh; '+e.s.watts+' W average printer power. '+(e.timeSource==='slicer input'?'Slicer time.':'Time is a rough '+e.s.gramsHour+' g/h estimate.')+' '+(e.massSource==='slicer input'?'Slicer mass.':'Mass includes 10% reserve.');
    doc.setFontSize(8);doc.setTextColor(...muted);text(wrap(note,W-2*M),M,166);
    note='Editable '+e.s.currency+' prices / allowances, not shop quotes. No currency conversion. Remaining budget = missing spools + missing hardware packs + print electricity. Excludes devices, tools, delivery and rack running power.';
    text(wrap(note,W-2*M),M,181);
    if(e.unknown.length){doc.setTextColor(164,78,34);text(wrap(e.unknown.length+' required item(s) unpriced. See the parts checklist; the budget is a known subtotal.',W-2*M),M,194);}
  }
  doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...green);text('QUICK NAVIGATION / CLICK A SECTION',M,211);
  page();

  // Orthographic construction overview. Model-verified production dimensions are not available.
  const U = 44.45, fp = d.frameParts;
  section('Technical overview', 'Front, rear, side and top / dimensions');
  let y2 = head('Technical overview', 35);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...muted);
  text('Orthographic schematics in mm. Frame outlines are approximate; not cutting templates.', M, y2 + 1);
  const dims = d.dimensions || {}, outerW = dims.outerWidth || 280, depth = dims.depth || 240;
  const k = Math.min(43 / outerW, 58 / (d.h * U + 35)), body = d.h * U * k;
  const cols = [M + 4, 80, 143], topY = 68;
  const label = (name, x, y) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...green); text(name, x, y); };
  const dimension = (x1, yy, x2, name) => {
    doc.setDrawColor(147, 156, 151); doc.setLineWidth(.15); doc.line(x1, yy, x2, yy); doc.line(x1, yy-1.2, x1, yy+1.2); doc.line(x2, yy-1.2, x2, yy+1.2);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...muted); text(name, (x1+x2)/2, yy+4, {align:'center'});
  };
  const elevation = (x, rear) => {
    const w = outerW*k, bay=222*k, post=(w-bay)/2;
    label(rear?'REAR':'FRONT',x,61);
    doc.setFillColor(237, 240, 237); doc.setDrawColor(75, 86, 79); doc.setLineWidth(.3); doc.rect(x,topY,w,body+8,'FD');
    doc.setFillColor(255,255,255); doc.rect(x+post,topY+4,bay,body,'F');
    for(let u=0;u<d.h;u++) {
      const yy=topY+4+(u+.5)*U*k;
      doc.setFont('helvetica','normal'); doc.setFontSize(5.5); doc.setTextColor(...muted); text(String(d.h-u),x-1.5,yy+1,{align:'right'});
    }
    doc.setFillColor(140,150,143);
    for(let u=0;u<d.h;u++)for(const off of [6.35,22.225,38.1]){
      const yy=topY+4+(u*U+off)*k;doc.circle(x+(w-236.525*k)/2,yy,.35,'F');doc.circle(x+(w+236.525*k)/2,yy,.35,'F');
    }
    d.items.filter(it=>!!it.back===rear).forEach(it=>{
      const yy=topY+4+it.pos2*U/2*k, hh=it.h2*U/2*k-.15;
      if(it.img) doc.addImage(it.img,'JPEG',x+w/2-125*k,yy,250*k,hh,(rear?'techrear':'techfront')+[...faces.keys()].indexOf(it.face),'FAST');
      else {doc.setFillColor(...hex(it.color));doc.rect(x+post/2,yy,w-post,hh,'F');}
    });
    dimension(x,topY+body+14,x+w,'~ '+outerW+' outer');
  };
  elevation(cols[0],false); elevation(cols[1],true);
  label('SIDE',cols[2],61);
  doc.setFillColor(d.sides==='acrylic'?231:240,242,239); doc.setDrawColor(75,86,79); doc.rect(cols[2],topY,depth*k,body+8,'FD');
  doc.setLineDashPattern([1, .8],0);doc.setDrawColor(139,161,144);
  d.items.filter(it=>it.depth>0).forEach(it=>{
    const dep=Math.min(depth,it.depth)*k, xx=it.back?cols[2]+depth*k-dep:cols[2], yy=topY+4+it.pos2*U/2*k;
    doc.rect(xx,yy,dep,Math.max(.8,it.h2*U/2*k),'S');
  });doc.setLineDashPattern([],0);
  doc.setDrawColor(170,180,172); doc.line(cols[2]+4,topY+4,cols[2]+depth*k-4,topY+4); doc.line(cols[2]+4,topY+body+4,cols[2]+depth*k-4,topY+body+4);
  dimension(cols[2],topY+body+14,cols[2]+depth*k,'~ '+depth+' depth');
  const viewBottom=topY+body+27;
  label('TOP / SCHEMATIC',M+4,viewBottom);
  const tk=.15, tx=M+4, ty=viewBottom+5;
  doc.setFillColor(240,243,240); doc.setDrawColor(75,86,79); doc.rect(tx,ty,outerW*tk,depth*tk,'FD');
  doc.setDrawColor(160,170,163);doc.rect(tx+5,ty+5,outerW*tk-10,depth*tk-10,'S');
  dimension(tx,ty+depth*tk+5,tx+outerW*tk,'~ '+outerW+' outer');
  let py=viewBottom+5;
  doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...green);text('PLACEMENT / U / SIDE',91,viewBottom);
  for(const it of d.items){
    doc.setFont('helvetica','normal');doc.setFontSize(8);const name=wrap(it.name,77),hh=Math.max(8,name.length*3.3+3);
    if(py+hh>239){py=head('Placement / continued',page());}
    doc.setFont('helvetica','bold');doc.setTextColor(...green);text(it.pos.replace(/ *\(back\)/i,''),91,py);doc.setFont('helvetica','normal');doc.setTextColor(...ink);text(name,112,py);py+=hh;
    doc.setFontSize(6);doc.setTextColor(...muted);text(it.back?'REAR':'FRONT',91,py-3);
  }
  y2=Math.max(ty+depth*tk+18,py+8);
  y2=fit(y2,54);y2=head('Frame / key dimensions',y2);
  const frameRows=[['Posts / side panels',fp.posts+' / '+fp.sides+(d.sides==='acrylic'?' acrylic':' printed')],['Other frame pieces','4 horizontals / 4 edges / 2 handles / 4 feet'],['Bay / mounting holes','222 mm clear / 236.525 mm hole centres'],['Bay height',(d.h*U).toFixed(1)+' mm nominal / '+d.h+'U']];
  doc.setFont('helvetica','normal');doc.setFontSize(8);
  for(const [a,b] of frameRows){doc.setTextColor(...muted);text(a,M,y2);doc.setTextColor(...ink);text(b,M+50,y2);y2+=6;}
  doc.setTextColor(...muted);text(wrap('~ = estimated outer envelope. Verify top mounts, clearances and acrylic contours against the actual model. Not a cutting or load-rated drawing.',W-2*M),M,y2+3);
  function airMap(m, y) {
    section('Cooling overview', 'Temperature by U, airflow and selected fans');
    y=head('Cooling overview',y);
    const stats=[['ROOM',Math.round(m.room)+' °C'],['WARMEST AIR',tC(m.maxT)],['HEAT',Math.round(m.Q)+' W'],['AIRFLOW',Math.round(m.flow)+' m³/h']];
    stats.forEach(([name,value],i)=>{const x=M+i*45.5;doc.setFillColor(243,246,243);doc.roundedRect(x,y,41.5,24,2,2,'F');doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(...muted);text(name,x+4,y+7);doc.setFontSize(16);doc.setTextColor(...(i===1&&m.maxT>40?[164,78,34]:ink));text(value,x+4,y+17);});
    y+=36;
    doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(...ink);text('Estimated air temperature / top to bottom',M,y);y+=9;
    for(let u=0;u<m.h;u++){
      const temp=(m.temp[u*2]+m.temp[u*2+1])/2, pos=m.h-u;
      doc.setFillColor(...heatRGB(temp-m.room,25));doc.roundedRect(M,y-4,W-2*M,13,1.5,1.5,'F');
      doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(...ink);text('U'+pos,M+4,y+3);
      const names=m.parts.filter(p=>p.pos2<(u+1)*2&&p.pos2+p.h2>u*2).map(p=>p.name);
      doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...muted);
      let name=clean(names.join(' / ')||'Open slot');while(doc.getTextWidth(name)>68&&name.length>4)name=name.slice(0,-2);text(name,M+19,y+3);
      const barX=M+95,barW=52;doc.setFillColor(255,255,255);doc.roundedRect(barX,y,barW,3,1,1,'F');
      const warm=[88,66,45];doc.setFillColor(...warm);doc.roundedRect(barX,y,Math.max(2,Math.min(1,(temp-m.room)/25)*barW),3,1,1,'F');
      doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(...ink);text(tC(temp),W-M-3,y+3,{align:'right'});y+=15;
    }
    y+=6;doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...muted);text('Colour = estimated air temperature. Scale: room temperature to +25 °C.',M,y);y+=6;
    const note=wrap('Planning estimate of the air around your equipment, not internal component temperature. Verify with real measurements after assembly.',W-2*M);text(note,M,y);y+=note.length*3.5+5;
    return y;
  }

  let y=page();section('Print & parts checklist','Only selected prints and essential purchases');
  y=head('Print & parts checklist',y);
  const tableRow=(name,qty,url,detail,cost)=>{
    doc.setFont('helvetica','bold');doc.setFontSize(8.5);const lines=wrap(name,112);
    doc.setFont('helvetica','normal');doc.setFontSize(7.5);const sub=detail?wrap(detail,112):[];
    const hh=Math.max(9,lines.length*3.5+sub.length*3.1+4);
    y=continued(y,hh,'Print & parts checklist');
    doc.setDrawColor(...line);doc.setLineWidth(.15);doc.line(M,y+hh-4,W-M,y+hh-4);
    doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(...(url?green:ink));text(lines,M+2,y);
    if(url)doc.link(M+2,y-3,112,Math.max(4,lines.length*3.5),{url});
    doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(...muted);if(sub.length)text(sub,M+2,y+lines.length*3.5);
    doc.setTextColor(...ink);text(qty,W-M-29,y,{align:'right'});if(cost)text(cost,W-M,y,{align:'right'});y+=hh;
  };
  doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...muted);text('TO PRINT / CLICK A MODEL NAME TO DOWNLOAD',M,y);y+=8;
  d.print.forEach(p=>tableRow(p.name,p.qty+'×',p.url,p.vars?'Variant: '+p.vars:'',null));
  y=fit(y+8,25);y=head('To buy / essential supplies',y);
  const supplies=e?e.supplies:window.LREstimate.essential(d.shop);
  supplies.forEach(r=>tableRow(r.name,r.qty==null?'check':String(r.qty)+'×',r.buy,r.qty==null?'Quantity needs checking':'Own '+r.owned+' / buy '+r.toBuy+(r.pack>1?' ('+r.packs+' packs of '+r.pack+')':''),r.cost==null?'unpriced':money(r.cost)));
  y=fit(y+5,17);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...muted);
  text(wrap('Filament is listed on the build overview. Quantities show total need; owned stock is deducted from purchases and costs. Tools, optional extras and device purchases are omitted.',W-2*M),M,y);
  if(d.wallMounts&&d.wallMounts.length){y=fit(y+18,32);y=head('Wall mounting / before drilling',y);doc.setFontSize(8);text(wrap('No verified hole coordinates are available for the selected bracket. Download the bracket model and measure or use the printed bracket as a template. No inferred drilling pattern is provided.',W-2*M),M,y);y+=15;for(const wall of d.wallMounts){doc.setTextColor(...green);doc.textWithLink(clean(wall.name),M,y,{url:wall.url});y+=6;}}

  const c=d.cooling;
  if(c&&c.map){
    y2=airMap(c.map,page());
    const notes=[...c.fans.map(f=>f.name+' / '+f.dir),...c.tips.slice(0,2).map(t=>t.text)];
    if(notes.length){
      y2=fit(y2+8,22);y2=head('For this build',y2);
      doc.setFont('helvetica','normal');doc.setFontSize(9);
      for(const note of notes){const lines=wrap(note,W-2*M-8);y2=fit(y2,lines.length*4+6);doc.setTextColor(...ink);text(lines,M+4,y2);y2+=lines.length*4+6;}
    }
  }

  // Illustrated steps: one action per card, at most three cards per page.
  if (d.guide && d.guide.length && window.LRGuide) {
    const steps=window.LRGuide.cards(d);
    y=page(); section('Illustrated assembly', 'One action per image / build-specific instructions');
    y=head('Illustrated assembly',y);
    doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...muted);
    text('Green highlights the action. Drawings are schematics; use the model maker instructions for exact joints.',M,y);y+=11;
    let onPage=0;
    for(let i=0;i<steps.length;i++){
      const st=steps[i];
      doc.setFont('helvetica','bold');doc.setFontSize(11);const title=wrap(st.title,94);
      doc.setFont('helvetica','normal');doc.setFontSize(9.5);const body=wrap(st.body,94);
      doc.setFontSize(8);const tip=st.tip?wrap(st.tip,89):[];
      const hh=Math.max(67,18+title.length*4.2+body.length*4+(tip.length?tip.length*3.5+7:0));
      if(onPage===3||y+hh>BOT){y=head('Assembly / continued',page());y+=3;onPage=0;}
      doc.setLineWidth(.2);doc.setDrawColor(219,226,220);doc.setFillColor(255,255,255);doc.roundedRect(M,y-3,W-2*M,hh,3,3,'FD');
      const art=await raster(window.LRGuide.svg(st,d),240,200,3,'image/png');doc.addImage(art,'PNG',M+3,y+1,68,56.67,'step'+i,'FAST');
      const x=M+77;let yy=y+3;
      doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(...green);text(String(i+1).padStart(2,'0')+' / '+st.phase.replace(/^\d+ \/ /,'').toUpperCase(),x,yy);yy+=7;
      doc.setFontSize(11);doc.setTextColor(...ink);text(title,x,yy);yy+=title.length*4.2+3;
      doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(...ink);text(body,x,yy);yy+=body.length*4+4;
      if(tip.length){doc.setDrawColor(...green);doc.setLineWidth(.6);doc.line(x,yy-2,x,yy+tip.length*3.5);doc.setFontSize(8);doc.setTextColor(...muted);text(tip,x+3,yy+1);}
      y+=hh+6;onPage++;
    }
  }
  // Fill the cover directory once the final page positions are known.
  doc.setPage(1);
  navigation.forEach((entry,i)=>{
    const yy=223+i*12;
    doc.setFillColor(255,255,255);doc.roundedRect(M,yy-5,W-2*M,11,2,2,'F');
    doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(...ink);text(entry.title,M+5,yy);
    doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...muted);text(entry.detail,M+5,yy+4);
    doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(...green);text(String(entry.page).padStart(2,'0'),W-M-5,yy+3,{align:'right'});
    doc.link(M,yy-5,W-2*M,11,{pageNumber:entry.page});
    if(doc.outline&&doc.outline.add)doc.outline.add(null,entry.title,{pageNumber:entry.page});
  });
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    if (i > 1) {
      doc.setFillColor(...green); doc.rect(M, 14, 2, 6, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...ink); text('MINI RACK PLANNER', M + 5, 18);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...muted); text(d.title, W - M, 18, { align: 'right' });
      doc.setDrawColor(...line); doc.setLineWidth(.2); doc.line(M, 24, W - M, 24);
      doc.line(M, 283, W - M, 283);
      doc.setFontSize(7); text('BUILD PLAN  /  ' + date.toUpperCase(), M, 289);
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...muted); text(String(i).padStart(2, '0') + ' / ' + String(pages).padStart(2, '0'), W - M, 289, { align: 'right' });
  }
  return new Uint8Array(doc.output('arraybuffer'));
}
window.LRPdf = { make };
})();
