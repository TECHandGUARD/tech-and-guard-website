import {useCallback, useEffect, useRef, useState} from 'react';
import {ArrowDownRight, ArrowUpRight, BatteryCharging, BriefcaseBusiness, Headphones, Minus, Package, Plus, ShoppingBag, Smartphone} from 'lucide-react';
import './showroom.css';
import {EnquiryForm} from './EnquiryForm';
import {storeCategories, storeCategory, type StoreCategory} from './store-categories';
import {basketQuantityLimit, changeBasket, maxBasketLines, readBasket} from './basket';
import {catalogueImage, catalogueText} from './catalogue-display';
import {money} from './commerce';
import {storeRequest} from './store-api';
import type {ProductDraft} from './store-import';
import {companyEmail,defaultProductEnquiryMessage,whatsappLink} from './contact-details';
import {PayFastCheckout} from './PayFastCheckout';
import {ShopOrderStatus} from './ShopOrderStatus';

const categoryIcons = {work:BriefcaseBusiness,power:BatteryCharging,audio:Headphones,everyday:Smartphone};
const enquiryEmail = companyEmail;
const basketKey = 'tech-guard:enquiry-basket';
type Product = ProductDraft & {published: boolean};
const cataloguePath = '/rest/v1/corporate_products?select=sku,handle,title,description,price_cents,stock,image_url,options,published&published=eq.true&order=title';

function savedBasket() {
 try { return readBasket(localStorage.getItem(basketKey)); }
 catch { return {}; }
}

function ProductImage({product}: {product: Product}) {
 const [failed, setFailed] = useState(false);
 return <div className="premium-product-media">
  {product.image_url && !failed
   ? <img className="product-image" src={product.image_url} alt={product.title} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)}/>
   : <span className="premium-product-placeholder"><Package size={38} strokeWidth={1.15} aria-hidden="true"/>Photo unavailable</span>}
 </div>;
}

