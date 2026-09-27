export const types=['activities','ceremonies','members','relations'];
export const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeMediaPath(value){
 if(typeof value!=='string'||!/^\/?assets\//.test(value)||/[\\?#\x00-\x1f]/.test(value)||value.split('/').some(p=>p==='..'||p==='.')||/%/i.test(value))throw Error('图片或视频必须来自网站素材库');
 return value.replace(/^\//,'');
}
export function validateEntry(e,type){
 if(!types.includes(type))throw Error('未知栏目');
 if(!/^[a-z0-9][a-z0-9-]{0,99}$/.test(e.id))throw Error('条目标识无效');
 for(const field of ['title','body'])if(typeof e[field]!=='string'||!e[field].trim())throw Error(`${e.id}: 缺少${field}`);
 if(e.title.length>200||e.body.length>50000)throw Error('标题或正文过长');
 for(const field of ['title_en','body_en','role','role_en','date','location','location_en'])if(e[field]!=null&&typeof e[field]!=='string')throw Error(`字段 ${field} 必须为文字`);
 if(typeof e.published!=='boolean'||!Number.isFinite(e.order))throw Error('显示状态或排序无效');
 if(e.date&&!/^\d{4}-\d{2}-\d{2}$/.test(e.date))throw Error('日期格式无效');
 if(type==='members'&&!e.role?.trim())throw Error('请填写职务');
 if(type==='relations'&&!['letter','exchange'].includes(e.category))throw Error('联谊类别无效');
 if(!Array.isArray(e.media)||e.media.length>30)throw Error('最多30项素材');
 for(const m of e.media){
  const src=safeMediaPath(m.src);
  if(!['image','video'].includes(m.kind))throw Error('素材类型无效');
  if(!m.alt?.trim())throw Error('请为素材填写说明');
  if(m.kind==='image'&&!/\.(png|jpe?g|webp|gif)$/i.test(src))throw Error('仅支持 JPG、PNG、WebP、GIF 图片');
  if(m.kind==='video'&&!/\.(mp4|webm)$/i.test(src))throw Error('仅支持 MP4、WebM 视频');
  if(m.poster){const poster=safeMediaPath(m.poster);if(!/\.(png|jpe?g|webp|gif)$/i.test(poster))throw Error('封面必须为图片');}
 }
 return e;
}
const esc=escapeHTML;
function bilingual(tag,cls,zh,en){return `<${tag} class="${cls}" data-zh="${esc(zh)}" data-en="${esc(en||zh)}">${esc(zh)}</${tag}>`;}
function paragraphs(e,cls){
 const en=e.body_en?.trim()||e.body;
 return `<div class="${cls} content-zh">${e.body.split(/\n\s*\n/).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('')}</div><div class="${cls} content-en" hidden>${en.split(/\n\s*\n/).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('')}</div>`;
}
export function renderEntry(e,type){
 validateEntry(e,type);
 const member=type==='members',relation=type==='relations',exchange=relation&&e.category==='exchange';
 const prefix=member?'member':type==='activities'?'activity':type==='ceremonies'?'ceremony':exchange?'exchange':'relation';
 const card=member||type==='activities'||type==='ceremonies'?`${prefix}-detail-card`:`${prefix}-card`;
 const imageClass=member?'member-image':relation?`${prefix}-img`:`${prefix}-image`;
 const media=e.media.map(m=>m.kind==='video'?`<video class="${imageClass}" controls playsinline preload="metadata" ${m.poster?`poster="${esc(safeMediaPath(m.poster))}"`:''} aria-label="${esc(m.alt)}"><source src="${esc(safeMediaPath(m.src))}" type="${m.src.endsWith('.webm')?'video/webm':'video/mp4'}"></video>`:`<img class="${imageClass}" src="${esc(safeMediaPath(m.src))}" alt="${esc(m.alt)}" loading="lazy">`).join('');
 const mediaClass=member?'member-photo':relation?`${prefix}-image`:`${prefix}-images`;
 const info=member?'member-info':`${prefix}-content`;
 const title=member?bilingual('h2','member-title',e.role,e.role_en)+bilingual('h3','member-name',e.title,e.title_en):bilingual('h2',`${prefix}-title`,e.title,e.title_en);
 const meta=(e.date?`<p class="entry-meta"><time datetime="${esc(e.date)}">${esc(e.date)}</time></p>`:'')+(e.location?bilingual('p','entry-meta',e.location,e.location_en):'');
 return `<div id="${esc(e.id)}" class="${card}${media?'':' without-media'}">${media?`<div class="${mediaClass}">${media}</div>`:''}<div class="${info}">${title}${meta}${paragraphs(e,`${prefix}-description`)}</div></div>`;
}
