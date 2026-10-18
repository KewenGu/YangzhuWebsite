import {variantImageText} from './shop-discovery.mjs';
import {escapeHTML as esc, safeMediaPath} from './content.mjs';

const statuses = ['in_stock', 'out_of_stock', 'inquiry'];
const text = (zh, en, english) => english ? en : zh;
const localized = (item, key, english) => english ? item[key + '_en'] || item[key] || '' : item[key] || '';
const validPrice = value => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 1000000 && Math.abs(value * 100 - Math.round(value * 100)) < 0.00001;
const validStock = value => value == null || Number.isSafeInteger(value) && value >= 0;
const money = value => new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(value);
export const validStripeURL = value => typeof value === 'string' && /^https:\/\/buy\.stripe\.com\/[A-Za-z0-9_]+$/.test(value);
export const hasVariants = product => Array.isArray(product?.variants) && product.variants.length > 0;

export function validateCommerce(product) {
  if (!product || typeof product !== 'object' || Array.isArray(product)) throw Error('商品销售设置无效');
  if (!validStock(product.stock_quantity)) throw Error('库存数量必须留空或填写非负整数');
  if (product.variants == null) return product;
  if (!Array.isArray(product.variants) || product.variants.length > 50) throw Error('商品款式必须是列表，最多 50 款');
  const ids = new Set(), links = new Set();
  for (const variant of product.variants) {
    if (!variant || typeof variant !== 'object' || Array.isArray(variant)) throw Error('款式设置无效');
    if (typeof variant.id !== 'string' || variant.id.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(variant.id) || ids.has(variant.id)) throw Error('款式标识必须唯一，仅使用小写字母、数字和单个连字符');
    ids.add(variant.id);
    if (typeof variant.title !== 'string' || !variant.title.trim()) throw Error('请填写款式名称');
    for (const field of ['title', 'title_en', 'details', 'details_en', 'image_alt', 'image_alt_en']) {
      const limit = field.startsWith('details') ? 10000 : field.startsWith('image_alt') ? 1000 : 200;
      if (variant[field] != null && (typeof variant[field] !== 'string' || variant[field].length > limit)) throw Error(`款式字段 ${field} 格式无效或过长`);
    }
    if (typeof variant.enabled !== 'boolean' || typeof variant.checkout_verified !== 'boolean') throw Error('请明确款式显示状态与付款确认状态');
    if (!statuses.includes(variant.availability)) throw Error('款式销售状态无效');
    if (!validStock(variant.stock_quantity)) throw Error('款式库存数量必须留空或填写非负整数');
    if (variant.price != null && !validPrice(variant.price)) throw Error('款式价格必须是最多两位小数的正数，且不超过 1,000,000');
    if (variant.currency != null && variant.currency !== product.currency) throw Error('款式币种须与商品一致');
    if (variant.stripe_url != null && (typeof variant.stripe_url !== 'string' || variant.stripe_url !== '' && !validStripeURL(variant.stripe_url))) throw Error('款式须使用 https://buy.stripe.com/ 开头的 Stripe Payment Link');
    if (variant.checkout_verified && (!validPrice(variant.price) || !validStripeURL(variant.stripe_url) || product.currency !== 'USD')) throw Error('已确认付款的款式必须填写有效的美元价格与专用 Stripe 链接');
    if (variant.enabled && variant.checkout_verified) {
      if (links.has(variant.stripe_url)) throw Error('每个可购买款式需使用不同的 Stripe 链接，以便订单记录正确款式');
      links.add(variant.stripe_url);
    }
    if (variant.image != null && (typeof variant.image !== 'string' || variant.image && !/\.(png|jpe?g|webp)$/i.test(safeMediaPath(variant.image)))) throw Error('款式图片仅支持素材库中的 JPG、PNG、WebP 实物照片');
  }
  return product;
}

export function effectiveAvailability(option) {
  return option?.availability === 'in_stock' && option.stock_quantity === 0 ? 'out_of_stock' : option?.availability;
}

export function canBuyOption(option) {
  return Boolean(option && option.checkout_verified === true && effectiveAvailability(option) === 'in_stock' && validStock(option.stock_quantity) && validPrice(option.price) && option.currency === 'USD' && validStripeURL(option.stripe_url));
}

// Variants never inherit a parent link, price, stock count, or checkout approval.
// A nonempty list of disabled variants must not revive the generic payment link.
export function commerceOptions(product) {
  if (!hasVariants(product)) return [{...product, option_id: 'default'}];
  return product.variants.filter(variant => variant.enabled === true).map(variant => ({...variant, currency: product.currency, option_id: variant.id}));
}

