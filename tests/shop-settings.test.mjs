import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {load} from 'cheerio';
import {defaultShopSettings, validateShopSettings, renderShopPolicies, renderShopPoliciesPage, policyPath} from '../scripts/shop-settings.mjs';

test('shop settings seed contains only the known public email and blank unconfirmed facts', async () => {
  const settings = JSON.parse(await readFile(new URL('../content/settings/shop.json', import.meta.url), 'utf8'));
  assert.deepEqual(settings, defaultShopSettings);
  assert.deepEqual(validateShopSettings(settings), defaultShopSettings);
  assert.ok(Object.entries(settings).every(([key, value]) => key === 'contact_email' || value === ''));
  assert.deepEqual(validateShopSettings({}), defaultShopSettings);
});

test('shop settings accept bounded plain text without mutating the input', () => {
  const input = {contact_email: ' orders+shop@yangzhu.org ', returns: '  联系客服\n\n保留包装。  '};
  const settings = validateShopSettings(input);
  assert.equal(settings.contact_email, 'orders+shop@yangzhu.org');
  assert.equal(settings.returns, '联系客服\n\n保留包装。');
  assert.equal(settings.shipping_regions, '');
  assert.equal(input.contact_email, ' orders+shop@yangzhu.org ');
  assert.doesNotThrow(() => validateShopSettings({returns: 'a'.repeat(4000)}));
  assert.throws(() => validateShopSettings({returns: 'a'.repeat(4001)}));
});

test('shop settings reject non-plain values, unknown fields, accessors and controls', () => {
  for (const input of [null, [], new Date(), 'text', 1, {returns: 3}, {returns: null}, {returns: 'x\u0000y'}, {private_notification_email: 'private@example.org'}, JSON.parse('{"__proto__": {"polluted": true}}')]) {
    assert.throws(() => validateShopSettings(input));
  }
  let accessorCalled = false;
  assert.throws(() => validateShopSettings({get returns() {accessorCalled = true; return 'x';}}));
  assert.equal(accessorCalled, false);
  assert.throws(() => validateShopSettings({[Symbol('private')]: 'value'}));
});

test('customer service email rejects injected headers, links, attributes and invalid domains', () => {
  for (const contact_email of ['', 'not-an-email', 'mailto:office@yangzhu.org', 'office@yangzhu.org?bcc=evil@example.org', 'office@yangzhu.org\nBcc:evil@example.org', 'office@yangzhu.org" onmouseover="run()', 'office@-yangzhu.org', 'office..other@yangzhu.org', 'office@example', `${'a'.repeat(65)}@yangzhu.org`]) {
    assert.throws(() => validateShopSettings({contact_email}), contact_email);
  }
  assert.equal(validateShopSettings({contact_email: 'office-shop@support.yangzhu.org'}).contact_email, 'office-shop@support.yangzhu.org');
});

test('blank settings render honest localized shipping and return contact fallbacks', () => {
  for (const english of [false, true]) {
    const $ = load(renderShopPolicies(defaultShopSettings, {english}));
    assert.equal($('.shop-policy-group').length, 3);
    assert.equal($('dl').length, 0);
    assert.equal($('a[href="mailto:office@yangzhu.org"]').length, 1);
    assert.match($('[data-policy="shipping"]').text(), english ? /before ordering/ : /下单前/);
    assert.match($('[data-policy="returns"]').text(), english ? /before ordering/ : /下单前/);
    assert.ok(!$.text().includes('Free shipping'));
    assert.equal($('script').length, 0);
  }
});

test('policy facts choose the correct language and preserve a missing translation as original text', () => {
  const settings = {shipping_regions: '美国', shipping_regions_en: 'United States', returns: '请先联系协会。', contact_note: '请注明订单号。', contact_note_en: 'Please include your order number.'};
  const zh = load(renderShopPolicies(settings));
  const en = load(renderShopPolicies(settings, {english: true}));
  assert.match(zh('[data-policy="shipping"] dd').text(), /美国/);
  assert.match(en('[data-policy="shipping"] dd').text(), /United States/);
  assert.equal(en('[data-policy="returns"] dd').text(), '请先联系协会。');
  assert.match(en('[data-policy="contact"]').text(), /Please include your order number/);
  assert.ok(!en('[data-policy="shipping"]').text().includes('Shipping costs'));
  assert.equal(en('dt').length, 2);
});

test('all policy text is escaped and line breaks remain readable without executable markup', () => {
  const payload = '<script>alert("x")</script><img src=x onerror=run()>&';
  const settings = {returns: `${payload}\nLine two.\n\nParagraph two.`, contact_note: payload};
  const $ = load(renderShopPolicies(settings));
  assert.equal($('script,img,[onerror]').length, 0);
  assert.match($('[data-policy="returns"] dd').text(), /<script>alert\("x"\)<\/script>/);
  assert.equal($('[data-policy="returns"] dd p').length, 2);
  assert.equal($('[data-policy="returns"] dd br').length, 1);
  assert.match($('[data-policy="contact"]').text(), /<img src=x onerror=run\(\)>/);
  assert.equal($('script[type="application/ld+json"]').length, 0);
});

test('policy page has one H1, accessible breadcrumbs and localized shop links; compact renderer has no H1', () => {
  for (const english of [false, true]) {
    const $ = load(renderShopPoliciesPage(defaultShopSettings, {english}));
    assert.equal($('h1').length, 1);
    assert.equal($('h1').text(), english ? 'Shipping & returns' : '配送与售后');
    assert.equal($('nav[aria-label]').length, 1);
    assert.equal($('nav a').last().attr('href'), `${english ? '/en' : ''}/shop.html`);
    assert.match($('.shop-policy-heading > p').last().text(), english ? /Delivery, returns/ : /选购前/);
    const compact = load(renderShopPolicies(defaultShopSettings, {english, compact: true}));
    assert.equal(compact('h1,h2').length, 0);
    assert.equal(compact('h3').length, 3);
    assert.equal(compact('.shop-policy-link').attr('href'), policyPath(english));
  }
});

test('compact product policies show dispatch and destination facts without repeating full terms', () => {
  const settings = {
    dispatch_time: '收到订单后联系确认。',
    shipping_regions: '请咨询目的地。',
    shipping_rates: '按目的地确认运费。',
    tracking: '发货后发送追踪号。',
    returns: '完整退换条款。\n\n更多详细退换条件。',
    contact_note: '较长的客服时间说明。',
  };
  const $ = load(renderShopPolicies(settings, {compact: true}));
  assert.equal($('dt').length, 3);
  assert.match($.text(), /收到订单后联系确认/);
  assert.match($.text(), /请咨询目的地/);
  assert.match($.text(), /按目的地确认运费/);
  assert.ok(!$.text().includes('完整退换条款'));
  assert.ok(!$.text().includes('发货后发送追踪号'));
  assert.ok(!$.text().includes('较长的客服时间说明'));
  assert.match($('[data-policy="returns"]').text(), /请查看完整说明/);
  assert.match(load(renderShopPolicies(settings)).text(), /更多详细退换条件/);
});
