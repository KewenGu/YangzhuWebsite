const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('new-script.js','utf8');
function harness(send,values={name:'Test',email:'test@example.com',message:'A message long enough.'}) {
 const button={},status={};let resets=0,calls=0;
 const form={reportValidity:()=>true,querySelector:()=>button,setAttribute(){},addEventListener(){},reset(){resets++}};
 const context={document:{addEventListener(){},getElementById:id=>id==='contact-form'?form:status},window:{languageManager:{currentLang:'zh'},emailjs:send?{send:(...args)=>{calls++;return send(...args)}}:undefined},FormData:class {constructor(){return Object.entries(values)}},setTimeout,clearTimeout,Date};
 vm.createContext(context);vm.runInContext(source+'\nglobalThis.Manager=FormManager;',context);
 const manager=new context.Manager({serviceId:'s',templateId:'t',publicKey:'public'});
 return {manager,button,status,context,get resets(){return resets},get calls(){return calls}};
}
test('clears input only after provider confirms delivery',async()=>{const h=harness(async()=>({status:200}));await h.manager.submit();assert.equal(h.manager.state,'sent');assert.equal(h.resets,1);assert.equal(h.button.disabled,false)});
test('preserves input on provider rejection',async()=>{const h=harness(async()=>{throw new Error('offline')});await h.manager.submit();assert.equal(h.manager.state,'failed');assert.equal(h.resets,0);assert.match(h.status.textContent,/office@yangzhu.org/)});
test('does not claim success for an unexpected response',async()=>{const h=harness(async()=>({status:500}));await h.manager.submit();assert.equal(h.manager.state,'failed');assert.equal(h.resets,0)});
test('handles blocked or unavailable email SDK',async()=>{const h=harness();await h.manager.submit();assert.equal(h.manager.state,'failed');assert.equal(h.button.disabled,false)});
test('prevents duplicate submissions while a request is pending',async()=>{let finish;const h=harness(()=>new Promise(r=>finish=r));const pending=h.manager.submit();await h.manager.submit();assert.equal(h.calls,1);assert.equal(h.button.disabled,true);finish({status:200});await pending;assert.equal(h.button.disabled,false)});
test('rejects whitespace-only name without calling provider',async()=>{const h=harness(async()=>({status:200}),{name:'  ',email:'test@example.com',message:'This is a full message'});await h.manager.submit();assert.equal(h.calls,0);assert.equal(h.manager.state,'invalid')});
test('timeout reports unknown outcome, preserves input and unlocks form',async()=>{const h=harness(()=>new Promise(()=>{}));h.context.setTimeout=callback=>setTimeout(callback,0);await h.manager.submit();assert.equal(h.manager.state,'uncertain');assert.equal(h.resets,0);assert.equal(h.button.disabled,false)});
test('status remains translatable after language change',async()=>{const h=harness();await h.manager.submit();h.context.window.languageManager.currentLang='en';h.manager.render();assert.match(h.status.textContent,/Unable to send/)});
