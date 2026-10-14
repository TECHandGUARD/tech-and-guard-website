export const STORE_URL='https://vthjdkwfvbfryofsmtdb.supabase.co';
const PUBLIC_KEY='sb_publishable_y__5ddJ5fQo0bdGnQtqgTg_kn6G5Hap';
let accessToken='';
export function setStoreToken(value:string){accessToken=value;}
export async function storeRequest(path:string,options:RequestInit={}){
 const response=await fetch(STORE_URL+path,{...options,headers:{apikey:PUBLIC_KEY,...(accessToken?{Authorization:'Bearer '+accessToken}:{}),'Content-Type':'application/json',...options.headers}});
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw new Error(data?.message||data?.msg||data?.error_description||'Store request failed. Please retry.');return data;
}
export async function themeUpload(file:File){
 const path=crypto.randomUUID()+'.zip';
 await storeRequest('/storage/v1/object/corporate-theme-uploads/'+path,{method:'POST',body:file,headers:{'Content-Type':'application/zip'}});
 return path;
}
