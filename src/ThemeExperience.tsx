import {useEffect, useState, type FormEvent} from 'react';
import {themeBriefLink, type DesignTheme} from './store-themes';
import {demoAccents, demoItems, demoPages, demoPictures, demoProjects, themeDemoUrl, type DemoPage} from './theme-demo-content';
import './theme-experience.css';

type PageCopy = {heading?:string; intro?:string};
type Style = {brand:string; accent:string; image:string; type:string; copy:Record<string,PageCopy>};
type Model = {style:Style; basket:Record<string,number>; approved:string[]};
const currency = new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR',maximumFractionDigits:0});

function original(theme:DesignTheme):Model {
 return {style:{brand:theme.brand,accent:'signature',image:theme.image,type:'signature',copy:{}},basket:{},approved:['Studio portfolio']};
}

function load(theme:DesignTheme):Model {
 try {
  const saved=sessionStorage.getItem('theme-demo:'+theme.id);
  if(saved) {
   const value=JSON.parse(saved);
   const defaults=original(theme);
   return {...defaults,...value,style:{...defaults.style,...value.style}};
  }
 } catch { /* The demo also works when browser storage is unavailable. */ }
 return original(theme);
}

function DemoEditor({theme,style,page,heading,intro,onChange,onReset}:{theme:DesignTheme;style:Style;page:string;heading:string;intro:string;onChange:(style:Style)=>void;onReset:()=>void}) {
 function editCopy(value:PageCopy) {
  onChange({...style,copy:{...style.copy,[page]:{...style.copy[page],...value}}});
 }
 return <details className="experience-editor">
  <summary>Customise this theme</summary>
  <p>Changes appear immediately and stay with you as you browse this theme in this tab.</p>
  <div className="experience-editor-fields">
   <label>Brand name<input maxLength={48} value={style.brand} onChange={event=>onChange({...style,brand:event.target.value})}/></label>
   <label>{page?'Page heading':'Main headline'}<input maxLength={100} value={style.copy[page]?.heading??heading} onChange={event=>editCopy({heading:event.target.value})}/></label>
   <label>Page introduction<input maxLength={200} value={style.copy[page]?.intro??intro} onChange={event=>editCopy({intro:event.target.value})}/></label>
   <label>Accent colour<select value={style.accent} onChange={event=>onChange({...style,accent:event.target.value})}>
    {demoAccents.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}
   </select></label>
   <label>Heading style<select value={style.type} onChange={event=>onChange({...style,type:event.target.value})}>
    <option value="signature">Theme default</option><option value="serif">Serif</option><option value="sans">Sans serif</option>
   </select></label>
   {theme.image&&<label>Hero image<select value={style.image} onChange={event=>onChange({...style,image:event.target.value})}>
    {demoPictures.map(picture=><option key={picture.path} value={picture.path}>{picture.label}</option>)}
   </select></label>}
  </div>
  <button type="button" className="text-link" onClick={onReset}>Reset customisation</button>
 </details>;
}

