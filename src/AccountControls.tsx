import {useEffect,useState} from 'react';
import {authErrorMessage} from './auth-errors';
import {cleanAuthLink,inspectAuthLink} from './auth-links';
import {createClient} from '@supabase/supabase-js';
import {STORE_URL,PUBLIC_KEY,setStoreToken,storeRequest} from './store-api';
const incomingLink=inspectAuthLink(window.location.href);
export const corporateAuth=createClient(STORE_URL,PUBLIC_KEY,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:true}});
corporateAuth.auth.onAuthStateChange((_event,session)=>{setStoreToken(session?.access_token||'');});
export function AccountControls({signedIn=false,returnPath='/admin/'}:{signedIn?:boolean;returnPath?:'/admin/'|'/store/'|'/account/'}){
 const [recovery,setRecovery]=useState(false),[hasSession,setHasSession]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(incomingLink.message),[cooldown,setCooldown]=useState(0);
 useEffect(()=>{
  let alive=true;
  const clean=()=>{if(incomingLink.hasAuthParams)history.replaceState(null,'',cleanAuthLink(window.location.href));};
  void corporateAuth.auth.getSession().then(({data,error})=>{
   if(!alive)return;
   setHasSession(Boolean(data.session));
   if(incomingLink.kind==='recovery'){
    setRecovery(Boolean(data.session)&&!error);
    setMessage(data.session&&!error?'Recovery link verified. Set your new password below.':'Your recovery session could not be established. Request a fresh password reset link below.');
   }else if(incomingLink.kind==='confirmation'&&data.session&&!error){setMessage('Email verified. You can now use your store account. Administrator access still requires approval.');}
   clean();
  }).catch(()=>{if(alive){setMessage('Your account session could not be checked. Sign in or request a fresh email link.');clean();}});
  const {data}=corporateAuth.auth.onAuthStateChange((event,session)=>{
   if(!alive)return;setHasSession(Boolean(session));
   if(event==='PASSWORD_RECOVERY'&&session){setRecovery(true);setMessage('Recovery link verified. Set your new password below.');clean();}
   if(event==='SIGNED_OUT')setRecovery(false);
  });
  return()=>{alive=false;data.subscription.unsubscribe();};
 },[]);
 useEffect(()=>{if(!cooldown)return;const timer=setTimeout(()=>setCooldown(value=>Math.max(0,value-1)),1000);return()=>clearTimeout(timer);},[cooldown]);
 const act=async(action:'signup'|'reset'|'resend'|'password')=>{
  if(busy||(action!=='password'&&cooldown>0))return;
  setBusy(true);setMessage('');
  try{
   if(action!=='password'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))throw new Error('Enter a valid email address.');
   if(action==='password'){
    if(!hasSession)throw new Error('Sign in or open a valid recovery link before changing your password.');
    if(password.length<12||password!==confirm)throw new Error('Use at least 12 characters and matching passwords.');
    const {error}=await corporateAuth.auth.updateUser({password});if(error)throw new Error(authErrorMessage(error,'password'));
    setPassword('');setConfirm('');const {error:signOutError}=await corporateAuth.auth.signOut();if(signOutError)throw new Error('Password updated, but sign-out failed. Please sign out before continuing.');setStoreToken('');window.location.assign(returnPath);
   }else if(action==='signup'){
    if(password.length<12||password!==confirm)throw new Error('Use at least 12 characters and matching passwords.');
    const {error}=await corporateAuth.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:window.location.origin+returnPath}});if(error)throw new Error(authErrorMessage(error,'signup'));
    setPassword('');setConfirm('');setCooldown(60);setMessage('If registration is available for this email, check your inbox and spam folder to verify it. Registration alone does not grant administrator access.');
   }else if(action==='resend'){
    const {error}=await corporateAuth.auth.resend({type:'signup',email:email.trim(),options:{emailRedirectTo:window.location.origin+returnPath}});if(error)throw new Error(authErrorMessage(error,'signup'));
    setCooldown(60);setMessage('If this account is awaiting confirmation, check your inbox and spam folder for a fresh link. Use only the newest link.');
   }else{
    const {error}=await corporateAuth.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+returnPath});if(error)throw new Error(authErrorMessage(error,'reset'));
    setCooldown(60);setMessage('If an account exists, check your inbox and spam folder for the recovery link. Use only the newest link. If it does not arrive, contact aneleq@techandguard.co.za.');
   }
  }catch(e){setMessage(e instanceof Error?e.message:'Account action failed.');}finally{setBusy(false);}
 };
 const authenticated=hasSession;
 return <details id="account-setup" className="store-panel" open={!signedIn||recovery||Boolean(message)||undefined}>
  <summary>{authenticated?'Change your password':'Create account or recover access'}</summary>
  <p>{recovery?'Your recovery session is active. Choose a new password to regain access.':authenticated?'Choose a new password. After saving it, you will be signed out.':'New account: create a password, verify your email, then sign in. Already registered? Request a password reset or resend your confirmation link.'}</p>
  {returnPath==='/admin/'&&<p>Only approved owner emails receive administrator access after verification. Other verified accounts need a staff assignment.</p>}
  {authenticated?<form onSubmit={e=>{e.preventDefault();void act('password');}}><label>New password<input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Confirm password<input type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><button className="button primary" disabled={busy}>Set password and sign out</button></form>:<form onSubmit={e=>{e.preventDefault();void act('signup');}}><label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password for a new account<input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Confirm your new password<input type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><div className="actions"><button className="button primary" disabled={busy||cooldown>0}>Create account</button><button className="button secondary" type="button" disabled={busy||!email||cooldown>0} onClick={()=>void act('resend')}>Resend confirmation link</button><button className="button secondary" type="button" disabled={busy||!email||cooldown>0} onClick={()=>void act('reset')}>Send password reset link</button></div>{cooldown>0&&<p role="status">You can request another email in {cooldown} seconds.</p>}</form>}
  {message&&<p role="status">{message}</p>}
 </details>;
}
type Staff={email:string;role:string;verified:boolean};
export function StaffControls(){
 const [rows,setRows]=useState<Staff[]>([]),[email,setEmail]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const load=async()=>{const data=await storeRequest('/rest/v1/rpc/corporate_list_staff',{method:'POST',body:'{}'});if(!Array.isArray(data))throw new Error('Unable to load staff.');setRows(data);};
 useEffect(()=>{void load().catch(()=>setMessage('Staff list could not be loaded.'));},[]);
 const assign=async(target:string,enabled:boolean)=>{setBusy(true);try{await storeRequest('/rest/v1/rpc/corporate_set_staff',{method:'POST',body:JSON.stringify({staff_email:target,enabled})});await load();setEmail('');setMessage(enabled?'Staff access granted.':'Staff access revoked.');}catch{setMessage('Action failed. Staff must have a verified account; owner accounts cannot be changed here.');}finally{setBusy(false);}};
 return <section className="store-panel"><h3>Staff access</h3><p>Staff can manage products and theme uploads. Only owners can grant or revoke staff access. Staff must register and verify their email first.</p><form onSubmit={e=>{e.preventDefault();void assign(email,true);}}><label>Staff email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="button primary" disabled={busy}>Grant staff access</button></form>{rows.map(row=><div className="store-item" key={row.email}><span>{row.email} — {row.role} — {row.verified?'Verified':'Awaiting verified account'}</span>{row.role==='staff'&&<button disabled={busy} onClick={()=>void assign(row.email,false)}>Revoke access</button>}</div>)}{message&&<p role="status">{message}</p>}</section>;
}
