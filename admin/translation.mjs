// Keep the editor's controlled widgets as the source of truth, including unsaved edits.
export const translationPairs={title_en:'title',body_en:'body',location_en:'location',role_en:'role'};
export function collectMissing(fields){
 const result={};
 for(const [target,source] of Object.entries(translationPairs)){
  const a=fields.get(source),b=fields.get(target);
  if(a&&b&&String(a.props.value||'').trim()&&!String(b.props.value||'').trim())result[target]=String(a.props.value);
 }
 return result;
}
export function applyTranslations(fields,snapshot,instances,result){
 let count=0;
 for(const [target,sourceText] of Object.entries(snapshot)){
  const targetWidget=fields.get(target),sourceWidget=fields.get(translationPairs[target]);
  // Never overwrite a user's edits, or write into another entry after navigation.
  if(targetWidget!==instances.get(target)||sourceWidget!==instances.get(translationPairs[target]))continue;
  if(String(sourceWidget.props.value||'')!==sourceText||String(targetWidget.props.value||'').trim())continue;
  if(typeof result[target]!=='string'||!result[target].trim())continue;
  targetWidget.props.onChange(result[target].trim());count++;
 }
 return count;
}
export function registerTranslationWidgets(CMS,config,{authBaseUrl,local=false}){
 const fields=new Map(),h=window.h;
 const TranslateControl=window.createClass({
  getInitialState(){return {busy:false,message:''};},
  componentDidMount(){this.alive=true;fields.set(this.props.field.get('name'),this);},
  componentWillUnmount(){this.alive=false;const key=this.props.field.get('name');if(fields.get(key)===this)fields.delete(key);this.abort?.abort();},
  async translate(){
   if(this.state.busy)return;
   const snapshot=collectMissing(fields),instances=new Map(fields);
   if(!Object.keys(snapshot).length){this.setState({message:'英文已填写完整，或尚未填写中文。已有英文不会被覆盖。'});return;}
   if(local){this.setState({message:'一键翻译请在正式发布后台登录后使用。'});return;}
   this.setState({busy:true,message:'正在生成英文，请稍候…'});this.abort=new AbortController();
   const timer=setTimeout(()=>this.abort.abort(),60000);
   try{
    // This is Decap 3.16.3's own authenticated session, not an AI API key.
    let session;try{session=JSON.parse(localStorage.getItem('decap-cms-user')||'null');}catch{}
    if(!session?.token)throw Error('请重新登录后台后再翻译。');
    const response=await fetch(new URL('/translate',authBaseUrl),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.token},body:JSON.stringify({fields:snapshot}),signal:this.abort.signal});
    let payload;try{payload=await response.json();}catch{throw Error('翻译服务尚未启用，请联系管理员更新 Cloudflare 服务。');}
    if(!response.ok)throw Error(payload.error||'翻译暂时失败，请稍后重试。');
    if(!payload.translations||Object.keys(snapshot).some(k=>typeof payload.translations[k]!=='string'||!payload.translations[k].trim()))throw Error('译文不完整，请重试；原文和已有英文已保留。');
    if(!this.alive)return;
    const count=applyTranslations(fields,snapshot,instances,payload.translations);
    this.setState({message:count?`已补齐 ${count} 个英文字段。请检查姓名、日期与译文，再保存和发布。`:'翻译期间内容发生变化，未覆盖你的修改。请再次点击生成。'});
   }catch(error){if(this.alive)this.setState({message:error.name==='AbortError'?'翻译超时，请重试；已填写内容不会丢失。':error.message});}
   finally{clearTimeout(timer);if(this.alive)this.setState({busy:false});}
  },
  render(){const name=this.props.field.get('name'),Control=CMS.getWidget(this.props.field.get('translationBase')).control;
   return h('div',null,name==='title_en'?h('div',{className:'translation-tools'},h('button',{type:'button',disabled:this.state.busy,onClick:()=>this.translate()},this.state.busy?'正在生成英文…':'一键补齐英文'),h('p',null,'将缺失的英文字段交由 Cloudflare AI 翻译，保留已有英文。生成后请预览校对。'),h('p',{role:'status','aria-live':'polite'},this.state.message)):null,h(Control,this.props));
  }
 });
 CMS.registerWidget('translation-field',TranslateControl);
 for(const collection of config.collections){
  for(const field of collection.fields){
   if(Object.keys(translationPairs).includes(field.name)||Object.values(translationPairs).includes(field.name)){
    field.translationBase=field.widget;field.widget='translation-field';
   }
  }
 }
}
