import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, rm, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {load} from 'cheerio';
import {readProducts} from '../scripts/build.mjs';
import {optimize, pageURL, sitemap} from '../scripts/seo.mjs';
import {validateProduct, canPurchase, validStripeURL, renderShop, renderProductPreview, productMetadata, shopMetadata, productThumbnail} from '../scripts/shop.mjs';

const fixture = (changes = {}) => ({
  id: 'test-pendant', title: '测试佩饰', title_en: 'Test pendant',
  summary: '传统文化佩饰', summary_en: 'A traditional cultural pendant',
  body: '第一段。\n\n第二段。', body_en: 'First paragraph.\n\nSecond paragraph.',
  category: 'pendants', currency: 'USD', price: 68,
  stripe_url: 'https://buy.stripe.com/eVqaEYfwZ31K3ygc1Aew801',
  checkout_verified: true, availability: 'in_stock', published: true, order: 10,
  details: '主题：净字符', details_en: 'Motif: Jing symbol',
  faq: '问：在哪里付款？\n答：在 Stripe 付款页。',
  faq_en: 'Q: Where is payment completed?\nA: On the Stripe payment page.',
  media: [{kind: 'image', src: '/assets/shop/jingming-jing-pendant.jpg', thumbnail: '/assets/shop/jingming-jing-pendant-thumb.jpg', alt: '净字符实物照片', alt_en: 'Jing-symbol product photograph', generated: false}],
  ...changes,
});
const htmlPage = (p, english = false) => optimize(
  '<!doctype html><html><head><title></title></head><body><main>' + renderProductPreview(p, {english}) + '</main></body></html>',
  'shop/' + p.id, english ? 'en' : 'zh', {}, productMetadata(p, english),
);
const graphOf = $ => JSON.parse($('script[type="application/ld+json"]').text())['@graph'];

test('replacing a CMS image cannot retain the previous product thumbnail', () => {
 const media=fixture().media[0];
 assert.equal(productThumbnail(media),'assets/shop/jingming-jing-pendant-thumb.jpg');
 assert.equal(productThumbnail({...media,src:'/assets/uploads/replacement.jpg'}),'assets/uploads/replacement.jpg');
});

test('product validation rejects traversal, executable images and external media', () => {
  for (const src of ['../secret.jpg', '/assets/../secret.jpg', '/assets/%2e%2e/secret.jpg', '/assets/x.jpg?run=x', '/assets/a\\b.jpg', 'https://example.com/x.jpg', 'javascript:alert(1)', '/assets/x.svg', '/assets/x.html']) {
    assert.throws(() => validateProduct(fixture({media: [{kind: 'image', src, alt: 'Photo'}]})), src);
  }
  assert.throws(() => validateProduct(fixture({id: '../escape'})));
  assert.throws(() => validateProduct(fixture({media: [{...fixture().media[0], thumbnail: 'javascript:alert(1)'}]})));
});

test('product validation restricts payment hosts and accepts only positive finite two-decimal USD prices', () => {
  for (const stripe_url of ['http://buy.stripe.com/test', 'https://buy.stripe.com.evil.test/test', 'https://buy.stripe.com@evil.test/test', '//buy.stripe.com/test', 'javascript:alert(1)', 'https://evil.test/pay']) {
    assert.equal(validStripeURL(stripe_url), false);
    assert.throws(() => validateProduct(fixture({stripe_url})), stripe_url);
  }
  for (const price of [0, -1, NaN, Infinity, '68', 68.001, 1000001]) {
    assert.throws(() => validateProduct(fixture({price})), String(price));
  }
  assert.throws(() => validateProduct(fixture({currency: 'EUR'})));
  assert.equal(validateProduct(fixture({price: 68.25})).price, 68.25);
});

test('published products require a real first photograph while secondary AI images are clearly labeled', () => {
  const real = fixture().media[0];
  const generated = {...real, generated: true};
  assert.throws(() => validateProduct(fixture({media: [generated, real]})));
  assert.throws(() => validateProduct(fixture({media: []})));
  const p = fixture({media: [real, generated]});
  validateProduct(p);
  const $ = load(renderProductPreview(p, {english: true}));
  assert.equal($('.generated-label').length, 1);
  assert.match($('.generated-label').text(), /AI-assisted illustration/);
  assert.equal(productMetadata(p, true).graph[0].image.length, 1);
});

test('checkout requires a verified link, positive price, USD and current stock; previews cannot pay', () => {
  const p = fixture();
  assert.equal(canPurchase(p), true);
  for (const changes of [{checkout_verified: false}, {availability: 'inquiry'}, {availability: 'out_of_stock'}, {price: 0}, {price: NaN}, {currency: 'EUR'}, {stripe_url: ''}]) {
    assert.equal(canPurchase({...p, ...changes}), false, JSON.stringify(changes));
  }
  const preview = load(renderProductPreview(p, {preview: true}));
  assert.equal(preview('.shop-buy').attr('href'), '#');
  assert.equal(preview('.shop-buy').attr('aria-disabled'), 'true');
  const inquiry = load(renderProductPreview(fixture({availability: 'inquiry'})));
  assert.match(inquiry('.shop-buy').attr('href'), /^mailto:office@yangzhu\.org\?/);
  assert.equal(inquiry('a[href^="https://buy.stripe.com/"]').length, 0);
});

