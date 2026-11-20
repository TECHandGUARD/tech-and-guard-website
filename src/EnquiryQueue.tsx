import {useEffect,useRef,useState} from 'react';
import {storeRequest} from './store-api';

type Status='new'|'in_progress'|'closed';
type NotificationStatus='not_configured'|'sending'|'sent'|'failed';
type Enquiry={
 id:string;kind:'service'|'product';customer_name:string;email:string;topic:string;
 message:string;status:Status;assigned_to:string|null;created_at:string;updated_at:string;
 notification_status:NotificationStatus;
 items:Array<{sku:string;title:string;quantity:number}>;
};
const labels:Record<Status,string>={new:'New',in_progress:'In progress',closed:'Closed'};
const notificationLabels:Record<NotificationStatus,string>={not_configured:'Email alert not configured',sending:'Email alert sending',sent:'Email alert sent',failed:'Email alert failed'};
const pageSize=50;

export function EnquiryQueue({userId}:{userId:string}){
 const [kind,setKind]=useState('all');
 const [status,setStatus]=useState('all');
 const [offset,setOffset]=useState(0);
 const [revision,setRevision]=useState(0);
 const [rows,setRows]=useState<Enquiry[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [changed,setChanged]=useState<Enquiry['id']>('');
 const pending=useRef(false);
 useEffect(()=>{
  const controller=new AbortController();
  setError('');
  setLoading(true);
  storeRequest('/rest/v1/rpc/corporate_list_enquiries',{
   method:'POST',signal:controller.signal,body:JSON.stringify({p_kind:kind,p_status:status,p_offset:offset}),
  }).then(data=>{
   if(!Array.isArray(data))throw new Error('Unable to load enquiries.');
   if(!controller.signal.aborted)setRows(data);
  }).catch(()=>{if(!controller.signal.aborted)setError('Unable to load the enquiry queue. Select Refresh enquiries to retry.');})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return ()=>controller.abort();
 },[kind,status,offset,revision]);

 async function update(entry:Enquiry,next:Status,claim=false){
  if(pending.current)return;
  pending.current=true;
  setError('');
  setMessage('');
  setBusy(true);
  try{
   await storeRequest('/rest/v1/rpc/corporate_update_enquiry',{method:'POST',body:JSON.stringify({
    p_id:entry.id,p_status:next,p_claim:claim,p_updated_at:entry.updated_at,
   })});
   setMessage(claim?'Enquiry assigned to you.':'Enquiry status saved.');
   setChanged(entry.id);
   setRevision(value=>value+1);
  }catch(error){setError(error instanceof Error?error.message:'Unable to update enquiry.');}
  finally{setBusy(false);pending.current=false;}
 }

 return <section className="store-panel" aria-labelledby="enquiry-queue-title">
  <div className="admin-card-heading"><h2 id="enquiry-queue-title">Customer enquiries</h2>
   <button type="button" className="button secondary" disabled={busy||loading} onClick={()=>setRevision(value=>value+1)}>Refresh enquiries</button></div>
  <div className="form-row"><label>Enquiry type<select value={kind} disabled={busy} onChange={e=>{setKind(e.target.value);setOffset(0);}}>
   <option value="all">All enquiries</option><option value="service">Services</option><option value="product">Products</option>
  </select></label>
  <label>Enquiry status<select value={status} disabled={busy} onChange={e=>{setStatus(e.target.value);setOffset(0);}}>
   <option value="all">All statuses</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
  </select></label></div>
  {error&&<p role="alert">{error}</p>}
  {message&&<p role="status">{message}</p>}
  {loading?<p role="status">Loading enquiries…</p>:!error&&(rows.length===0?<p>No enquiries in this view.</p>:
   <div className="enquiry-queue-list">{rows.map(entry=><article key={entry.id} aria-labelledby={'enquiry-'+entry.id}>
    <header><h3 id={'enquiry-'+entry.id}>{entry.topic||(entry.kind==='product'?'Catalogue enquiry':'Service enquiry')}</h3>
     <p>{entry.kind==='product'?'Product':'Service'} · {labels[entry.status]} · {new Date(entry.created_at).toLocaleDateString('en-ZA')}</p></header>
    <p className={'enquiry-notification-status enquiry-notification-'+entry.notification_status}>{notificationLabels[entry.notification_status]}</p>
    <p><strong>{entry.customer_name}</strong> · <a href={'mailto:'+encodeURIComponent(entry.email)+'?subject='+encodeURIComponent('Tech & GUARD enquiry '+entry.id)}>Reply by email</a></p>
    <p className="enquiry-message">{entry.message}</p>
    {entry.items.length>0&&<ul>{entry.items.map(item=><li key={item.sku}>{item.quantity} × {item.title} ({item.sku})</li>)}</ul>}
    <p>{entry.assigned_to===userId?'Assigned to you':entry.assigned_to?'Assigned to another staff member':'Unassigned'}</p>
    <div className="actions">
     {!entry.assigned_to&&entry.status!=='closed'&&<button className="button primary" disabled={busy} onClick={()=>void update(entry,'in_progress',true)}>Assign to me</button>}
     <label>Update status<select key={changed===entry.id?entry.updated_at:entry.id} value={entry.status} disabled={busy} onChange={e=>void update(entry,e.target.value as Status)}>
      {Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
     </select></label>
    </div>
   </article>)}</div>)}
  <div className="actions">
   {offset>0&&<button disabled={busy||loading} onClick={()=>setOffset(value=>value-pageSize)}>Previous enquiries</button>}
   {!error&&rows.length===pageSize&&<button disabled={busy||loading} onClick={()=>setOffset(value=>value+pageSize)}>Next enquiries</button>}
  </div>
 </section>;
}
