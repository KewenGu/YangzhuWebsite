// The same controlled widgets Decap saves are the source of truth for AI drafts.
export const productDraftFields = {
 title_en:'英文商品名称',summary:'中文短介绍',summary_en:'英文短介绍',
 body:'中文商品介绍',body_en:'英文商品介绍',details:'中文商品细节',details_en:'英文商品细节',
 faq:'中文常见问题',faq_en:'英文常见问题'
};
const sourceFields = ['title','title_en','body','details','category'];
export function takeProductSnapshot(fields) {
 return new Map([...fields].map(([key,widget]) => [key,{widget,value:String(widget.props.value ?? '')}]));
}
export function snapshotIsCurrent(fields,snapshot) {
 return [...snapshot].every(([key,{widget,value}]) => fields.get(key)===widget && String(widget.props.value ?? '')===value);
}
export function applyProductDraft(fields,snapshot,draft,selected) {
 // A changed source, edited destination, or navigation to another product invalidates the draft.
 if(!snapshotIsCurrent(fields,snapshot))return 0;
 let count=0;
 for(const key of selected) {
  if(!Object.hasOwn(productDraftFields,key)||!snapshot.has(key)||typeof draft[key]!=='string'||!draft[key].trim())continue;
  fields.get(key).props.onChange(draft[key].trim());count++;
 }
 return count;
}
export function prepareProductInput(fields) {
 return Object.fromEntries(sourceFields.map(key => [key,String(fields.get(key)?.props.value ?? '')]));
}
export function decodeGeneratedImage(result) {
 if(!result||!['image/png','image/jpeg','image/webp'].includes(result.mime)||typeof result.base64!=='string'||!result.base64||result.base64.length>16000000||!/^[A-Za-z0-9+/]*={0,2}$/.test(result.base64))throw Error('图片服务返回了无效文件，请重试。');
 const bytes=Uint8Array.from(atob(result.base64),c=>c.charCodeAt(0));
 if(bytes.length<12)throw Error('图片服务返回了不完整文件，请重试。');
 const signature=result.mime==='image/png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:result.mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216: String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 if(!signature)throw Error('图片格式不正确，请重试。');
 return new Blob([bytes],{type:result.mime});
}
function readImage(file) {
 return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('无法读取原图，请重新选择。'));reader.readAsDataURL(file);});
}
async function requestAI(path,body,authBaseUrl,signal) {
 let session;try{session=JSON.parse(localStorage.getItem('decap-cms-user')||'null');}catch{}
 if(!session?.token)throw Error('请重新登录后台后使用 AI 商品助手。');
 if(!authBaseUrl)throw Error('尚未配置 AI 服务，请联系管理员。');
 const endpoint=new URL(path,authBaseUrl);
 if(endpoint.protocol!=='https:')throw Error('AI 服务必须使用 HTTPS。');
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.token},body:JSON.stringify(body),signal});
 let payload;try{payload=await response.json();}catch{throw Error('AI 商品助手尚未启用，请联系管理员更新服务配置。');}
 if(!response.ok)throw Error(payload.error||'生成暂时失败，请稍后重试。');
 return payload;
}
export function registerShopWidgets(CMS,config,{authBaseUrl,local=false}) {
 const collection=config.collections.find(c=>c.name==='products');
 if(!collection)return;
 const fields=new Map(),h=window.h;
 const ProductControl=window.createClass({
  getInitialState(){return {busy:false,message:'',draft:null,selected:{},reference:null,referenceUrl:'',imageUrl:'',imageMime:'',prompt:''};},
  componentDidMount(){this.alive=true;fields.set(this.props.field.get('name'),this);},
  componentWillUnmount(){
   this.alive=false;const name=this.props.field.get('name');if(fields.get(name)===this)fields.delete(name);
   this.abort?.abort();if(this.state.imageUrl)URL.revokeObjectURL(this.state.imageUrl);if(this.state.referenceUrl)URL.revokeObjectURL(this.state.referenceUrl);
  },
  async generate(mode) {
   if(this.state.busy)return;
   if(local){this.setState({message:'AI 商品助手需在正式发布后台登录后使用。本机仍可手动编辑和预览商品。'});return;}
   const product=prepareProductInput(fields);
   if(!product.title.trim()||!product.body.trim()){this.setState({message:'先填写商品名称和中文商品介绍，描述真实的图案与已确认的信息。'});return;}
   if(mode==='image'&&!this.state.reference){this.setState({message:'先选择一张真实商品原图，AI 会基于这张图制作展示图。'});return;}
   const snapshot=takeProductSnapshot(fields),reference=this.state.reference;
   this.setState({busy:true,message:mode==='copy'?'正在草拟中英文商品文案…':'正在根据原图制作展示图，通常需要一两分钟…'});
   this.abort=new AbortController();const timer=setTimeout(()=>this.abort.abort(),mode==='copy'?90000:180000);
   try {
    if(mode==='copy') {
     const payload=await requestAI('/shop-ai/copy',{product},authBaseUrl,this.abort.signal);
     if(!this.alive)return;
     if(!snapshotIsCurrent(fields,snapshot)){this.setState({message:'生成期间商品内容发生变化，未使用旧草稿。请重新生成。'});return;}
     const draft=Object.fromEntries(Object.keys(productDraftFields).filter(key=>typeof payload.draft?.[key]==='string'&&payload.draft[key].trim()).map(key=>[key,payload.draft[key].trim()]));
     if(!Object.keys(draft).length)throw Error('未收到可用文案，请重试。');
     const selected=Object.fromEntries(Object.keys(draft).map(key=>[key,!snapshot.get(key)?.value.trim()]));
     this.copySnapshot=snapshot;
     this.setState({draft,selected,prompt:typeof payload.draft.image_prompt==='string'?payload.draft.image_prompt:'',message:'草稿已生成。可编辑下方文字，勾选需要写入的字段，再点击「应用选中文案」。已有内容默认保留。'});
    }else{
     const base64=await readImage(reference);
     const payload=await requestAI('/shop-ai/image',{product,image:{base64,mime:reference.type},prompt:this.state.prompt},authBaseUrl,this.abort.signal);
     const blob=decodeGeneratedImage(payload.image);
     if(!this.alive)return;
     if(!snapshotIsCurrent(fields,snapshot)){this.setState({message:'生成期间商品内容发生变化，未使用旧图片。请重新生成。'});return;}
     if(this.state.imageUrl)URL.revokeObjectURL(this.state.imageUrl);
     this.setState({imageUrl:URL.createObjectURL(blob),imageMime:blob.type,message:'展示图已生成，尚未加入商品。请对照原图核对雕刻、符字、形状和颜色；确认后下载，再添加到「商品图片」并勾选「AI 辅助图片」。'});
    }
   }catch(error){if(this.alive)this.setState({message:error.name==='AbortError'?'生成超时，请稍后重试。已填写的商品资料已保留。':error.message});}
   finally{clearTimeout(timer);if(this.alive)this.setState({busy:false});}
  },
  applyDraft() {
   const selected=Object.keys(this.state.selected).filter(key=>this.state.selected[key]);
   if(!selected.length){this.setState({message:'请至少勾选一个要应用的字段。'});return;}
   const count=applyProductDraft(fields,this.copySnapshot,this.state.draft,selected);
   this.setState(count?{draft:null,message:`已写入 ${count} 个字段。请预览并核对商品事实、译文和收款信息，再保存草稿。`}:{message:'商品内容已改变，或已切换条目。为保留你的修改，请重新生成草稿。'});
  },
  chooseReference(event) {
   const file=event.target.files?.[0];
   if(!file)return;
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>6*1024*1024){event.target.value='';if(this.state.referenceUrl)URL.revokeObjectURL(this.state.referenceUrl);this.setState({reference:null,referenceUrl:'',message:'请选择不超过 6MB 的 JPG、PNG 或 WebP 商品原图。'});return;}
   if(this.state.imageUrl)URL.revokeObjectURL(this.state.imageUrl);
   if(this.state.referenceUrl)URL.revokeObjectURL(this.state.referenceUrl);
   this.setState({reference:file,referenceUrl:URL.createObjectURL(file),imageUrl:'',message:'已选择原图。生成时会将该图片发送给 AI 图片服务，请使用你有权发布的商品照片。'});
  },
  render() {
   const Control=CMS.getWidget(this.props.field.get('shopBase')).control;
   if(this.props.field.get('name')!=='title')return h(Control,this.props);
   return h('div',null,h(Control,this.props),h('section',{className:'shop-ai-tools','aria-label':'AI 商品助手'},
    h('h3',null,'AI 商品助手'),
    h('p',null,'先填写商品名称、介绍和已知细节。AI 可草拟中英文介绍和问答，也可基于商品原图制作展示图。生成后只需核对商品事实与译文。搜索展示信息会根据保存的商品资料自动生成，无需设置或使用 AI 助手。'),
    h('button',{type:'button',disabled:this.state.busy,onClick:()=>this.generate('copy')},this.state.busy?'正在生成…':'草拟商品文案'),
    this.state.draft?h('div',{className:'shop-ai-draft'},
     ...Object.entries(this.state.draft).map(([key,value])=>h('div',{key,className:'shop-ai-draft-field'},
      h('label',null,h('input',{type:'checkbox',checked:!!this.state.selected[key],onChange:e=>this.setState({selected:{...this.state.selected,[key]:e.target.checked}})}),productDraftFields[key],this.copySnapshot?.get(key)?.value.trim()?'（替换已有内容）':''),
      h('textarea',{'aria-label':productDraftFields[key]+'草稿',value,rows:key.startsWith('body')||key.startsWith('faq')?5:3,onChange:e=>this.setState({draft:{...this.state.draft,[key]:e.target.value}})})
     )),h('button',{type:'button',disabled:this.state.busy,onClick:()=>this.applyDraft()},'应用选中文案'),
     h('button',{type:'button',className:'shop-ai-secondary',onClick:()=>this.setState({draft:null,message:'已丢弃草稿，原有内容保留。'})},'丢弃草稿')):null,
    h('details',{className:'shop-ai-image-tools'},h('summary',null,'制作商品展示图'),
     h('p',null,'使用真实原图作为参考。AI 可能改变雕刻或符字，请逐项核对；展示图不能替代真实商品主图。'),
     h('label',null,'商品原图（JPG / PNG / WebP，最多 6MB）',h('input',{type:'file',accept:'image/jpeg,image/png,image/webp',disabled:this.state.busy,onChange:e=>this.chooseReference(e)})),
     this.state.referenceUrl?h('figure',{className:'shop-ai-reference'},h('img',{src:this.state.referenceUrl,alt:'用于核对的真实商品原图'}),h('figcaption',null,'真实商品原图')):null,
     h('label',null,'画面要求（可选）',h('textarea',{value:this.state.prompt,rows:3,placeholder:'例如：柔和自然光、素色背景；保留商品原本的雕刻和颜色。',disabled:this.state.busy,onChange:e=>this.setState({prompt:e.target.value})})),
     h('button',{type:'button',disabled:this.state.busy||!this.state.reference,onClick:()=>this.generate('image')},'根据原图生成展示图'),
     this.state.imageUrl?h('div',{className:'shop-ai-generated'},h('img',{src:this.state.imageUrl,alt:'待核对的 AI 商品展示图'}),h('p',null,'这张图尚未上传或发布。核对无误后下载，在「商品图片」中上传，并打开「AI 辅助图片」。'),h('a',{href:this.state.imageUrl,download:'yangzhu-product-ai.'+(this.state.imageMime==='image/png'?'png':this.state.imageMime==='image/jpeg'?'jpg':'webp')},'下载展示图')):null
    ),h('p',{role:'status','aria-live':'polite'},this.state.message)
   ));
  }
 });
 CMS.registerWidget('product-field',ProductControl);
 for(const field of collection.fields)if(['string','text','select'].includes(field.widget)){
  field.shopBase=field.widget;field.widget='product-field';
 }
}
