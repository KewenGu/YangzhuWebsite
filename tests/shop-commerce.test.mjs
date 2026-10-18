import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {validateCommerce, effectiveAvailability, canBuyOption, commerceOptions, hasVariants, renderPurchaseOptions, commerceSummary, validStripeURL} from '../scripts/shop-commerce.mjs';

const base = (changes = {}) => ({
  id: 'test-pendant', title: '护佑挂坠', title_en: 'Protection pendant', currency: 'USD',
  checkout_verified: true, price: 68, availability: 'in_stock',
  stripe_url: 'https://buy.stripe.com/parentLink', ...changes,
});
const variant = (changes = {}) => ({
  id: 'jingming', title: '净明净字符', title_en: 'Jingming Jing pendant',
  enabled: true, price: 68, stripe_url: 'https://buy.stripe.com/test_jingmingLink',
  checkout_verified: true, availability: 'in_stock', ...changes,
});

test('zero manual stock overrides sale status without inventing stock for unspecified quantities', () => {
  for (const stock_quantity of [undefined, null, 1, 500]) {
    assert.equal(effectiveAvailability(base({stock_quantity})), 'in_stock');
    assert.equal(canBuyOption(base({stock_quantity})), true);
  }
  const soldOut = base({stock_quantity: 0});
  assert.equal(effectiveAvailability(soldOut), 'out_of_stock');
  assert.equal(canBuyOption(soldOut), false);
  const $ = load(renderPurchaseOptions(soldOut, {english: true}));
  assert.equal($('a[href^="https://buy.stripe.com"]').length, 0);
  assert.match($('.product-price').text(), /\$68\.00.*Currently unavailable/);
  assert.match($('.shop-buy').attr('href'), /^mailto:/);
  assert.equal(effectiveAvailability(base({availability: 'inquiry', stock_quantity: 0})), 'inquiry');
});

test('commerce validation rejects invalid, fractional, negative and unsafe stock quantities', () => {
  for (const stock_quantity of [-1, 0.5, '2', Infinity, NaN, false, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => validateCommerce(base({stock_quantity})));
    assert.throws(() => validateCommerce(base({variants: [variant({stock_quantity})]})));
    assert.equal(canBuyOption(base({stock_quantity})), false);
  }
  assert.doesNotThrow(() => validateCommerce(base({stock_quantity: null, variants: [variant({stock_quantity: 0})]})));
});

test('variants require unique stable identifiers, bounded text and explicit publication/checkout states', () => {
  for (const changes of [{id: '-bad'}, {id: 'bad--id'}, {id: 'bad-'}, {id: 'Bad'}, {id: 'a'.repeat(101)}, {id: 'a/b'}, {title: ''}, {title: 2}, {title_en: 'a'.repeat(201)}, {details: 'a'.repeat(10001)}, {enabled: 'true'}, {checkout_verified: 'true'}, {availability: 'unknown'}]) {
    assert.throws(() => validateCommerce(base({variants: [variant(changes)]})), JSON.stringify(changes).slice(0, 100));
  }
  assert.throws(() => validateCommerce(base({variants: [variant(), variant()]})), /标识/);
  assert.throws(() => validateCommerce(base({variants: Array(51).fill(variant())})));
  assert.throws(() => validateCommerce(base({variants: {}})));
  assert.throws(() => validateCommerce(base({variants: [null]})));
  assert.doesNotThrow(() => validateCommerce(base({variants: [variant({id: 'design-2-red'})]})));
});

