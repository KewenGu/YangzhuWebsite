import {escapeHTML as esc} from './content.mjs';

// Public storefront information only. Order notifications stay in Stripe.
export const defaultShopSettings = Object.freeze({
  contact_email: 'office@yangzhu.org',
  contact_note: '', contact_note_en: '',
  ships_from: '', ships_from_en: '',
  shipping_regions: '', shipping_regions_en: '',
  shipping_rates: '', shipping_rates_en: '',
  dispatch_time: '', dispatch_time_en: '',
  delivery_time: '', delivery_time_en: '',
  tracking: '', tracking_en: '',
  pickup: '', pickup_en: '',
  returns: '', returns_en: '',
  cancellations: '', cancellations_en: '',
  damaged_orders: '', damaged_orders_en: '',
  custom_orders: '', custom_orders_en: '',
  duties_taxes: '', duties_taxes_en: '',
});

const fields = new Set(Object.keys(defaultShopSettings));
const emailPattern = /^[A-Za-z0-9]+(?:[._+-][A-Za-z0-9]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;
const controlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export function validateShopSettings(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(input))) {
    throw new Error('商店设置必须是普通对象');
  }
  const settings = {...defaultShopSettings};
  for (const field of Reflect.ownKeys(input)) {
    if (!fields.has(field)) throw new Error('商店设置包含未知字段');
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (!Object.hasOwn(descriptor, 'value')) throw new Error('商店设置字段必须是文本');
    const value = descriptor.value;
    if (typeof value !== 'string' || value.length > (field === 'contact_email' ? 254 : 4000) || controlCharacters.test(value)) {
      throw new Error(`商店设置 ${field} 必须是有效文本，且不能过长`);
    }
    settings[field] = value.trim();
  }
  const email = settings.contact_email;
  if (!emailPattern.test(email) || email.split('@')[0].length > 64) {
    throw new Error('请填写有效的公开客服邮箱');
  }
  return settings;
}

export const policyPath = (english = false) => `${english ? '/en' : ''}/shop-policies.html`;
const text = (zh, en, english) => english ? en : zh;
const valueFor = (settings, field, english) => english ? settings[`${field}_en`] || settings[field] : settings[field];
const paragraphs = value => value.split(/\n\s*\n/).filter(Boolean).map(paragraph => `<p>${esc(paragraph).replace(/\r?\n/g, '<br>')}</p>`).join('');

const groups = [
  {
    id: 'shipping', title: ['配送', 'Shipping'],
    fields: [
      ['ships_from', '发货地点', 'Ships from'],
      ['shipping_regions', '配送范围', 'Delivery destinations'],
      ['shipping_rates', '运费', 'Shipping costs'],
      ['dispatch_time', '备货与发货时间', 'Preparation and dispatch'],
      ['delivery_time', '预计运输时间', 'Estimated delivery time'],
      ['tracking', '物流追踪', 'Order tracking'],
      ['pickup', '自取安排', 'Local pickup'],
      ['duties_taxes', '关税与税费', 'Duties and taxes'],
    ],
    fallback: ['配送范围、运费与发货安排请在下单前联系协会确认。', 'Please contact the Association before ordering to confirm delivery destinations, shipping costs, and dispatch arrangements.'],
  },
  {
    id: 'returns', title: ['退换与售后', 'Returns & order support'],
    fields: [
      ['returns', '退换货', 'Returns and exchanges'],
      ['cancellations', '取消订单', 'Order cancellations'],
      ['damaged_orders', '损坏、错发或丢失', 'Damaged, incorrect, or lost orders'],
      ['custom_orders', '定制商品', 'Custom orders'],
    ],
    fallback: ['退换货与取消订单的具体安排请在下单前联系协会确认。', 'Please contact the Association before ordering to confirm return, exchange, and cancellation arrangements.'],
  },
];

export function renderShopPolicies(input, {english = false, compact = false} = {}) {
  const settings = validateShopSettings(input);
  const heading = compact ? 'h3' : 'h2';
  const sections = groups.map(group => {
    const visibleFields = compact ? group.fields.filter(([field]) => group.id === 'shipping' && ['dispatch_time', 'shipping_regions', 'shipping_rates'].includes(field)) : group.fields;
    const rows = visibleFields.map(([field, zh, en]) => {
      const value = valueFor(settings, field, english);
      return value ? `<div class="shop-policy-fact"><dt>${text(zh, en, english)}</dt><dd>${paragraphs(value)}</dd></div>` : '';
    }).filter(Boolean);
    let fallback = text(...group.fallback, english);
    if (compact && group.id === 'returns' && valueFor(settings, 'returns', english)) {
      fallback = text('退换货条件与具体安排请查看完整说明。', 'Please read the full return and exchange conditions before ordering.', english);
    } else if (compact && group.id === 'shipping' && group.fields.some(([field]) => valueFor(settings, field, english))) {
      fallback = text('配送安排请查看完整说明。', 'Please read the full shipping information before ordering.', english);
    }
    return `<section class="shop-policy-group" data-policy="${group.id}"><${heading}>${text(...group.title, english)}</${heading}>${rows.length ? `<dl>${rows.join('')}</dl>` : `<p>${fallback}</p>`}</section>`;
  }).join('');
  const contactNote = valueFor(settings, 'contact_note', english);
  return `<div class="shop-policies${compact ? ' shop-policies-compact' : ''}">${sections}<section class="shop-policy-group" data-policy="contact"><${heading}>${text('联系我们', 'Contact us', english)}</${heading}><p><a href="mailto:${esc(settings.contact_email)}">${esc(settings.contact_email)}</a></p>${contactNote && !compact ? paragraphs(contactNote) : ''}</section>${compact ? `<a class="text-link shop-policy-link" href="${policyPath(english)}">${text('查看配送与售后说明', 'View shipping & return information', english)} <span aria-hidden="true">↗</span></a>` : ''}</div>`;
}

// Page body; the build supplies the site's shared header, footer and SEO tags.
export function renderShopPoliciesPage(settings, {english = false} = {}) {
  return `<div class="container shop-policy-page"><nav class="shop-breadcrumb" aria-label="${text('面包屑导航', 'Breadcrumb', english)}"><a href="${english ? '/en/' : '/'}">${text('首页', 'Home', english)}</a><span aria-hidden="true">/</span><a href="${english ? '/en' : ''}/shop.html">${text('文化商店', 'Shop', english)}</a></nav><header class="shop-policy-heading"><p class="shop-eyebrow">${text('阳翥 · 文化商店', 'YANGZHU · CULTURAL SHOP', english)}</p><h1>${text('配送与售后', 'Shipping & returns', english)}</h1><p>${text('选购前，请了解配送、退换与联系安排。', 'Delivery, returns, and contact information for your order.', english)}</p></header>${renderShopPolicies(settings, {english})}<a class="text-link shop-back" href="${english ? '/en' : ''}/shop.html">← ${text('返回文化商店', 'Back to the collection', english)}</a></div>`;
}
