import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {readFile} from 'node:fs/promises';
import {optimize,pages,pageURL,sitemap} from '../scripts/seo.mjs';
test('both language pages expose unique canonical metadata, crawlable navigation and matching alternates',async()=>{
 const components=JSON.parse((await readFile('includes.js','utf8')).match(/const components = (.*);/)[1]);
 for(const page of pages)for(const lang of ['zh','en']){
  const $=load(optimize(await readFile(page+'.html','utf8'),page,lang,components));
  assert.equal($('link[rel=canonical]').length,1);
  assert.equal($('link[rel=canonical]').attr('href'),pageURL(page,lang));
  assert.equal($('link[hreflang=en]').attr('href'),pageURL(page,'en'));
  assert.equal($('html').attr('lang'),lang==='en'?'en':'zh-CN');
  assert.ok($('meta[name=description]').attr('content').length>30);
  assert.ok($('#primary-nav a').length>=5);
  assert.equal($('[data-include]').length,0);
  assert.equal($('h1').length,1);
  assert.ok(!$.html().includes('images/logo.png'));
  assert.ok(JSON.parse($('script[type="application/ld+json"]').text())['@graph'].length===3);
  assert.equal($('#primary-nav a').first().attr('href'),lang==='en'?'/en/about.html':'/about.html');
 }
});
test('sitemap contains only canonical public language URLs with no invented modification dates',()=>{
 const xml=sitemap();assert.equal((xml.match(/<loc>/g)||[]).length,12);assert.ok(!xml.includes('lastmod'));assert.ok(!xml.includes('/admin/'));
});
