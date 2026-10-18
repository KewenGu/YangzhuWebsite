import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {productSearchText,productImageText,excerpt} from '../scripts/shop-discovery.mjs';
import {validateProduct,productMetadata,productQuestions,renderProductPreview,renderShop} from '../scripts/shop.mjs';
import {optimize} from '../scripts/seo.mjs';

const product=(changes={})=>({id:'automatic-product',title:'净字符佩饰',title_en:'Jing Pendant',summary:'适合日常佩戴的传统纹样。',summary_en:'A traditional design for everyday wear.',body:'已确认的商品介绍。',body_en:'Confirmed product information.',details:'尺寸：4 厘米',details_en:'Size: 4 cm',category:'pendants',currency:'USD',price:68,stripe_url:'https://buy.stripe.com/test_automatic',availability:'in_stock',checkout_verified:true,published:true,order:10,media:[{kind:'image',src:'/assets/shop/jingming-jing-pendant.jpg'}],...changes});
const variant=(changes={})=>({id:'jing',title:'净字款',title_en:'Jing design',enabled:true,price:68,stripe_url:'https://buy.stripe.com/test_jing',availability:'in_stock',checkout_verified:true,image:'/assets/shop/jingming-jing-pendant.jpg',...changes});

test('search metadata is derived from current facts even when legacy overrides exist',()=>{
 const p=product({seo_title:'旧标题',seo_title_en:'Old title',seo_description:'旧摘要',seo_description_en:'Old description'}),original=structuredClone(p);
 for(const en of [false,true]){
  const meta=productMetadata(p,en);
  assert.equal(meta.title,en?'Jing Pendant':'净字符佩饰');
  assert.match(meta.description,en?/4 cm/:/4 厘米/);
  assert.doesNotMatch(meta.description,/Old|旧/);
 }
 assert.deepEqual(p,original);
 const changed=productMetadata({...p,title:'新名称',title_en:'New name',summary_en:'New factual introduction.'},true);
 assert.equal(changed.title,'New name');assert.match(changed.description,/New factual introduction/);
 assert.doesNotMatch(changed.description,/Jing Pendant|Old description/);
});

test('automatic excerpts are compact and fall back to the actual body without inventing facts',()=>{
 const p=product({summary:'',summary_en:'',details:'',details_en:''});
 assert.match(productSearchText(p,true).description,/Confirmed product information/);
 assert.doesNotMatch(productSearchText(p,true).description,/shipping|wood|handmade|guarantee/i);
 for(const en of [false,true]){
  const result=productSearchText(product({summary:'传统🙂'.repeat(100),summary_en:'Traditional pendant with a cultural design. '.repeat(20)}),en);
  assert.ok(Array.from(result.description).length<=(en?165:110));
  assert.ok(!/[\uD800-\uDBFF]$/.test(result.description));
 }
 assert.equal(excerpt('  Plain\ntext  ',100,true),'Plain text');
});

test('blank image captions publish with useful automatic alternatives in every surface',()=>{
 const p=product({media:[{kind:'image',src:'/assets/shop/jingming-jing-pendant.jpg'},{kind:'image',src:'/assets/shop/thunder-ancestor-pendant.jpg',generated:true}],variants:[variant()]});
 validateProduct(p);
 for(const en of [false,true]){
  const $=load(renderProductPreview(p,{english:en}));
  const alts=$('.product-gallery img').map((_,el)=>$(el).attr('alt')).get();
  assert.match(alts[0],en?/Jing Pendant.*product image 1/:/净字符佩饰.*商品图片 1/);
  assert.match(alts[1],en?/AI-assisted illustration 2/:/AI 辅助示意图 2/);
  assert.match($('.product-variant-image').attr('alt'),en?/Jing design.*design image/:/净字款.*款式图片/);
  assert.equal(load(renderShop([p],{english:en}))('.shop-card-image img').attr('alt'),alts[0]);
  assert.equal(productMetadata(p,en).imageAlt,alts[0]);
 }
 assert.equal(productImageText(p,{alt:'提供的图案细节说明'},0),'提供的图案细节说明');
 assert.throws(()=>validateProduct(product({media:[{kind:'image',src:'/assets/shop/jingming-jing-pendant.jpg',alt:{}}]})));
});

