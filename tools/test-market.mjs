import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context={window:{},URL};vm.runInNewContext(readFileSync(new URL('../market.js',import.meta.url),'utf8'),context);
const shops=JSON.parse(readFileSync(new URL('../catalog.json',import.meta.url))).shops;
for(const country of ['US','GB','CA','AU','DE','FR','OTHER']){
 const links=context.window.LRMarket.links('M6 screws',country,shops);assert(!links.some(l=>l.shop.toLowerCase().includes('bol')));
 const amazon=links.find(l=>l.shop.toLowerCase().includes('amazon'));if(country==='OTHER')assert(!amazon);else assert.equal(new URL(amazon.url).hostname,context.window.LRMarket.regions[country].amazon);
}
assert(context.window.LRMarket.links('M6','NL',shops).some(l=>l.shop.toLowerCase().includes('bol')));
console.log('Marketplace checks passed: regional Amazon domains and bol limited to NL/BE.');
