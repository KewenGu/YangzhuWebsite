// Decap 3.16.3 exposes Emotion component labels; keep these scoped to its editor.
// Preserve the original save/publish handlers and add only a narrow-screen view switch.
export function installEditorLayout(){
 function enhance(){
  const editor=document.querySelector('[class*="-EditorContainer"]');
  const toolbar=editor?.querySelector('[class*="-ToolbarContainer"]');
  if(!toolbar||toolbar.querySelector('.cms-view-switch'))return;
  editor.dataset.cmsView='edit';
  const controls=document.createElement('div');controls.className='cms-view-switch';
  controls.setAttribute('role','group');controls.setAttribute('aria-label','编辑与预览');
  for(const [view,label] of [['edit','编辑内容'],['preview','效果预览']]){
   const button=document.createElement('button');button.type='button';button.textContent=label;
   button.setAttribute('aria-pressed',String(view==='edit'));
   button.addEventListener('click',()=>{
    if(view==='preview'&&!editor.querySelector('#preview-pane'))editor.querySelector('button[title="打开/关闭预览"]')?.click();
    editor.dataset.cmsView=view;
    for(const b of controls.children)b.setAttribute('aria-pressed',String(b===button));
   });controls.append(button);
  }
  toolbar.append(controls);
 }
 new MutationObserver(enhance).observe(document.getElementById('nc-root')||document.body,{childList:true,subtree:true});
 enhance();
}