export function ThemeExperience({theme,current}:{theme:DesignTheme;current:DemoPage}) {
 const [model,setModel]=useState(()=>load(theme));
 const [category,setCategory]=useState('All');
 const [finish,setFinish]=useState('Midnight');
 const [notice,setNotice]=useState('');
 const home=current.id==='';
 const studio=theme.id==='bold-studio';
 const corporate=theme.id==='modern-corporate';
 const items=demoItems[theme.id]??[];
 const pages=demoPages[theme.id];
 const brand=model.style.brand.trim()||theme.brand;

 useEffect(()=>{
  try { sessionStorage.setItem('theme-demo:'+theme.id,JSON.stringify(model)); } catch { /* Preview state remains in memory. */ }
 },[theme.id,model]);
 useEffect(()=>{
  const restore=(event:PageTransitionEvent)=>{if(event.persisted)setModel(load(theme));};
  window.addEventListener('pageshow',restore);
  return ()=>window.removeEventListener('pageshow',restore);
 },[theme]);

 function add(name:string) {
  setModel(previous=>({...previous,basket:{...previous.basket,[name]:(previous.basket[name]??0)+1}}));
  setNotice(name+' added to the demo basket.');
 }
 function remove(name:string) {
  setModel(previous=>({...previous,basket:{...previous.basket,[name]:Math.max(0,(previous.basket[name]??0)-1)}}));
 }
 function approve(project:string) {
  setModel(previous=>({...previous,approved:[...previous.approved,project]}));
  setNotice(project+' approved.');
 }
 function sampleEnquiry(event:FormEvent) {
  event.preventDefault();
  setNotice('Example enquiry complete. No message was sent.');
 }

 const primary=pages[1];
 const product=items.find(item=>item.name===new URLSearchParams(window.location.search).get('item'))??items[0];
 const filtered=category==='All'?items:items.filter(item=>item.category===category);
 const listing=current.id==='catalogue'||current.id==='collection';
 const productPage=current.id==='product'||current.id==='details';
 const isBasket=current.id==='basket';
 const defaultHeading=home?theme.headline:productPage?product.name:current.heading;
 const defaultIntro=home?theme.description:productPage?product.detail:current.intro;
 const copy=model.style.copy[current.id];
 const count=Object.values(model.basket).reduce((total,quantity)=>total+quantity,0);

 return <main id="main" className="experience">
  <header className="experience-toolbar">
   <div><a className="text-link" href="/design-themes/">All design themes</a><h1>{theme.name}</h1></div>
   <a className="button primary" href={themeBriefLink(theme.service,theme.id)}>Choose {theme.name}</a>
  </header>
  <DemoEditor theme={theme} style={model.style} page={current.id} heading={defaultHeading} intro={defaultIntro} onChange={style=>setModel(previous=>({...previous,style}))} onReset={()=>setModel(previous=>({...previous,style:original(theme).style}))}/>
  <article className={`experience-site demo-${theme.id}`} data-accent={model.style.accent} data-type={model.style.type} aria-label={brand+' demo'}>
   <header className="experience-site-header">
    <a className="experience-brand" href={themeDemoUrl(theme.id)}>{brand}</a>
    <nav aria-label="Theme pages">
     {pages.map(page=><a key={page.id} href={themeDemoUrl(theme.id,page.id)} aria-current={page.id===current.id?'page':undefined}>
      {page.label}{page.id==='basket'&&count>0?' ('+count+')':''}
     </a>)}
    </nav>
   </header>
   <section className={`experience-hero ${home?'experience-home':'experience-inner'}`}>
    <div>
     <h2>{copy?.heading?.trim()||defaultHeading}</h2>
     <p>{copy?.intro??defaultIntro}</p>
     {home&&<a className="experience-action" href={themeDemoUrl(theme.id,primary.id)}>{studio?'View projects':corporate?'Explore services':primary.label==='Product'?'Explore product':'Browse '+primary.label.toLowerCase()}</a>}
    </div>
    {(home||productPage)&&model.style.image&&<img src={model.style.image} width={1000} height={660} alt=""/>}
   </section>
   {(home||current.id==='services')&&corporate&&<section className="experience-section">
    <h3>How we can help</h3>
    <div className="experience-grid">{[
     ['Advisory','Work through a decision with someone who can bring a second perspective.'],
     ['Operations','Clarify ownership and make everyday processes easier to follow.'],
     ['Growth planning','Agree what to pursue now and how to measure progress over time.'],
    ].map(([heading,copy])=><section className="experience-panel" key={heading}><h4>{heading}</h4><p>{copy}</p></section>)}</div>
    <a className="experience-action" href={themeDemoUrl(theme.id,'contact')}>Discuss a project</a>
   </section>}
   {corporate&&current.id==='about'&&<section className="experience-section">
    <h3>How we work</h3>
    <p>We start with a conversation about what your team is trying to achieve. Then we agree the questions to answer and leave you with steps you can act on.</p>
    <div className="experience-grid">
     <section className="experience-panel"><h4>Discovery</h4><p>Talk through the decision, the people involved and the deadline.</p></section>
     <section className="experience-panel"><h4>Recommendations</h4><p>Get a clear explanation of the options and their trade-offs.</p></section>
     <section className="experience-panel"><h4>Follow-through</h4><p>Agree who owns each next step and how you’ll review progress.</p></section>
    </div>
    <a className="experience-action" href={themeDemoUrl(theme.id,'contact')}>Get in touch</a>
   </section>}
   {corporate&&current.id==='contact'&&<section className="experience-section">
    <h3>Project enquiry</h3>
    <form className="example-contact" onSubmit={sampleEnquiry}>
     <label>Example name<input required placeholder="Alex Smith"/></label>
     <label>Example message<textarea required rows={4} placeholder="I’d like to discuss a website project."/></label>
     <button className="experience-action" type="submit">Try example enquiry</button>
    </form>
   </section>}
   {(home||listing)&&items.length>1&&<section className="experience-section">
    <h3>{listing?'Browse items':'Featured products'}</h3>
    {listing&&<label className="experience-filter">Category<select value={category} onChange={event=>setCategory(event.target.value)}>
     {['All',...new Set(items.map(item=>item.category))].map(option=><option key={option}>{option}</option>)}
    </select></label>}
    <div className="experience-grid">{filtered.map(item=><section className="experience-panel" key={item.name}>
     <p className="experience-category">{item.category}</p><h4>{item.name}</h4><p>{item.detail}</p><p>{currency.format(item.price)}</p>
     <a href={themeDemoUrl(theme.id,'product')+'?'+new URLSearchParams({item:item.name})}>View {item.name}</a>
    </section>)}</div>
   </section>}
   {(home||current.id==='specifications')&&theme.id==='product-showcase'&&<section className="experience-section">
    <h3>Product specification</h3>
    <dl className="experience-specs"><div><dt>Fit</dt><dd>Over-ear, closed-back</dd></div><div><dt>Charging</dt><dd>USB-C</dd></div><div><dt>Connectivity</dt><dd>Wireless and wired</dd></div></dl>
    <a className="experience-action" href={themeDemoUrl(theme.id,'details')}>View Studio Wireless</a>
   </section>}
   {productPage&&<section className="experience-section">
    <h3>{currency.format(product.price)}</h3>
    {theme.id==='product-showcase'&&<label className="experience-filter">Finish<select value={finish} onChange={event=>setFinish(event.target.value)}><option>Midnight</option><option>Sandstone</option></select></label>}
    <button type="button" className="experience-action" onClick={()=>add(theme.id==='product-showcase'?product.name+' · '+finish:product.name)}>Add to demo basket</button>
    <a className="experience-secondary" href={themeDemoUrl(theme.id,'basket')}>View basket</a>
   </section>}
   {isBasket&&<section className="experience-section">
    {count===0?<p>Your demo basket is empty.</p>:<>
     <ul className="experience-list">{Object.entries(model.basket).filter(([,quantity])=>quantity>0).map(([name,quantity])=><li key={name}>
      <strong>{name}</strong><span>Quantity {quantity}</span><button type="button" onClick={()=>remove(name)}>Remove one</button>
     </li>)}</ul>
     <p>No real orders are placed in this demo.</p>
    </>}
    <a className="experience-action" href={themeDemoUrl(theme.id,primary.id)}>Continue browsing</a>
   </section>}
   {studio&&<section className="experience-section">
    {home&&<div className="experience-grid">
     <section className="experience-panel"><h3>Projects</h3><p>{demoProjects.length} sample projects</p></section>
     <section className="experience-panel"><h3>Needs review</h3><p>{demoProjects.length-model.approved.length} awaiting approval</p></section>
     <section className="experience-panel"><h3>Approved</h3><p>{model.approved.length} complete</p></section>
    </div>}
    <h3>{current.id==='approvals'?'Awaiting approval':current.id==='approved'?'Completed projects':'Current projects'}</h3>
    <ul className="experience-list">{demoProjects.filter(project=>current.id==='approvals'?!model.approved.includes(project):current.id==='approved'?model.approved.includes(project):true).map(project=><li key={project}>
     <strong>{project}</strong><span>{model.approved.includes(project)?'Approved':'Needs review'}</span>
     {current.id==='approvals'&&<button type="button" onClick={()=>approve(project)}>Approve {project}</button>}
    </li>)}</ul>
    {current.id==='approvals'&&model.approved.length===demoProjects.length&&<p>All sample projects have been reviewed.</p>}
   </section>}
   {notice&&<p className="experience-feedback" role="status">{notice}</p>}
   <footer className="experience-footer"><strong>{brand}</strong><span>Interactive theme demo</span></footer>
  </article>
 </main>;
}
