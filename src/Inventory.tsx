import {lowStockLimit,stockStatus} from './admin-insights';
import {useEffect,useRef,useState} from 'react';
import {catalogueImage} from './catalogue-display';
import {Product,money,priceToCents} from './commerce';
import {StockAdjustment} from './StockAdjustment';
import {STORE_URL,storeRequest,uploadProductImage} from './store-api';

const blankDraft = {sku:'',title:'',description:'',price:'',options:'',image:''};
type Draft = typeof blankDraft;
type Editor = {product:Product|null;draft:Draft};

export function Inventory({products,refresh,onLockChange,initiallyPublished=false}:{initiallyPublished?:boolean;products:Product[];refresh:()=>Promise<void>;onLockChange?:(locked:boolean)=>void}){
 const [filter,setFilter]=useState('');
 const [publication,setPublication]=useState(initiallyPublished?'published':'all');
 const [stockFilter,setStockFilter]=useState('all');
 const [editor,setEditor]=useState<Editor|null>(null);
 const [adjusting,setAdjusting]=useState<Product|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [failure,setFailure]=useState('');
 const firstField=useRef<HTMLInputElement>(null);
 const addButton=useRef<HTMLButtonElement>(null);
 const pending=useRef(false);

 useEffect(()=>{if(editor)firstField.current?.focus();},[editor?.product?.sku,Boolean(editor)]);

 function edit(product:Product|null){
  setFailure('');
  setMessage('');
  setEditor({product,draft:product ? {
   sku:product.sku,title:product.title,description:product.description,price:(product.price_cents/100).toFixed(2),
   options:product.options ?? '',image:product.image_url ?? '',
  } : blankDraft});
 }

 function change(field:keyof Draft,value:string){
  setEditor(current=>current && {...current,draft:{...current.draft,[field]:value}});
 }

 function closeEditor(){
  setEditor(null);
  addButton.current?.focus();
 }

 async function run(action:()=>Promise<void>){
  if(pending.current)return;
  pending.current=true;
  setBusy(true);
  setFailure('');
  setMessage('');
  try{await action();}
  catch(error){setFailure(error instanceof Error?error.message:'Catalogue action failed.');}
  finally{pending.current=false;setBusy(false);}
 }

 async function reload(success:string){
  setMessage(success);
  try{await refresh();}
  catch{setMessage(success+' Select Refresh data to reload your catalogue.');}
 }

 async function save(event:React.FormEvent){
  event.preventDefault();
  if(!editor)return;
  const {draft,product}=editor;
  await run(async()=>{
   if(!draft.sku.trim()||!draft.title.trim())throw new Error('Enter a SKU and product name.');
   const imageInput=draft.image.trim();
   const unchanged=imageInput===(product?.image_url ?? '');
   const image=unchanged ? imageInput : catalogueImage(imageInput);
   if(imageInput&&!image)throw new Error('Enter a valid HTTPS product image URL.');
   if(image&&!unchanged&&!image.startsWith('https://images.unsplash.com/')&&
      !image.startsWith(STORE_URL+'/storage/v1/object/public/corporate-product-images/')){
    throw new Error('Upload a photo for this product or use an approved image URL.');
   }
   await storeRequest('/rest/v1/rpc/corporate_save_catalogue_product',{method:'POST',body:JSON.stringify({
    sku:draft.sku,title:draft.title,description:draft.description,price_cents:priceToCents(draft.price),
    options:draft.options,image_url:image,expected_updated_at:product?.updated_at ?? null,
   })});
   closeEditor();
   await reload(product?'Product saved.':'Draft product created. Publish it when you are ready.');
  });
 }

 async function publish(product:Product){
  await run(async()=>{
   await storeRequest('/rest/v1/rpc/corporate_set_catalogue_visibility',{method:'POST',body:JSON.stringify({
    sku:product.sku,published:!product.published,expected_updated_at:product.updated_at,
   })});
   await reload(product.published?'Product unpublished.':'Product published to the Store.');
  });
 }

 async function photo(file:File|undefined){
  if(!file)return;
  await run(async()=>{
   change('image',await uploadProductImage(file));
   setMessage('Image uploaded. Save the product to use it.');
  });
 }

 const visible=products.filter(product=>(publication==='all'||product.published===(publication==='published'))
  &&(stockFilter==='all'||stockFilter===stockStatus(product.stock))
  &&(product.title+' '+product.sku).toLowerCase().includes(filter.trim().toLowerCase()));
 return <section className="store-panel">
  <div className="admin-card-heading">
   <h2>Product catalogue</h2>
   <button ref={addButton} className="button primary" disabled={busy||!!adjusting||!!editor} onClick={()=>edit(null)}>Add product</button>
  </div>
  {message&&<p role="status">{message}</p>}
  {failure&&<p role="alert">{failure}</p>}
  {editor&&<form className="product-editor" onSubmit={event=>void save(event)}>
   <h3>{editor.product?'Edit '+editor.product.sku:'New product draft'}</h3>
   <fieldset disabled={busy}>
    <div className="form-row">
     {editor.product
      ? <label>Product name<input ref={firstField} required maxLength={300} value={editor.draft.title} onChange={event=>change('title',event.target.value)}/></label>
      : <><label>SKU<input ref={firstField} required maxLength={160} value={editor.draft.sku} onChange={event=>change('sku',event.target.value)}/></label>
       <label>Product name<input required maxLength={300} value={editor.draft.title} onChange={event=>change('title',event.target.value)}/></label></>}
     <label>Price in rand<input inputMode="decimal" required value={editor.draft.price} onChange={event=>change('price',event.target.value)}/></label>
    </div>
    <label>Description<textarea rows={4} maxLength={10000} value={editor.draft.description} onChange={event=>change('description',event.target.value)}/></label>
    <label>Variant or options<input maxLength={1000} value={editor.draft.options} onChange={event=>change('options',event.target.value)}/></label>
    <label>Product image URL<input type="url" maxLength={2000} value={editor.draft.image} onChange={event=>change('image',event.target.value)}/></label>
    <label>Upload product photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>{const file=event.target.files?.[0];event.target.value='';void photo(file);}}/></label>
    <small>Upload images you have permission to publish. Uploaded photos are publicly accessible by URL.</small>
    <div className="actions">
     <button className="button primary">{editor.product?'Save product':'Save draft'}</button>
     <button className="button secondary" type="button" onClick={closeEditor}>Cancel editing</button>
    </div>
   </fieldset>
  </form>}
  <div className="catalogue-views" role="group" aria-label="Product visibility">
   {['all','published','draft'].map(view=><button key={view} type="button" aria-pressed={publication===view} onClick={()=>setPublication(view)}>
    {view==='all'?'All products':view==='published'?'Published':'Drafts'}
   </button>)}
  </div>
  <div className="catalogue-filter-row">
  <label>Search by name or SKU<input type="search" value={filter} onChange={event=>setFilter(event.target.value)}/></label>
  <label>Stock status<select value={stockFilter} onChange={event=>setStockFilter(event.target.value)}>
   <option value="all">All stock</option><option value="low">Low stock (1–{lowStockLimit} units)</option><option value="out">Out of stock</option><option value="unknown">Unknown stock</option>
  </select></label>
  </div>
  {adjusting&&<StockAdjustment key={adjusting.sku} product={adjusting} refresh={refresh} onLockChange={onLockChange} close={()=>setAdjusting(null)}/>}
  <div className="catalogue-results">
   <span role="status">{visible.length} of {products.length} products</span>
   {(filter||stockFilter!=='all'||publication!=='all')&&<button type="button" onClick={()=>{setFilter('');setStockFilter('all');setPublication('all');}}>Clear filters</button>}
  </div>
  {visible.length===0?<p>No products match this view.</p>:<div className="store-table admin-table-region catalogue-table" role="region" aria-label="Catalogue products" tabIndex={0}>
   <table><thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Visibility</th><th>Actions</th></tr></thead>
   <tbody>{visible.map(product=><tr key={product.sku}>
    <td>{product.title}<small className="sku">{product.sku}</small></td>
    <td data-label="Price">{money(product.price_cents)}</td><td data-label="Stock">{product.stock??'Unknown'}</td><td data-label="Visibility"><span className={'publication-badge'+(product.published?' is-published':'')}>{product.published?'Published':'Draft'}</span></td>
    <td><button disabled={busy||!!adjusting||!!editor} onClick={()=>edit(product)}>Edit</button>{' '}
     <button disabled={busy||!!adjusting||!!editor} onClick={()=>setAdjusting(product)}>Adjust stock / history</button>{' '}
     <button disabled={busy||!!adjusting||!!editor} onClick={()=>void publish(product)}>{product.published?'Unpublish':'Publish'}</button></td>
   </tr>)}</tbody></table>
  </div>}
 </section>;
}
