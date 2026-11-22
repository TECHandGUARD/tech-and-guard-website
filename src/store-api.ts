import {commerceError} from './commerce.ts';
import {resolveStoreConfig} from './store-config.ts';
const config=resolveStoreConfig(import.meta.env);
export const STORE_URL=config.url;
export const PUBLIC_KEY=config.key;
export class StoreRejection extends Error {}
let accessToken='';
export function setStoreToken(value:string){accessToken=value;}
export async function storeRequest(path:string,options:RequestInit={}){
 const controller=new AbortController();
 const cancel=()=>controller.abort(options.signal?.reason);
 if(options.signal?.aborted)cancel();else options.signal?.addEventListener('abort',cancel,{once:true});
 const timeout=setTimeout(()=>controller.abort(new Error('Store request timed out. Please retry.')),15000);
 const requestToken=accessToken;
 const headers=new Headers(options.headers);
 headers.set('apikey',PUBLIC_KEY);
 if(requestToken)headers.set('Authorization','Bearer '+requestToken);else headers.delete('Authorization');
 if(!headers.has('Content-Type'))headers.set('Content-Type','application/json');
 try{
  const response=await fetch(STORE_URL+path,{...options,headers,signal:controller.signal});
  const body=await response.text();
  let data:unknown=null;
  if(body){try{data=JSON.parse(body);}catch{throw new Error('The store returned an unreadable response. Please retry.');}}
  if(!response.ok){
   if(data&&typeof data==='object'&&'message' in data){const message=commerceError(data.message);if(message)throw response.status===400&&data.message!=='request_changed'&&data.message!=='adjustment_changed'?new StoreRejection(message):new Error(message);}
   if(response.status===401){if(accessToken===requestToken)accessToken='';throw new Error(path.startsWith('/auth/')?'Sign-in failed. Check your email and password.':'Your store session has expired. Please sign in again.');}
   if(response.status===403)throw new Error('This account is not authorised for this store action.');
   if(path.startsWith('/auth/'))throw new Error('Sign-in failed. Check your email and password.');
   throw new Error('Store request failed. Please retry.');
  }
  const noStaffRole=path==='/rest/v1/rpc/corporate_staff_role'&&body.trim()==='null';
  if(data===null&&!noStaffRole&&response.status!==204&&options.method!=='PATCH'&&path!=='/rest/v1/rpc/corporate_set_staff')throw new Error('The store returned an empty response. Please retry.');
  return data;
 }catch(error){
  if(controller.signal.aborted)throw new Error(options.signal?.aborted?'Store request cancelled.':'Store request timed out. Please retry.');
  throw error;
 }finally{clearTimeout(timeout);options.signal?.removeEventListener('abort',cancel);}
}
export async function themeUpload(file:File){
 const path=crypto.randomUUID()+'.zip';
 await storeRequest('/storage/v1/object/corporate-theme-uploads/'+path,{method:'POST',body:file,headers:{'Content-Type':'application/zip'}});
 return path;
}

export async function uploadProductImage(file: File){
 const extension = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
 if (!extension || file.size === 0 || file.size > 5 * 1024 * 1024) {
  throw new Error('Choose a JPEG, PNG or WebP image up to 5 MB.');
 }
 const object = 'corporate-product-images/' + crypto.randomUUID() + '.' + extension;
 await storeRequest('/storage/v1/object/' + object, {
  method:'POST', body:file, headers:{'Content-Type':file.type},
 });
 return STORE_URL + '/storage/v1/object/public/' + object;
}
