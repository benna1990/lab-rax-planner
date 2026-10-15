/* Destination-specific search links. No price scraping, automatic checkout or currency conversion. */
(function(){
'use strict';
const regions={NL:{name:'Netherlands',currency:'EUR',amazon:'www.amazon.nl'},BE:{name:'Belgium',currency:'EUR',amazon:'www.amazon.com.be'},DE:{name:'Germany',currency:'EUR',amazon:'www.amazon.de'},FR:{name:'France',currency:'EUR',amazon:'www.amazon.fr'},GB:{name:'United Kingdom',currency:'GBP',amazon:'www.amazon.co.uk'},US:{name:'United States',currency:'USD',amazon:'www.amazon.com'},CA:{name:'Canada',currency:'CAD',amazon:'www.amazon.ca'},AU:{name:'Australia',currency:'AUD',amazon:'www.amazon.com.au'},OTHER:{name:'Other / international',currency:'USD',amazon:null}};
function links(q,region,shops){
 const r=regions[region]||regions.OTHER,out=[];
 for(const [id,shop] of Object.entries(shops||{})){
  if(!shop||typeof shop.url!=='string'||id.startsWith('_'))continue;
  if(id==='bol'&&!['NL','BE'].includes(region))continue;
  if(id==='amazon'&&!r.amazon)continue;
  if(!['amazon','bol','aliexpress'].includes(id)&&!(shop.countries||[]).includes(region))continue;
  const template=id==='amazon'?'https://'+r.amazon+'/s?k={q}':shop.url;
  let url=template.replace('{q}',encodeURIComponent(q)),aff=false;
  // Affiliate identifiers are marketplace-specific; use the configured tag only on its configured domain.
  const sameMarket=id!=='amazon'||new URL(shop.url.replace('{q}','x')).hostname===r.amazon;
  if(sameMarket&&shop.tag&&shop.tagParam){url+=(url.includes('?')?'&':'?')+encodeURIComponent(shop.tagParam)+'='+encodeURIComponent(shop.tag);aff=true;}
  if(sameMarket&&shop.wrap){url=shop.wrap.replace('{url}',encodeURIComponent(url));aff=true;}
  out.push({shop:shop.name||id,url,aff});
 }
 return out;
}
window.LRMarket={regions,links};
})();
