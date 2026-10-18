import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyProductDraft,takeProductSnapshot,snapshotIsCurrent,prepareProductInput,decodeGeneratedImage,registerShopWidgets,productDraftFields} from '../admin/shop-ai.mjs';
import {registerTranslationWidgets} from '../admin/translation.mjs';

function widgets(values) {
 const writes=[];
 const fields=new Map(Object.entries(values).map(([name,value])=>[name,{props:{value,onChange:text=>writes.push([name,text])}}]));
 return {fields,writes};
}

test('product AI drafts require explicit field selection and never change commerce data',()=>{
 const {fields,writes}=widgets({title:'净字挂件',body:'商品原文',body_en:'Existing English',summary:'',price:28,stock_quantity:2,variants:[{id:'original',title:'Original',enabled:false}]});
 const snapshot=takeProductSnapshot(fields);
 const draft={body:'新的文案',body_en:'New English',summary:'简洁介绍',price:'1',stock_quantity:'100',variants:'replacement'};
 assert.equal(applyProductDraft(fields,snapshot,draft,[]),0);
 assert.equal(applyProductDraft(fields,snapshot,draft,['summary','price','stock_quantity','variants']),1);
 assert.deepEqual(writes,[['summary','简洁介绍']]);
});

test('legacy search fields cannot be written by AI or exposed for review',()=>{
 const {fields,writes}=widgets({title:'净字挂件',summary:'',seo_title:'旧标题',seo_title_en:'Old title',seo_description:'旧摘要',seo_description_en:'Old summary'});
 const snapshot=takeProductSnapshot(fields);
 const legacy=['seo_title','seo_title_en','seo_description','seo_description_en'];
 const draft={summary:'简洁介绍',...Object.fromEntries(legacy.map(key=>[key,'Unexpected manual search text']))};
 assert.ok(legacy.every(key=>!Object.hasOwn(productDraftFields,key)));
 assert.equal(applyProductDraft(fields,snapshot,draft,['summary',...legacy]),1);
 assert.deepEqual(writes,[['summary','简洁介绍']]);
});

test('shop editors only fill normal product data and may leave photo descriptions blank',async()=>{
 const config=JSON.parse(await readFile(new URL('../admin/config.yml',import.meta.url),'utf8'));
 const products=config.collections.find(c=>c.name==='products');
 const names=products.fields.map(field=>field.name);
 assert.ok(names.every(name=>!/^seo_|^geo_/.test(name)));
 assert.match(products.fields.find(field=>field.name==='title').hint,/自动生成/);
 const photoFields=products.fields.find(field=>field.name==='media').fields;
 for(const name of ['alt','alt_en'])assert.equal(photoFields.find(field=>field.name===name).required,false);
 assert.match(photoFields.find(field=>field.name==='alt').hint,/留空.*自动/);
 const variantFields=products.fields.find(field=>field.name==='variants').fields;
 for(const name of ['image_alt','image_alt_en'])assert.equal(variantFields.find(field=>field.name===name).required,false);
 assert.match(variantFields.find(field=>field.name==='image_alt').hint,/留空.*自动/);
});

test('product AI drafts preserve edits made during generation or review',()=>{
 const {fields,writes}=widgets({title:'净字挂件',body:'真实商品描述',summary:''});
 const snapshot=takeProductSnapshot(fields);
 fields.get('body').props.value='更新的商品事实';
 assert.equal(snapshotIsCurrent(fields,snapshot),false);
 assert.equal(applyProductDraft(fields,snapshot,{summary:'基于旧描述的文案'},['summary']),0);
 assert.deepEqual(writes,[]);
});

test('product AI drafts cannot leak into another entry with identical text',()=>{
 const {fields,writes}=widgets({title:'净字挂件',body:'真实商品描述',summary:''});
 const snapshot=takeProductSnapshot(fields);
 fields.set('summary',{props:{value:'',onChange:text=>writes.push(['other-entry',text])}});
 assert.equal(applyProductDraft(fields,snapshot,{summary:'旧条目的文案'},['summary']),0);
 assert.deepEqual(writes,[]);
});

test('AI receives author-provided source fields but no prices or checkout credentials',()=>{
 const {fields}=widgets({title:'挂件',title_en:'Pendant',body:'图案介绍',details:'图案：净字',category:'pendants',price:28,stripe_url:'https://buy.stripe.com/sample',published:true});
 assert.deepEqual(prepareProductInput(fields),{title:'挂件',title_en:'Pendant',body:'图案介绍',details:'图案：净字',category:'pendants'});
});

test('generated image download rejects executable and malformed payloads',()=>{
 assert.throws(()=>decodeGeneratedImage({mime:'image/svg+xml',base64:btoa('<svg onload="alert(1)"/>')}));
 assert.throws(()=>decodeGeneratedImage({mime:'image/webp',base64:btoa('<script>alert(1)</script>')}));
 assert.throws(()=>decodeGeneratedImage({mime:'image/png',base64:'not a base64 image'}));
 const bytes=Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0]);
 const blob=decodeGeneratedImage({mime:'image/png',base64:btoa(String.fromCharCode(...bytes))});
 assert.equal(blob.type,'image/png');assert.equal(blob.size,12);
});