const hasVerifiedPrice = option => option.checkout_verified === true && validPrice(option.price) && option.currency === 'USD' && validStripeURL(option.stripe_url) && ['in_stock', 'out_of_stock'].includes(effectiveAvailability(option));
function priceRange(options) {
  const prices = options.filter(hasVerifiedPrice).map(option => option.price);
  if (!prices.length) return '';
  const low = Math.min(...prices), high = Math.max(...prices);
  return `${money(low)}${low !== high ? '–' + money(high) : ''} <small>USD</small>`;
}

export function commerceSummary(product, english = false) {
  const options = commerceOptions(product), available = options.filter(canBuyOption);
  if (available.length) return priceRange(available) + (hasVariants(product) ? ` <span>${text('可购款式', 'Available designs', english)}</span>` : '');
  if (options.length && options.every(option => effectiveAvailability(option) === 'out_of_stock')) {
    const price = priceRange(options);
    return `${price}${price ? ' ' : ''}<span>${text('暂时售罄', 'Currently unavailable', english)}</span>`;
  }
  return text('咨询款式与价格', 'Inquire about this design', english);
}

function safeEmail(email) {
  return typeof email === 'string' && /^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email) ? email : 'office@yangzhu.org';
}

function optionDetails(option, english) {
  const description = localized(option, 'details', english);
  if (!description) return '';
  return `<p class="product-variant-details">${esc(description).replace(/\n/g, '<br>')}</p>`;
}

export function renderPurchaseOptions(product, {english = false, preview = false, contactEmail = 'office@yangzhu.org'} = {}) {
  validateCommerce(product);
  const options = commerceOptions(product), variants = hasVariants(product), title = localized(product, 'title', english);
  const selectId = 'product-variant-' + (product.id || 'product');
  const inquiry = option => `mailto:${safeEmail(contactEmail)}?subject=${encodeURIComponent(title + (variants && option ? ' — ' + localized(option, 'title', english) : ''))}`;
  const buyLabel = text('前往 Stripe 购买', 'Buy with Stripe', english);
  const blocks = options.map(option => {
    const name = localized(option, 'title', english);
    const image = variants && option.image ? `<img class="product-variant-image" src="/${esc(safeMediaPath(option.image))}" alt="${esc(variantImageText(option, english))}" width="480" height="480" loading="lazy">` : '';
    const purchase = canBuyOption(option)
      ? `<a class="shop-buy" href="${preview ? '#' : esc(option.stripe_url)}" ${preview ? 'aria-disabled="true" tabindex="-1"' : 'rel="external"'}${variants ? ` aria-label="${esc(buyLabel + ': ' + name)}"` : ''}>${buyLabel} <span aria-hidden="true">↗</span></a><p class="purchase-caption">${text('在 Stripe 安全付款。请在结账页核对款式、数量和总额。', 'Secure checkout on Stripe. Review the design, quantity, and total before paying.', english)}</p>`
      : `<a class="shop-buy" href="${esc(inquiry(option))}">${text('咨询这款商品', 'Ask about this design', english)} <span aria-hidden="true">↗</span></a>`;
    return `<article class="product-variant-option"${variants ? ` id="variant-${esc(option.option_id)}" data-variant-id="${esc(option.option_id)}"` : ''}>${variants ? `<h2>${esc(name)}</h2>${image}${optionDetails(option, english)}` : ''}<p class="product-price">${commerceSummary({...option, variants: []}, english)}</p><div class="product-purchase">${purchase}</div></article>`;
  }).join('');
  if (!options.length) return `<div class="product-purchase-options"><p>${text('当前没有开放购买的款式，请联系协会确认。', 'Please contact the Association about available designs.', english)}</p><a class="shop-buy" href="${esc(inquiry())}">${text('咨询这款商品', 'Ask about this design', english)} <span aria-hidden="true">↗</span></a></div>`;
  const selector = variants ? `<div class="product-variant-picker" hidden><label for="${esc(selectId)}">${text('选择款式', 'Choose a design', english)}</label><select id="${esc(selectId)}" data-variant-select><option value="">${text('请选择款式', 'Select a design', english)}</option>${options.map(option => `<option value="${esc(option.option_id)}">${esc(localized(option, 'title', english))}${effectiveAvailability(option) === 'out_of_stock' ? text(' — 暂时售罄', ' — Currently unavailable', english) : ''}</option>`).join('')}</select></div><p class="sr-only product-variant-status" aria-live="polite" aria-atomic="true"></p>` : '';
  return `<div class="product-purchase-options"${variants ? ' data-product-variants' : ''}>${selector}${blocks}</div>`;
}
