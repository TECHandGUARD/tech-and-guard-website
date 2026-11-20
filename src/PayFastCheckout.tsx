import {useEffect,useRef,useState} from 'react';
import {money} from './commerce';
import {storeRequest} from './store-api';

type CartLine={sku:string;title:string;options:string;quantity:number;price_cents:number;stock:number|null};
type Fulfilment={label:string;feeCents:number;details?:string};
type CheckoutConfig={enabled:boolean;mode:'sandbox'|'live';currency:'ZAR';fulfilment:{collection:Fulfilment|null;delivery:Fulfilment|null};policies:{termsUrl:string;returnsUrl:string;deliveryUrl:string;termsVersion:string}|null};

function randomToken(){const bytes=crypto.getRandomValues(new Uint8Array(32));return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
function initialAttempt(cartKey:string){return {cartKey,checkoutKey:crypto.randomUUID(),accessToken:randomToken()};}

export function PayFastCheckout({items}:{items:CartLine[]}){
 const [config,setConfig]=useState<CheckoutConfig|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[phone,setPhone]=useState(''),[method,setMethod]=useState<'collection'|'delivery'>('collection');
 const [line1,setLine1]=useState(''),[line2,setLine2]=useState(''),[town,setTown]=useState(''),[province,setProvince]=useState(''),[postalCode,setPostalCode]=useState('');
 const [acceptedTerms,setAcceptedTerms]=useState(false),[open,setOpen]=useState(false),[website,setWebsite]=useState('');
 const busyRef=useRef(false);
 const cartKey=JSON.stringify(items.map(({sku,quantity})=>({sku,quantity})).sort((a,b)=>a.sku.localeCompare(b.sku)));
 const attempt=useRef(initialAttempt(cartKey));
 if(attempt.current.cartKey!==cartKey)attempt.current=initialAttempt(cartKey);

 useEffect(()=>{let alive=true;void storeRequest('/functions/v1/payfast-store-config',{method:'POST',body:'{}'}).then(value=>{
  if(!alive)return;
  if(value&&typeof value==='object'&&'enabled' in value){
   const data=value as CheckoutConfig;setConfig(data);
   if(data.fulfilment.collection)setMethod('collection');else if(data.fulfilment.delivery)setMethod('delivery');
  }else setConfig({enabled:false,mode:'sandbox',currency:'ZAR',fulfilment:{collection:null,delivery:null},policies:null});
 }).catch(()=>{if(alive)setConfig({enabled:false,mode:'sandbox',currency:'ZAR',fulfilment:{collection:null,delivery:null},policies:null});});return()=>{alive=false;};},[]);

 const subtotal=items.reduce((sum,item)=>sum+item.price_cents*item.quantity,0);
 const stockReady=items.length>0&&items.every(item=>item.stock!==null&&item.stock>=item.quantity&&item.stock>0);
 const shipping=method==='collection'?0:(config?.fulfilment.delivery?.feeCents??0);
 const startCheckout=async(event:React.FormEvent)=>{
  event.preventDefault();if(busyRef.current||!config?.enabled||!acceptedTerms)return;
  busyRef.current=true;setBusy(true);setError('');setNotice('Checking stock and preparing secure checkout…');
  try{
   const data=await storeRequest('/functions/v1/payfast-create-checkout',{method:'POST',body:JSON.stringify({
    checkoutKey:attempt.current.checkoutKey,accessToken:attempt.current.accessToken,website,acceptedTerms,
    name,email:email.trim().toLowerCase(),phone,fulfilmentMethod:method,
    deliveryAddress:method==='delivery'?{line1,line2,town,province,postalCode}: {},
    items:items.map(item=>({sku:item.sku,quantity:item.quantity})),
   })});
   if(!data||typeof data!=='object'||!('action'in data)||!('fields'in data)||!('orderId'in data)||!('totalCents'in data))throw new Error('Secure checkout returned an invalid response. Please try again.');
   if(typeof data.orderId!=='string'||! /^[0-9a-f-]{36}$/i.test(data.orderId))throw new Error('Secure checkout returned an invalid order reference. Please try again.');
   const action=String(data.action);const target=new URL(action);
   if(target.protocol!=='https:'||!['sandbox.payfast.co.za','www.payfast.co.za'].includes(target.hostname))throw new Error('Secure checkout is unavailable. Please contact us.');
   const fields=data.fields as Record<string,unknown>;
   if(!fields||typeof fields!=='object'||typeof fields.signature!=='string'||typeof fields.amount!=='string')throw new Error('Secure checkout returned an invalid payment form. Please try again.');
   const serverTotal=Number(data.totalCents);if(!Number.isSafeInteger(serverTotal)||serverTotal<=0)throw new Error('Secure checkout returned an invalid total. Please try again.');
   const form=document.createElement('form');form.method='POST';form.action=target.href;form.acceptCharset='UTF-8';form.setAttribute('aria-label','Continue to PayFast secure checkout');
   for(const [key,value] of Object.entries(fields)){if(typeof value!=='string')continue;const input=document.createElement('input');input.type='hidden';input.name=key;input.value=value;form.append(input);}
   sessionStorage.setItem(`tech-guard:shop-order:${String(data.orderId)}`,attempt.current.accessToken);
   document.body.append(form);setNotice(`Order total ${money(serverTotal)}. Redirecting to PayFast…`);form.submit();
  }catch(cause){setNotice('');setError(cause instanceof Error?cause.message:'Checkout could not start. Please retry.');}
  finally{busyRef.current=false;setBusy(false);}
 };

 if(config?.enabled!==true)return <section className="shop-checkout" aria-labelledby="shop-checkout-title"><div><p className="showroom-brand">SECURE ONLINE CHECKOUT</p><h4 id="shop-checkout-title">Checkout setup is in progress</h4><p>Online payments will open once delivery options and store policies are confirmed. You can still send an enquiry without paying.</p><p className="shop-checkout-trust">Card details are entered on PayFast. Tech &amp; GUARD does not collect or store card numbers.</p></div></section>;
 const methods=[config.fulfilment.collection&&['collection',config.fulfilment.collection] as const,config.fulfilment.delivery&&['delivery',config.fulfilment.delivery] as const].filter(Boolean) as Array<['collection'|'delivery',Fulfilment]>;
 if(!methods.length||!config.policies)return null;
 return <section className="shop-checkout" aria-labelledby="shop-checkout-title"><div className="shop-checkout-heading"><div><p className="showroom-brand">{config.mode==='sandbox'?'SANDBOX CHECKOUT':'SECURE CHECKOUT'}</p><h4 id="shop-checkout-title">Buy securely</h4></div><button type="button" className="button secondary" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?'Close checkout':'Continue to checkout'}</button></div>
 {open&&<form onSubmit={startCheckout}>
  <label className="shop-honeypot" aria-hidden="true">Leave this field empty<input tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label>
  <label>Your name<input autoComplete="name" maxLength={120} required value={name} onChange={e=>setName(e.target.value)}/></label>
  <label>Email address<input type="email" autoComplete="email" maxLength={100} required value={email} onChange={e=>setEmail(e.target.value)}/></label>
  <label>Mobile number<input type="tel" autoComplete="tel" inputMode="tel" maxLength={32} required value={phone} onChange={e=>setPhone(e.target.value)}/></label>
  <fieldset><legend>How would you like to receive your order?</legend>{methods.map(([key,option])=><label className="shop-radio" key={key}><input type="radio" name="fulfilment" value={key} checked={method===key} onChange={()=>setMethod(key)}/><span><strong>{option.label}</strong> · {option.feeCents?money(option.feeCents):'No extra charge'}{key==='collection'&&option.details&&<small>{option.details}</small>}</span></label>)}</fieldset>
  {method==='delivery'&&<div className="shop-address"><label>Address line 1<input autoComplete="address-line1" required maxLength={120} value={line1} onChange={e=>setLine1(e.target.value)}/></label><label>Address line 2 (optional)<input autoComplete="address-line2" maxLength={120} value={line2} onChange={e=>setLine2(e.target.value)}/></label><label>Town or suburb<input autoComplete="address-level2" required maxLength={80} value={town} onChange={e=>setTown(e.target.value)}/></label><label>Province<input autoComplete="address-level1" maxLength={80} value={province} onChange={e=>setProvince(e.target.value)}/></label><label>Postal code<input autoComplete="postal-code" inputMode="numeric" required maxLength={12} value={postalCode} onChange={e=>setPostalCode(e.target.value)}/></label></div>}
  <div className="shop-order-total"><span>Products</span><strong>{money(subtotal)}</strong>{method==='delivery'&&<><span>Delivery</span><strong>{money(shipping)}</strong></>}<span>Total due to PayFast</span><strong>{money(subtotal+shipping)}</strong></div>
  <label className="shop-terms"><input type="checkbox" required checked={acceptedTerms} onChange={e=>setAcceptedTerms(e.target.checked)}/><span>I agree to the <a href={config.policies.termsUrl} target="_blank" rel="noopener noreferrer">terms</a>, and have read the <a href={config.policies.returnsUrl} target="_blank" rel="noopener noreferrer">returns policy</a> and <a href={config.policies.deliveryUrl} target="_blank" rel="noopener noreferrer">delivery policy</a>.</span></label>
  <p className="shop-checkout-trust">Your payment is processed on PayFast’s secure hosted page. We only store the order details needed to fulfil your purchase; card details stay with PayFast.</p>
  {!stockReady&&<p role="status">Some items have unconfirmed stock. Please contact us before placing this order.</p>}
  <button className="button primary" disabled={busy||!stockReady}>{busy?'Preparing secure checkout…':'Continue to PayFast · '+money(subtotal+shipping)}</button>
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
 </form>}
 </section>;
}
