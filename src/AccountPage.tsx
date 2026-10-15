import {useEffect,useState} from 'react';
import {AccountControls,corporateAuth} from './AccountControls';
import {authErrorMessage} from './auth-errors';
import {OrderRequest,money} from './commerce';
import {storeRequest} from './store-api';
export default function AccountPage(){
 const [userId,setUserId]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[orders,setOrders]=useState<OrderRequest[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [loading,setLoading]=useState(false),[loadError,setLoadError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{let alive=true;void corporateAuth.auth.getSession().then(({data})=>{if(alive)setUserId(data.session?.user.id||'');});const {data}=corporateAuth.auth.onAuthStateChange((_event,session)=>{if(alive)setUserId(session?.user.id||'');});return()=>{alive=false;data.subscription.unsubscribe();};},[]);
 useEffect(()=>{
  setOrders([]);setLoadError('');setLoading(Boolean(userId));if(!userId)return;
  let alive=true;const controller=new AbortController();
  void storeRequest('/rest/v1/corporate_orders?select=*&user_id=eq.'+encodeURIComponent(userId)+'&order=created_at.desc&limit=20',{signal:controller.signal}).then(data=>{
   if(!Array.isArray(data))throw new Error('Unable to load your requests.');if(alive)setOrders(data);
  }).catch(()=>{if(alive)setLoadError('Your requests could not be loaded. Retry below. If your session has expired, sign out and sign in again.');}).finally(()=>{if(alive)setLoading(false);});
  return()=>{alive=false;controller.abort();};
 },[userId,revision]);
 const login=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setMessage('');try{const {error}=await corporateAuth.auth.signInWithPassword({email:email.trim(),password});if(error)throw new Error(authErrorMessage(error,'login'));setPassword('');}catch(e){setMessage(e instanceof Error?e.message:'Sign-in failed.');}finally{setBusy(false);}};
 const logout=async()=>{setBusy(true);setMessage('');try{const {error}=await corporateAuth.auth.signOut();if(error)throw error;}catch{setMessage('Sign-out failed. Please retry.');}finally{setBusy(false);}};
 return <section className="section"><div className="container"><h2>Your store account</h2><p>Managing the store? <a className="text-link" href="/admin/">Open administrator sign in</a>.</p><p>View your recent order requests and manage your own password.</p>{!userId?<form className="store-panel admin-login" onSubmit={login}><h3>Sign in</h3><label>Email<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="button primary" disabled={busy}>Sign in</button></form>:<section className="store-panel" aria-busy={loading}><div className="admin-heading"><h3>Your latest requests</h3><div className="actions"><button className="button secondary" disabled={loading} onClick={()=>setRevision(n=>n+1)}>Refresh requests</button><button className="button secondary" disabled={busy} onClick={()=>void logout()}>Sign out</button></div></div><p>Showing up to your latest 20 requests. No online payment has been collected for these requests.</p>{loading?<p role="status">Loading your requests…</p>:loadError?<p role="alert">{loadError}</p>:!orders.length?<p>No requests to display.</p>:orders.map(o=><article className="order-card" key={o.id}><strong>{o.status} · {money(o.subtotal_cents)} listed subtotal</strong><p>{new Date(o.created_at).toLocaleString('en-ZA')}</p><p className="order-reference">Reference: {o.id}</p><ul>{o.items.map(i=><li key={i.sku}>{i.quantity} × {i.title} — {money(i.unit_price_cents)} each</li>)}</ul><a className="text-link" href={'mailto:aneleq@techandguard.co.za?subject='+encodeURIComponent('Order request '+o.id)}>Ask about this request</a></article>)}</section>}<AccountControls signedIn={Boolean(userId)} returnPath="/account/"/>{message&&<p role="status">{message}</p>}<a className="button secondary" href="/store/">Return to store</a></div></section>;
}
