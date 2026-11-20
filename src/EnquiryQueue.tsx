import {useEffect,useRef,useState} from 'react';
import {storeRequest} from './store-api';
import {FollowUp,ManualEnquiry,QuotePanel,sources} from './QuoteDesk';
import type {QuoteDetails,SaveEnquiry} from './QuoteDesk';

type Status='new'|'in_progress'|'closed';
type NotificationStatus='not_configured'|'sending'|'sent'|'failed';
type Enquiry=QuoteDetails&{
 id:string;kind:'service'|'product';customer_name:string;email:string;topic:string;
 message:string;status:Status;assigned_to:string|null;created_at:string;updated_at:string;
 source:keyof typeof sources;contact_phone:string|null;
 notification_status:NotificationStatus;
 items:Array<{sku:string;title:string;quantity:number}>;
};
const labels:Record<Status,string>={new:'New',in_progress:'In progress',closed:'Closed'};
const notificationLabels:Record<NotificationStatus,string>={not_configured:'Email alert not configured',sending:'Email alert sending',sent:'Email alert sent',failed:'Email alert failed'};
const pageSize=50;

export function EnquiryQueue({userId}:{userId:string}){
 const [kind,setKind]=useState('all');
 const [status,setStatus]=useState('all');
 const [overdue,setOverdue]=useState(false);
 const [offset,setOffset]=useState(0);
 const [revision,setRevision]=useState(0);
 const [rows,setRows]=useState<Enquiry[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [loadError,setLoadError]=useState('');
 const [message,setMessage]=useState('');
 const pending=useRef(false);
 useEffect(()=>{
  const controller=new AbortController();
  setLoadError('');
  setLoading(true);
  storeRequest('/rest/v1/rpc/corporate_quote_desk_enquiries',{
   method:'POST',signal:controller.signal,body:JSON.stringify({p_kind:kind,p_status:status,p_offset:offset,p_overdue:overdue}),
  }).then(data=>{
   if(!Array.isArray(data))throw new Error('Unable to load enquiries.');
   if(!controller.signal.aborted)setRows(data);
  }).catch(()=>{if(!controller.signal.aborted)setLoadError('Unable to load the enquiry queue. Select Refresh enquiries to retry.');})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return ()=>controller.abort();
 },[kind,status,offset,overdue,revision]);

 const save:SaveEnquiry=async(operation,successMessage)=>{
  if(pending.current)return false;
  pending.current=true;
  setError('');
  setMessage('');
  setBusy(true);
  try{
   await operation();
   setMessage(successMessage);
   setRevision(value=>value+1);
   return true;
  }catch(error){
   setError(error instanceof Error?error.message:'Unable to update enquiry.');
   return false;
  }finally{setBusy(false);pending.current=false;}
 };

 function update(entry:Enquiry,next:Status,claim=false){
  return save(()=>storeRequest('/rest/v1/rpc/corporate_update_enquiry',{method:'POST',body:JSON.stringify({
    p_id:entry.id,p_status:next,p_claim:claim,p_updated_at:entry.updated_at,
   })}),claim?'Enquiry assigned to you.':'Enquiry status saved.');
 }
 const log:SaveEnquiry=async(operation,successMessage)=>{
  const successful=await save(operation,successMessage);
  if(successful){setKind('all');setStatus('all');setOffset(0);setOverdue(false);}
  return successful;
 };
 const editing=busy||loading;

 return <section className="store-panel" aria-labelledby="enquiry-queue-title">
  <div className="admin-card-heading"><h2 id="enquiry-queue-title">Customer enquiries</h2>
   <button type="button" className="button secondary" disabled={editing} onClick={()=>{setError('');setRevision(value=>value+1);}}>Refresh enquiries</button></div>
  <ManualEnquiry busy={editing} save={log}/>
  <div className="form-row"><label>Enquiry type<select value={kind} disabled={editing} onChange={e=>{setKind(e.target.value);setOffset(0);}}>
   <option value="all">All enquiries</option><option value="service">Services</option><option value="product">Products</option>
  </select></label>
  <label>Enquiry status<select value={status} disabled={editing} onChange={e=>{setStatus(e.target.value);setOffset(0);}}>
   <option value="all">All statuses</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
  </select></label></div>
  <label className="quote-desk-filter"><input type="checkbox" checked={overdue} disabled={editing}
   onChange={e=>{setOverdue(e.target.checked);setOffset(0);}}/> Overdue follow-ups only</label>
  {error&&<p role="alert">{error}</p>}
  {loadError&&<p role="alert">{loadError}</p>}
  {message&&<p role="status">{message}</p>}
  {loading&&rows.length===0&&<p role="status">Loading enquiries…</p>}
  {!loadError&&(rows.length===0?!loading&&<p>No enquiries in this view.</p>:
   <div className="enquiry-queue-list">{rows.map(entry=><article key={entry.id} aria-labelledby={'enquiry-'+entry.id}>
    <header><h3 id={'enquiry-'+entry.id}>{entry.topic||(entry.kind==='product'?'Catalogue enquiry':'Service enquiry')}</h3>
     <p>{entry.kind==='product'?'Product':'Service'} · {sources[entry.source]} · {labels[entry.status]} · {new Date(entry.created_at).toLocaleDateString('en-ZA')}</p></header>
    {entry.source==='website'&&<p className={'enquiry-notification-status enquiry-notification-'+entry.notification_status}>{notificationLabels[entry.notification_status]}</p>}
    <p><strong>{entry.customer_name}</strong>
     {entry.email&&<> · <a href={'mailto:'+encodeURIComponent(entry.email)+'?subject='+encodeURIComponent('Tech & GUARD enquiry '+entry.id)}>Reply by email</a></>}
     {entry.contact_phone&&<> · <a href={'https://wa.me/'+entry.contact_phone.slice(1)} target="_blank" rel="noopener noreferrer">Reply on WhatsApp</a></>}
    </p>
    <p className="enquiry-message">{entry.message}</p>
    {entry.items.length>0&&<ul>{entry.items.map(item=><li key={item.sku}>{item.quantity} × {item.title} ({item.sku})</li>)}</ul>}
    <p>{entry.assigned_to===userId?'Assigned to you':entry.assigned_to?'Assigned to another staff member':'Unassigned'}</p>
    <div className="actions">
     {!entry.assigned_to&&entry.status!=='closed'&&<button className="button primary" disabled={editing} onClick={()=>void update(entry,'in_progress',true)}>Assign to me</button>}
     <label>Update status<select value={entry.status} disabled={editing} onChange={e=>void update(entry,e.target.value as Status)}>
      {Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
     </select></label>
    </div>
    <FollowUp key={entry.updated_at} entry={entry} busy={editing} save={save}/>
    <QuotePanel entry={entry} busy={editing} save={save}/>
   </article>)}</div>)}
  <div className="actions">
   {offset>0&&<button disabled={editing} onClick={()=>setOffset(value=>value-pageSize)}>Previous enquiries</button>}
   {!loadError&&rows.length===pageSize&&<button disabled={editing} onClick={()=>setOffset(value=>value+pageSize)}>Next enquiries</button>}
  </div>
 </section>;
}
