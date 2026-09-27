import {validateEntry,renderEntry} from './content.mjs';
const message=document.getElementById('setup-error');
const local=['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).get('local')==='1';
try{
 const config=await fetch('config.yml').then(r=>{if(!r.ok)throw Error('无法读取栏目配置');return r.json()});
 const settings=await fetch('settings.json',{cache:'no-store'}).then(r=>r.json());
 if(local){
  const proxy=await fetch('http://127.0.0.1:8081/api/v1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'info'})}).then(r=>r.json());
  if(!proxy.repo)throw Error('本机编辑服务未启动，请让网站管理员运行 npm run cms:proxy。');
  config.local_backend={url:'http://127.0.0.1:8081/api/v1'};
  config.publish_mode='simple';
  document.getElementById('local-banner').hidden=false;
 }else{
  if(!settings.authBaseUrl)throw Error('正式登录尚未配置。请联系网站管理员完成 GitHub 登录接入。');
  const auth=new URL(settings.authBaseUrl);if(auth.protocol!=='https:')throw Error('登录地址必须使用 HTTPS');
  config.backend.base_url=auth.origin;
 }
 await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/decap-cms@3.16.3/dist/decap-cms.js';script.onload=resolve;script.onerror=()=>reject(Error('编辑器加载失败，请检查网络后刷新。'));document.head.append(script)});
 const h=window.h,CMS=window.CMS;
 const EntryId=window.createClass({
  componentDidMount(){if(!this.props.value||/\/new(?:[?]|$)/.test(location.hash))this.props.onChange('entry-'+crypto.randomUUID());},
  render(){return h('span',{style:{fontSize:'12px',color:'#5b6058'}},'系统自动管理，无需填写');}
 });
 CMS.registerWidget('entry-id',EntryId);
 CMS.registerPreviewStyle('../home.css');
 CMS.registerPreviewStyle('.preview-entry{padding:24px;background:white}.preview-entry .member-detail-card,.preview-entry .activity-detail-card,.preview-entry .ceremony-detail-card,.preview-entry .exchange-card{grid-template-columns:1fr;gap:32px;padding:24px 0}.preview-entry .member-photo{max-width:280px;margin:auto}.preview-entry .content-en{display:none}.preview-entry .relation-img{max-height:450px}.preview-note{font:14px/1.8 system-ui;color:#5b6058}.preview-language{padding:8px 16px;margin-bottom:20px}',{raw:true});
 const Preview=window.createClass({
  getInitialState(){return {english:false};},
  render(){const e=this.props.entry.get('data').toJS(),type=this.props.collection.get('name');let html;try{html=renderEntry(e,type);const url=this.props.getAsset;for(const m of e.media||[])for(const src of [m.src,m.poster].filter(Boolean)){const asset=String(url(src)||src);const resolved=asset.startsWith('assets/')?'/'+asset:asset;html=html.split(`="${src.replace(/^\//,'')}"`).join(`="${resolved.replace(/"/g,'&quot;')}"`);}}catch(err){return h('p',{className:'preview-note'},'填写标题、介绍和素材说明后，这里会显示网站预览。');}
   return h('div',{className:'preview-entry'},h('button',{className:'preview-language',onClick:()=>this.setState({english:!this.state.english})},this.state.english?'查看中文预览':'查看英文预览'),h('p',{className:'preview-note'},e.published?'发布后将按网站版式显示。':'当前设置为下架，发布后不会在官网显示。'),h('div',{ref:node=>{if(node){node.querySelectorAll('[data-en]').forEach(n=>n.textContent=n.dataset[this.state.english?'en':'zh']);node.querySelectorAll('.content-zh,.content-en').forEach(n=>{const show=n.classList.contains(this.state.english?'content-en':'content-zh');n.hidden=!show;n.style.display=show?'block':'none';});}},dangerouslySetInnerHTML:{__html:html}}));
  }
 });
 for(const c of config.collections)CMS.registerPreviewTemplate(c.name,Preview);
 CMS.registerEventListener({name:'preSave',handler:({entry})=>{const data=entry.get('data');validateEntry(data.toJS(),entry.get('collection'));return data;}});
 CMS.registerEventListener({name:'postPublish',handler:()=>{document.getElementById('publish-feedback')?.remove();const p=document.createElement('p');p.id='publish-feedback';p.setAttribute('role','status');p.textContent=local?'已保存到本机。重新生成网站后可查看结果。':'发布请求已提交，网站正在更新。请稍后刷新官网确认；如长时间未更新，请联系网站管理员。';Object.assign(p.style,{position:'fixed',bottom:'16px',left:'16px',right:'16px',padding:'16px',background:'#fff5cf',color:'#55430b',zIndex:'100'});p.addEventListener('click',()=>p.remove());document.body.append(p);}});
 message.remove();CMS.init({config:{...config,load_config_file:false}});
}catch(error){message.textContent=error.message||'暂时无法加载，请刷新后重试。';const a=document.createElement('a');a.href='index.html';a.textContent=' 返回发布台';message.append(a);}
