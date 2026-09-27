import {test} from 'node:test';
import assert from 'node:assert/strict';
import {translate} from '../auth/worker.mjs';
import {collectMissing,applyTranslations} from '../admin/translation.mjs';
const env={CMS_ORIGIN:'https://yangzhu.org',AUTH_ORIGIN:'https://auth.example.test',ALLOWED_USERS:'president',AI:{run:async()=>({response:JSON.stringify({title_en:'First Anniversary'})})}};
const req=(fields={title_en:'成立一周年'},extra={})=>new Request(env.AUTH_ORIGIN+'/translate',{method:'POST',headers:{Origin:env.CMS_ORIGIN,Authorization:'Bearer test-token','Content-Type':'application/json',...extra},body:JSON.stringify({fields})});
const gh=async url=>Response.json(url.endsWith('/user')?{login:'president'}:{permissions:{push:true}});
test('translation requires exact origin, a session, allowlist and repository write access',async()=>{
 assert.equal((await translate(req(undefined,{Origin:'https://evil.test'}),env,gh)).status,403);
 assert.equal((await translate(req(undefined,{Authorization:''}),env,gh)).status,401);
 assert.equal((await translate(req(),env,async()=>Response.json({login:'stranger'}))).status,403);
 assert.equal((await translate(req(),env,async url=>Response.json(url.endsWith('/user')?{login:'president'}:{permissions:{push:false}}))).status,403);
});
test('translation CORS only permits the site, and missing AI has actionable error',async()=>{
 const r=await translate(new Request(env.AUTH_ORIGIN+'/translate',{method:'OPTIONS',headers:{Origin:env.CMS_ORIGIN}}),env,gh);
 assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),env.CMS_ORIGIN);
 const missing=await translate(req(),{...env,AI:null},gh);assert.equal(missing.status,503);assert.match((await missing.json()).error,/AI/);
});
test('translation validates size and field names before AI invocation',async()=>{
 let calls=0;const e={...env,AI:{run:async()=>{calls++;return {};}}};
 for(const fields of [{token:'secret'},{title_en:''},{body_en:'字'.repeat(6001)},{title_en:'字'.repeat(201)},[]])assert.ok((await translate(req(fields),e,gh)).status>=400);
 assert.equal(calls,0);
});
test('translation returns validated English and fails cleanly on model errors',async()=>{
 const response=await translate(req(),env,gh);assert.equal(response.status,200);assert.deepEqual(await response.json(),{translations:{title_en:'First Anniversary'}});assert.equal(response.headers.get('Cache-Control'),'no-store');
 for(const output of ['invalid','{}','{"title_en":""}','{"title_en":"ok","extra":"oops"}'])assert.equal((await translate(req(),{...env,AI:{run:async()=>({response:output})}},gh)).status,502);
 assert.equal((await translate(req(),{...env,AI:{run:async()=>{throw Error('private error');}}},gh)).status,502);
});
function widgets(){const fields=new Map();for(const [key,value] of Object.entries({title:'标题',title_en:'',body:'中文正文',body_en:'Reviewed English'})){fields.set(key,{props:{value,onChange(text){this.value=text;}}});}return fields;}
test('only missing English is translated; reviewed English is preserved',()=>{
 const fields=widgets(),snapshot=collectMissing(fields);assert.deepEqual(snapshot,{title_en:'标题'});
 assert.equal(applyTranslations(fields,snapshot,new Map(fields),{title_en:'Title'}),1);
 assert.equal(fields.get('title_en').props.value,'Title');assert.equal(fields.get('body_en').props.value,'Reviewed English');
});
test('late translations do not overwrite manual edits, changed Chinese, or a different entry',()=>{
 for(const mode of ['english','chinese','navigate']){
  const fields=widgets(),snapshot=collectMissing(fields),instances=new Map(fields);
  if(mode==='english')fields.get('title_en').props.value='Manual';
  if(mode==='chinese')fields.get('title').props.value='新标题';
  if(mode==='navigate')fields.set('title_en',{props:{value:'',onChange(){throw Error('wrong entry');}}});
  assert.equal(applyTranslations(fields,snapshot,instances,{title_en:'Title'}),0);
 }
});
