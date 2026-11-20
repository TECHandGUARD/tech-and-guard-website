import {useState} from 'react';
import {themeDemoUrl} from './theme-demo-content';
import {type DemoItem,type ThemeCatalogue} from './theme-catalogues';
import {type DesignTheme} from './store-themes';

export const demoPrice = new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR',maximumFractionDigits:0});

export function cataloguePage(theme:DesignTheme) {
 return theme.id==='warm-editorial'?'collection':'catalogue';
}

function itemLink(theme:DesignTheme,item:DemoItem) {
 return themeDemoUrl(theme.id,theme.id==='product-showcase'?'details':'product')+'?'+new URLSearchParams({item:item.id});
}

export function MerchandiseGrid({theme,items}:{theme:DesignTheme;items:readonly DemoItem[]}) {
 return <div className="merchandise-grid">
  {items.map(item=><article className="merchandise-card" key={item.id}>
   <a href={itemLink(theme,item)} aria-label={'View '+item.name}>
    <div className="merchandise-image"><img src={item.image} width={420} height={360} loading="lazy" alt=""/></div>
    <div className="merchandise-copy">
     <span className="merchandise-category">{item.category}</span>
     <h4>{item.name}</h4><p>{item.detail}</p>
     <strong>{demoPrice.format(item.price)}</strong><span className="merchandise-open">View product</span>
    </div>
   </a>
  </article>)}
 </div>;
}

export function MerchandiseCollection({theme,catalogue,full}:{theme:DesignTheme;catalogue:ThemeCatalogue;full:boolean}) {
 const categories=[...new Set(catalogue.items.map(item=>item.category))];
 const [category,setCategory]=useState(()=>{
  const requested=new URLSearchParams(window.location.search).get('category');
  return full&&requested&&categories.includes(requested)?requested:'All';
 });
 const [query,setQuery]=useState('');
 const [sort,setSort]=useState('featured');
 const term=query.trim().toLowerCase();
 const items=catalogue.items.filter(item=>(category==='All'||category===item.category)&&(!term||[item.name,item.category,item.detail].some(value=>value.toLowerCase().includes(term))));
 if(sort==='low') items.sort((a,b)=>a.price-b.price);
 if(sort==='high') items.sort((a,b)=>b.price-a.price);
 return <section className="experience-section merchandise-section">
  <div className="merchandise-section-heading">
   <div><h3>{catalogue.heading}</h3><p>{catalogue.intro}</p></div>
   {!full&&<a className="experience-action" href={themeDemoUrl(theme.id,cataloguePage(theme))}>Shop all {items.length} products</a>}
  </div>
  {!full&&<nav className="merchandise-category-links" aria-label="Shop by category">
   {categories.map(option=><a key={option} href={themeDemoUrl(theme.id,cataloguePage(theme))+'?'+new URLSearchParams({category:option})}>{option}</a>)}
  </nav>}
  {full&&<>
   <div className="merchandise-controls">
    <label>Search products<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search by name or category"/></label>
    <label>Category<select value={category} onChange={event=>setCategory(event.target.value)}>
     {['All',...categories].map(option=><option key={option}>{option}</option>)}
    </select></label>
    <label>Sort by<select value={sort} onChange={event=>setSort(event.target.value)}>
     <option value="featured">Featured order</option><option value="low">Price low to high</option><option value="high">Price high to low</option>
    </select></label>
   </div>
   <p className="merchandise-count" aria-live="polite">{items.length} {items.length===1?'product':'products'}</p>
  </>}
  {items.length>0?<MerchandiseGrid theme={theme} items={full?items:items.slice(0,4)}/>:
   <div className="merchandise-empty"><p>No products match your search.</p><button className="experience-action" type="button" onClick={()=>{setQuery('');setCategory('All');}}>Clear filters</button></div>}
 </section>;
}

export function productPhoto(catalogue:ThemeCatalogue,product:DemoItem,finish:string) {
 if(product.id==='studio-wireless'&&finish==='Sandstone') {
  return catalogue.items.find(item=>item.id==='studio-wireless-ivory')?.image??product.image;
 }
 return product.image;
}

export function relatedItems(catalogue:ThemeCatalogue,product:DemoItem) {
 const extras=product.category==='Headphones'?['Care and carry','Desk setup']:product.category==='Face'?['Cleansing','Accessories']:[product.category];
 const available=catalogue.items.filter(item=>item.id!==product.id);
 return [...available.filter(item=>extras.includes(item.category)),...available.filter(item=>!extras.includes(item.category))].slice(0,3);
}

export function DemoBasket({theme,catalogue,quantities,onChange}:{theme:DesignTheme;catalogue:ThemeCatalogue;quantities:Record<string,number>;onChange:(name:string,step:number)=>void}) {
 const [done,setDone]=useState(false);
 const lines=Object.entries(quantities).flatMap(([name,quantity])=>{
  const item=catalogue.items.find(candidate=>candidate.name===name||name.startsWith(candidate.name+' · '));
  return item&&quantity>0?[{name,quantity,item,finish:name.slice(item.name.length).replace(/^ · /,'')}]:[];
 });
 const subtotal=lines.reduce((total,{quantity,item})=>total+quantity*item.price,0);
 return <section className="experience-section">
  {lines.length===0?<p>Your demo basket is empty.</p>:<div className="merchandise-basket">
   <ul className="experience-list merchandise-lines">{lines.map(({name,quantity,item,finish})=><li key={name}>
    <img src={productPhoto(catalogue,item,finish)} width={100} height={80} alt=""/>
    <div><strong>{name}</strong><span>Quantity {quantity}</span></div>
    <strong>{demoPrice.format(item.price*quantity)}</strong>
    <div className="merchandise-quantity">
     <button type="button" aria-label={'Remove one '+name} onClick={()=>{setDone(false);onChange(name,-1);}}>−</button>
     <button type="button" aria-label={'Add one '+name} onClick={()=>{setDone(false);onChange(name,1);}}>+</button>
    </div>
   </li>)}</ul>
   <aside className="merchandise-order">
    <h3>Order summary</h3><dl><dt>Subtotal</dt><dd>{demoPrice.format(subtotal)}</dd></dl>
    <p>Delivery options would be shown at checkout.</p>
    <button type="button" className="experience-action" onClick={()=>setDone(true)}>Try demo checkout</button>
    {done&&<p role="status">Demo checkout complete. No order or payment was placed.</p>}
   </aside>
  </div>}
  <a className="experience-action" href={themeDemoUrl(theme.id,cataloguePage(theme))}>Continue browsing</a>
 </section>;
}
