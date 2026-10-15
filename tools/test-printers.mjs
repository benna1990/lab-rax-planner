import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context={window:{}};vm.runInNewContext(readFileSync(new URL('../printers.js',import.meta.url),'utf8'),context);
const L=context.window.LRPrinters, bed=id=>L.bed({id});
// fitRect against a brute-force search over turns of 0.05°
const brute=(p,q,a,b)=>{if(p<=a&&q<=b||p<=b&&q<=a)return 2;for(let t=0;t<=90;t+=.05){const r=t*Math.PI/180,w=p*Math.cos(r)+q*Math.sin(r),h=p*Math.sin(r)+q*Math.cos(r);if(w<=a+1e-6&&h<=b+1e-6)return 1;}return 0;};
let seed=7;const rnd=(lo,hi)=>{seed=(seed*16807)%2147483647;return lo+(hi-lo)*seed/2147483647;};
let checked=0;
for(let i=0;i<4000;i++){
 const a=rnd(150,360),b=rnd(150,360),p=rnd(50,420),q=rnd(2,200),want=brute(p,q,a,b),got=L.fitRect(p,q,a,b);
 if(want!==got&&Math.abs(want-got)===1){const s=1.004;if(L.fitRect(p/s,q/s,a,b)===want||L.fitRect(p*s,q*s,a,b)===want)continue;} // within the sampling step of an edge case
 assert.equal(got,want,`fitRect(${p.toFixed(1)}, ${q.toFixed(1)}, ${a.toFixed(1)}, ${b.toFixed(1)})`);checked++;
}
const panel1U=[254,44.45-.79,3], horizontal=[280,32,36];
const f=(dims,B)=>L.fit({ways:[dims]},B);
assert.equal(f(panel1U,bed('a1mini')),0,'a full-width 1U panel is too big for an A1 mini');
assert.equal(f([254,21.4,3],bed('a1mini')),0,'a full-width ½U panel is too big for an A1 mini');
assert.equal(f(panel1U,bed('a1')),2,'a full-width panel fits a 256 mm bed straight');
assert.equal(f([254,4*44.45-.79,3],bed('a1')),2,'a 4U panel fits a 256 mm bed straight');
assert.equal(f(horizontal,bed('a1')),1,'the horizontal pieces only fit a 256 mm bed diagonally (Lab Rax article)');
assert.equal(f(horizontal,bed('ender3')),0,'the horizontal pieces don\'t fit a 220 mm bed (Lab Rax article)');
assert.equal(f([250,210,3],bed('mk4')),2,'a bed-sized part fits exactly');
// height: a shelf printed face-down stands as tall as it is deep
assert.equal(L.fit({ways:[[250,43.66,205]]},bed('a1mini')),0);
assert.equal(L.fit({ways:[[250,43.66,205],[250,205,43.66]]},bed('a1')),2,'a shelf may lie on its floor');
assert.equal(L.fit({ways:[[250,43.66,240]]},bed('mk4')),0,'too tall for a 220 mm build height');
// custom sizes: width and depth are needed, the height is optional
assert.equal(L.bed({id:'custom',w:300,d:200}).h,null);
assert.equal(L.bed({id:'custom',w:300}),null);
assert.equal(L.bed({id:'custom',w:20,d:200}),null);
assert.equal(L.bed({id:'nope'}),null);
assert.equal(L.bed(null),null);
const r=L.check([{name:'a',ways:[panel1U]},{name:'b',ways:[horizontal]},{name:'c',ways:[[100,40,3]]}],bed('a1'));
assert.equal(JSON.stringify([r.bad.length,r.turned.map(p=>p.name)]),JSON.stringify([0,["b"]]));
assert.equal(L.check([{name:'c',ways:[[100,40,3]]}],bed('a1mini')),null);
console.log(`Printer bed checks passed: ${checked} random fits match a brute-force search; panels, frame pieces and shelves on A1 mini, 256 mm, 220 mm and MK4 beds.`);