test('all customer-controlled product text is escaped in HTML and cannot break out of JSON-LD', () => {
  const payload = '</script><script>alert("x")</script><img src=x onerror=alert(1)>';
  const p = fixture({title: payload, title_en: payload, summary: payload, summary_en: payload, body: payload, body_en: payload, details: 'Detail: ' + payload, details_en: 'Detail: ' + payload, faq: 'Q: ' + payload + '\nA: ' + payload, faq_en: 'Q: ' + payload + '\nA: ' + payload, media: [{...fixture().media[0], alt: payload, alt_en: payload}]});
  for (const english of [false, true]) {
    const html = htmlPage(p, english), $ = load(html);
    assert.equal($('script').length, 1);
    assert.equal($('img[onerror]').length, 0);
    assert.equal($('h1').text(), payload);
    assert.equal($('.product-story p').text(), payload);
    assert.equal($('.product-gallery img').attr('alt'), payload);
    assert.equal(graphOf($).find(item => item['@type'] === 'Product').name, payload);
    assert.match($('script').text(), /\\u003c\/script>/);
  }
});

test('both product languages have canonical URLs, reciprocal hreflang and matching Product, Offer and Breadcrumb data', () => {
  const p = fixture();
  for (const english of [false, true]) {
    const $ = load(htmlPage(p, english)), lang = english ? 'en' : 'zh';
    const url = pageURL('shop/' + p.id, lang), graph = graphOf($);
    assert.equal($('link[rel="canonical"]').length, 1);
    assert.equal($('link[rel="canonical"]').attr('href'), url);
    assert.equal($('link[hreflang="zh-Hans"]').attr('href'), pageURL('shop/' + p.id, 'zh'));
    assert.equal($('link[hreflang="en"]').attr('href'), pageURL('shop/' + p.id, 'en'));
    assert.equal($('link[hreflang="x-default"]').attr('href'), pageURL('shop/' + p.id, 'zh'));
    const product = graph.find(item => item['@type'] === 'Product');
    assert.equal(product.url, url);
    assert.equal(product.name, english ? p.title_en : p.title);
    assert.equal(product.offers.price, '68.00');
    assert.equal(product.offers.priceCurrency, 'USD');
    assert.equal(product.offers.url, $('.shop-buy').attr('href'));
    assert.equal(product.offers.availability, 'https://schema.org/InStock');
    assert.equal(graph.find(item => item['@type'] === 'ItemPage').mainEntity['@id'], product['@id']);
    const breadcrumbs = graph.find(item => item['@type'] === 'BreadcrumbList').itemListElement;
    assert.equal(breadcrumbs.at(-1).item, url);
    assert.equal(breadcrumbs[1].item, pageURL('shop', lang));
    assert.equal($('meta[property="og:image"]').attr('content'), product.image[0]);
    assert.equal($('h1').length, 1);
    assert.ok(!('aggregateRating' in product));
  }
});

test('inquiry and unverified listings never advertise an Offer; stock status agrees with checkout', () => {
  for (const changes of [{availability: 'inquiry'}, {checkout_verified: false}, {checkout_verified: false, price: undefined, stripe_url: ''}]) {
    const p = fixture(changes);
    assert.ok(!('offers' in productMetadata(p).graph[0]));
  }
  const p = fixture({availability: 'out_of_stock'});
  assert.equal(productMetadata(p).graph[0].offers.availability, 'https://schema.org/OutOfStock');
  assert.equal(load(renderProductPreview(p))('a[href^="https://buy.stripe.com/"]').length, 0);
});

test('draft products stay out of shop cards, list metadata and both sitemap language routes', () => {
  const published = fixture(), draft = fixture({id: 'private-draft-item', title: 'Unpublished secret title', title_en: 'Unpublished secret title', published: false});
  const products = [published, draft];
  for (const english of [false, true]) {
    const $ = load(renderShop(products, {english}));
    assert.equal($('.shop-card').length, 1);
    assert.ok(!$.text().includes(draft.title));
    assert.ok(!$.html().includes(draft.id));
    assert.equal(shopMetadata(products, english).graph[0].itemListElement.length, 1);
  }
  const xml = sitemap(products);
  assert.ok(!xml.includes(draft.id));
  assert.ok(xml.includes(pageURL('shop/' + published.id, 'zh')));
  assert.ok(xml.includes(pageURL('shop/' + published.id, 'en')));
});

