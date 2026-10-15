import test from 'node:test';
import assert from 'node:assert/strict';
import {checkAdminAccess} from '../src/admin-access.ts';
import {authFetch} from '../src/auth-fetch.ts';
import {authErrorMessage} from '../src/auth-errors.ts';
import {createClient} from '@supabase/supabase-js';
test('dashboard access checks permissions independently of catalogue loading',async()=>{
 const calls=[];
 assert.deepEqual(await checkAdminAccess(async path=>{calls.push(path);return path.endsWith('is_admin')?true:'owner';}),{owner:true});
 assert.equal(calls.length,2);
 assert.ok(calls.every(path=>path.startsWith('/rest/v1/rpc/')));
 assert.deepEqual(await checkAdminAccess(async path=>path.endsWith('is_admin')?true:'staff'),{owner:false});
 await assert.rejects(checkAdminAccess(async()=>false),/signed in.*does not have/);
 await assert.rejects(checkAdminAccess(async()=>{throw new Error('Session expired');}),/Session expired/);
});
test('account fetch aborts stalled connections and exposes a useful account error',async()=>{
 const original=global.fetch;
 try{global.fetch=async(_input,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));
 await assert.rejects(authFetch('https://example.invalid',{},10),/timed out/);
 assert.match(authErrorMessage({status:0},'login'),/timed out/);
 }finally{global.fetch=original;}
});
test('account fetch preserves API status and response body and respects cancellation',async()=>{
 const original=global.fetch;
 try{global.fetch=async()=>new Response(JSON.stringify({code:'invalid_credentials'}),{status:400,headers:{'content-type':'application/json'}});
 const response=await authFetch('https://example.invalid');assert.equal(response.status,400);assert.deepEqual(await response.json(),{code:'invalid_credentials'});
 const controller=new AbortController();controller.abort(new Error('Cancelled'));
 global.fetch=async(_input,options)=>{if(options.signal.aborted)throw options.signal.reason;return new Response();};
 await assert.rejects(authFetch('https://example.invalid',{signal:controller.signal}),/Cancelled/);
 }finally{global.fetch=original;}
});
test('actual Auth SDK completes password sign-in with synchronous session listeners and bounded fetch',async()=>{
 const original=global.fetch;let token='';
 const jwt='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:'fixture-user',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.signature';
 try{global.fetch=async()=>new Response(JSON.stringify({access_token:jwt,refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,user:{id:'fixture-user',email:'fixture@example.invalid',aud:'authenticated'}}),{status:200,headers:{'content-type':'application/json'}});
 const client=createClient('https://example.invalid','fixture-publishable-key',{global:{fetch:authFetch},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const {data:listener}=client.auth.onAuthStateChange((_event,session)=>{token=session?.access_token||'';});
 const {data,error}=await client.auth.signInWithPassword({email:'fixture@example.invalid',password:'fixture-password'});
 assert.equal(error,null);assert.equal(data.session.access_token,jwt);assert.equal(token,jwt);listener.subscription.unsubscribe();
 }finally{global.fetch=original;}
});
