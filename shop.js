document.addEventListener('DOMContentLoaded',()=>{
 const english=document.documentElement.lang==='en';
 // All named designs remain readable and usable without JavaScript.
 document.querySelectorAll('[data-product-variants]').forEach(group=>{
  const select=group.querySelector('[data-variant-select]');
  const options=[...group.querySelectorAll('[data-variant-id]')];
  if(!select||!options.length)return;
  const announce=group.querySelector('.product-variant-status');
  const update=(requested,writeURL)=>{
   const selected=options.find(option=>option.dataset.variantId===requested);
   select.value=selected?requested:'';
   options.forEach(option=>{option.hidden=option!==selected;});
   if(announce)announce.textContent=selected?[selected.querySelector('h2')?.textContent,selected.querySelector('.product-price')?.textContent].filter(Boolean).join(' · '):english?'Select a design to see its price and availability.':'请选择款式，查看对应价格和供货情况。';
   if(writeURL){const url=new URL(location.href);if(selected)url.searchParams.set('variant',requested);else url.searchParams.delete('variant');history.replaceState(history.state,'',url);}
  };
  group.querySelector('.product-variant-picker').hidden=false;
  update(new URLSearchParams(location.search).get('variant'),false);
  select.addEventListener('change',()=>update(select.value,true));
  window.addEventListener('popstate',()=>update(new URLSearchParams(location.search).get('variant'),false));
 });
 const filters=document.querySelector('.shop-filters');
 if(filters){
  filters.hidden=false;
  filters.addEventListener('click',event=>{
   const button=event.target.closest('button[data-filter]');if(!button)return;
   filters.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
   let count=0;
   document.querySelectorAll('.shop-design-grid .shop-card').forEach(card=>{card.hidden=button.dataset.filter!=='all'&&card.dataset.category!==button.dataset.filter;if(!card.hidden)count++;});
   document.querySelector('.shop-filter-status').textContent=english?`${count} designs shown`:`显示 ${count} 个款式`;
  });
 }
 const images=document.querySelectorAll('.product-image-link');
 if(images.length){
  const dialog=document.createElement('dialog');dialog.className='shop-image-dialog';dialog.setAttribute('aria-label',english?'Product image':'商品图片');
  const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label',english?'Close image':'关闭图片');
  const image=document.createElement('img'),caption=document.createElement('p');dialog.append(close,image,caption);document.body.append(dialog);
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  images.forEach(link=>link.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();image.src=link.href;image.alt=link.querySelector('img').alt;caption.textContent=link.closest('figure').querySelector('figcaption').textContent;dialog.showModal();}));
 }
 document.querySelectorAll('#primary-nav a').forEach(a=>{if(/\/shop\.html$/.test(a.pathname))a.setAttribute('aria-current','page');});
});
