/* Planning allowances, not live retail prices. EUR by default; user values take precedence. */
(function () {
'use strict';
const defaults = { currency:'EUR', kgPrice:25, kwhPrice:.30, watts:120, gramsHour:25, slicedGrams:null, slicedHours:null, prices:{}, owned:{}, filamentOwned:{} };
const allowance = { m6x10:8,m6x12:8,insert:12,nut:5,m3x8lp:6,m25kit:8,fan40:8,fan80:10,fan92:12,fan120:12,fan140:15,fan200:20,fanusb:4,fansplit:4,usbpower:10,powerstrip:15,pi5psu:15,pi4psu:10,poehat5:30,poehat4:25,poeinj:25,poeinjbt:45,usbc:5,keystone:20,patch:12,ties:5 };
function settings(raw) {
 const r=raw&&typeof raw==='object'?raw:{}, o={...defaults,prices:{}, owned:{}, filamentOwned:{}};
 o.currency=['EUR','USD','GBP','CAD','AUD'].includes(r.currency)?r.currency:'EUR';
 if(o.currency!=='EUR'){o.kgPrice=null;o.kwhPrice=null;}
 for(const [k,max] of Object.entries({kgPrice:1000,kwhPrice:10,watts:10000,gramsHour:500,slicedGrams:100000,slicedHours:10000})) {
  const v=r[k];if(typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max&&(k!=='gramsHour'||v>0))o[k]=v;
 }
 if(r.prices&&typeof r.prices==='object')for(const [k,v] of Object.entries(r.prices))if(typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100000)o.prices[k]=v;
 for(const name of ['owned','filamentOwned'])if(r[name]&&typeof r[name]==='object')for(const [k,v] of Object.entries(r[name]))if(typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100000)o[name][k]=Math.floor(v);
 return o;
}
function essential(rows) {return rows.filter(r=>!r.optional&&!['tools','print'].includes(r.group)&&r.key!=='fanspeed');}
function calculate(filament,rows,raw) {
 const s=settings(raw),base=filament.reduce((n,r)=>n+r.grams,0),grams=s.slicedGrams===null?base:s.slicedGrams;
 const ratio=base?grams/base:0, colours=filament.map(r=>{const g=r.grams*ratio,owned=s.filamentOwned[r.c]||0,missing=Math.max(0,g-owned);return {...r,grams:g,owned,missing,spools:Math.ceil(missing/1000)};});
 const hours=s.slicedHours===null?grams/s.gramsHour:s.slicedHours,kwh=hours*s.watts/1000;
 const supplies=essential(rows).map(r=>{
  const price=Object.prototype.hasOwnProperty.call(s.prices,r.key)?s.prices[r.key]:(s.currency==='EUR'?allowance[r.key]:null),owned=s.owned[r.key]||0;
  const toBuy=r.qty==null?null:Math.max(0,r.qty-owned),packs=toBuy===null?null:Math.ceil(toBuy/(r.pack||1));
  return {...r,owned,toBuy,packs,price:price??null,cost:packs===0?0:price==null||packs===null?null:price*packs};
 });
 const unknown=supplies.filter(r=>r.cost===null),hardware=supplies.reduce((n,r)=>n+(r.cost||0),0),material=s.kgPrice===null&&grams>0?null:grams/1000*(s.kgPrice||0),electricity=s.kwhPrice===null&&kwh>0?null:kwh*(s.kwhPrice||0);
 const spools=colours.reduce((n,r)=>n+r.spools,0),spoolCost=s.kgPrice===null&&spools>0?null:spools*(s.kgPrice||0);
 if(spoolCost===null)unknown.push({key:'material-price',name:'Local filament price'});if(electricity===null)unknown.push({key:'electricity-price',name:'Local electricity tariff'});
 return {s,grams,colours,hours,kwh,material,electricity,printing:material===null||electricity===null?null:material+electricity,hardware,spools,spoolCost,total:(spoolCost||0)+(electricity||0)+hardware,unknown,supplies,timeSource:s.slicedHours===null?'rough throughput estimate':'slicer input',massSource:s.slicedGrams===null?'rough estimate incl. 10% reserve':'slicer input'};
}
window.LREstimate={defaults,settings,essential,calculate,money:(n,currency='EUR')=>n==null?'unpriced':new Intl.NumberFormat('en',{style:'currency',currency}).format(n)};
})();