test('products use reviewed AI controls without changing existing translation widgets',async()=>{
 const config=JSON.parse(await readFile(new URL('../admin/config.yml',import.meta.url),'utf8'));
 const original=globalThis.window;
 const registered=new Map();
 globalThis.window={h:()=>{},createClass:definition=>definition};
 try {
  const cms={registerWidget:(name,definition)=>registered.set(name,definition)};
  registerTranslationWidgets(cms,config,{local:true});
  registerShopWidgets(cms,config,{local:true});
  const products=config.collections.find(c=>c.name==='products');
  const slugField=products.fields.find(f=>f.name==='id');
  assert.equal(slugField.widget,'entry-id');
  assert.equal(slugField.label,'商品编号');
  assert.equal(Object.hasOwn(slugField,'shopBase'),false);
  assert.match(slugField.hint,/自动生成/);
  assert.equal(products.fields.find(f=>f.name==='title').widget,'product-field');
  assert.equal(products.fields.find(f=>f.name==='title_en').shopBase,'string');
  assert.equal(products.fields.find(f=>f.name==='body').shopBase,'text');
  assert.equal(config.collections.find(c=>c.name==='activities').fields.find(f=>f.name==='body').widget,'translation-field');
  assert.equal(products.fields.find(f=>f.name==='published').default,false);
  assert.equal(products.fields.find(f=>f.name==='checkout_verified').default,false);
  assert.equal(products.fields.find(f=>f.name==='availability').default,'inquiry');
  assert.equal(products.fields.find(f=>f.name==='price').required,false);
  assert.equal(products.fields.find(f=>f.name==='stripe_url').required,false);
  const pattern=new RegExp(products.fields.find(f=>f.name==='stripe_url').pattern[0]);
  assert.ok(pattern.test('https://buy.stripe.com/cNi3cwckN6dWfgY6Hgew800'));
  assert.ok(!pattern.test('https://buy.stripe.com.evil.test/cNi3cwckN6dWfgY6Hgew800'));
  assert.ok(registered.has('product-field'));
 } finally {globalThis.window=original;}
});

async function withProductControls(run) {
 const previous={window:globalThis.window,fetch:globalThis.fetch,localStorage:globalThis.localStorage};
 const registered=new Map(),changes=[];
 globalThis.window={h:()=>{},createClass:definition=>definition};
 globalThis.localStorage={getItem:()=>JSON.stringify({token:'editor-session-token'})};
 const config={collections:[{name:'products',fields:['title','title_en','body','body_en','summary','summary_en','details','category'].map(name=>({name,widget:'string'}))}]};
 const cms={registerWidget:(name,definition)=>registered.set(name,definition)};
 registerShopWidgets(cms,config,{authBaseUrl:'https://auth.example.test'});
 const definition=registered.get('product-field'),controls=new Map();
 for(const field of config.collections[0].fields) {
  const control={...definition,props:{field:{get:key=>field[key]},value:field.name==='title'?'净字挂件':field.name==='body'?'提供的真实商品描述':field.name==='category'?'pendants':''}};
  control.props.onChange=value=>{changes.push([field.name,value]);control.props.value=value;};
  control.state=control.getInitialState();control.setState=patch=>Object.assign(control.state,patch);control.componentDidMount();controls.set(field.name,control);
 }
 try {await run(controls,changes);} finally {
  for(const control of controls.values())control.componentWillUnmount();
  globalThis.window=previous.window;globalThis.fetch=previous.fetch;
  if(previous.localStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous.localStorage;
 }
}

test('AI control requests authenticated drafts and applies only reviewed fields',async()=>withProductControls(async(controls,changes)=>{
 let request;
 globalThis.fetch=async(url,options)=>{request={url:String(url),...options};return Response.json({draft:{title_en:'Jing Pendant',summary:'简洁介绍',body:'可选新正文',seo_description:'不应出现的搜索摘要'}});};
 const title=controls.get('title');
 await title.generate('copy');
 assert.equal(request.url,'https://auth.example.test/shop-ai/copy');
 assert.equal(request.headers.Authorization,'Bearer editor-session-token');
 assert.equal(JSON.parse(request.body).product.title,'净字挂件');
 assert.equal(title.state.selected.body,false);
 assert.equal(title.state.selected.summary,true);
 assert.equal(Object.hasOwn(title.state.draft,'seo_description'),false);
 assert.equal(Object.hasOwn(title.state.selected,'seo_description'),false);
 assert.equal(changes.length,0);
 title.state.draft.summary='人工校对后的介绍';
 title.applyDraft();
 assert.deepEqual(changes,[['title_en','Jing Pendant'],['summary','人工校对后的介绍']]);
 assert.equal(controls.get('body').props.value,'提供的真实商品描述');
 assert.equal(title.state.draft,null);
}));

test('AI control exposes missing-service errors and drops responses after source edits',async()=>withProductControls(async(controls,changes)=>{
 const title=controls.get('title');
 globalThis.fetch=async()=>Response.json({error:'尚未配置图片服务密钥'},{status:503});
 await title.generate('copy');
 assert.match(title.state.message,/尚未配置/);assert.equal(title.state.busy,false);
 globalThis.fetch=async()=>{controls.get('body').props.value='编辑期间更新的描述';return Response.json({draft:{summary:'基于旧信息'}});};
 await title.generate('copy');
 assert.equal(title.state.draft,null);assert.equal(changes.length,0);
 assert.match(title.state.message,/发生变化/);
}));
