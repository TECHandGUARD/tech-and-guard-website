import {useRef,useState} from 'react';
import type {FormEvent} from 'react';
import {money,priceToCents} from './commerce';
import {storeRequest} from './store-api';

type QuoteLine={title:string;quantity:number;unit_price_cents:number};
type QuoteStatus='draft'|'sent'|'accepted'|'declined';
export type QuoteDetails={
 id:string;updated_at:string;status:'new'|'in_progress'|'closed';follow_up_on:string|null;
 quote_status:QuoteStatus|null;quote_valid_until:string|null;quote_lines:QuoteLine[];quote_total_cents:number;
};
export type SaveEnquiry=(operation:()=>Promise<unknown>,message:string)=>Promise<boolean>;
export const sources={website:'Website',whatsapp:'WhatsApp',email:'Email'} as const;
const quoteStatuses:Record<QuoteStatus,string>={draft:'Draft',sent:'Sent',accepted:'Accepted',declined:'Declined'};

function rpc(name:string,payload:Record<string,unknown>){
 return storeRequest('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(payload)});
}

function localDate(){
 return new Intl.DateTimeFormat('en-CA',{
  timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit',
 }).format(new Date());
}

export function ManualEnquiry({busy,save}:{busy:boolean;save:SaveEnquiry}){
 const [source,setSource]=useState<'whatsapp'|'email'>('whatsapp');
 const [open,setOpen]=useState(false);
 const key=useRef<string|null>(null);

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const fields=new FormData(event.currentTarget);
  key.current??=crypto.randomUUID();
  const success=await save(()=>rpc('corporate_log_enquiry',{
   p_key:key.current,p_source:source,p_kind:fields.get('kind'),p_name:fields.get('name'),
   p_email:fields.get('email'),p_phone:fields.get('phone'),p_topic:fields.get('topic'),
   p_message:fields.get('message'),p_follow_up_on:fields.get('followUp')||null,
  }),'Enquiry logged and assigned to you.');
  if(success){
   key.current=null;
   setOpen(false);
  }
 }

 return <details className="quote-desk-disclosure" open={open} onToggle={e=>setOpen(e.currentTarget.open)}>
  <summary>Log a WhatsApp or email enquiry</summary>
  {open&&<form onSubmit={event=>void submit(event)}>
   <fieldset disabled={busy} className="quote-desk-form">
    <div className="form-row">
     <label>Source<select value={source} onChange={e=>setSource(e.target.value as typeof source)}>
      <option value="whatsapp">WhatsApp</option><option value="email">Email</option>
     </select></label>
     <label>Enquiry type<select name="kind"><option value="service">Service</option><option value="product">Product</option></select></label>
     <label>Customer name<input name="name" required maxLength={120}/></label>
     <label>Customer email<input type="email" name="email" required={source==='email'} maxLength={254}/></label>
     <label>WhatsApp number<input name="phone" type="tel" placeholder="+27821234567"
      pattern="[+][1-9][0-9]{6,14}" maxLength={16} required={source==='whatsapp'}/></label>
     <label>Follow-up date<input name="followUp" type="date"/></label>
    </div>
    <label>Subject<input name="topic" required maxLength={160}/></label>
    <label>Enquiry details<textarea name="message" required maxLength={2000} rows={3}/></label>
    <div><button type="submit" className="button primary">Log enquiry</button></div>
   </fieldset>
  </form>}
 </details>;
}

type EditorLine={id:number;title:string;quantity:string;price:string};
function QuoteEditor({entry,busy,save}:{entry:QuoteDetails;busy:boolean;save:SaveEnquiry}){
 const [date,setDate]=useState(entry.quote_valid_until||'');
 const [error,setError]=useState('');
 const nextLine=useRef(entry.quote_lines.length+1);
 const [lines,setLines]=useState<EditorLine[]>(()=>entry.quote_lines.length
  ?entry.quote_lines.map((line,index)=>({
   id:index,title:line.title,quantity:String(line.quantity),price:(line.unit_price_cents/100).toFixed(2),
  }))
  :[{id:0,title:'',quantity:'1',price:''}]);

 function update(id:number,field:'title'|'quantity'|'price',value:string){
  setLines(previous=>previous.map(line=>line.id===id?{...line,[field]:value}:line));
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  setError('');
  try{
   const payload=lines.map(line=>{
    if(!line.title.trim()||!/^([1-9][0-9]{0,2})$/.test(line.quantity)){
     throw new Error('Enter a description and a whole quantity from 1 to 999 for each item.');
    }
    return {title:line.title.trim(),quantity:Number(line.quantity),unit_price_cents:priceToCents(line.price)};
   });
   await save(()=>rpc('corporate_save_enquiry_quote',{
    p_id:entry.id,p_updated_at:entry.updated_at,p_status:'draft',p_valid_until:date,p_lines:payload,
   }),'Quote draft saved.');
  }catch(error){
   setError(error instanceof Error?error.message:'Check the quote details.');
  }
 }
 return <form onSubmit={event=>void submit(event)}>
  <fieldset disabled={busy} className="quote-desk-form">
   <label>Valid until<input type="date" value={date} min={localDate()} required onChange={e=>setDate(e.target.value)}/></label>
   {lines.map((line,index)=><div key={line.id} className="quote-desk-line">
    <label>Item {index+1}<input value={line.title} onChange={e=>update(line.id,'title',e.target.value)} required maxLength={160}/></label>
    <label>Quantity<input value={line.quantity} onChange={e=>update(line.id,'quantity',e.target.value)}
     type="number" min={1} max={999} step={1} required/></label>
    <label>Unit price (R)<input value={line.price} onChange={e=>update(line.id,'price',e.target.value)}
     inputMode="decimal" maxLength={10} required/></label>
    {lines.length>1&&<button className="button secondary" type="button" aria-label={'Remove quote item '+(index+1)}
     onClick={()=>setLines(previous=>previous.filter(item=>item.id!==line.id))}>Remove</button>}
   </div>)}
   {error&&<p role="alert">{error}</p>}
   <div className="actions">
    <button type="button" className="button secondary" disabled={lines.length>=20}
     onClick={()=>{const id=nextLine.current++;setLines(previous=>[...previous,{id,title:'',quantity:'1',price:''}]);}}>Add line item</button>
    <button type="submit" className="button primary">Save quote draft</button>
   </div>
  </fieldset>
 </form>;
}

