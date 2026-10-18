// Shared routing keeps file-based settings separate from content entries.
export function createEditorContent({validateEntry,renderEntry,validateProduct,renderProductPreview,validateShopSettings,renderShopPoliciesPage,shopSettings}) {
 return {
  validate(data,collection) {
   if(collection==='shop_settings')return validateShopSettings(data);
   return collection==='products'?validateProduct(data):validateEntry(data,collection);
  },
  render(data,collection,{english=false}={}) {
   if(collection==='shop_settings')return renderShopPoliciesPage(data,{english});
   return collection==='products'?renderProductPreview(data,{english,preview:true,settings:shopSettings}):renderEntry(data,collection);
  },
  notice(data,collection) {
   if(collection==='shop_settings')return '这是商店共用的公开说明。发布后会更新商店及商品页面；空白项目不会显示。';
   if(collection==='products')return (data.published?'发布后将按网站版式显示。':'当前设置为下架，发布后不会在官网显示。')+'搜索与分享信息会随商品资料自动更新，无需单独填写。';
   return data.published?'发布后将按网站版式显示。':'当前设置为下架，发布后不会在官网显示。';
  },
  isShop(collection) {return collection==='products'||collection==='shop_settings';}
 };
}
export function resolvePreviewAssets(html,data,getAsset) {
 const sources=[...(data.media||[]).flatMap(m=>[m.src,m.poster]),...(data.variants||[]).map(v=>v.image)].filter(Boolean);
 for(const src of sources){
  const normalized=src.replace(/^\//,''),asset=String(getAsset(normalized)||src);
  const resolved=asset.startsWith('assets/')?'/'+asset:asset;
  for(const path of [normalized,'/'+normalized])html=html.split(`="${path}"`).join(`="${resolved.replace(/"/g,'&quot;')}"`);
 }
 return html;
}
