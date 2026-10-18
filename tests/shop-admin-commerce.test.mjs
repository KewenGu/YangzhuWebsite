import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createEditorContent,resolvePreviewAssets} from '../admin/editor-content.mjs';
import {validateEntry,renderEntry} from '../scripts/content.mjs';
import {validateProduct,renderProductPreview} from '../scripts/shop.mjs';
import {validateShopSettings,renderShopPoliciesPage,defaultShopSettings} from '../scripts/shop-settings.mjs';
import {registerTranslationWidgets} from '../admin/translation.mjs';

const configuration=async()=>JSON.parse(await readFile(new URL('../admin/config.yml',import.meta.url),'utf8'));
const field=(fields,name)=>fields.find(f=>f.name===name);
const editor=createEditorContent({validateEntry,renderEntry,validateProduct,renderProductPreview,validateShopSettings,renderShopPoliciesPage,shopSettings:defaultShopSettings});

test('admin exposes conservative per-design checkout and manual stock fields',async()=>{
 const {collections}=await configuration(),product=collections.find(c=>c.name==='products');
 const variants=field(product.fields,'variants');
 assert.equal(variants.widget,'list');assert.deepEqual(variants.default,[]);assert.equal(variants.required,false);assert.equal(variants.max,50);
 assert.equal(field(variants.fields,'enabled').default,false);
 assert.equal(field(variants.fields,'checkout_verified').default,false);
 assert.equal(field(variants.fields,'availability').default,'inquiry');
 for(const fields of [product.fields,variants.fields]){
  assert.equal(field(fields,'stock_quantity').required,false);
  assert.equal(field(fields,'stock_quantity').value_type,'int');
  assert.equal(field(fields,'stock_quantity').min,0);
  assert.equal(field(fields,'price').required,false);
  assert.equal(field(fields,'stripe_url').required,false);
 }
 assert.equal(field(variants.fields,'image').choose_url,false);
 assert.equal(field(variants.fields,'image').media_library.config.max_file_size,20000000);
 const idPattern=new RegExp(field(variants.fields,'id').pattern[0]);
 assert.ok(idPattern.test('wenchang-pendant'));
 for(const value of ['../escape','Bad-Id','a--b','bad-','x'.repeat(101)])assert.ok(!idPattern.test(value));
});

test('settings collection includes all supported public policy fields and no private operations fields',async()=>{
 const {collections}=await configuration(),settings=collections.find(c=>c.name==='shop_settings');
 assert.equal(settings.format,'json');assert.equal(settings.extension,'json');
 assert.equal(settings.fields,undefined);
 assert.equal(settings.files.length,1);assert.equal(settings.files[0].file,'content/settings/shop.json');assert.equal(settings.files[0].name,'shop');
 const fields=settings.files[0].fields,names=fields.map(f=>f.name);
 assert.deepEqual(names.toSorted(),Object.keys(defaultShopSettings).toSorted());
 for(const f of fields)if(f.name!=='contact_email')assert.equal(f.required,false);
 for(const name of ['api_key','stripe_secret','notification_email','customer_email','orders'])assert.ok(!names.includes(name));
});

test('settings preview renders unsaved policies and validates independently of product publication fields',()=>{
 const draft={contact_email:'shop@example.org',shipping_regions:'仅限测试地区',shipping_regions_en:'Draft delivery area',returns:'请先联系协会确认。'};
 assert.equal(editor.validate(draft,'shop_settings').contact_email,'shop@example.org');
 assert.throws(()=>editor.validate({...draft,contact_email:'bad\n@example.org'},'shop_settings'));
 assert.throws(()=>editor.validate({...draft,stripe_secret:'do-not-store'},'shop_settings'));
 const zh=editor.render(draft,'shop_settings'),en=editor.render(draft,'shop_settings',{english:true});
 assert.equal((zh.match(/<h1\b/g)||[]).length,1);
 assert.match(zh,/仅限测试地区/);assert.match(en,/Draft delivery area/);
 assert.ok(editor.isShop('shop_settings'));assert.ok(!editor.isShop('members'));
 assert.doesNotMatch(editor.notice(draft,'shop_settings'),/下架|不会在官网显示/);
});

test('product routing keeps payment disabled in CMS preview and validates the actual product',async()=>{
 const draft=JSON.parse(await readFile(new URL('../content/products/peace-protection-talisman.json',import.meta.url),'utf8'));
 assert.equal(editor.validate(draft,'products').id,draft.id);
 assert.throws(()=>editor.validate({...draft,currency:'EUR'},'products'));
 const preview=editor.render(draft,'products');
 assert.match(preview,/aria-disabled="true"/);
 assert.doesNotMatch(preview,/href="https:\/\/buy\.stripe\.com\//);
 assert.match(editor.notice({...draft,published:false},'products'),/下架/);
});

test('local preview resolves both gallery and variant images after an unsaved upload',()=>{
 const html='<img src="/assets/uploads/product.jpg"><img src="assets/uploads/variant.png"><a href="/assets/uploads/variant.png">view</a>';
 const data={media:[{src:'/assets/uploads/product.jpg'}],variants:[{image:'/assets/uploads/variant.png'}]};
 const result=resolvePreviewAssets(html,data,src=>src.endsWith('variant.png')?'blob:variant-upload':'blob:product-upload');
 assert.match(result,/src="blob:product-upload"/);
 assert.match(result,/src="blob:variant-upload"/);
 assert.match(result,/href="blob:variant-upload"/);
 assert.doesNotMatch(result,/assets\/uploads/);
});

test('legacy translation safely skips the settings file collection',async()=>{
 const config=await configuration(),original=globalThis.window;
 const settings=config.collections.find(c=>c.name==='shop_settings'),snapshot=JSON.stringify(settings);
 globalThis.window={h:()=>{},createClass:def=>def};
 try{
  registerTranslationWidgets({registerWidget:()=>{}},config,{local:true});
  assert.equal(JSON.stringify(settings),snapshot);
  assert.equal(field(config.collections.find(c=>c.name==='activities').fields,'body').widget,'translation-field');
 }finally{globalThis.window=original;}
});
