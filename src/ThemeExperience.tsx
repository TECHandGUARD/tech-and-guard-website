import {useEffect, useState, type FormEvent} from 'react';
import {themeBriefLink, type DesignTheme} from './store-themes';
import {advisoryOffers, demoAccents, demoPages, demoPhotoSrcSet, demoPictures, demoProjects, demoStories, spaTreatments, themeDemoUrl, type DemoPage} from './theme-demo-content';
import {themeCatalogues} from './theme-catalogues';
import {DemoBasket, MerchandiseCollection, MerchandiseGrid, cataloguePage, demoPrice, relatedItems} from './ThemeMerchandise';
import './theme-experience.css';

type PageCopy = {heading?:string; intro?:string};
type Style = {brand:string; accent:string; image:string; type:string; copy:Record<string,PageCopy>};
type Model = {style:Style; basket:Record<string,number>; approved:string[]};
const currency = demoPrice;

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
 const [finish,setFinish]=useState('Midnight');
 const [notice,setNotice]=useState('');
 const [treatment,setTreatment]=useState<string>(spaTreatments[0].name);
 const [appointment,setAppointment]=useState('Tuesday at 10:00');
 const home=current.id==='';
 const studio=theme.id==='bold-studio';
 const spa=theme.id==='warm-editorial';
 const corporate=theme.id==='modern-corporate';
 const catalogue=themeCatalogues[theme.id];
 const items=catalogue?.items??[];
 const pages=demoPages[theme.id];
 const story=demoStories[theme.id];
 const next=pages[pages.findIndex(page=>page.id===current.id)+1];
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
 function changeQuantity(name:string,step:number) {
  setModel(previous=>({...previous,basket:{...previous.basket,[name]:Math.max(0,(previous.basket[name]??0)+step)}}));
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
 const query=new URLSearchParams(window.location.search);
 const product=items.find(item=>item.id===query.get('item')||item.name===query.get('item'))??items[0];
 const hasFinish=product?.id==='studio-wireless';
 const listing=current.id==='catalogue'||current.id==='collection';
 const productPage=current.id==='product'||current.id==='details';
 const isBasket=current.id==='basket';
 const defaultHeading=home?theme.headline:productPage?product.name:current.heading;
 const defaultIntro=home?{
  'modern-corporate':'Strategy and operations advice for businesses entering their next stage of growth.',
  'warm-editorial':'Unhurried skin treatments and a few thoughtful essentials to bring the feeling home.',
  'clean-premium-retail':'Well-chosen tech for the places you work, study and travel.',
  'product-showcase':'Meet Studio Wireless. Over-ear listening for the commute, the desk and everything in between.',
  'bold-studio':'See what the team is working on, what needs a decision and what is ready to share.',
 }[theme.id]:productPage?product.detail:current.intro;
 const productImage=hasFinish&&finish==='Sandstone'?items[1].image:product?.image;
 const heroImage=home?model.style.image:productPage?model.style.image===theme.image?productImage??'':model.style.image:'';
 const offer=query.get('interest');
 const copy=model.style.copy[current.id];
 const count=Object.values(model.basket).reduce((total,quantity)=>total+quantity,0);

 return <main id="main" className="experience">
  <header className="experience-toolbar">
   <div><a className="text-link" href="/design-themes/">All design themes</a><h1>{theme.name}</h1><p>Browse the pages below or try your own colours and copy.</p></div>
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
   <section className={`experience-hero ${home?'experience-home':'experience-inner'}${productPage?' experience-product-hero':''}`}>
    <div>
     {home&&<span className="experience-eyebrow">{theme.audience}</span>}
     {productPage&&<a className="experience-back-link" href={themeDemoUrl(theme.id,cataloguePage(theme))}>Browse the collection</a>}
     <h2>{copy?.heading?.trim()||defaultHeading}</h2>
     <p>{copy?.intro??defaultIntro}</p>
     {productPage&&<div className="experience-buy">
      <strong className="experience-hero-price">{currency.format(product.price)}</strong>
      {hasFinish&&<label className="experience-filter">Finish<select value={finish} onChange={event=>setFinish(event.target.value)}><option>Midnight</option><option>Sandstone</option></select></label>}
      <button type="button" className="experience-action" onClick={()=>add(hasFinish?product.name+' · '+finish:product.name)}>Add to demo basket</button>
      <a className="experience-secondary" href={themeDemoUrl(theme.id,'basket')}>View basket</a>
      {notice&&<p className="experience-purchase-feedback" role="status">{notice}</p>}
     </div>}
     {home&&<a className="experience-action" href={themeDemoUrl(theme.id,primary.id)}>{studio?'View projects':corporate?'Explore services':primary.label==='Product'?'Explore product':'Browse '+primary.label.toLowerCase()}</a>}
    </div>
    {heroImage&&<img src={heroImage} srcSet={demoPhotoSrcSet(heroImage)}
     sizes={home&&theme.id==='product-showcase'?'(max-width: 1440px) 95vw, 1350px':'(max-width: 680px) 95vw, (max-width: 1440px) 50vw, 720px'}
     width={1000} height={660} fetchPriority={home?'high':'auto'} alt=""/>}
   </section>
   {home&&<section className="experience-story">
    <h3>{story.heading}</h3>
    <div><p>{story.text}</p><a href={themeDemoUrl(theme.id,story.page)}>{story.action}</a></div>
   </section>}
   {spa&&current.id==='treatments'&&<section className="experience-section">
    <h3>The studio menu</h3>
    <div className="experience-grid">{spaTreatments.map(item=><section className="experience-panel" key={item.name}>
     <h4>{item.name}</h4><p>{item.detail}</p><p>{item.duration} · {currency.format(item.price)}</p>
     <button type="button" className="experience-action" aria-pressed={treatment===item.name} onClick={()=>setTreatment(item.name)}>{treatment===item.name?item.name+' selected':'Select '+item.name}</button>
    </section>)}</div>
    <form className="example-contact experience-appointment" onSubmit={event=>{event.preventDefault();setNotice('Sample appointment selected for '+treatment+' on '+appointment+'. No appointment was booked.');}}>
     <label>Sample appointment time<select value={appointment} onChange={event=>setAppointment(event.target.value)}><option>Tuesday at 10:00</option><option>Thursday at 14:30</option><option>Saturday at 09:00</option></select></label>
     <button className="experience-action" type="submit">Try booking a treatment</button>
    </form>
   </section>}
   {(home||current.id==='services')&&corporate&&<section className="experience-section">
    <div className="merchandise-section-heading"><div><h3>Advisory for the decisions ahead</h3><p>Choose the kind of decision or change you need to work through.</p></div>
     {home&&<a className="experience-action" href={themeDemoUrl(theme.id,'services')}>Explore all {advisoryOffers.length} services</a>}
    </div>
    <div className="experience-grid">{(home?advisoryOffers.filter((_,i)=>i%4===0):advisoryOffers).map(item=>
     <section className="experience-panel advisory-offer" key={item.name}><span>{item.group}</span><h4>{item.name}</h4><p>{item.detail}</p>
      <a href={themeDemoUrl(theme.id,'contact')+'?'+new URLSearchParams({interest:item.name})}>Enquire about {item.name}</a>
     </section>)}</div>
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
     <label>Service of interest<select defaultValue={advisoryOffers.find(item=>item.name===offer)?.name??''}>
      <option value="">Choose a service</option>{advisoryOffers.map(item=><option key={item.name}>{item.name}</option>)}
     </select></label>
     <label>Example message<textarea required rows={4} placeholder="I’d like to discuss a website project."/></label>
     <button className="experience-action" type="submit">Try example enquiry</button>
    </form>
   </section>}
   {(home||listing)&&catalogue&&<MerchandiseCollection theme={theme} catalogue={catalogue} full={listing}/>}
   {(home||current.id==='specifications')&&theme.id==='product-showcase'&&<section className="experience-section">
    <h3>Product specification</h3>
    <dl className="experience-specs"><div><dt>Fit</dt><dd>Over-ear, closed-back</dd></div><div><dt>Charging</dt><dd>USB-C</dd></div><div><dt>Connectivity</dt><dd>Wireless and wired</dd></div></dl>
    <a className="experience-action" href={themeDemoUrl(theme.id,'details')}>View Studio Wireless</a>
   </section>}
   {productPage&&<section className="experience-section">
    <h3>{spa?'The ritual':'How to use it'}</h3>
    <p>{product.use}</p>
   </section>}
   {productPage&&catalogue&&<section className="experience-section merchandise-section">
    <div className="merchandise-section-heading"><div><h3>{spa?'Complete the ritual':'Complete your setup'}</h3><p>{spa?'Explore a few ways to round out the routine.':'Pair this piece with something that fits the way you use it.'}</p></div></div>
    <MerchandiseGrid theme={theme} items={relatedItems(catalogue,product)}/>
   </section>}
   {isBasket&&catalogue&&<DemoBasket theme={theme} catalogue={catalogue} quantities={model.basket} onChange={changeQuantity}/>}
   {studio&&<section className="experience-section">
    {home&&<div className="experience-grid">
     <section className="experience-panel"><h3>Projects</h3><p>{demoProjects.length} sample projects</p></section>
     <section className="experience-panel"><h3>Needs review</h3><p>{demoProjects.length-model.approved.length} awaiting approval</p></section>
     <section className="experience-panel"><h3>Approved</h3><p>{model.approved.length} complete</p></section>
    </div>}
    <h3>{current.id==='approvals'?'Awaiting approval':current.id==='approved'?'Completed projects':'Current projects'}</h3>
    {home&&<p>Follow current work and review the brief before it goes to a client.</p>}
    <ul className="experience-list experience-projects">{(home?demoProjects.slice(0,4):demoProjects.filter(project=>current.id==='approvals'?!model.approved.includes(project.name):current.id==='approved'?model.approved.includes(project.name):true)).map(project=><li key={project.name}>
     <div><span className="merchandise-category">{project.type}</span><strong>{project.name}</strong><p>{project.detail}</p></div>
     <span className={model.approved.includes(project.name)?'project-approved':'project-review'}>{model.approved.includes(project.name)?'Approved':'Needs review'}</span>
     {current.id==='approvals'&&<button type="button" onClick={()=>approve(project.name)}>Approve {project.name}</button>}
    </li>)}</ul>
    {home&&<a className="experience-action" href={themeDemoUrl(theme.id,'projects')}>Open all {demoProjects.length} projects</a>}
    {current.id==='approvals'&&model.approved.length===demoProjects.length&&<p>All sample projects have been reviewed.</p>}
   </section>}
   {notice&&!productPage&&<p className="experience-feedback" role="status">{notice}</p>}
   <footer className="experience-footer"><strong>{brand}</strong><span>Interactive theme demo</span>
    {next&&<a href={themeDemoUrl(theme.id,next.id)}>Next page · {next.label}</a>}
   </footer>
  </article>
 </main>;
}