export function Store() {
 const [products, setProducts] = useState<Product[]>([]);
 const [state, setState] = useState<'loading'|'ready'|'error'>('loading');
 const [reload, setReload] = useState(0);
 const [search, setSearch] = useState('');
 const [sort, setSort] = useState('name');
 const [availability, setAvailability] = useState('all');
 const [category, setCategory] = useState<StoreCategory|'all'>('all');
 const [basket, setBasket] = useState(savedBasket);
 const [basketMessage, setBasketMessage] = useState('');
 const [directEnquiry, setDirectEnquiry] = useState(false);
 const basketHeading = useRef<HTMLHeadingElement>(null);
 const catalogueHeading = useRef<HTMLHeadingElement>(null);
 const clearBasketAfterPayment=useCallback(()=>setBasket({}),[]);

 useEffect(() => {
  const controller = new AbortController();
  storeRequest(cataloguePath, {signal: controller.signal}).then(data => {
   if (!Array.isArray(data)) throw new Error('Invalid catalogue response.');
   if (controller.signal.aborted) return;
   setProducts(data.map(p => ({...p, title: catalogueText(p.title), description: catalogueText(p.description), image_url: catalogueImage(p.image_url)})));
   setState('ready');
  }).catch(() => { if (!controller.signal.aborted) setState('error'); });
  return () => controller.abort();
 }, [reload]);

 useEffect(() => {
  try { localStorage.setItem(basketKey, JSON.stringify(basket)); }
  catch { /* The in-memory basket remains available. */ }
 }, [basket]);

 const query = search.trim().toLowerCase().split(/\s+/);
 const filtered = products.filter(p => {
  const text = [p.title, p.options, p.description, p.sku].join(' ').toLowerCase();
  return (category === 'all' || storeCategory(p.title) === category)
   && query.every(term => text.includes(term)) && (availability === 'all'
   || (availability === 'listed' && p.stock !== null && p.stock > 0)
   || (availability === 'confirm' && p.stock === null));
 }).sort((a, b) => sort === 'price-low' ? a.price_cents - b.price_cents
  : sort === 'price-high' ? b.price_cents - a.price_cents : a.title.localeCompare(b.title));

 const quantityFor = (sku: string) => Object.prototype.hasOwnProperty.call(basket, sku) ? basket[sku] : 0;
 const lines = products.filter(p => quantityFor(p.sku) > 0);
 const missing = state === 'ready' ? Object.keys(basket).filter(sku => !products.some(p => p.sku === sku)) : [];
 const invalid = lines.some(p => quantityFor(p.sku) > basketQuantityLimit(p.stock));
 const count = Object.values(basket).reduce((sum, quantity) => sum + quantity, 0);
 const total = lines.reduce((sum, p) => sum + p.price_cents * quantityFor(p.sku), 0);
 const body = [
  'Hi Tech & GUARD,',
  '',
  'I’d like to enquire about these products:',
  '',
  ...lines.map(p => `${quantityFor(p.sku)} × ${p.title} (SKU ${p.sku}${p.options ? ` · ${p.options}` : ''}) — ${money(p.price_cents)} each`),
  '',
  `Listed subtotal: ${money(total)}`,
  'Please confirm stock and delivery costs.',
  'My town or suburb: ',
 ].join('\n');
 const canEnquire = state === 'ready' && lines.length > 0 && missing.length === 0 && !invalid;
 const enquiryLink = `mailto:${enquiryEmail}?subject=Product%20enquiry&body=${encodeURIComponent(body)}`;
 const whatsAppEnquiryLink = whatsappLink(body);

 async function copyEnquiry() {
  try {
   await navigator.clipboard.writeText(body);
   setBasketMessage('Enquiry copied. Paste it into an email to ' + enquiryEmail + '.');
  } catch {
   setBasketMessage('Could not copy your enquiry. Use Email enquiry to open it in your email app.');
  }
 }

 function updateQuantity(product: Product, adjustment: number) {
  setBasket(current => changeBasket(current, product.sku, adjustment, product.stock));
  const quantity = Math.max(0, quantityFor(product.sku) + adjustment);
  setBasketMessage(quantity ? `${product.title}: ${quantity} in your enquiry.` : `${product.title} removed from your enquiry.`);
 }

 function removeLine(sku: string) {
  setBasket(current => {
   const next = {...current};
   delete next[sku];
   return next;
  });
  basketHeading.current?.focus();
  setBasketMessage('Item removed from your enquiry.');
 }

 return <div className="store-showroom">
  <ShopOrderStatus onPaid={clearBasketAfterPayment}/>
  <header className="showroom-hero">
   <div className="container showroom-hero-inner">
    <div>
     <p className="showroom-brand">TECH &amp; GUARD STORE</p>
     <h1>Better gear for<br/>every day.</h1>
      <p className="showroom-lead">Shop laptop bags, charging gear and audio. Add your favourites to the basket, then ask us to confirm availability. Secure PayFast checkout is being prepared.</p>
     <div className="actions">
      <a className="button primary" href="#catalogue">Browse products <ArrowDownRight size={18} aria-hidden="true"/></a>
      <button type="button" className="button secondary" onClick={() => basketHeading.current?.focus()}><ShoppingBag size={17} aria-hidden="true"/> Basket ({count})</button>
     </div>
    </div>
    <img className="showroom-editorial" src="/images/store-editorial.webp" alt="" width={1200} height={800} fetchPriority="high"/>
   </div>
  </header>

  {products.length > 0 && <section className="container showroom-categories" aria-labelledby="category-title">
   <h2 id="category-title">Shop by category</h2>
   <div className="showroom-category-grid">
    {(Object.keys(storeCategories) as StoreCategory[]).map(key => {
     const Icon = categoryIcons[key];
     const amount = products.filter(product => storeCategory(product.title) === key).length;
     if (!amount) return null;
     return <button key={key} className="showroom-category" type="button" onClick={() => {
      setCategory(key); setSearch(''); setAvailability('all'); catalogueHeading.current?.focus();
     }}>
      <Icon size={22} strokeWidth={1.55} aria-hidden="true"/>
      <span><strong>{storeCategories[key]}</strong><small>{amount} {amount === 1 ? 'product' : 'products'}</small></span>
      <ArrowUpRight size={16} aria-hidden="true"/>
     </button>;
    })}
   </div>
  </section>}

  <div className="container showroom-workspace">
   <section id="catalogue" className="showroom-catalogue" aria-labelledby="catalogue-title">
    <h2 id="catalogue-title" ref={catalogueHeading} tabIndex={-1}>Product catalogue</h2>
  {products.length > 0 && <>
   {category !== 'all' && <div className="showroom-active-category">
    <strong>{storeCategories[category]}</strong>
    <button type="button" onClick={() => setCategory('all')}>Show all categories</button>
   </div>}
   <div className="catalogue-tools">
    <label>Search products<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, variant or SKU"/></label>
    <label>Availability<select value={availability} onChange={e => setAvailability(e.target.value)}><option value="all">All products</option><option value="listed">Listed in stock</option><option value="confirm">Stock to confirm</option></select></label>
    <label>Sort by<select value={sort} onChange={e => setSort(e.target.value)}><option value="name">Name (A–Z)</option><option value="price-low">Price (low to high)</option><option value="price-high">Price (high to low)</option></select></label>
   </div>
   <p className="catalogue-count" role="status">{filtered.length} of {products.length} products</p>
  </>}
  {state === 'loading' ? <p role="status">Loading products…</p>
   : state === 'error' ? <div className="store-panel"><p role="alert">The catalogue is temporarily unavailable.</p><button className="button secondary" onClick={() => { setState('loading'); setReload(n => n + 1); }}>Retry catalogue</button> <a className="text-link" href={`mailto:${enquiryEmail}`}>Email us about a product</a></div>
   : !products.length ? <div className="store-panel"><h3>Products coming soon</h3><p>Please contact us for the current catalogue.</p></div>
   : !filtered.length ? <div><p>No products match these filters.</p><button className="button secondary" onClick={() => { setSearch(''); setAvailability('all'); setSort('name'); setCategory('all'); }}>Reset filters</button></div>
   : <div className="showroom-grid">{filtered.map(p => {
    const quantity = quantityFor(p.sku);
    const atLimit = quantity >= basketQuantityLimit(p.stock) || (!quantity && Object.keys(basket).length >= maxBasketLines);
    return <article className="product-card" key={p.sku}>
     <ProductImage key={p.image_url} product={p}/>
     <h3>{p.title}</h3>{p.options && <p className="showroom-variant">{p.options}</p>}<p>{p.description}</p>
     <div className="product-card-actions"><strong className="premium-product-price">{money(p.price_cents)}</strong>
      <p className="premium-stock-status">{p.stock === 0 ? 'Out of stock' : p.stock === null ? 'Stock confirmed before purchase' : `${p.stock} available`}</p>
      <button className="button ghost" disabled={atLimit||p.stock===0} aria-label={`Add to basket: ${p.title}`} onClick={() => updateQuantity(p, 1)}>Add to basket</button>{quantity>0&&<small>{quantity} in basket</small>}
     </div>
    </article>;
   })}</div>}
   </section>
  <aside className="store-panel enquiry-basket" aria-labelledby="enquiry-basket">
   <h3 id="enquiry-basket" ref={basketHeading} tabIndex={-1}>Your basket</h3>
   {!count && <p>Add products from the catalogue to start an enquiry.</p>}
   <a className="showroom-contact" href={whatsappLink(defaultProductEnquiryMessage)} target="_blank" rel="noopener noreferrer">Ask about a product on WhatsApp <ArrowUpRight size={15} aria-hidden="true"/></a>
   {!!(lines.length || missing.length) && <ul className="enquiry-items">
    {lines.map(p => <li key={p.sku}><div><strong>{p.title}</strong><small>{money(p.price_cents)} each</small>
     {quantityFor(p.sku) > basketQuantityLimit(p.stock) && <small role="alert">Reduce the quantity to the available limit of {basketQuantityLimit(p.stock)}.</small>}</div>
     <div className="enquiry-quantity">
      <button type="button" aria-label={`Decrease ${p.title} quantity`} disabled={quantityFor(p.sku) <= 1} onClick={() => updateQuantity(p, -1)}><Minus size={16}/></button>
      <span>{quantityFor(p.sku)}</span>
      <button type="button" aria-label={`Increase ${p.title} quantity`} disabled={quantityFor(p.sku) >= basketQuantityLimit(p.stock)} onClick={() => updateQuantity(p, 1)}><Plus size={16}/></button>
      <button type="button" aria-label={`Remove ${p.title}`} onClick={() => removeLine(p.sku)}>Remove</button>
     </div>
    </li>)}
    {missing.map(sku => <li key={sku}><span>{sku} is unavailable</span><button type="button" onClick={() => removeLine(sku)}>Remove {sku}</button></li>)}
   </ul>}
   {!!lines.length && <><p>Listed subtotal <strong>{money(total)}</strong>. Delivery is confirmed separately.</p>
    {canEnquire ? <>
     <div className="actions">
      <button type="button" className="button primary" aria-expanded={directEnquiry} onClick={()=>setDirectEnquiry(open=>!open)}>{directEnquiry?'Hide enquiry form':'Ask about these products'}</button>
      <a className="button secondary" href={enquiryLink}>Email enquiry</a>
      <a className="button secondary" href={whatsAppEnquiryLink} target="_blank" rel="noopener noreferrer">WhatsApp enquiry</a>
      <button type="button" className="button secondary" onClick={() => void copyEnquiry()}>Copy enquiry</button>
     </div>
     {directEnquiry&&<EnquiryForm kind="product" items={lines.map(product=>({sku:product.sku,quantity:quantityFor(product.sku)}))}/>}
    <p>Your email or WhatsApp draft includes the product list. Add your town or suburb and we’ll help with product questions.</p>
    </> : <p>Update the unavailable items or quantities to continue.</p>}</>}
   <p className="enquiry-feedback" role="status">{basketMessage}</p>
   {!!lines.length&&missing.length===0&&<PayFastCheckout items={lines.map(product=>({sku:product.sku,title:product.title,options:product.options,quantity:quantityFor(product.sku),price_cents:product.price_cents,stock:product.stock}))}/>}
  </aside>
 </div></div>;
}
