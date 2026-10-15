// Bound account requests, including reading the response body, so buttons recover.
export async function authFetch(input:RequestInfo|URL,options:RequestInit={},timeoutMs=15000):Promise<Response>{
 const controller=new AbortController();const source=options.signal??(input instanceof Request?input.signal:undefined);
 const abort=()=>controller.abort(source?.reason);
 if(source?.aborted)abort();else source?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>controller.abort(new Error('Account service timed out. Please retry.')),timeoutMs);
 try{const response=await fetch(input,{...options,signal:controller.signal});const body=await response.arrayBuffer();return new Response(response.status===204||response.status===205||response.status===304?null:body,{status:response.status,statusText:response.statusText,headers:response.headers});}
 finally{clearTimeout(timer);source?.removeEventListener('abort',abort);}
}
