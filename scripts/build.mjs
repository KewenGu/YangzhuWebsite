import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import {optimize,sitemap} from './seo.mjs';
import {readFile,writeFile,readdir,cp,mkdir,rm,access,stat} from 'node:fs/promises';
import {types,validateEntry,renderEntry,safeMediaPath,escapeHTML as esc} from './content.mjs';
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
export async function build(){
 const all=await readEntries();
 const versions={};
 for(const asset of ['home.css','home.js','includes.js','new-script.js']) versions[asset]=createHash('sha256').update(await readFile(asset)).digest('hex').slice(0,12);
 const shared=await readFile('includes.js','utf8');
 const components=JSON.parse(shared.match(/const components = (.*);/)[1]);
 // Only explicit public files are deployed. Source data and draft content stay out of the website.
 await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
 for(const name of ['assets','admin','home.css','home.js','includes.js','new-script.js','robots.txt','sitemap.xml','CNAME'])await cp(name,path.join('dist',name),{recursive:true});
 await cp('scripts/content.mjs','admin/content.mjs');
 await cp('scripts/content.mjs','dist/admin/content.mjs');
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
   const story=e=>`<a class="text-link" href="activities.html#${esc(e.id)}"><span data-zh="${esc(e.title)}" data-en="${esc(e.title_en||e.title)}">${esc(e.title)}</span><span aria-hidden="true">↗︎</span></a><p data-zh="${esc(e.body.split('\n\n')[0])}" data-en="${esc((e.body_en||e.body).split('\n\n')[0])}">${esc(e.body.split('\n\n')[0])}</p>`;
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
 await writeFile('dist/sitemap.xml',sitemap());
 await writeFile('dist/admin/build.json',JSON.stringify({builtAt:new Date().toISOString(),revision:process.env.GITHUB_SHA||'local'}));
 console.log('Built website:',Object.fromEntries(types.map(t=>[t,all[t].filter(e=>e.published).length])));
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve('scripts/build.mjs'))await build();
