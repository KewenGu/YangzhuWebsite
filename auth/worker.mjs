// Minimal Decap GitHub OAuth bridge for Cloudflare Workers.
// Secrets stay here; the browser receives only its own GitHub access token.
const cookieName='__Host-yangzhu-oauth';
const enc=new TextEncoder();
const base64url=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function sign(text,secret){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return base64url(await crypto.subtle.sign('HMAC',key,enc.encode(text)));}
export async function createState(secret,now=Date.now()){const payload=base64url(crypto.getRandomValues(new Uint8Array(32)))+'.'+now;return payload+'.'+await sign(payload,secret);}
export async function validState(state,secret,now=Date.now()){
 if(typeof state!=='string')return false;const parts=state.split('.');if(parts.length!==3)return false;
 const age=now-Number(parts[1]);if(!Number.isFinite(age)||age<0||age>600000)return false;
 const expected=await sign(parts.slice(0,2).join('.'),secret);if(expected.length!==parts[2].length)return false;
 let diff=0;for(let i=0;i<expected.length;i++)diff|=expected.charCodeAt(i)^parts[2].charCodeAt(i);return diff===0;
}
function headers(extra={}){return {'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',...extra};}
const clearCookie=`${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
function error(text,status=400){return new Response(text,{status,headers:headers({'Content-Type':'text/plain; charset=utf-8','Set-Cookie':clearCookie})});}
function popup(token,origin){
 const nonce=base64url(crypto.getRandomValues(new Uint8Array(18)));
 const payload=JSON.stringify('authorization:github:success:'+JSON.stringify({token,provider:'github'})).replace(/</g,'\\u003c');
 const target=JSON.stringify(origin);
 const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>登录成功</title><body><p>登录已验证，正在返回发布后台。若窗口未关闭，请返回发布后台重试。</p><script nonce="${nonce}">const target=${target};function receive(e){if(e.origin!==target||e.source!==window.opener||e.data!=='authorizing:github')return;window.removeEventListener('message',receive);window.opener.postMessage(${payload},target);window.close();}window.addEventListener('message',receive);if(window.opener)window.opener.postMessage('authorizing:github',target);</script></body></html>`;
 return new Response(html,{headers:headers({'Content-Type':'text/html; charset=utf-8','Set-Cookie':clearCookie,'Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`})});
}
export async function handle(request,env,fetcher=fetch){
 const url=new URL(request.url);
 if(request.method!=='GET')return error('Method not allowed',405);
 if(!env.GITHUB_CLIENT_ID||!env.GITHUB_CLIENT_SECRET||!env.ALLOWED_USERS||!env.CMS_ORIGIN||!env.AUTH_ORIGIN)return error('登录服务尚未完成配置，请联系管理员。',503);
 const origin=new URL(env.CMS_ORIGIN).origin;
 if(origin!==env.CMS_ORIGIN||!origin.startsWith('https://')||url.origin!==env.AUTH_ORIGIN)return error('Invalid origin');
 if(url.pathname==='/auth'){
  if(url.searchParams.get('provider')!=='github')return error('Unsupported provider');
  if(url.searchParams.get('site_id')!==new URL(origin).hostname)return error('Invalid site');
  const state=await createState(env.GITHUB_CLIENT_SECRET);
  const authorize=new URL('https://github.com/login/oauth/authorize');
  for(const [k,v] of Object.entries({client_id:env.GITHUB_CLIENT_ID,redirect_uri:env.AUTH_ORIGIN+'/callback',scope:'public_repo',state}))authorize.searchParams.set(k,v);
  return new Response(null,{status:302,headers:headers({Location:authorize.href,'Set-Cookie':`${cookieName}=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`})});
 }
 if(url.pathname!=='/callback')return error('Not found',404);
 const state=url.searchParams.get('state'),cookie=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 if(!state||state!==cookie||!await validState(state,env.GITHUB_CLIENT_SECRET))return error('登录验证已失效，请返回后台重新登录。',403);
 const code=url.searchParams.get('code');if(!code||url.searchParams.has('error'))return error('GitHub 登录未完成，请返回后台重试。');
 try{
  const exchange=await fetcher('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code,redirect_uri:env.AUTH_ORIGIN+'/callback'})});
  const data=await exchange.json();if(!exchange.ok||!data.access_token)return error('GitHub 未能完成授权，请重新登录。',502);
  const ghHeaders={Authorization:`Bearer ${data.access_token}`,Accept:'application/vnd.github+json','User-Agent':'Yangzhu-CMS-OAuth','X-GitHub-Api-Version':'2022-11-28'};
  const user=await fetcher('https://api.github.com/user',{headers:ghHeaders});const account=await user.json();
  const allowed=env.ALLOWED_USERS.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  if(!user.ok||!allowed.includes(String(account.login).toLowerCase()))return error('此 GitHub 账号未获发布权限，请联系管理员。',403);
  const repo=await fetcher('https://api.github.com/repos/KewenGu/YangzhuWebsite',{headers:ghHeaders});const repository=await repo.json();
  if(!repo.ok||!repository.permissions?.push)return error('请先接受协会网站的协作邀请，再重新登录。',403);
  return popup(data.access_token,origin);
 }catch{return error('登录服务暂时无法连接 GitHub，请稍后再试。',502);}
}
export default {fetch:(request,env)=>handle(request,env)};