test('each enabled verified variant has a distinct exact-host Stripe link and valid inherited USD price', () => {
  for (const stripe_url of ['http://buy.stripe.com/x', 'https://buy.stripe.com.evil.test/x', 'https://buy.stripe.com@evil.test/x', 'https://buy.stripe.com/x?price=1', 'https://buy.stripe.com/x#part', 'https://buy.stripe.com/x/y', 'https://buy.stripe.com/%2e%2e', 'javascript:alert(1)', '']) {
    assert.equal(validStripeURL(stripe_url), false);
    assert.throws(() => validateCommerce(base({variants: [variant({stripe_url})]})));
  }
  assert.equal(validStripeURL('https://buy.stripe.com/test_sample123'), true);
  for (const price of [-1, 0, NaN, Infinity, '68', 68.001, 1000001]) {
    assert.throws(() => validateCommerce(base({variants: [variant({price})]})));
    assert.equal(canBuyOption(base({price})), false);
  }
  assert.throws(() => validateCommerce(base({currency: 'EUR', variants: [variant()]})));
  assert.throws(() => validateCommerce(base({variants: [variant({currency: 'EUR'})]})));
  assert.throws(() => validateCommerce(base({variants: [variant(), variant({id: 'other'})]})), /不同/);
  assert.doesNotThrow(() => validateCommerce(base({variants: [variant(), variant({id: 'other', enabled: false})]})));
  assert.doesNotThrow(() => validateCommerce(base({variants: [variant(), variant({id: 'other', checkout_verified: false})]})));
});

test('only explicit enabled options are exposed and never inherit parent checkout, stock or price', () => {
  const p = base({stock_quantity: 3, variants: [variant({checkout_verified: false, price: undefined, stripe_url: undefined}), variant({id: 'hidden', enabled: false})]});
  validateCommerce(p);
  const options = commerceOptions(p);
  assert.equal(options.length, 1);
  assert.equal(options[0].option_id, 'jingming');
  assert.equal(options[0].currency, 'USD');
  assert.equal(options[0].stripe_url, undefined);
  assert.equal(options[0].stock_quantity, undefined);
  assert.equal(options[0].price, undefined);
  assert.equal(canBuyOption(options[0]), false);
  const $ = load(renderPurchaseOptions(p));
  assert.equal($('a[href^="https://buy.stripe.com"]').length, 0);
  assert.equal($('article[data-variant-id="hidden"]').length, 0);
  assert.equal(JSON.stringify(p).includes('option_id'), false);
});

test('all-disabled variants never revive parent checkout; an empty list uses normal single-product purchase', () => {
  const disabled = base({variants: [variant({enabled: false})]});
  assert.equal(hasVariants(disabled), true);
  assert.deepEqual(commerceOptions(disabled), []);
  const $ = load(renderPurchaseOptions(disabled));
  assert.equal($('a[href^="https://buy.stripe.com"]').length, 0);
  assert.equal($('[data-variant-select]').length, 0);
  assert.match($('.shop-buy').attr('href'), /^mailto:/);
  for (const variants of [undefined, null, []]) {
    const p = base({variants});
    assert.equal(hasVariants(p), false);
    assert.equal(commerceOptions(p)[0].option_id, 'default');
    assert.equal(load(renderPurchaseOptions(p))('a[href^="https://buy.stripe.com"]').attr('href'), p.stripe_url);
  }
});

test('variant choices have accessible progressive markup and correctly distinct payment and inquiry targets', () => {
  const p = base({variants: [variant(), variant({id: 'wenchang', title: '文昌', title_en: 'Wenchang', price: 78, stripe_url: 'https://buy.stripe.com/wenchang'}), variant({id: 'inquiry', title: '定制款', title_en: 'Custom design', checkout_verified: false, stripe_url: '', price: null})]});
  const $ = load(renderPurchaseOptions(p, {english: true, contactEmail: 'orders@yangzhu.org'}));
  assert.equal($('.product-variant-picker[hidden]').length, 1);
  assert.equal($('label').attr('for'), $('select').attr('id'));
  assert.equal($('[data-variant-select] option').first().attr('value'), '');
  assert.equal($('[data-variant-select] option').length, 4);
  assert.equal($('article[data-variant-id]').length, 3);
  assert.equal($('article[hidden]').length, 0, 'no-JS users can see every named option');
  assert.equal($('#variant-jingming .shop-buy').attr('href'), p.variants[0].stripe_url);
  assert.equal($('#variant-wenchang .shop-buy').attr('href'), p.variants[1].stripe_url);
  assert.match($('#variant-wenchang .shop-buy').attr('aria-label'), /Wenchang/);
  assert.equal($('.product-variant-status[aria-live="polite"]').length, 1);
  assert.match(decodeURIComponent($('#variant-inquiry .shop-buy').attr('href')), /orders@yangzhu\.org\?subject=Protection pendant — Custom design/);
});

