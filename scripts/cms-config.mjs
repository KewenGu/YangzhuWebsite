import {writeFile} from 'node:fs/promises';
const field=(name,label,widget='string',extra={})=>({name,label,widget,...extra});
const media=field('media','图片与视频','list',{required:false,default:[],summary:'{{fields.alt}}',fields:[field('kind','素材类型','select',{options:[{label:'图片',value:'image'},{label:'视频',value:'video'}],default:'image'}),field('src','选择或上传文件','file',{choose_url:false,media_library:{config:{max_file_size:20000000}},hint:'图片支持 JPG / PNG / WebP / GIF；视频支持 MP4 / WebM。单个文件不超过20MB。'}),field('alt','图片或视频说明'),field('poster','视频封面','image',{required:false,choose_url:false})]});
const stockField=()=>field('stock_quantity','库存数量（人工维护）','number',{required:false,value_type:'int',min:0,hint:'留空表示未录入数量；0 会暂停网站购买入口。付款后不会自动扣减，修改后需发布才生效；Stripe 链接的库存或限购仍需另行管理。'});
const availabilityField=()=>field('availability','销售状态','select',{default:'inquiry',options:[{label:'咨询购买',value:'inquiry'},{label:'有货，可购买',value:'in_stock'},{label:'暂时缺货',value:'out_of_stock'}],hint:'仅在有货、库存不为0、价格有效且 Stripe 链接已核对时显示付款入口。'});
const stripeField=(variant=false)=>field('stripe_url','Stripe 收款链接','string',{required:false,pattern:['^https://buy\\.stripe\\.com/[A-Za-z0-9_]+$','请填写 https://buy.stripe.com/ 开头的有效收款链接'],hint:variant?'使用该款式独立的 Stripe 收款链接，并确保 Stripe 订单名称明确标识此款式；请勿复用其他款式链接。':'每件商品必须对应自己的收款链接，请勿复用其他商品的链接。修改网站售价不会同步修改 Stripe。'});
const variants=field('variants','商品款式','list',{required:false,default:[],max:50,summary:'{{fields.title}}',hint:'可添加不同图案或形制的款式，最多50款。添加任何款式后，商品统一收款入口即停用；每款需分别填写价格及独立收款链接。未确认的款式可停用或设为咨询购买。',fields:[
 field('id','款式标识','string',{pattern:['^(?=.{1,100}$)[a-z0-9]+(?:-[a-z0-9]+)*$','使用小写英文、数字和单个连字符，例如 wenchang'],hint:'同一商品内不能重复。已发布款式请保持此标识不变。'}),
 field('title','中文款式名称','string',{pattern:['^.{1,200}$','请填写不超过200字的款式名称']}),field('title_en','英文款式名称','string',{required:false}),
 field('enabled','在商品页展示此款式','boolean',{default:false,hint:'关闭后保留资料，但买家看不到此款式。'}),
 field('image','款式实物图','image',{required:false,choose_url:false,media_library:{config:{max_file_size:20000000}},hint:'可上传此款式的真实照片，帮助买家核对图案。支持 JPG / PNG / WebP；最多20MB。'}),
 field('image_alt','中文款式图片说明','string',{required:false,hint:'选填，可补充图案或拍摄角度；留空时会根据商品和款式名称自动生成说明。'}),field('image_alt_en','英文款式图片说明','string',{required:false,hint:'选填，留空时自动生成说明。'}),
 field('details','中文款式细节','text',{required:false,hint:'每行一项，例如「尺寸：已确认的尺寸」。商品共有规格仍填写在上方商品细节。'}),field('details_en','英文款式细节','text',{required:false}),
 field('price','此款售价（美元）','number',{required:false,value_type:'float',min:0.01,hint:'必须与此款 Stripe 收款页一致，最多两位小数。网站售价不会同步修改 Stripe。'}),stripeField(true),
 field('checkout_verified','已核对此款式和收款金额','boolean',{default:false,hint:'打开此款收款页，确认 Stripe 商品名称明确包含本款式、单件价格与选购内容一致后再勾选。'}),availabilityField(),stockField()
]});
const policyPairs=[['contact_note','售后联系说明'],['ships_from','发货地点'],['shipping_regions','配送国家与地区'],['shipping_rates','运费规则'],['dispatch_time','备货与发货时间'],['delivery_time','预计运输时间'],['tracking','物流追踪'],['pickup','自取安排'],['returns','退货与退款规则'],['cancellations','取消订单规则'],['damaged_orders','损坏、错发或丢件处理'],['custom_orders','定制商品规则'],['duties_taxes','税费与关税说明']];
const collections=[['activities','活动与交流','活动'],['ceremonies','协会法会','法会'],['members','主要成员','成员'],['relations','国际联谊','联谊条目']].map(([name,label,label_singular])=>({name,label,label_singular,folder:`content/${name}`,create:true,delete:false,format:'json',extension:'json',identifier_field:'title',slug:'{{id}}',summary:'{{title}}',sortable_fields:['order','title'],view_filters:[{label:'网站展示中',field:'published',pattern:true},{label:'已下架',field:'published',pattern:false}],fields:[field('id','条目标识','entry-id'),field('title',name==='members'?'姓名':'标题','string',{pattern:['^.{1,200}$','请填写不超过200字的标题']}),field('title_en',name==='members'?'英文姓名':'英文标题','string',{required:false,hint:'暂未填写英文时，英文页面会显示中文内容。'}),...(name==='members'?[field('role','职务'),field('role_en','英文职务','string',{required:false})]:[]),...(name==='relations'?[field('category','条目类别','select',{options:[{label:'贺信与祝贺',value:'letter'},{label:'联谊与交流',value:'exchange'}],default:'exchange'})]:[]),...(['activities','ceremonies'].includes(name)?[field('date','日期','datetime',{required:false,date_format:'YYYY-MM-DD',time_format:false,format:'YYYY-MM-DD',picker_utc:true}),field('location','地点','string',{required:false}),field('location_en','英文地点','string',{required:false})]:[]),field('body','中文介绍','text',{hint:'像写邮件一样输入正文，空一行即可分段。请勿粘贴网页代码。'}),field('body_en','英文介绍','text',{required:false}),media,field('order','显示顺序','number',{default:0,value_type:'int',min:0,hint:'数字越小越靠前。新活动可填0；成员可用10、20、30排列。'}),...(name==='activities'?[field('featured','在首页展示','boolean',{default:false,hint:'首页最多显示4条，按照显示顺序排列。'})]:[]),field('published','在网站上显示','boolean',{default:true,hint:'关闭后再发布，即可下架；内容仍保留，可随时恢复。'})]}));
collections.push({
 name:'products',label:'在线商店',label_singular:'商品',folder:'content/products',create:true,delete:false,format:'json',extension:'json',identifier_field:'title',slug:'{{id}}',summary:'{{title}}',sortable_fields:['order','title'],
 view_filters:[{label:'网站展示中',field:'published',pattern:true},{label:'已下架 / 待上架',field:'published',pattern:false}],
 fields:[
  field('id','商品编号','entry-id',{hint:'系统自动生成并保留，无需填写。修改商品名称不会改变已有网址。'}),
  field('title','商品名称','string',{pattern:['^.{1,200}$','请填写不超过200字的商品名称'],hint:'正常填写商品名称和介绍即可。网站会根据资料自动生成供搜索引擎和 AI 搜索使用的信息，并随商品更新，无需额外设置。'}),
  field('title_en','英文商品名称','string',{required:false}),
  field('category','商品类别','select',{options:[{label:'挂件',value:'pendants'},{label:'书法与符箓',value:'calligraphy'}],default:'pendants'}),
  field('summary','中文短介绍','text',{hint:'一句话说明商品是什么及其特色，会出现在商品列表。'}),
  field('summary_en','英文短介绍','text',{required:false}),
  field('body','中文商品介绍','text',{hint:'先填写已知的商品事实，再使用 AI 草拟描述。请勿填写未经确认的材质、尺寸或效果承诺。空一行即可分段。'}),
  field('body_en','英文商品介绍','text',{required:false}),
  field('details','中文商品细节','text',{required:false,hint:'每行一项，例如「图案：文昌帝君」。只填写已确认的规格；无需凑齐未知的材质或尺寸。'}),
  field('details_en','英文商品细节','text',{required:false}),
  field('faq','中文常见问题','text',{required:false,hint:'选填商品文化、图案或用途方面的问答。问题占一行，答案另起一行；两组之间空一行。价格、库存和款式信息由系统自动整理，配送退换规则统一使用商店设置。'}),
  field('faq_en','英文常见问题','text',{required:false}),
  field('media','商品图片','list',{required:false,default:[],summary:'{{fields.alt}}',hint:'第一张是商品主图。使用真实商品照片；AI 场景图请打开「AI 辅助图片」并先核对商品细节。',fields:[
   field('kind','素材类型','hidden',{default:'image'}),
   field('src','选择或上传图片','image',{choose_url:false,media_library:{config:{max_file_size:20000000}},hint:'商品图片支持 JPG / PNG / WebP，单张不超过20MB。'}),
   field('alt','中文图片说明','string',{required:false,hint:'选填，可补充图案或拍摄角度；留空时会根据商品名称自动生成说明。'}),field('alt_en','英文图片说明','string',{required:false,hint:'选填，留空时自动生成说明。'}),
   field('generated','AI 辅助图片','boolean',{default:false,required:false,hint:'用于在页面上说明这是一张 AI 辅助展示图。'})
  ]}),
  field('price','售价（美元）','number',{required:false,value_type:'float',min:0.01,hint:'未设置款式时使用此价格。必须与 Stripe 单件价格一致；修改这里不会修改 Stripe 收款金额。不确定价格时留空。'}),
  field('currency','币种','select',{options:['USD'],default:'USD'}),
  stripeField(),
  field('checkout_verified','已核对收款商品与价格','boolean',{default:false,hint:'打开 Stripe 收款页，确认名称、价格、可选款式与本商品一致后再勾选。'}),
  availabilityField(),stockField(),variants,
  field('order','显示顺序','number',{default:0,value_type:'int',min:0}),
  field('published','在网站上显示','boolean',{default:false,hint:'先保存草稿并预览；确认内容和付款链接后打开，再发布。关闭并发布即可下架。'})
 ]
});
collections.push({name:'shop_settings',label:'商店设置',label_singular:'商店设置',format:'json',extension:'json',delete:false,files:[{name:'shop',label:'配送、退换与客服联系',file:'content/settings/shop.json',fields:[
 field('contact_email','公开客服邮箱','string',{pattern:['^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$','请填写有效邮箱地址'],hint:'显示在商店和商品页面上。请勿在这里填写私人订单通知邮箱、账号、密码或服务密钥。'}),
 ...policyPairs.flatMap(([name,label])=>[field(name,label,'text',{required:false,hint:'只填写已确认、准备对外公布的信息；留空不会展示此项。商店及所有商品统一使用这份说明。'}),field(name+'_en','英文'+label,'text',{required:false,hint:'未填写英文时，英文页面显示中文内容。'})])
]}]});
await writeFile('admin/config.yml',JSON.stringify({backend:{name:'github',repo:'KewenGu/YangzhuWebsite',branch:'main',auth_endpoint:'auth',commit_messages:{create:'content: 新增 {{collection}} — {{slug}}',update:'content: 更新 {{collection}} — {{slug}}'}},publish_mode:'editorial_workflow',locale:'zh_Hans',site_url:'https://yangzhu.org',display_url:'https://yangzhu.org',logo_url:'/assets/about/official_logo.png',media_folder:'assets/uploads',public_folder:'/assets/uploads',collections},null,2)+'\n');
