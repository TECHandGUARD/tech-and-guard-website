import {useEffect,useRef,useState} from 'react';
import {storeRequest} from './store-api';
import {onlineStoreService,resolveTheme,themeChoices} from './store-themes';

type Line={sku:string;quantity:number};
type Props={
 kind:'service'|'product';
 items?:Line[];
 topics?:string[];
 initialTopic?:string;
 initialTheme?:string;
};
const replyAddress='aneleq@techandguard.co.za';

export function EnquiryForm({kind,items=[],topics=[],initialTopic='',initialTheme=''}:Props){
 const [ready,setReady]=useState<boolean|null>(null);
 const [name,setName]=useState('');
 const [email,setEmail]=useState('');
 const [topic,setTopic]=useState(topics.includes(initialTopic)?initialTopic:'');
 const [message,setMessage]=useState('');
 const [theme,setTheme]=useState(resolveTheme(initialTopic,initialTheme));
 const [business,setBusiness]=useState('');
 const [catalogueSize,setCatalogueSize]=useState('');
 const [timeline,setTimeline]=useState('');
 const [budget,setBudget]=useState('');
 const isStoreBrief=kind==='service'&&topic===onlineStoreService;
 const choices=kind==='service'?themeChoices(topic):[];
 const themeName=choices.find(choice=>choice.id===theme)?.name;
 const projectMessage=isStoreBrief?[
  themeName&&'Store theme: '+themeName,
  business.trim()&&'Business: '+business.trim(),
  catalogueSize&&'Catalogue size: '+catalogueSize,
  timeline.trim()&&'Target launch: '+timeline.trim(),
  budget.trim()&&'Budget: '+budget.trim(),
  message.trim()
 ].filter(Boolean).join('\n'):[themeName&&'Design theme: '+themeName,message.trim()].filter(Boolean).join('\n');
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
 const mailBody=[name&&'Name: '+name,email&&'Email: '+email,topic&&'Service: '+topic,projectMessage,
  ...items.map(item=>item.quantity+' × '+item.sku)].filter(Boolean).join('\n');
 const emailLink='mailto:'+replyAddress+'?subject='+encodeURIComponent(kind==='service'?'Project enquiry':'Product enquiry')+
  '&body='+encodeURIComponent(mailBody);

 async function send(event:React.FormEvent){
  event.preventDefault();
  if(!ready||submitting.current)return;
  if(kind==='product'&&!items.length){setFeedback('Add a product before sending your enquiry.');return;}
  if(isStoreBrief&&(!business.trim()||!themeName||message.length>1500)){
   setFeedback('Choose a theme, enter your business name, and keep project details within 1,500 characters.');return;
  }
  if(projectMessage.length>2000){setFeedback('Shorten your project details to fit the enquiry.');return;}
  submitting.current=true;
  setBusy(true);
  setFeedback('');
  try{
   const payload={p_kind:kind,p_name:name.trim(),p_email:email.trim(),p_topic:kind==='product'?'Catalogue enquiry':topic,p_message:projectMessage,p_items:items};
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
  {kind==='service'&&<label>What do you need?<select value={topic} onChange={event=>{setTopic(event.target.value);setTheme('');}}>
   <option value="">Choose a service</option>{topics.map(option=><option key={option}>{option}</option>)}
  </select></label>}
  {choices.length>0&&<label>{isStoreBrief?'Store theme':'Design theme'}<select required={isStoreBrief} value={theme} onChange={event=>setTheme(event.target.value)}>
    <option value="">Choose a theme</option>
    {choices.map(choice=><option key={choice.id} value={choice.id}>{choice.name}</option>)}
   </select></label>}
  {isStoreBrief&&<>
   <div className="form-row">
    <label>Business name<input required maxLength={120} value={business} onChange={event=>setBusiness(event.target.value)}/></label>
    <label>Approximate catalogue size<select value={catalogueSize} onChange={event=>setCatalogueSize(event.target.value)}>
     <option value="">Select if known</option>
     {['1–20 products','21–100 products','101+ products'].map(size=><option key={size}>{size}</option>)}
    </select></label>
   </div>
   <div className="form-row">
    <label>Target launch<input maxLength={80} value={timeline} onChange={event=>setTimeline(event.target.value)}/></label>
    <label>Estimated budget (ZAR)<input maxLength={60} value={budget} onChange={event=>setBudget(event.target.value)}/></label>
   </div>
  </>}
  <label>{kind==='service'?'Project details':'Town or suburb and any questions'}
   <textarea required rows={4} maxLength={isStoreBrief?1500:themeName?2000-('Design theme: '+themeName+'\n').length:2000} value={message} onChange={event=>setMessage(event.target.value)}/>
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
