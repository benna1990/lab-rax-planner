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
// QR code (qrcode-generator 1.4.4 from cdnjs, loaded on demand like jsPDF): this layout's own link while the code stays
// scannable at 30 mm (85 modules or fewer, so modules of 0.35 mm or more), else the planner's home page
let qrp = null;
function loadQR() {
  if (!qrp) { qrp = (window.qrcode ? Promise.resolve() : window.LRParts.loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js')).then(() => window.qrcode); qrp.catch(() => { qrp = null; }); }
  return qrp;
}
const HOME = 'https://benna1990.github.io/lab-rax-planner/';
async function qrFor(url) {
  const qrcode = await loadQR().catch(() => null);
  if (!qrcode) return null;
  const make = s => { try { const q = qrcode(0, 'L'); q.addData(s); q.make(); return q; } catch (e) { return null; } };
  const own = url ? make(url) : null;
  if (own && own.getModuleCount() <= 85) return { q: own, url, full: true };
  const home = make(HOME);
  return home ? { q: home, url: HOME, full: false } : null;
}
// built-in PDF fonts only cover WinAnsi; map the few characters the planner uses that fall outside it
const clean = s => String(s == null ? '' : s).replace(/€/g, 'EUR ').replace(/≈/g, '~').replace(/→/g, '->').replace(/″/g, '"').replace(/✓/g, '').replace(/[^\x00-\xFF–—‘’“”•…×½]/g, '');
const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
// the planner's heat scale (light theme): room temperature to `span` °C above it. It only gets darker, so it survives greyscale printing.
const HEAT = ['#EEF6EF', '#D8EEDC', '#EDE6A8', '#F2C987', '#EC9F63', '#D8743F', '#B04E28'].map(hex), SPAN = 20;
function heatRGB(dT, span) { const p = Math.sqrt(Math.max(0, Math.min(1, dT / span))) * 6, i = Math.min(5, Math.floor(p)), f = p - i; return HEAT[i].map((v, k) => Math.round(v + (HEAT[i + 1][k] - v) * f)); }
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
  const qr = await qrFor(d.shareUrl);
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
  if(d.top){
    const t=d.top, cx=tx+outerW*tk/2, cy=ty+depth*tk/2, mm=+((t.match(/(\d{2,3}) ?mm/)||[])[1]||0);
    doc.setDrawColor(75,86,79);doc.setLineWidth(.25);
    if(/mesh|hex|vent/i.test(t)){doc.setFillColor(196,203,198);for(let gx=tx+7.5;gx<tx+outerW*tk-7;gx+=2.2)for(let gy=ty+7.5;gy<ty+depth*tk-7;gy+=2.2)doc.circle(gx,gy,.42,'F');}
    if(/\bu7\b|\bu6\b|access point/i.test(t)){const sz=(/u7 pro/i.test(t)?206:160)*tk, dz=/45/.test(t)?.71:1;doc.setFillColor(248,249,250);doc.roundedRect(cx-sz/2,cy-sz*dz/2,sz,sz*dz,sz*.16,sz*.16*dz,'FD');doc.setFillColor(110,160,230);doc.circle(cx,cy,.9,'F');}
    else if(mm){const r=mm/2*tk;doc.setFillColor(255,255,255);doc.circle(cx,cy,r,'FD');doc.setDrawColor(140,150,143);doc.line(cx-r*.7,cy-r*.7,cx+r*.7,cy+r*.7);doc.line(cx-r*.7,cy+r*.7,cx+r*.7,cy-r*.7);doc.circle(cx,cy,r*.22,'S');}
    doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.setTextColor(...muted);text(wrap('Top: '+t,outerW*tk+26),tx,ty+depth*tk+13.5);
  }
  let py=viewBottom+5;
  doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...green);text('PLACEMENT / U / SIDE',91,viewBottom);
  for(const it of d.items){
    doc.setFont('helvetica','normal');doc.setFontSize(8);const name=wrap(it.name,77),hh=Math.max(8,name.length*3.3+4);
    if(py+hh>239){py=head('Placement / continued',page());}
    doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...green);text(it.pos.replace(/ *\(back\)/i,''),91,py);
    doc.setFont('helvetica','normal');doc.setFontSize(6);doc.setTextColor(...muted);text(it.back?'REAR':'FRONT',91,py+3.2);
    doc.setFontSize(8);doc.setTextColor(...ink);text(name,112,py);py+=hh;
  }
  y2=Math.max(ty+depth*tk+(d.top?24:18),py+8);
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
    y+=34;
    const blue=[37,99,235], warm=[196,73,40];
    const kk=Math.min(60/280,118/(m.h*U)), rw=280*kk, bay=222*kk, rx=M+13, ry=y+20, layerH=U/2*kk, bh=m.h*U*kk, post=(rw-bay)/2;
    doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(...ink);text('Air temperature and airflow',M,y);
    doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(...muted);text('Front view. Blue arrows: air in; orange: air out (m³/h).',M,y+4.5);
    doc.setFillColor(64,70,66);doc.roundedRect(rx,ry-3,rw,bh+6,1,1,'F');doc.setFillColor(250,250,250);doc.rect(rx+post,ry,bay,bh,'F');
    d.items.filter(it=>!it.back&&it.img).forEach(it=>doc.addImage(it.img,'JPEG',rx+rw/2-125*kk,ry+it.pos2*layerH,250*kk,it.h2*layerH-.1,'heat'+[...faces.keys()].indexOf(it.face),'FAST'));
    const fade=doc.GState?new doc.GState({opacity:.5}):null;if(fade)doc.setGState(fade);
    m.temp.forEach((t,i)=>{doc.setFillColor(...heatRGB(t-m.room,SPAN));doc.rect(rx+post,ry+i*layerH,bay,layerH+.05,'F');});
    if(fade)doc.setGState(new doc.GState({opacity:1}));
    doc.setFont('helvetica','bold');doc.setFontSize(5.5);doc.setTextColor(255,255,255);
    for(let u=0;u<m.h;u++)text(String(m.h-u),rx+post/2,ry+(u+.5)*U*kk+1,{align:'center'});
    if(m.neutral!=null&&m.H){const ny=ry+bh-m.neutral/m.H*bh;doc.setLineDashPattern([1,.8],0);doc.setDrawColor(90,96,92);doc.setLineWidth(.25);doc.line(rx+post,ny,rx+rw-post,ny);doc.setLineDashPattern([],0);doc.setFont('helvetica','normal');doc.setFontSize(5.5);doc.setTextColor(...muted);text('neutral',rx+rw-post-1,ny-.8,{align:'right'});}
    // arrows: front openings and front fans on the left, back and sides on the right, the top above
    const mean=(layers,flows,sign)=>{let w=0,sum=0;(flows||[]).forEach((f,i)=>{const v=sign*f;if(v>0){w+=v;sum+=v*layers[i];}});return w?{layer:sum/w,flow:w}:null;};
    const arrows=[], add=(side,layer,flow)=>{if(Math.abs(flow)>=.5)arrows.push({side,layer,flow});};
    const sideOf=k=>k==='top'?'top':(k==='back'||k==='side')?'right':'left';
    (m.openings||[]).forEach(o=>{const side=sideOf(o.kind);if(side==='top'){add('top',0,(o.in||0)-(o.out||0));return;}const i=mean(o.layers,o.flows,1),out=mean(o.layers,o.flows,-1);if(i)add(side,i.layer,i.flow);if(out)add(side,out.layer,-out.flow);});
    (m.fans||[]).forEach(f=>{const side=sideOf(f.place);add(side,f.pos2!=null?f.pos2+(f.h2||1)/2-.5:0,(f.in||0)-(f.out||0));});
    const arrow=(x1,y1,x2,y2,c)=>{doc.setDrawColor(...c);doc.setFillColor(...c);doc.setLineWidth(.55);const a2=Math.atan2(y2-y1,x2-x1),h=1.9;doc.line(x1,y1,x2-Math.cos(a2)*h*.8,y2-Math.sin(a2)*h*.8);doc.triangle(x2,y2,x2-h*Math.cos(a2-.42),y2-h*Math.sin(a2-.42),x2-h*Math.cos(a2+.42),y2-h*Math.sin(a2+.42),'F');};
    arrows.sort((p,q)=>Math.abs(q.flow)-Math.abs(p.flow)).slice(0,8).forEach(ar=>{
      const inn=ar.flow>0,c=inn?blue:warm,lab=(inn?'in ':'out ')+Math.round(Math.abs(ar.flow));
      doc.setFont('helvetica','bold');doc.setFontSize(5.8);doc.setTextColor(...c);
      if(ar.side==='top'){const cx=rx+rw/2,y0=ry-4;if(inn)arrow(cx,y0-8,cx,y0-.5,c);else arrow(cx,y0-.5,cx,y0-8,c);text(lab,cx+1.5,y0-5);}
      else{const yy=ry+(ar.layer+.5)*layerH;
        if(ar.side==='left'){if(inn)arrow(M,yy,rx-.6,yy,c);else arrow(rx-.6,yy,M,yy,c);text(lab,M,yy-1.4);}
        else{const x0=rx+rw+.6,x1=rx+rw+12;if(inn)arrow(x1,yy,x0,yy,c);else arrow(x0,yy,x1,yy,c);text(lab,x0+.6,yy-1.4);}}
    });
    // the scale: room temperature to +20 °C, fixed so racks compare
    const sy=ry+bh+10;for(let i=0;i<24;i++){doc.setFillColor(...heatRGB(i/23*SPAN,SPAN));doc.rect(rx+i*rw/24,sy,rw/24+.05,3,'F');}
    doc.setFont('helvetica','normal');doc.setFontSize(6);doc.setTextColor(...muted);
    [[0,tC(m.room,true)],[.5,'+'+SPAN/2+'°'],[1,'+'+SPAN+'°']].forEach(([f,l])=>text(l,rx+f*rw,sy+6,{align:f===0?'left':f===1?'right':'center'}));
    // per U, top to bottom
    const tx0=rx+rw+16, tw=W-M-tx0, rowH=Math.max(6.4,Math.min(10,(bh+6)/m.h));
    let ty=ry-3;doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(...muted);text('PER U, TOP TO BOTTOM',tx0,ty-2.5);
    for(let u=0;u<m.h;u++){
      const temp=(m.temp[u*2]+m.temp[u*2+1])/2,names=m.parts.filter(p=>p.pos2<(u+1)*2&&p.pos2+p.h2>u*2).map(p=>p.name);
      doc.setFillColor(...heatRGB(temp-m.room,SPAN));doc.roundedRect(tx0,ty,tw,rowH-1,1,1,'F');
      doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...ink);text('U'+(m.h-u),tx0+2.5,ty+rowH/2+1);
      doc.setFont('helvetica','normal');doc.setFontSize(7);let nm=clean(names.join(' / ')||'Open slot');while(doc.getTextWidth(nm)>tw-30&&nm.length>4)nm=nm.slice(0,-2);text(nm,tx0+12,ty+rowH/2+1);
      doc.setFont('helvetica','bold');doc.setFontSize(8.5);text(tC(temp),tx0+tw-2.5,ty+rowH/2+1,{align:'right'});ty+=rowH;
    }
    y=Math.max(sy+12,ty+4);
    doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...muted);
    const note=wrap('Colour = estimated air temperature, room to +'+SPAN+' °C. A planning estimate of the air around your equipment, not the temperature inside it; check with a thermometer after an hour of use.',W-2*M);text(note,M,y);y+=note.length*3.5+5;
    return y;
  }

  let y=page();section('Print & parts checklist','Only selected prints and essential purchases');
  y=head('Print & parts checklist',y);
  const tableRow=(name,qty,url,detail,cost)=>{
    doc.setFont('helvetica','bold');doc.setFontSize(8.5);const lines=wrap(name,112),nameW=doc.getTextWidth(clean(lines[lines.length-1]));
    doc.setFont('helvetica','normal');doc.setFontSize(7);
    const inline=!!detail&&nameW+3+doc.getTextWidth(clean(detail))<=112, sub=detail&&!inline?wrap(detail,112):[];
    const hh=Math.max(6.6,lines.length*3.6+sub.length*3+3);
    y=continued(y,hh,'Print & parts checklist');
    doc.setDrawColor(...line);doc.setLineWidth(.15);doc.line(M,y+hh-3.4,W-M,y+hh-3.4);
    doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(...(url?green:ink));text(lines,M+2,y);
    if(url)doc.link(M+2,y-3,112,Math.max(4,lines.length*3.6),{url});
    doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(...muted);
    if(inline)text(detail,M+2+nameW+3,y+(lines.length-1)*3.6);else if(sub.length)text(sub,M+2,y+lines.length*3.6);
    doc.setFontSize(8);doc.setTextColor(...ink);text(qty,W-M-29,y,{align:'right'});if(cost)text(cost,W-M,y,{align:'right'});y+=hh;
  };
  doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...muted);text('TO PRINT / CLICK A MODEL NAME TO DOWNLOAD',M,y);y+=8;
  d.print.forEach(p=>tableRow(p.name,p.qty+'×',p.url,p.vars?'Variant: '+p.vars:'',null));
  y=fit(y+8,25);y=head('To buy / essential supplies',y);
  doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(...muted);
  const buyNote=wrap('Total need per item; what you already own is deducted from what to buy and the costs. Filament is on page 1; tools, optional extras and devices are left out.',W-2*M);text(buyNote,M,y-2);y+=buyNote.length*3.2+3;
  const supplies=e?e.supplies:window.LREstimate.essential(d.shop);
  supplies.forEach(r=>tableRow(r.name,r.qty==null?'check':String(r.qty)+'×',r.buy,r.qty==null?'Quantity needs checking':'Own '+r.owned+' / buy '+r.toBuy+(r.pack>1?' ('+r.packs+(r.packs===1?' pack':' packs')+' of '+r.pack+')':''),r.cost==null?'unpriced':money(r.cost)));
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
  const navW=W-2*M-(qr?40:0);
  if(qr){ // the QR code beside the navigation: this rack with its shopping list on a phone
    const n=qr.q.getModuleCount(), size=32, cell=size/n, qx=W-M-size-2, qy=216;
    doc.setFillColor(255,255,255);doc.roundedRect(qx-3,qy-3,size+6,size+15,2,2,'F');doc.setFillColor(...ink);
    for(let r=0;r<n;r++)for(let col=0;col<n;col++)if(qr.q.isDark(r,col))doc.rect(qx+col*cell,qy+r*cell,cell+.02,cell+.02,'F');
    doc.link(qx,qy,size,size,{url:qr.url});
    doc.setFont('helvetica','bold');doc.setFontSize(6.5);doc.setTextColor(...ink);text(wrap(qr.full?'Scan: this rack and its shopping list':'Scan: open the planner',size+2),qx+size/2,qy+size+4,{align:'center'});
  }
  navigation.forEach((entry,i)=>{
    const yy=223+i*12;
    doc.setFillColor(255,255,255);doc.roundedRect(M,yy-5,navW,11,2,2,'F');
    doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(...ink);text(entry.title,M+5,yy);
    doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...muted);text(entry.detail,M+5,yy+4);
    doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(...green);text(String(entry.page).padStart(2,'0'),M+navW-5,yy+3,{align:'right'});
    doc.link(M,yy-5,navW,11,{pageNumber:entry.page});
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
