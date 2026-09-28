import {load} from 'cheerio';
export const pages=['index','about','members','activities','ceremonies','relations'];
const names={index:['美国阳翥道教协会｜纽约道教文化与交流','Yangzhu Taoist Association of America | New York'],about:['关于协会','About the Association'],members:['主要成员','Our People'],activities:['活动与交流','Activities and Cultural Exchange'],ceremonies:['协会法会','Taoist Ceremonies'],relations:['国际联谊','International Relations']};
const descriptions={index:['美国阳翥道教协会立足纽约，传承道教宗教与文化传统，开展法会、文化活动、社区服务与跨宗教交流。','Based in New York, the Yangzhu Taoist Association of America shares Taoist traditions through ceremonies, cultural activities, community service and interfaith exchange.'],about:['了解美国阳翥道教协会的成立背景、宗旨与使命，以及协会在纽约开展的道教传承、文化传播和国际交流工作。','Learn about the Yangzhu Taoist Association of America, its founding in New York in 2025, its mission and its work in Taoist culture and international exchange.'],members:['认识美国阳翥道教协会会长、理事与顾问，了解主要成员的道教传承、专业背景与文化交流工作。','Meet the president, directors and advisers of the Yangzhu Taoist Association of America and learn about their backgrounds and contributions.'],activities:['浏览美国阳翥道教协会的周年庆典、文化体验、联合国交流及跨宗教活动，查看活动介绍、照片与视频。','Explore anniversary celebrations, Taoist cultural experiences, United Nations engagement and interfaith activities, with reports, photographs and videos.'],ceremonies:['了解美国阳翥道教协会举办的传统道教法会与科仪，浏览诵经、祈福及宗教文化活动记录。','Discover traditional Taoist ceremonies, scripture recitation and prayer activities organized by the Yangzhu Taoist Association of America.'],relations:['浏览美国阳翥道教协会与国际道教团体、宗教机构及文化组织的联谊往来、贺信与交流记录。','Explore correspondence and cultural exchanges between the Yangzhu Taoist Association of America and Taoist, religious and cultural organizations worldwide.']};
export function pageURL(page,lang='zh'){return 'https://yangzhu.org/'+(lang==='en'?'en/':'')+(page==='index'?'':page+'.html');}
export function optimize(html,page,lang,components){
 const $=load(html), english=lang==='en', url=pageURL(page,lang), title=names[page][english?1:0]+(page==='index'?'':english?' | Yangzhu Taoist Association of America':'｜美国阳翥道教协会'), description=descriptions[page][english?1:0];
 $('[data-include]').each((_,e)=>{$(e).replaceWith(components[$(e).attr('data-include')]||'');});
 $('html').attr('lang',english?'en':'zh-CN').attr('data-page-language',lang).attr('data-language-url',new URL(pageURL(page,english?'zh':'en')).pathname);
 if(english){
  $('[data-en]').each((_,e)=>{if(!$(e).is('input,textarea'))$(e).text($(e).attr('data-en'));});
  $('.content-zh').attr('hidden','').css('display','none');$('.content-en').removeAttr('hidden').css('display','');
 }
 // Resolve assets from either language directory; keep navigation in the current language.
 $('[href],[src],[poster]').each((_,e)=>{for(const attr of ['href','src','poster']){const v=$(e).attr(attr);if(!v||/^(?:[a-z]+:|\/\/|#)/i.test(v))continue;const local=v.replace(/^\//,'').replace(/^images\/logo\.png$/, 'assets/about/official_logo.png');const match=local.match(/^(index|about|members|activities|ceremonies|relations)\.html(.*)$/);$(e).attr(attr,match?new URL(pageURL(match[1],lang)).pathname+match[2]:'/'+local);}});
 $('title').text(title);
 $('meta[name="description"],meta[name="keywords"],meta[name="robots"],meta[property^="og:"],meta[name^="twitter:"],link[rel="canonical"],link[rel="alternate"],script[type="application/ld+json"]').remove();
 const meta=(key,value,property=false)=>$('head').append($('<meta>').attr(property?'property':'name',key).attr('content',value));
 meta('description',description);meta('robots','index, follow, max-image-preview:large');
 $('head').append($('<link rel="canonical">').attr('href',url));
 for(const [code,l] of [['zh-Hans','zh'],['en','en'],['x-default','zh']])$('head').append($('<link rel="alternate">').attr('hreflang',code).attr('href',pageURL(page,l)));
 const image='https://yangzhu.org/assets/about/official_logo.png';
 for(const [key,value] of Object.entries({type:'website',title,description,url,image,'image:alt':'Yangzhu Taoist Association of America — official seal',site_name:'美国阳翥道教协会 · Yangzhu Taoist Association of America',locale:english?'en_US':'zh_CN','locale:alternate':english?'zh_CN':'en_US'}))meta('og:'+key,value,true);
 for(const [key,value] of Object.entries({card:'summary',title,description,image,'image:alt':'Yangzhu Taoist Association of America — official seal'}))meta('twitter:'+key,value);
 $('link[rel="icon"]').attr('href','/assets/about/favicon-gold.svg').attr('type','image/svg+xml');
 $('link[rel="apple-touch-icon"]').attr('href','/assets/about/official_logo.png');
 const org={'@type':'Organization','@id':'https://yangzhu.org/#organization',name:'美国阳翥道教协会',alternateName:'Yangzhu Taoist Association of America',url:'https://yangzhu.org/',logo:image,foundingDate:'2025',email:'office@yangzhu.org',address:{'@type':'PostalAddress',addressLocality:'New York',addressRegion:'NY',addressCountry:'US'}};
 const data={'@context':'https://schema.org','@graph':[org,{'@type':'WebSite','@id':'https://yangzhu.org/#website',url:'https://yangzhu.org/',name:org.alternateName,inLanguage:['zh-Hans','en'],publisher:{'@id':org['@id']}},{'@type':page==='about'?'AboutPage':page==='index'?'WebPage':'CollectionPage','@id':url+'#webpage',url,name:title,description,inLanguage:english?'en':'zh-Hans',isPartOf:{'@id':'https://yangzhu.org/#website'},about:{'@id':org['@id']}}]};
 $('head').append($('<script type="application/ld+json">').text(JSON.stringify(data).replace(/</g,'\\u003c')));
 return $.html();
}
export function sitemap(){return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+pages.flatMap(p=>['zh','en'].map(l=>`<url><loc>${pageURL(p,l)}</loc></url>`)).join('\n')+'\n</urlset>\n';}
