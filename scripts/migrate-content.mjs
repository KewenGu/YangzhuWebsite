// One-time migration. Refuses to overwrite any existing record.
import {load} from 'cheerio';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const groups={activities:'.activity-detail-card',ceremonies:'.ceremony-detail-card',members:'.member-detail-card',relations:'.relation-card,.exchange-card'};
for(const [type,selector] of Object.entries(groups)) {
 const $=load(await readFile(`${type}.html`,'utf8'));
 await mkdir(`content/${type}`,{recursive:true});
 const entries=$(selector).toArray();
 for(const [i,node] of entries.entries()) {
  const el=$(node), title=el.find('.member-name,h2,h3').filter((_,e)=>!$(e).hasClass('member-title')).first();
  const text=(e,lang)=>$(e).attr(`data-${lang}`)||$(e).text().trim();
  const body={zh:[],en:[]};
  const content=el.find('.member-description,.activity-content,.ceremony-content,.relation-content,.exchange-content').first();
  content.find('p,div,span').each((_,e)=>{
   const n=$(e); if(n.children().length||n.is('h2,h3')) return;
   const value=n.text().trim();if(!value)return;
   if(!n.hasClass('content-en'))body.zh.push(text(e,'zh'));
   if(!n.hasClass('content-zh'))body.en.push(text(e,'en'));
  });
  const media=[];
  el.find('img,video').each((_,e)=>{
   const n=$(e),video=e.tagName==='video';
   media.push({kind:video?'video':'image',src:n.attr('src')||n.find('source').attr('src'),alt:n.attr('alt')||text(title,'zh'),poster:n.attr('poster')||''});
  });
  const record={id:el.attr('id')||`relation-${i+1}`,title:text(title,'zh'),title_en:text(title,'en'),order:(i+1)*10,published:true,body:body.zh.join('\n\n'),body_en:body.en.join('\n\n'),media};
  if(type==='members'){record.role=text(el.find('.member-title'),'zh');record.role_en=text(el.find('.member-title'),'en');}
  if(type==='relations')record.category=el.hasClass('exchange-card')?'exchange':'letter';
  if(type==='activities')record.featured=['tao-te-ching-competition','interfaith-harmony-week','museum-visits','nianhua-event'].includes(record.id);
  await writeFile(`content/${type}/${record.id}.json`,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
 }
 console.log(`${type}: migrated ${entries.length} entries`);
}