test('generated purchase answers follow current verified price and stock without manual SEO work',()=>{
 const p=product({faq:'问：如何购买这件商品？\n答：旧价格 1 美元。\n\n问：图案是什么？\n答：净字符。'});
 const qs=productQuestions(p);
 assert.equal(qs.filter(q=>q.question==='如何购买这件商品？').length,1);
 assert.match(qs[0].answer,/68\.00/);assert.doesNotMatch(qs[0].answer,/1 美元/);
 assert.equal(qs.at(-1).answer,'净字符。');
 assert.match(productQuestions({...p,price:88},{english:true})[0].answer,/88\.00/);
 for(const change of [{stock_quantity:0},{availability:'out_of_stock'}]){
  const item={...p,...change};
  assert.match(productQuestions(item,{english:true})[0].answer,/currently unavailable/);
  assert.equal(productMetadata(item,true).graph[0].offers.availability,'https://schema.org/OutOfStock');
  assert.doesNotMatch(productQuestions(item,{english:true})[0].answer,/Use this page’s Stripe/);
 }
 for(const change of [{checkout_verified:false},{availability:'inquiry'}])assert.doesNotMatch(productQuestions({...p,...change},{english:true})[0].answer,/68\.00|check out/);
});

test('variant answers expose only enabled designs and do not use the parent checkout',()=>{
 const p=product({variants:[variant(),variant({id:'sold',title:'售罄款',title_en:'Sold design',stock_quantity:0,stripe_url:'https://buy.stripe.com/test_sold'}),variant({id:'hidden',title:'隐藏款',enabled:false})]});
 const qs=productQuestions(p,{english:true});
 assert.match(qs[0].answer,/Select a design/);
 assert.match(qs[1].answer,/Jing design — Available to purchase/);
 assert.match(qs[1].answer,/Sold design — Currently unavailable/);
 assert.doesNotMatch(qs[1].answer,/隐藏款/);
 p.variants.forEach(v=>v.enabled=false);
 assert.doesNotMatch(productQuestions(p,{english:true})[0].answer,/Stripe|68\.00/);
});

test('public contact settings update inquiry answers while unknown policies remain unclaimed',()=>{
 const p=product({checkout_verified:false});
 for(const en of [false,true]){
  const settings={contact_email:'shop@example.org'};
  assert.match(productQuestions(p,{english:en,settings})[0].answer,/shop@example.org/);
  const $=load(renderProductPreview(p,{english:en,settings}));
  assert.ok($('.product-faq').text().includes('shop@example.org'));
  assert.doesNotMatch($('.product-faq').text(),/free shipping|30.days|免运费|30天/i);
 }
});

test('automatic metadata and FAQs remain escaped, crawlable and linked in both languages',()=>{
 const p=product({title:'<img src=x onerror=alert(1)>',title_en:'<script>bad</script>',summary:'当前资料',summary_en:'Current facts'});
 for(const en of [false,true]){
  const html=optimize('<html><head></head><body><main>'+renderProductPreview(p,{english:en})+'</main></body></html>','shop/'+p.id,en?'en':'zh',{},productMetadata(p,en)), $=load(html);
  assert.equal($('script').length,1);assert.equal($('[onerror]').length,0);
  assert.ok($('title').text().endsWith(en?' | Yangzhu':'｜阳翥'));
  assert.equal($('link[rel=canonical]').attr('href'),'https://yangzhu.org/'+(en?'en/':'')+'shop/'+p.id+'.html');
  assert.equal($('h1').length,1);assert.ok($('.product-faq details').length);
  assert.equal($('meta[name=description]').attr('content'),$('meta[property="og:description"]').attr('content'));
  assert.doesNotThrow(()=>JSON.parse($('script[type="application/ld+json"]').text()));
 }
});
