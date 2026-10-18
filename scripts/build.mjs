import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import {optimize,sitemap} from './seo.mjs';
import {readFile,writeFile,readdir,cp,mkdir,rm,access,stat} from 'node:fs/promises';
import {types,validateEntry,renderEntry,safeMediaPath,escapeHTML as esc} from './content.mjs';
import {validateProduct,renderShop,renderProductPreview,productMetadata,shopMetadata} from './shop.mjs';
import {productSearchText} from './shop-discovery.mjs';
import {validateShopSettings,renderShopPoliciesPage} from './shop-settings.mjs';
import path from 'node:path';
export async function readEntries(root='content'){
 const result={};
 for(const type of types){
  const files=(await readdir(path.join(root,type))).filter(f=>f.endsWith('.json'));
  const ids=new Set();result[type]=[];
  for(const file of files){
   const e=validateEntry(JSON.parse(await readFile(path.join(root,type,file),'utf8')),type);
   if(ids.has(e.id)||file!==e.id+'.json')throw Error(`Duplicate or mismatched ID: ${file}`);ids.add(e.id);
   for(const m of e.media)for(const src of [m.src,m.poster].filter(Boolean)){
    const filePath=safeMediaPath(src);await access(filePath);
    if(filePath.startsWith('assets/uploads/')&&(await stat(filePath)).size>20000000)throw Error(`${e.id}: 上传素材超过20MB，请压缩后重试`);
   }
   result[type].push(e);
  }
  result[type].sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
 }
 return result;
}
export async function readProducts(root='content/products'){
 const result=[],ids=new Set();
 for(const file of (await readdir(root)).filter(f=>f.endsWith('.json'))){
  const p=validateProduct(JSON.parse(await readFile(path.join(root,file),'utf8')));
  if(ids.has(p.id)||file!==p.id+'.json')throw Error(`Duplicate or mismatched product ID: ${file}`);ids.add(p.id);
  for(const m of p.media)for(const value of [m.src,m.thumbnail].filter(Boolean)){const src=safeMediaPath(value);await access(src);if((await stat(src)).size>20000000)throw Error(`${p.id}: 商品图片超过20MB`);}
  for(const v of p.variants||[])if(v.image){const src=safeMediaPath(v.image);await access(src);if((await stat(src)).size>20000000)throw Error(`${p.id}: 款式图片超过20MB`);}
  result.push(p);
 }
 return result.sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
}
export async function build(){
 const all=await readEntries();
 const products=await readProducts();
 const shopSettings=validateShopSettings(JSON.parse(await readFile('content/settings/shop.json','utf8')));
 const versions={};
 for(const asset of ['home.css','home.js','includes.js','new-script.js','shop.css','shop.js']) versions[asset]=createHash('sha256').update(await readFile(asset)).digest('hex').slice(0,12);
 const shared=await readFile('includes.js','utf8');
 const components=JSON.parse(shared.match(/const components = (.*);/)[1]);
 // Deploy public files and uploaded media; source records and unpublished pages are omitted.
 await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
 for(const name of ['assets','admin','home.css','home.js','includes.js','new-script.js','shop.css','shop.js','robots.txt','sitemap.xml','CNAME'])await cp(name,path.join('dist',name),{recursive:true});
 await cp('scripts/content.mjs','admin/content.mjs');
 await cp('scripts/content.mjs','dist/admin/content.mjs');
 await cp('scripts/shop.mjs','admin/shop.mjs');
 await cp('scripts/shop.mjs','dist/admin/shop.mjs');
 for(const name of ['shop-commerce','shop-settings','shop-discovery']){
  await cp(`scripts/${name}.mjs`,`admin/${name}.mjs`);
  await cp(`scripts/${name}.mjs`,`dist/admin/${name}.mjs`);
 }
 // Only public customer-facing settings belong in this file.
 for(const directory of ['admin','dist/admin'])await writeFile(`${directory}/shop-settings.json`,JSON.stringify(shopSettings));
 await writeFile('dist/.nojekyll','');
 for(const page of ['index','about',...types]){
  const $=load(await readFile(page+'.html','utf8'));
  if(types.includes(page)){
   const entries=all[page].filter(e=>e.published);
   if(page==='relations'){
    $('.relations-grid').html(entries.filter(e=>e.category==='letter').map(e=>renderEntry(e,page)).join('\n'));
    $('.exchange-section .exchange-card').remove();
    $('.exchange-section').append(entries.filter(e=>e.category==='exchange').map(e=>renderEntry(e,page)).join('\n'));
   }else{
    $(`.${page==='activities'?'activities':page==='ceremonies'?'ceremonies':'members'}-detail-section > .container`).html(entries.map(e=>renderEntry(e,page)).join('\n')||'<p class="empty-content" data-zh="内容正在整理，敬请关注。" data-en="Updates are coming soon.">内容正在整理，敬请关注。</p>');
   }
  }
  if(page==='index'){
   const featured=all.activities.filter(e=>e.published&&e.featured).slice(0,4);
   const story=e=>`<a class="text-link" href="activities.html#${esc(e.id)}"><span data-zh="${esc(e.title)}" data-en="${esc(e.title_en||e.title)}">${esc(e.title)}</span><svg class="link-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 12 12 4M5 4h7v7"/></svg></a><p data-zh="${esc(e.body.split('\n\n')[0])}" data-en="${esc((e.body_en||e.body).split('\n\n')[0])}">${esc(e.body.split('\n\n')[0])}</p>`;
   if(featured.length){const image=featured[0].media.find(m=>m.kind==='image');$('.feature-story').html((image?`<a href="activities.html#${esc(featured[0].id)}"><img src="${esc(safeMediaPath(image.src))}" alt="${esc(image.alt)}" loading="lazy"></a>`:'')+story(featured[0]));$('.story-list').html(featured.slice(1).map(e=>`<article>${story(e)}</article>`).join(''));}
   else $('.activity-layout').html('<p data-zh="最新活动即将更新。" data-en="New activities will be announced soon.">最新活动即将更新。</p>');
  }
  $('link[href],script[src]').each((_,element)=>{
   const attr=$(element).is('script')?'src':'href';const original=$(element).attr(attr);const name=original?.split('?')[0];
   if(versions[name]) $(element).attr(attr,name+'?v='+versions[name]);
  });
  await writeFile(`dist/${page}.html`,optimize($.html(),page,'zh',components));
  await mkdir('dist/en',{recursive:true});
  await writeFile(`dist/en/${page}.html`,optimize($.html(),page,'en',components));
 }
 const shopTemplate=await readFile('shop.html','utf8');
 for(const lang of ['zh','en']){
  const en=lang==='en',prefix=en?'dist/en':'dist';await mkdir(prefix+'/shop',{recursive:true});
  const renderPage=async(page,main,metadata)=>{
   const $=load(shopTemplate);$('main').html(main);
   $('link[href],script[src]').each((_,el)=>{const attr=$(el).is('script')?'src':'href',name=$(el).attr(attr)?.split('?')[0];if(versions[name])$(el).attr(attr,'/'+name+'?v='+versions[name]);});
   await writeFile(`${prefix}/${page}.html`,optimize($.html(),page,lang,components,metadata));
  };
  await renderPage('shop',renderShop(products,{english:en,settings:shopSettings}),shopMetadata(products,en));
  await renderPage('shop-policies',renderShopPoliciesPage(shopSettings,{english:en}),{pageType:'WebPage'});
  for(const p of products.filter(p=>p.published))await renderPage('shop/'+p.id,renderProductPreview(p,{english:en,settings:shopSettings}),productMetadata(p,en));
 }
 await writeFile('dist/sitemap.xml',sitemap(products));
 const markdownText=s=>String(s).replace(/[\r\n]+/g,' ').replace(/[\\\[\]()*_`<>]/g,'');
 await writeFile('dist/llms.txt','# Yangzhu Taoist Association of America\n\nOfficial bilingual website of the New York-based Taoist association.\n\n## Cultural shop\n\nProduct pages contain photographs, descriptions of Taoist cultural meanings, product facts and questions. Spiritual meanings describe tradition and belief, not guaranteed outcomes.\n\n- [Shipping, returns and customer service](https://yangzhu.org/en/shop-policies.html)\n\n'+products.filter(p=>p.published).map(p=>`- [${markdownText(p.title_en||p.title)}](https://yangzhu.org/en/shop/${p.id}.html): ${markdownText(productSearchText(p,true).description)}`).join('\n')+'\n');
 await writeFile('dist/admin/build.json',JSON.stringify({builtAt:new Date().toISOString(),revision:process.env.GITHUB_SHA||'local'}));
 console.log('Built website:',Object.fromEntries([...types.map(t=>[t,all[t].filter(e=>e.published).length]),['products',products.filter(p=>p.published).length]]));
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve('scripts/build.mjs'))await build();
