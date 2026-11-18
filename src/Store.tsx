import {useEffect, useRef, useState} from 'react';
import {Minus, Plus, ShoppingBag} from 'lucide-react';
import {basketQuantityLimit, changeBasket, maxBasketLines, readBasket} from './basket';
import {catalogueImage, catalogueText} from './catalogue-display';
import {money} from './commerce';
import {storeRequest} from './store-api';
import type {ProductDraft} from './store-import';

const enquiryEmail = 'aneleq@techandguard.co.za';
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
   : <span className="premium-product-placeholder" aria-hidden="true">TECH &amp; GUARD</span>}
 </div>;
}

export function Store() {
 const [products, setProducts] = useState<Product[]>([]);
 const [state, setState] = useState<'loading'|'ready'|'error'>('loading');
 const [reload, setReload] = useState(0);
 const [search, setSearch] = useState('');
 const [sort, setSort] = useState('name');
 const [availability, setAvailability] = useState('all');
 const [basket, setBasket] = useState(savedBasket);
 const [basketMessage, setBasketMessage] = useState('');
 const basketHeading = useRef<HTMLHeadingElement>(null);

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
  return query.every(term => text.includes(term)) && (availability === 'all'
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

 return <section id="store" className="section services dawn-store"><div className="container">
  <div className="section-heading"><div><span className="label">TECH &amp; GUARD COLLECTION</span><h2>Browse the catalogue</h2></div>
   <p>Choose the products you’re interested in and email us to confirm availability and delivery.</p></div>
  <div className="store-shortcuts">
   <a className="text-link" href={`mailto:${enquiryEmail}`}>Ask us about a product</a>
   <button type="button" className="button secondary" onClick={() => basketHeading.current?.focus()}><ShoppingBag size={17}/> Enquiry basket ({count})</button>
  </div>
  {products.length > 0 && <>
   <div className="catalogue-tools">
    <label>Search products<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, variant or SKU"/></label>
    <label>Availability<select value={availability} onChange={e => setAvailability(e.target.value)}><option value="all">All products</option><option value="listed">Listed in stock</option><option value="confirm">Stock to confirm</option></select></label>
    <label>Sort by<select value={sort} onChange={e => setSort(e.target.value)}><option value="name">Name (A–Z)</option><option value="price-low">Price (low to high)</option><option value="price-high">Price (high to low)</option></select></label>
   </div>
   <p className="catalogue-count" role="status">{filtered.length} of {products.length} products</p>
  </>}
  {state === 'loading' ? <p role="status">Loading products…</p>
   : state === 'error' ? <div className="store-panel"><p role="alert">The catalogue is temporarily unavailable.</p><button className="button secondary" onClick={() => { setState('loading'); setReload(n => n + 1); }}>Retry catalogue</button> <a className="text-link" href={`mailto:${enquiryEmail}`}>Email us about a product</a></div>
   : !products.length ? <div className="service"><h3>Products coming soon</h3><p>Please contact us for the current catalogue.</p></div>
   : !filtered.length ? <div><p>No products match these filters.</p><button className="button secondary" onClick={() => { setSearch(''); setAvailability('all'); setSort('name'); }}>Reset filters</button></div>
   : <div className="service-grid">{filtered.map(p => {
    const quantity = quantityFor(p.sku);
    const atLimit = quantity >= basketQuantityLimit(p.stock) || (!quantity && Object.keys(basket).length >= maxBasketLines);
    return <article className="service product-card" key={p.sku}>
     <ProductImage key={p.image_url} product={p}/>
     <h3>{p.title}</h3>{p.options && <p>{p.options}</p>}<p>{p.description}</p>
     <div className="product-card-actions"><strong className="premium-product-price">{money(p.price_cents)}</strong>
      <p className="premium-stock-status">{p.stock === null ? 'Stock to be confirmed' : p.stock === 0 ? 'Out of stock' : `${p.stock} listed · availability subject to confirmation`}</p>
      <button className="button ghost" disabled={atLimit} aria-label={`Add ${p.title} to enquiry`} onClick={() => updateQuantity(p, 1)}>{quantity ? `Add another · ${quantity} in basket` : 'Add to enquiry'}</button>
     </div>
    </article>;
   })}</div>}
  <section className="store-panel enquiry-basket" aria-labelledby="enquiry-basket">
   <h3 id="enquiry-basket" ref={basketHeading} tabIndex={-1}>Your enquiry basket</h3>
   {!count && <p>Add products from the catalogue to start an enquiry.</p>}
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
      <a className="button primary" href={enquiryLink}>Email enquiry</a>
      <button type="button" className="button secondary" onClick={() => void copyEnquiry()}>Copy enquiry</button>
     </div>
     <p>Email enquiry opens a draft in your email app. Add your town or suburb, then send it to <a href={`mailto:${enquiryEmail}`}>{enquiryEmail}</a>.</p>
    </> : <p>Update the unavailable items or quantities to continue.</p>}</>}
   <p className="enquiry-feedback" role="status">{basketMessage}</p>
  </section>
 </div></section>;
}