export function FollowUp({entry,busy,save}:{entry:QuoteDetails;busy:boolean;save:SaveEnquiry}){
 const [date,setDate]=useState(entry.follow_up_on||'');
 const overdue=entry.status!=='closed'&&entry.follow_up_on&&entry.follow_up_on<localDate();
 function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  void save(()=>rpc('corporate_set_enquiry_follow_up',{
   p_id:entry.id,p_updated_at:entry.updated_at,p_follow_up_on:date||null,
  }),date?'Follow-up date saved.':'Follow-up date cleared.');
 }
 return <form className="quote-desk-follow-up" onSubmit={submit}>
  <label>Follow-up date<input type="date" value={date} disabled={busy} onChange={e=>setDate(e.target.value)}/></label>
  <button className="button secondary" type="submit" disabled={busy||date===(entry.follow_up_on||'')}>Save follow-up</button>
  {overdue&&<strong className="quote-desk-overdue">Overdue</strong>}
 </form>;
}

export function QuotePanel({entry,busy,save}:{entry:QuoteDetails;busy:boolean;save:SaveEnquiry}){
 const [copyMessage,setCopyMessage]=useState('');
 const status=entry.quote_status;
 const closed=entry.status==='closed';
 const expired=entry.quote_valid_until!==null&&entry.quote_valid_until<localDate();
 const quoteText=[
  'Tech & GUARD quote '+entry.id,
  ...entry.quote_lines.map(line=>line.quantity+' × '+line.title+' at '+money(line.unit_price_cents)+' each'),
  'Total: '+money(entry.quote_total_cents),
  'Valid until: '+entry.quote_valid_until,
 ].join('\n');

 function transition(next:Exclude<QuoteStatus,'draft'>){
  void save(()=>rpc('corporate_save_enquiry_quote',{
   p_id:entry.id,p_updated_at:entry.updated_at,p_status:next,p_valid_until:null,p_lines:null,
  }),'Quote marked as '+quoteStatuses[next].toLowerCase()+'.');
 }
 async function copy(){
  try{
   await navigator.clipboard.writeText(quoteText);
   setCopyMessage('Quote copied.');
  }catch{
   setCopyMessage('Open Quote text to copy the quote manually.');
  }
 }
 return <details className="quote-desk-disclosure">
  <summary>{status?'Quote · '+quoteStatuses[status]+(expired&&status!=='accepted'&&status!=='declined'?' · Expired':''):'Prepare a quote'}</summary>
  {status&&<>
   <p><strong>{money(entry.quote_total_cents)}</strong> · Valid until {entry.quote_valid_until}</p>
   <ul>{entry.quote_lines.map((line,index)=><li key={index}>{line.quantity} × {line.title} at {money(line.unit_price_cents)} each</li>)}</ul>
   <div className="actions">
    <button type="button" className="button secondary" onClick={()=>void copy()}>Copy quote</button>
    {!closed&&status==='draft'&&<button type="button" className="button secondary" disabled={busy||expired} onClick={()=>transition('sent')}>Mark as sent</button>}
    {!closed&&status==='sent'&&<>
     <button type="button" className="button primary" disabled={busy||expired} onClick={()=>transition('accepted')}>Mark as accepted</button>
     <button type="button" className="button secondary" disabled={busy} onClick={()=>transition('declined')}>Mark as declined</button>
    </>}
   </div>
   {status==='draft'&&!closed&&<p>Share the saved quote with the customer before marking it as sent.</p>}
   {copyMessage&&<p role="status">{copyMessage}</p>}
   <details><summary>Quote text</summary><label>Quote text<textarea value={quoteText} readOnly rows={5}/></label></details>
  </>}
  {closed&&<p>Reopen the enquiry to update its quote.</p>}
  {!closed&&(!status||status==='draft')&&<QuoteEditor key={entry.updated_at} entry={entry} busy={busy} save={save}/>}
 </details>;
}
