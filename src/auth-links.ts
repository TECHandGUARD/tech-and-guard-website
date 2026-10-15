const authParams=['access_token','refresh_token','token_type','expires_in','expires_at','type','error','error_code','error_description','code'];
export function inspectAuthLink(href:string){
 const url=new URL(href);const fragment=new URLSearchParams(url.hash.slice(1));
 const value=(key:string)=>fragment.get(key)||url.searchParams.get(key);
 const failed=Boolean(value('error')||value('error_code')||value('error_description'));
 const kind=failed?'error':value('type')==='recovery'?'recovery':value('type')==='signup'?'confirmation':'none';
 const expired=value('error_code')==='otp_expired';
 return {kind,hasAuthParams:authParams.some(key=>fragment.has(key)||url.searchParams.has(key)),message:failed?(expired?'This email link has expired or has already been used. Request a fresh confirmation or password reset link below.':'This email link could not be verified. Request a fresh link below.'):''};
}
export function cleanAuthLink(href:string){
 const url=new URL(href);const fragment=new URLSearchParams(url.hash.slice(1));
 const authFragment=authParams.some(key=>fragment.has(key));
 for(const key of authParams){url.searchParams.delete(key);if(authFragment)fragment.delete(key);}
 return url.pathname+url.search+(authFragment?(fragment.size?'#'+fragment.toString():''):url.hash);
}