async function withCatalog(records, run) {
  const root = await mkdtemp(path.join(tmpdir(), 'yangzhu-shop-test-'));
  try {
    for (const [filename, record] of records) await writeFile(path.join(root, filename), JSON.stringify(record));
    await run(root);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
}

test('build reader validates the real catalog and referenced originals and thumbnails without generating dist', async () => {
  const products = await readProducts();
  assert.ok(Array.isArray(products));
  assert.equal(new Set(products.map(p => p.id)).size, products.length);
  for (const p of products) for (const m of p.media) for (const src of [m.src, m.thumbnail].filter(Boolean)) await access(src.replace(/^\//, ''));
});

test('build reader refuses missing source images, missing thumbnails and mismatched IDs', async () => {
  for (const changes of [
    {media: [{...fixture().media[0], src: '/assets/shop/does-not-exist.jpg'}]},
    {media: [{...fixture().media[0], thumbnail: '/assets/shop/does-not-exist-thumb.jpg'}]},
  ]) await withCatalog([['test-pendant.json', fixture(changes)]], root => assert.rejects(readProducts(root), /ENOENT/));
  await withCatalog([['wrong-filename.json', fixture()]], root => assert.rejects(readProducts(root), /mismatched product ID/));
});

test('build reader preserves draft status and sorts records without silently publishing them', async () => {
  const draft = fixture({id: 'draft-first', order: 0, published: false});
  await withCatalog([['test-pendant.json', fixture()], ['draft-first.json', draft]], async root => {
    const records = await readProducts(root);
    assert.deepEqual(records.map(p => p.id), ['draft-first', 'test-pendant']);
    assert.equal(records[0].published, false);
  });
});

const variantFixture=(changes={})=>({id:'design-a',title:'款式甲',title_en:'Design A',enabled:true,price:68,stripe_url:'https://buy.stripe.com/test_designA',checkout_verified:true,availability:'in_stock',stock_quantity:2,details:'图案：甲',details_en:'Motif: A',image:'/assets/shop/jingming-jing-pendant.jpg',image_alt:'款式甲照片',image_alt_en:'Design A photo',...changes});

test('variant pages and schema agree on enabled designs, exact checkout targets and stock',()=>{
 const p=fixture({variants:[variantFixture(),variantFixture({id:'design-b',title:'款式乙',title_en:'Design B',price:88,stripe_url:'https://buy.stripe.com/test_designB',stock_quantity:0}),variantFixture({id:'draft-design',enabled:false,stripe_url:'https://buy.stripe.com/test_draft'})]});
 for(const english of [false,true]){
  const $=load(htmlPage(p,english)),group=graphOf($).find(n=>n['@type']==='ProductGroup');
  assert.equal(group.hasVariant.length,2);
  assert.equal(group.hasVariant[0].offers.url,$('#variant-design-a .shop-buy').attr('href'));
  assert.equal(group.hasVariant[1].offers.availability,'https://schema.org/OutOfStock');
  assert.match(group.hasVariant[0].url,/\?variant=design-a$/);
  assert.equal($('#variant-design-b a[href^="https://buy.stripe.com/"]').length,0);
  assert.equal($('a[href="'+p.stripe_url+'"]').length,0);
  assert.equal($('#variant-draft-design').length,0);
  assert.ok(!$.html().includes('test_draft'));
  assert.equal(canPurchase(p),true);
 }
 const none={...p,variants:p.variants.map(v=>({...v,enabled:false}))};
 assert.equal(canPurchase(none),false);
 assert.equal(load(renderProductPreview(none))('a[href^="https://buy.stripe.com/"]').length,0);
 assert.ok(!productMetadata(none).graph[0].offers);
 const sharedPhoto=productMetadata(fixture({variants:[variantFixture({image:''})]})).graph[0];
 assert.deepEqual(sharedPhoto.hasVariant[0].image,sharedPhoto.image);
});

test('zero product stock removes checkout and emits OutOfStock despite saved sale status',()=>{
 const p=fixture({stock_quantity:0});
 assert.equal(canPurchase(p),false);
 assert.equal(productMetadata(p).graph[0].offers.availability,'https://schema.org/OutOfStock');
 assert.equal(load(renderProductPreview(p))('a[href^="https://buy.stripe.com/"]').length,0);
});

test('shared service settings reach both languages of the shop and product ordering section',()=>{
 const settings={contact_email:'shop@example.org',shipping_regions:'配送地区测试',shipping_regions_en:'Test destinations',returns:'退换规则测试',returns_en:'Test returns'};
 for(const english of [false,true]){
  const $=load(renderProductPreview(fixture({availability:'inquiry'}),{english,settings}));
  assert.match($('.shop-buy').attr('href'),/^mailto:shop@example.org\?/);
  assert.ok($('.product-order-note').text().includes(english?'Test destinations':'配送地区测试'));
  assert.equal($('.product-order-note a[href$="shop-policies.html"]').attr('href'),english?'/en/shop-policies.html':'/shop-policies.html');
  const listing=load(renderShop([fixture()],{english,settings}));
  assert.equal(listing('a[href="mailto:shop@example.org"]').length,1);
  assert.equal(listing('a[href$="shop-policies.html"]').length,1);
 }
});

test('build rejects missing variant photos even on disabled variants',async()=>{
 const p=fixture({variants:[variantFixture({enabled:false,image:'/assets/shop/missing-variant.jpg'})]});
 await withCatalog([['test-pendant.json',p]],root=>assert.rejects(readProducts(root),/ENOENT/));
});
