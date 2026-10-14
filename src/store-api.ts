export const STORE_URL='https://vthjdkwfvbfryofsmtdb.supabase.co';
const PUBLIC_KEY='sb_publishable_y__5ddJ5fQo0bdGnQtqgTg_kn6G5Hap';
let accessToken='';
export function setStoreToken(value:string){accessToken=value;}
export async function storeRequest(path:string,options:RequestInit={}){
 const controller=new AbortController();
 const cancel=()=>controller.abort(options.signal?.reason);
 if(options.signal?.aborted)cancel();else options.signal?.addEventListener('abort',cancel,{once:true});
 const timeout=setTimeout(()=>controller.abort(new Error('Store request timed out. Please retry.')),15000);
 const headers=new Headers(options.headers);
 headers.set('apikey',PUBLIC_KEY);
 if(accessToken)headers.set('Authorization','Bearer '+accessToken);else headers.delete('Authorization');
 if(!headers.has('Content-Type'))headers.set('Content-Type','application/json');
 try{
  const response=await fetch(STORE_URL+path,{...options,headers,signal:controller.signal});
  const body=await response.text();
  let data:unknown=null;
  if(body){try{data=JSON.parse(body);}catch{throw new Error('The store returned an unreadable response. Please retry.');}}
  if(!response.ok){
   if(response.status===401){accessToken='';throw new Error(path.startsWith('/auth/')?'Sign-in failed. Check your email and password.':'Your store session has expired. Please sign in again.');}
   if(response.status===403)throw new Error('This account is not authorised for this store action.');
   if(path.startsWith('/auth/'))throw new Error('Sign-in failed. Check your email and password.');
   throw new Error('Store request failed. Please retry.');
  }
  if(data===null&&response.status!==204&&options.method!=='PATCH')throw new Error('The store returned an empty response. Please retry.');
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
