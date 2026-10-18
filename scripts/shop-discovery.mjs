// Derived from the current product record on every render; no saved SEO overrides.
const localized = (item, key, english) => english ? item[key + '_en'] || item[key] || '' : item[key] || '';
export const compactText = value => String(value || '').replace(/\s+/gu, ' ').trim();

export function excerpt(value, maximum, english = false) {
  const text = compactText(value), characters = Array.from(text);
  if (characters.length <= maximum) return text;
  let cut = characters.slice(0, maximum - 1).join('');
  if (english) {
    const boundary = cut.lastIndexOf(' ');
    if (boundary > cut.length * 0.6) cut = cut.slice(0, boundary);
  }
  return cut.replace(/[\s,，;；:：.。!?！？]+$/u, '') + '…';
}

export function productSearchText(product, english = false) {
  const name = compactText(localized(product, 'title', english));
  const introduction = compactText(localized(product, 'summary', english)) ||
    compactText(localized(product, 'body', english).split(/\n\s*\n/u)[0]);
  const facts = String(localized(product, 'details', english)).split('\n').map(compactText).filter(Boolean);
  const lead = introduction.toLocaleLowerCase().startsWith(name.toLocaleLowerCase()) ? introduction :
    [name, introduction].filter(Boolean).join(english ? '. ' : '。');
  // Prefer the author's introduction, then confirmed facts if space remains.
  const description = excerpt([lead, ...facts].filter(Boolean).join(' '), english ? 165 : 110, english);
  return {title: excerpt(name, english ? 80 : 40, english), description};
}

export function productImageText(product, media, index = 0, english = false) {
  const caption = compactText(localized(media, 'alt', english));
  if (caption) return caption;
  const name = compactText(localized(product, 'title', english));
  const kind = media.generated ? (english ? 'AI-assisted illustration' : 'AI 辅助示意图') : (english ? 'product image' : '商品图片');
  const number = product.media?.length > 1 ? ` ${index + 1}` : '';
  return `${name} — ${kind}${number}`;
}

export function variantImageText(variant, english = false) {
  return compactText(localized(variant, 'image_alt', english)) ||
    `${compactText(localized(variant, 'title', english))} — ${english ? 'design image' : '款式图片'}`;
}
