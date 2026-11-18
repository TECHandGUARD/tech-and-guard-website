import {useEffect,useRef,useState} from 'react';
import {storeRequest} from './store-api';

type Line={sku:string;quantity:number};
type Props={
 kind:'service'|'product';
 items?:Line[];
 topics?:string[];
 initialTopic?:string;
};
const replyAddress='aneleq@techandguard.co.za';

export function EnquiryForm({kind,items=[],topics=[],initialTopic=''}:Props){
 const [ready,setReady]=useState<boolean|null>(null);
 const [name,setName]=useState('');
 const [email,setEmail]=useState('');
 const [topic,setTopic]=useState(topics.includes(initialTopic)?initialTopic:'');
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const [feedback,setFeedback]=useState('');
 const [reference,setReference]=useState('');
 const attempt=useRef<{key:string;payload:string}|null>(null);
 const submitting=useRef(false);
 useEffect(()=>{
  const controller=new AbortController();
  storeRequest('/rest/v1/rpc/corporate_enquiry_intake_ready',{method:'POST',body:'{}',signal:controller.signal})
   .then(data=>{if(!controller.signal.aborted)setReady(data===true);})
   .catch(()=>{if(!controller.signal.aborted)setReady(false);});
  return ()=>controller.abort();
 },[]);
 const mailBody=[name&&'Name: '+name,email&&'Email: '+email,topic&&'Service: '+topic,message,
  ...items.map(item=>item.quantity+' × '+item.sku)].filter(Boolean).join('\n');
 const emailLink='mailto:'+replyAddress+'?subject='+encodeURIComponent(kind==='service'?'Project enquiry':'Product enquiry')+
  '&body='+encodeURIComponent(mailBody);

 async function send(event:React.FormEvent){
  event.preventDefault();
  if(!ready||submitting.current)return;
  if(kind==='product'&&!items.length){setFeedback('Add a product before sending your enquiry.');return;}
  submitting.current=true;
  setBusy(true);
  setFeedback('');
  try{
   const payload={p_kind:kind,p_name:name.trim(),p_email:email.trim(),p_topic:kind==='product'?'Catalogue enquiry':topic,p_message:message.trim(),p_items:items};
   const value=JSON.stringify(payload);
   if(attempt.current?.payload!==value)attempt.current={key:crypto.randomUUID(),payload:value};
   const id=await storeRequest('/rest/v1/rpc/corporate_submit_enquiry',{method:'POST',body:JSON.stringify({...payload,p_key:attempt.current.key})});
   if(typeof id!=='string'||!id)throw new Error('The service did not confirm receipt. Retry or use email.');
   setReference(id);
  }catch(error){setFeedback(error instanceof Error?error.message:'Your enquiry could not be confirmed. Try again or use email.');}
  finally{submitting.current=false;setBusy(false);}
 }
 if(reference)return <section className="enquiry-receipt" role="status">
  <h3>Enquiry received</h3>
  <p>We’ll review your enquiry and reply to <strong>{email}</strong>.</p>
  <p>Reference <code>{reference}</code></p>
 </section>;

 return <form className="contact-form guest-enquiry" onSubmit={event=>void send(event)}>
  <div className="form-row">
   <label>Your name<input required autoComplete="name" maxLength={120} value={name} onChange={event=>setName(event.target.value)}/></label>
   <label>Your email<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={event=>setEmail(event.target.value)}/></label>
  </div>
  {kind==='service'&&<label>What do you need?<select value={topic} onChange={event=>setTopic(event.target.value)}>
   <option value="">Choose a service</option>{topics.map(option=><option key={option}>{option}</option>)}
  </select></label>}
  <label>{kind==='service'?'Project details':'Town or suburb and any questions'}
   <textarea required rows={4} maxLength={2000} value={message} onChange={event=>setMessage(event.target.value)}/>
  </label>
  <p>We use these details to reply about your enquiry. Please leave out payment and identity details.</p>
  {feedback&&<p role="alert">{feedback}</p>}
  {ready===null&&<p role="status">Checking enquiry availability…</p>}
  {ready===false&&<p>Online enquiries are unavailable here. Open an email draft or use the contact address.</p>}
  <div className="actions">
   {ready&&<button className="button primary" disabled={busy}>{busy?'Sending…':'Send enquiry'}</button>}
   <a className={ready?'button secondary':'button primary'} href={emailLink}>Open email draft</a>
  </div>
 </form>;
}