test('preview can never follow a live or test payment link', () => {
  for (const p of [base(), base({variants: [variant()]})]) {
    const $ = load(renderPurchaseOptions(p, {preview: true}));
    assert.equal($('a[href^="https://buy.stripe.com"]').length, 0);
    assert.equal($('.shop-buy').attr('href'), '#');
    assert.equal($('.shop-buy').attr('aria-disabled'), 'true');
    assert.equal($('.shop-buy').attr('tabindex'), '-1');
  }
});

test('summary price range covers only purchasable designs and handles unavailable or mixed inquiry options honestly', () => {
  const p = base({variants: [variant({price: 68}), variant({id: 'premium', price: 108, stripe_url: 'https://buy.stripe.com/premium'}), variant({id: 'soldout', price: 1, stock_quantity: 0, stripe_url: 'https://buy.stripe.com/soldout'}), variant({id: 'hidden', enabled: false, price: 2})]});
  assert.match(commerceSummary(p, true), /^\$68\.00–\$108\.00/);
  assert.doesNotMatch(commerceSummary(p, true), /\$1\.00|\$2\.00/);
  const soldOut = base({variants: [variant({stock_quantity: 0}), variant({id: 'other', availability: 'out_of_stock', price: 80, stripe_url: 'https://buy.stripe.com/other'})]});
  assert.match(commerceSummary(soldOut, true), /\$68\.00–\$80\.00.*Currently unavailable/);
  soldOut.variants.push(variant({id: 'ask', checkout_verified: false, availability: 'inquiry', price: null, stripe_url: ''}));
  assert.equal(commerceSummary(soldOut, true), 'Inquire about this design');
  assert.doesNotMatch(commerceSummary(base({checkout_verified: false}), true), /68/);
});

test('variant media rejects unsafe paths and derives missing image descriptions', () => {
  for (const image of ['javascript:alert(1)', '/assets/../secret.jpg', '/assets/%2e/x.jpg', '/assets/a.svg', '/assets/a.jpg?x=1', 'https://example.com/a.jpg', 2]) {
    assert.throws(() => validateCommerce(base({variants: [variant({image, image_alt: 'Photo'})]})));
  }
  const fallback = base({variants: [variant({image: '/assets/shop/design.jpg'})]});
  validateCommerce(fallback);
  assert.match(load(renderPurchaseOptions(fallback))('.product-variant-image').attr('alt'), /款式图片/);
  const p = base({variants: [variant({image: '/assets/shop/design.webp', image_alt: '净字符', image_alt_en: 'Jing symbol'})]});
  const $ = load(renderPurchaseOptions(p, {english: true}));
  assert.equal($('.product-variant-image').attr('src'), '/assets/shop/design.webp');
  assert.equal($('.product-variant-image').attr('alt'), 'Jing symbol');
});

test('option titles, details, identifiers and contact values cannot inject active markup or mail headers', () => {
  const payload = '<img src=x onerror=alert(1)><script>alert(1)</script>';
  const p = base({title: payload, variants: [variant({title: payload, title_en: payload, details: 'Description: ' + payload, details_en: payload, image: '/assets/shop/design.jpg', image_alt: payload, checkout_verified: false})]});
  const $ = load(renderPurchaseOptions(p, {english: true, contactEmail: 'bad@example.com?bcc=intruder@example.com'}));
  assert.equal($('script, img[onerror]').length, 0);
  assert.equal($('.product-variant-option h2').text(), payload);
  assert.equal($('.product-variant-details').text(), payload);
  assert.equal($('.product-variant-image').attr('alt'), payload);
  assert.match($('.shop-buy').attr('href'), /^mailto:office@yangzhu\.org\?subject=/);
  assert.doesNotMatch($('.shop-buy').attr('href'), /bcc=/);
});
