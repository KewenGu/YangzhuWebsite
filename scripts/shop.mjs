import {escapeHTML as esc,safeMediaPath} from './content.mjs';
import {validateCommerce,commerceOptions,canBuyOption,effectiveAvailability,hasVariants,commerceSummary,renderPurchaseOptions} from './shop-commerce.mjs';
import {productSearchText,productImageText} from './shop-discovery.mjs';
import {defaultShopSettings,validateShopSettings,renderShopPolicies,policyPath} from './shop-settings.mjs';

export const productCategories=['pendants','calligraphy'];
const origin='https://yangzhu.org';
const pick=(p,key,en)=>en?(p[key+'_en']||p[key]||''):(p[key]||'');
const text=(zh,en,english)=>english?en:zh;
export function validStripeURL(value){return typeof value==='string'&&/^https:\/\/buy\.stripe\.com\/[A-Za-z0-9_]+$/.test(value);}
export function canPurchase(p){return commerceOptions(p).some(canBuyOption);}
export function validateProduct(p){
 if(!p||typeof p!=='object'||typeof p.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,99}$/.test(p.id))throw Error('商品标识仅能包含小写字母、数字与连字符');
 for(const field of ['title','body'])if(typeof p[field]!=='string'||!p[field].trim())throw Error(`${p.id}: 缺少 ${field}`);
 for(const field of ['title','title_en','summary','summary_en','body','body_en','details','details_en','faq','faq_en']){
  if(p[field]!=null&&(typeof p[field]!=='string'||p[field].length>(field.startsWith('body')?30000:field.startsWith('details')||field.startsWith('faq')?10000:field.startsWith('title')||field.startsWith('seo_title')?200:2000)))throw Error(`商品字段 ${field} 格式无效或过长`);
 }
 if(!productCategories.includes(p.category))throw Error('请选择商品分类');
 if(typeof p.published!=='boolean'||!Number.isFinite(p.order))throw Error('商品显示状态或排序无效');
 if(!['in_stock','out_of_stock','inquiry'].includes(p.availability))throw Error('商品销售状态无效');
 if(p.checkout_verified!=null&&typeof p.checkout_verified!=='boolean')throw Error('付款确认状态无效');
 if(p.currency!=='USD')throw Error('目前仅支持美元 USD');
 if(p.price!=null&&(typeof p.price!=='number'||!Number.isFinite(p.price)||p.price<=0||p.price>1000000||Math.abs(p.price*100-Math.round(p.price*100))>0.00001))throw Error('价格必须是最多两位小数的正数');
 if(p.stripe_url&&!validStripeURL(p.stripe_url))throw Error('请使用 https://buy.stripe.com/ 开头的 Stripe Payment Link');
 if(p.checkout_verified&&(!validStripeURL(p.stripe_url)||!p.price))throw Error('已确认付款的商品必须填写 Stripe 链接与价格');
 if(!Array.isArray(p.media)||p.media.length>20||(p.published&&!p.media.length))throw Error('已发布商品需要图片，最多20张');
 for(const m of p.media){
  if(m.kind!=='image'||! /\.(png|jpe?g|webp)$/i.test(safeMediaPath(m.src)))throw Error('商品仅支持 JPG、PNG、WebP 图片');
  for(const field of ['alt','alt_en'])if(m[field]!=null&&(typeof m[field]!=='string'||m[field].length>1000))throw Error('图片说明必须是有效文本，且不超过1000字');
  if(m.generated!=null&&typeof m.generated!=='boolean')throw Error('图片来源标记无效');
  if(m.thumbnail&&!/\.(png|jpe?g|webp)$/i.test(safeMediaPath(m.thumbnail)))throw Error('缩略图必须来自素材库');
 }
 if(p.published&&p.media[0]?.generated)throw Error('商品首图必须使用实物照片');
 validateCommerce(p);
 return p;
}
export const productPath=(p,en=false)=>`${en?'/en':''}/shop/${p.id}.html`;
// Replacing a CMS source image must not leave the catalogue using its old thumbnail.
export function productThumbnail(m){const src=safeMediaPath(m.src);return m.thumbnail&&safeMediaPath(m.thumbnail).replace(/-thumb\.(png|jpe?g|webp)$/i,'')===src.replace(/\.(png|jpe?g|webp)$/i,'')?safeMediaPath(m.thumbnail):src;}
const paragraphs=s=>String(s).split(/\n\s*\n/).filter(Boolean).map(s=>`<p>${esc(s).replace(/\n/g,'<br>')}</p>`).join('');
export function parseDetails(s){return String(s||'').split('\n').filter(s=>s.trim()).map(s=>{const at=s.search(/[:：]/);return at>0?[s.slice(0,at).trim(),s.slice(at+1).trim()]:['',s.trim()];});}
export function parseFAQ(s){return String(s||'').split(/\n\s*\n/).filter(Boolean).map(s=>s.split('\n')).filter(a=>a.length>1).map(([q,...a])=>({question:q.replace(/^(Q|问)[:：]\s*/i,''),answer:a.join('\n').replace(/^(A|答)[:：]\s*/i,'')}));}
export function productQuestions(p,{english:en=false,settings=defaultShopSettings}={}){
 const contact=validateShopSettings(settings).contact_email,options=commerceOptions(p),available=options.filter(canBuyOption),variants=hasVariants(p);
 const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value)+' USD';
 let answer;
 if(available.length){
  answer=variants?text('选择款式后，页面会显示该款的价格与供货状态；可购买的款式通过对应的 Stripe 入口结账。','Select a design to see its price and availability. Available designs have their own Stripe checkout link.',en):text(`当前商品价格为 ${money(available[0].price)}，可通过本页的 Stripe 入口结账。`,`The current product price is ${money(available[0].price)}. Use this page’s Stripe link to check out.`,en);
  answer+=' '+text('请在结账页核对所选商品、数量和最终总额。','Review the selected item, quantity, and final total at checkout.',en);
 }else{
  const soldOut=options.length&&options.every(o=>effectiveAvailability(o)==='out_of_stock');
  answer=text(soldOut?'商品暂时售罄。':'购买前需先确认款式与供货情况。',soldOut?'This product is currently unavailable.':'Please confirm the design and availability before purchasing.',en)+' '+text(`请联系 ${contact}。`,`Contact ${contact}.`,en);
 }
 const automatic=[{question:text('如何购买这件商品？','How can I purchase this product?',en),answer}];
 if(variants&&options.length)automatic.push({question:text('有哪些可选款式？','Which designs are available?',en),answer:options.map(o=>pick(o,'title',en)+' — '+text(canBuyOption(o)?'可购买':effectiveAvailability(o)==='out_of_stock'?'暂时售罄':'需咨询',canBuyOption(o)?'Available to purchase':effectiveAvailability(o)==='out_of_stock'?'Currently unavailable':'Please inquire',en)).join(en?'; ':'；')});
 // Buying answers are derived from current commerce data, never from old SEO copy.
 const custom=parseFAQ(pick(p,'faq',en)),questions=new Set(automatic.map(f=>f.question.trim().toLocaleLowerCase()));
 return [...automatic,...custom.filter(f=>!questions.has(f.question.trim().toLocaleLowerCase()))];
}
function status(p,en){return commerceSummary(p,en);}
function card(p,en){const m=p.media[0];return `<article class="shop-card" data-category="${p.category}"><a class="shop-card-image" href="${productPath(p,en)}">${m?`<img src="/${esc(productThumbnail(m))}" alt="${esc(productImageText(p,m,0,en))}" width="900" height="1100" loading="lazy">`:''}</a><div class="shop-card-meta"><span>${text(p.category==='pendants'?'随身佩饰':'符箓书画',p.category==='pendants'?'Pendants':'Talisman art',en)}</span><span>${status(p,en)}</span></div><h3><a href="${productPath(p,en)}">${esc(pick(p,'title',en))}<span aria-hidden="true">↗</span></a></h3><p>${esc(pick(p,'summary',en)||pick(p,'body',en).split('\n')[0])}</p></article>`;}
export function renderShop(products,{english:en=false,settings=defaultShopSettings}={}){
 const shopSettings=validateShopSettings(settings);
 const visible=products.filter(p=>p.published),featured=visible.filter(canPurchase),designs=visible.filter(p=>!canPurchase(p));
 return `<section class="shop-intro container"><div class="shop-intro-copy"><p class="shop-eyebrow">${text('阳翥 · 文化商店','YANGZHU · CULTURAL SHOP',en)}</p><h1>${text('把一份平安，<br>带入日常。','Tradition,<br>held close.',en)}</h1><p class="shop-lead">${text('从随身佩饰到居家符箓，以一件承载道教文化的物品，寄托平安与和合的心愿。','Taoist pendants and talisman art, carrying a tradition of prayers for peace, protection, and harmony into everyday life.',en)}</p><a class="text-link" href="#collection">${text('浏览商品','Explore the collection',en)} <span aria-hidden="true">↓</span></a></div><figure class="shop-intro-image"><img src="/assets/shop/calligraphy-collection.jpg" width="1200" height="900" alt="${text('阳翥协会陈列的红金色道教符箓卷轴','Red and gold Taoist talisman scrolls displayed at Yangzhu',en)}" fetchpriority="high"><figcaption>${text('传统相承，心意相随。','A living tradition. A meaningful connection.',en)}</figcaption></figure></section>
 <section class="shop-collection container" id="collection"><div class="shop-section-heading"><div><p class="shop-eyebrow">${text('精选商品','THE COLLECTION',en)}</p><h2>${text('为日常，寄一份祝愿','Objects with meaning',en)}</h2></div><p>${text('由美国阳翥道教协会提供。','Offered by the Yangzhu Taoist Association of America.',en)}</p></div>${featured.length?`<div class="shop-grid shop-featured">${featured.map(p=>card(p,en)).join('')}</div>`:`<p>${text('商品正在整理，欢迎联系协会咨询。','Our collection is being prepared. Please contact the Association with inquiries.',en)}</p>`}</section>
 ${designs.length?`<section class="shop-collection shop-designs container"><div class="shop-section-heading"><div><p class="shop-eyebrow">${text('细看传统','EXPLORE THE DESIGNS',en)}</p><h2>${text('一物一意','A closer look',en)}</h2></div><p>${text('不同纹样，各有文化意涵。请先咨询具体款式及供货情况。','Discover the symbolism of each design. Please inquire about individual designs and availability.',en)}</p></div><div class="shop-filters" aria-label="${text('商品分类','Product categories',en)}" hidden><button type="button" data-filter="all" aria-pressed="true">${text('全部','All designs',en)}</button><button type="button" data-filter="pendants" aria-pressed="false">${text('佩饰','Pendants',en)}</button><button type="button" data-filter="calligraphy" aria-pressed="false">${text('符箓书画','Talisman art',en)}</button></div><p class="sr-only shop-filter-status" aria-live="polite"></p><div class="shop-grid shop-design-grid">${designs.map(p=>card(p,en)).join('')}</div></section>`:''}
 <section class="shop-note container"><p class="shop-eyebrow">${text('选购须知','BEFORE YOU ORDER',en)}</p><h2>${text('让每一份心意，都有所了解。','Choose with understanding.',en)}</h2><p>${text('商品介绍中的护佑、祈福等寓意源于道教传统与信仰。若您对具体款式、规格、配送或退换有疑问，欢迎在付款前联系协会。','The meanings of protection and blessing described here belong to Taoist tradition and belief. For design, specification, shipping, or return questions, please contact the Association before payment.',en)}</p><div class="shop-service-links"><a class="text-link" href="${policyPath(en)}">${text('配送与退换','Shipping & returns',en)} <span aria-hidden="true">↗</span></a><a class="text-link" href="mailto:${esc(shopSettings.contact_email)}">${esc(shopSettings.contact_email)} <span aria-hidden="true">↗</span></a></div></section>`;
}
export function renderProductPreview(p,{english:en=false,preview=false,settings=defaultShopSettings}={}){
 validateProduct(p);
 const shopSettings=validateShopSettings(settings);
 const title=pick(p,'title',en),details=parseDetails(pick(p,'details',en)),faq=productQuestions(p,{english:en,settings:shopSettings});
 return `<div class="container shop-product"><nav class="shop-breadcrumb" aria-label="${text('面包屑导航','Breadcrumb',en)}"><a href="${en?'/en/':'/'}">${text('首页','Home',en)}</a><span aria-hidden="true">/</span><a href="${en?'/en':''}/shop.html">${text('文化商店','Shop',en)}</a></nav><div class="product-layout"><div class="product-gallery">${p.media.map((m,i)=>`<figure id="photo-${i+1}" class="product-photo${m.generated?' generated-photo':''}"><a href="/${esc(safeMediaPath(m.src))}" class="product-image-link" aria-label="${esc(text('查看大图：','Enlarge image: ',en)+productImageText(p,m,i,en))}"><img src="/${esc(safeMediaPath(m.src))}" alt="${esc(productImageText(p,m,i,en))}" width="1000" height="1200" ${i?'loading="lazy"':'fetchpriority="high"'}></a><figcaption>${esc(productImageText(p,m,i,en))}${m.generated?` <span class="generated-label">${text('AI 辅助场景示意 · 实物请参考原始照片','AI-assisted illustration · See original photos for product details',en)}</span>`:''}</figcaption></figure>`).join('')}</div><div class="product-information"><p class="shop-eyebrow">${text(p.category==='pendants'?'阳翥 · 随身佩饰':'阳翥 · 符箓书画',p.category==='pendants'?'YANGZHU · PENDANTS':'YANGZHU · TALISMAN ART',en)}</p><h1>${esc(title)}</h1><p class="product-summary">${esc(pick(p,'summary',en))}</p>${renderPurchaseOptions(p,{english:en,preview,contactEmail:shopSettings.contact_email})}<div class="product-story">${paragraphs(pick(p,'body',en))}</div>${details.length?`<section class="product-details"><h2>${text('商品细节','The details',en)}</h2><dl>${details.map(([k,v])=>`${k?`<dt>${esc(k)}</dt>`:''}<dd>${esc(v)}</dd>`).join('')}</dl></section>`:''}<section class="product-order-note"><h2>${text('购买与配送','Ordering & delivery',en)}</h2>${renderShopPolicies(shopSettings,{english:en,compact:true})}</section>${faq.length?`<section class="product-faq"><h2>${text('常见问题','Questions & answers',en)}</h2>${faq.map(f=>`<details><summary>${esc(f.question)}</summary>${paragraphs(f.answer)}</details>`).join('')}</section>`:''}<a class="text-link shop-back" href="${en?'/en':''}/shop.html">← ${text('返回文化商店','Back to the collection',en)}</a></div></div></div>`;
}
export function productMetadata(p,en=false){
 const name=pick(p,'title',en),url=origin+productPath(p,en),search=productSearchText(p,en),description=search.description;
 const product={'@type':'Product','@id':url+'#product',url,name,description,image:p.media.filter(m=>!m.generated).map(m=>origin+'/'+safeMediaPath(m.src)),category:en?(p.category==='pendants'?'Taoist pendants':'Taoist talisman art'):(p.category==='pendants'?'道教佩饰':'道教符箓书画'),mainEntityOfPage:{'@id':url+'#webpage'}};
 const offerFor=o=>o.checkout_verified&&validStripeURL(o.stripe_url)&&o.price&&['in_stock','out_of_stock'].includes(effectiveAvailability(o))?{'@type':'Offer',url:o.stripe_url,price:o.price.toFixed(2),priceCurrency:o.currency,availability:'https://schema.org/'+(effectiveAvailability(o)==='in_stock'?'InStock':'OutOfStock'),seller:{'@id':origin+'/#organization'}}:null;
 const options=commerceOptions(p);
 if(hasVariants(p)&&options.length){
  product['@type']='ProductGroup';product.productGroupID=p.id;product.variesBy=['https://schema.org/pattern'];
  product.hasVariant=options.map(o=>{
   const variantURL=url+'?variant='+encodeURIComponent(o.option_id),variant={'@type':'Product','@id':variantURL+'#product',url:variantURL,name:name+' · '+pick(o,'title',en),pattern:pick(o,'title',en),description:pick(o,'details',en)||description,isVariantOf:{'@id':product['@id']}};
   variant.image=o.image?origin+'/'+safeMediaPath(o.image):product.image;
   const offer=offerFor(o);if(offer)variant.offers=offer;
   return variant;
  });
 }else if(!hasVariants(p)){
  const offer=offerFor(p);if(offer)product.offers=offer;
 }
 const properties=parseDetails(pick(p,'details',en)).filter(([k])=>k).map(([name,value])=>({'@type':'PropertyValue',name,value}));
 if(properties.length)product.additionalProperty=properties;
 return {title:search.title,titleBrand:en?'Yangzhu':'阳翥',description,image:product.image[0],imageAlt:productImageText(p,p.media.find(m=>!m.generated)||{},0,en),pageType:'ItemPage',mainEntity:{'@id':product['@id']},graph:[product,{'@type':'BreadcrumbList','@id':url+'#breadcrumb',itemListElement:[{'@type':'ListItem',position:1,name:text('首页','Home',en),item:origin+(en?'/en/':'/')},{'@type':'ListItem',position:2,name:text('文化商店','Shop',en),item:origin+(en?'/en':'')+'/shop.html'},{'@type':'ListItem',position:3,name,item:url}]}]};
}
export function shopMetadata(products,en=false){return {image:origin+'/assets/shop/calligraphy-collection.jpg',imageAlt:text('阳翥协会符箓陈列','Yangzhu talisman collection',en),graph:[{'@type':'ItemList',name:text('阳翥文化商店','Yangzhu cultural shop',en),itemListElement:products.filter(p=>p.published).map((p,i)=>({'@type':'ListItem',position:i+1,url:origin+productPath(p,en),name:pick(p,'title',en)}))}]};}
