/* Mini Rack Planner — build-specific illustrated assembly cards. Original schematic drawings; no community meshes. */
(function () {
'use strict';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function cards(d) {
  const out=[], brass=d.version!=='Bolted', sections=new Set((d.guide||[]).map(s=>s.id));
  const add=(phase,title,body,drawing,tip)=>out.push({phase,title,body,drawing,tip:tip||''});
  add('01 / Prepare','Print and prepare', 'Download the selected model variants and slice them for your printer. Sort the frame pieces and mounts.'+(brass?' Fit the specified heat-set inserts squarely and let them cool.':''),'print',brass?'Fit post inserts only at the panel positions in your layout.':'Check screw and nut sizes against the selected model.');
  add('02 / Frame','Build from the bottom up','1. Assemble the base. 2. Attach the four posts'+(d.frameParts.joiners?' and joiners':'')+'. 3. Slide in the '+(d.sides==='acrylic'?'acrylic':'printed')+' sides. 4. Fit the top, handles and feet.','assembly',d.sides==='acrylic'?'Verify acrylic thickness and cut size before ordering.':d.frameParts.joiners?'Check the extension model for joiner fasteners.':'Start all screws before tightening the frame.');
  if(d.items.length)add('03 / Devices','Fit the selected devices','Fit each device into its mount, then attach the panels at the U positions and sides in the placement table. Half-U panels use two mounting screws; taller panels use four.','mounts',d.items.some(i=>i.back)?'Rear-mounted devices face out the back.':'');
  if(sections.has('network')||sections.has('power'))add('04 / Connect','Connect network and power',(sections.has('network')?'Connect the devices to the switch with short patch cables. ':'')+'Use the correct certified supply per device and one suitable power strip. Do not chain power strips.','power',sections.has('network')?'Route network and power cables on opposite sides.':'');
  if(sections.has('fans'))add('05 / Cooling','Connect the selected fans','Match fan voltage to the supply and follow the airflow direction in the cooling plan. Check the fan arrows before fastening.','fans','Keep total fan current below the supply rating.');
  if(d.wallMounts&&d.wallMounts.length)add('Wall mounting','Fit the selected wall bracket','Follow the selected bracket model and choose fixings for your wall and loaded rack. Measure the actual bracket before marking holes.','wall','No verified hole coordinates are available; use the bracket as the template.');
  add('Finish','Check and switch on','Check frame joints and cable clearance. Start one device at a time, then check operation and temperature after an hour of normal use.','finish','Label both ends of each cable.');
  return out;
}
function svg(c, d) {
  const green = '#17824a', ink = '#3a444a', pale = '#dce2df', bg = '#f1f4f1', brass = '#c89d44';
  const line = (x1,y1,x2,y2,col=ink,w=4) => '<path d="M'+x1+' '+y1+'L'+x2+' '+y2+'" stroke="'+col+'" stroke-width="'+w+'" stroke-linecap="round" fill="none"/>';
  const rect = (x,y,w,h,fill=pale,stroke=ink) => '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="3" fill="'+fill+'" stroke="'+stroke+'" stroke-width="2"/>';
  const txt = (s,x,y,size=11,col=ink) => '<text x="'+x+'" y="'+y+'" font-family="Arial,Helvetica,sans-serif" font-size="'+size+'" fill="'+col+'">'+esc(s)+'</text>';
  const arrow = (x1,y1,x2,y2) => line(x1,y1,x2,y2,green,2)+'<circle cx="'+x2+'" cy="'+y2+'" r="3" fill="'+green+'"/>';
  const ring = (y,col) => '<path d="M52 '+y+'L166 '+y+'L194 '+(y-23)+'L80 '+(y-23)+'Z" fill="'+(col===green?'#e3f2e8':bg)+'" stroke="'+col+'" stroke-width="5" stroke-linejoin="round"/>';
  const posts = (col) => line(52,148,52,51,col,7)+line(166,148,166,51,col,7)+line(80,125,80,28,col,6)+line(194,125,194,28,col,6);
  const fullRack = () => ring(148,ink)+posts(ink)+ring(51,ink);
  let a='';
  switch(c.drawing) {
    case 'print':
      a=rect(30,126,182,12)+line(46,126,46,30)+line(196,126,196,30)+line(46,30,196,30)+rect(105,29,32,25,ink)+ '<path d="M114 54h14l-7 13Z" fill="'+green+'"/>' + rect(70,98,40,24,'#e3f2e8',green)+rect(129,109,60,13,'#e3f2e8',green)+arrow(121,72,121,94)+txt('FRAME + MOUNTS',61,163);break;
    case 'inserts':
      a=rect(88,77,52,77)+ '<circle cx="114" cy="103" r="14" fill="'+brass+'" stroke="'+ink+'" stroke-width="2"/>' + '<circle cx="114" cy="103" r="6" fill="white"/>'+rect(104,21,20,35,ink)+arrow(114,59,114,81)+txt('SQUARE + FLUSH',61,175);break;
    case 'base':a=ring(133,green)+rect(91,87,49,15)+arrow(115,68,115,97)+txt('BOTTOM PANEL',72,164);break;
    case 'posts':a=ring(148,ink)+posts(green)+arrow(36,63,36,112)+arrow(209,42,209,93);break;
    case 'joiners':a=rect(62,105,25,57)+rect(62,30,25,57)+rect(54,82,41,27,'#e3f2e8',green)+arrow(75,56,75,80)+txt('POST',115,55)+txt('JOINER',115,100)+txt('POST',115,140);break;
    case 'sides':a=ring(148,ink)+posts(ink)+'<path d="M171 63l19-17v73l-19 17Z" fill="#e3f2e8" stroke="'+green+'" stroke-width="3"/>'+arrow(182,15,182,55)+txt(d.sides==='acrylic'?'ACRYLIC SIDES':'PRINTED SIDES',52,178);break;
    case 'top':a=ring(148,ink)+posts(ink)+ring(34,green)+arrow(115,11,115,29)+rect(46,155,16,9,green)+rect(160,155,16,9,green)+txt(d.top?'SELECTED TOP MOUNT':'TOP + HANDLES + FEET',40,184);break;
    case 'assembly': a=ring(151,ink)+posts(ink)+ring(31,green)+arrow(115,8,115,25)+'<path d="M172 62l16-14v69l-16 14Z" fill="#e3f2e8" stroke="'+green+'" stroke-width="2"/>'+txt('1 BASE',12,175,10)+txt('2 POSTS',82,175,10)+txt('3 SIDES',152,175,10)+txt('4 TOP',97,190,10);break;
    case 'wall': a=rect(38,17,10,147)+rect(50,51,34,13,'#e3f2e8',green)+rect(88,37,103,115)+line(48,58,64,58,green,3)+txt('WALL',15,184,10)+txt('BRACKET + RACK',85,184,10);break;
    case 'mounts': {
      a=rect(62,16,11,150)+rect(187,16,11,150);
      d.items.forEach(it=>{const yy=19+it.pos2/(d.h*2)*140,hh=Math.max(4,it.h2/(d.h*2)*140-1);a+=rect(58,yy,144,hh,it.back?'#dbe4f0':'#e3f2e8',it.back?'#55799d':green);});
      a+=txt('USE THE U / SIDE TABLE',50,187,10);break;
    }
    case 'mount': {
      a=rect(66,16,11,150)+rect(187,16,11,150);
      const n=d.h*2, yy=21+c.item.pos2/n*137, hh=Math.max(7,c.item.h2/n*137);
      for(let k=0;k<n;k++)a+='<circle cx="71.5" cy="'+(22+k/n*137)+'" r="1.8" fill="#7a8781"/><circle cx="192.5" cy="'+(22+k/n*137)+'" r="1.8" fill="#7a8781"/>';
      a+=rect(61,yy,142,hh,'#e3f2e8',green)+arrow(26,yy+hh/2,57,yy+hh/2)+txt(c.item.back?'REAR / '+c.item.pos:'FRONT / '+c.item.pos,65,185);
      if(c.item.face) {
        const face=c.item.face.replace(/\s(?:width|height)="[^"]*"/g,'');
        a+=face.replace('<svg ', '<svg x="80" y="'+yy+'" width="105" height="'+hh+'" ');
      }
      break;
    }
    case 'network':a=rect(25,35,70,33)+rect(134,93,83,35)+rect(25,132,70,33)+line(95,51,174,51,green,3)+line(174,51,174,93,green,3)+line(60,132,60,110,green,3)+line(60,110,134,110,green,3)+txt('DEVICE',38,56)+txt('DEVICE',38,153)+txt('SWITCH',151,114);break;
    case 'power':a=rect(31,124,181,25)+[49,86,123,160].map(x=>'<circle cx="'+x+'" cy="136" r="6" fill="white" stroke="'+ink+'"/>').join('')+rect(65,34,48,41)+txt('PSU',77,59)+line(88,75,88,124,green,3)+rect(146,34,49,41)+txt('DEVICE',149,59,10)+line(113,54,146,54,green,3)+txt('CERTIFIED SUPPLY + STRIP',32,174,10);break;
    case 'fans':a=fullRack()+'<circle cx="112" cy="100" r="25" fill="white" stroke="'+green+'" stroke-width="3"/>'+line(95,83,129,117,green,5)+line(129,83,95,117,green,5)+arrow(22,143,45,143)+arrow(111,65,111,17)+txt('IN',17,162)+txt('OUT',124,20);break;
    default:a=fullRack()+'<path d="M92 95l15 15 30-37" fill="none" stroke="'+green+'" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'+txt('CHECK / POWER UP / TEST',35,180,10);
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 200" role="img" aria-label="'+esc(c.title)+'"><rect width="240" height="200" rx="12" fill="'+bg+'"/>'+a+'</svg>';
}
const css = '.assembly-cards{display:grid;gap:14px;margin:16px 0}.assembly-card{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.35fr);gap:18px;padding:18px;border:1px solid var(--line,#dce2df);border-radius:14px;break-inside:avoid}.assembly-art svg{display:block;width:100%;height:auto}.assembly-phase{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted,#6a6f76)}.assembly-copy h3{font-size:17px;margin:5px 0 9px;line-height:1.3}.assembly-copy p{font-size:13px;line-height:1.5;margin:0}.assembly-tip{margin-top:12px!important;padding-left:10px;border-left:3px solid #17824a;font-size:12px!important}.assembly-details{margin:12px 0;color:var(--muted,#6a6f76)}@media(max-width:540px){.assembly-card{grid-template-columns:1fr}.assembly-art{max-width:260px;margin:auto;width:100%}}@media print{.assembly-card{grid-template-columns:1fr 1.35fr}.assembly-art{max-width:none}}';
function html(d) {
  return '<div class="assembly-cards">'+cards(d).map((c,i)=>'<article class="assembly-card"><div class="assembly-art">'+svg(c,d)+'</div><div class="assembly-copy"><span class="assembly-phase">'+(i+1)+' / '+esc(c.phase)+'</span><h3>'+esc(c.title)+'</h3><p>'+esc(c.body)+'</p>'+(c.tip?'<p class="assembly-tip">'+esc(c.tip)+'</p>':'')+'</div></article>').join('')+'</div>';
}
window.LRGuide = { cards, svg, html, css };
})();
