import {useEffect,useState} from 'react';
import {authErrorMessage} from './auth-errors';
import {createClient} from '@supabase/supabase-js';
import {STORE_URL,PUBLIC_KEY,setStoreToken,storeRequest} from './store-api';
const recoveryLink=new URLSearchParams(window.location.hash.slice(1)).get('type')==='recovery';
export const corporateAuth=createClient(STORE_URL,PUBLIC_KEY,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:true}});
corporateAuth.auth.onAuthStateChange((event,session)=>{setStoreToken(session?.access_token||'');if(event==='PASSWORD_RECOVERY')history.replaceState(null,'',window.location.pathname);});
export function AccountControls({signedIn=false,returnPath='/admin/'}:{signedIn?:boolean;returnPath?:'/admin/'|'/store/'|'/account/'}){
 const [recovery,setRecovery]=useState(recoveryLink),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{const {data}=corporateAuth.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY'){setRecovery(true);history.replaceState(null,'',window.location.pathname);}});return()=>data.subscription.unsubscribe();},[]);
 const act=async(action:'signup'|'reset'|'password')=>{setBusy(true);setMessage('');try{
  if(action!=='password'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))throw new Error('Enter a valid email address.');
  if(action==='password'){
   if(password.length<12||password!==confirm)throw new Error('Use at least 12 characters and matching passwords.');
   const {error}=await corporateAuth.auth.updateUser({password});if(error)throw new Error(authErrorMessage(error,'password'));
   setPassword('');setConfirm('');await corporateAuth.auth.signOut();setStoreToken('');window.location.assign(returnPath);
  }else if(action==='signup'){
   if(password.length<12||password!==confirm)throw new Error('Use at least 12 characters and matching passwords.');
   const {error}=await corporateAuth.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:window.location.origin+returnPath}});if(error)throw new Error(authErrorMessage(error,'signup'));
   setPassword('');setConfirm('');setMessage('If registration is available for this email, check your inbox to verify it. Registration alone does not grant administrator access.');
  }else{
   const {error}=await corporateAuth.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+returnPath});if(error)throw new Error(authErrorMessage(error,'reset'));
   setMessage('If an account exists, check your inbox and spam folder for the recovery link. If it does not arrive, contact aneleq@techandguard.co.za.');
  }
 }catch(e){setMessage(e instanceof Error?e.message:'Account action failed.');}finally{setBusy(false);}};
 return <details id="account-setup" className="store-panel" open={!signedIn||recovery||undefined}><summary>{signedIn?'Change your password':'Create account or reset password'}</summary><p>New account: create a password, verify your email, then sign in above. Already registered? Use the password reset button instead.</p>{returnPath==='/admin/'&&<p>Only approved owner emails receive administrator access after verification. Other verified accounts need a staff assignment.</p>}{signedIn||recovery?<form onSubmit={e=>{e.preventDefault();void act('password');}}><label>New password<input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Confirm password<input type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><button className="button primary" disabled={busy}>Set password and sign out</button></form>:<form onSubmit={e=>{e.preventDefault();void act('signup');}}><label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password for a new account<input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Confirm your new password<input type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><button className="button primary" disabled={busy}>Create account</button><button className="button secondary" type="button" disabled={busy||!email} onClick={()=>void act('reset')}>Send password reset link</button></form>}{message&&<p role="status">{message}</p>}</details>;
}
type Staff={email:string;role:string;verified:boolean};
export function StaffControls(){
 const [rows,setRows]=useState<Staff[]>([]),[email,setEmail]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const load=async()=>{const data=await storeRequest('/rest/v1/rpc/corporate_list_staff',{method:'POST',body:'{}'});if(!Array.isArray(data))throw new Error('Unable to load staff.');setRows(data);};
 useEffect(()=>{void load().catch(()=>setMessage('Staff list could not be loaded.'));},[]);
 const assign=async(target:string,enabled:boolean)=>{setBusy(true);try{await storeRequest('/rest/v1/rpc/corporate_set_staff',{method:'POST',body:JSON.stringify({staff_email:target,enabled})});await load();setEmail('');setMessage(enabled?'Staff access granted.':'Staff access revoked.');}catch{setMessage('Action failed. Staff must have a verified account; owner accounts cannot be changed here.');}finally{setBusy(false);}};
 return <section className="store-panel"><h3>Staff access</h3><p>Staff can manage products and theme uploads. Only owners can grant or revoke staff access. Staff must register and verify their email first.</p><form onSubmit={e=>{e.preventDefault();void assign(email,true);}}><label>Staff email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="button primary" disabled={busy}>Grant staff access</button></form>{rows.map(row=><div className="store-item" key={row.email}><span>{row.email} — {row.role} — {row.verified?'Verified':'Awaiting verified account'}</span>{row.role==='staff'&&<button disabled={busy} onClick={()=>void assign(row.email,false)}>Revoke access</button>}</div>)}{message&&<p role="status">{message}</p>}</section>;
}
