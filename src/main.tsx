import React,{useEffect,useRef,useState,lazy,Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowUpRight,ArrowRight,Menu,X,Globe2,ShoppingBag,PanelsTopLeft,Cloud,Headset,Check,GraduationCap,Mail,Layers3} from 'lucide-react';
import {Store} from './Store';
const AccountPage=lazy(()=>import('./AccountPage'));
const StoreAdmin=lazy(()=>import('./StoreAdmin').then(m=>({default:m.StoreAdmin})));
import './styles.css';
import './company-home.css';
const bridge='https://main.d2pos7eidu5lbk.amplifyapp.com';
import {EnquiryForm} from './EnquiryForm';
const navigation=[['Home','/'],['Services','/services/'],['Projects','/projects/'],['About','/about/'],['Store','/store/'],['Contact','/contact/']];
const services=[{icon:Globe2,title:'Business websites',summary:'Make your business easy to find and understand.',detail:'Company portfolios, service pages and landing pages with clear content, accessible navigation and layouts that work on phones.',items:['Company portfolios','Landing pages','Responsive design']},{icon:ShoppingBag,title:'Independent online stores',summary:'Your products, on your own website.',detail:'Product catalogues, import tools and shopping experiences designed around your business. Payment activation and delivery rules are configured for each store.',items:['Product catalogues','CSV imports','Store administration']},{icon:PanelsTopLeft,title:'Custom web applications',summary:'Tools built around the way you work.',detail:'Dashboards, portals and digital workflows that help teams manage information and give customers a simpler experience.',items:['Dashboards and portals','Workflow tools','Account access']},{icon:Cloud,title:'Cloud & maintenance',summary:'Support beyond the first launch.',detail:'Deployment planning, website updates and practical maintenance to keep your digital presence useful as your business changes.',items:['Deployment support','Website updates','Ongoing maintenance']},{icon:Headset,title:'Technology consulting',summary:'A clear plan before you invest.',detail:'We help define your needs, compare options and plan a practical path from your first idea to a working digital solution.',items:['Requirements and planning','System reviews','Digital strategy']}];
const path=window.location.pathname.replace(/\/+$/,'')||'/';
const titles:Record<string,string>={'/':'Tech & Guard | Digital solutions','/services':'Services | Tech & Guard','/projects':'Projects | Tech & Guard','/about':'About | Tech & Guard','/store':'Store | Tech & Guard','/contact':'Contact | Tech & Guard','/account':'Your account | Tech & Guard','/admin':'Store administration | Tech & Guard'};
document.title=titles[path]||'Page not found | Tech & Guard';
function Intro({label,title,text}:{label:string;title:string;text:string}){return <div className="page-intro container"><span className="label">{label}</span><h1>{title}</h1><p>{text}</p></div>;}
function CTA(){return <section className="container cta"><div><span className="label">YOUR NEXT STEP, MADE SIMPLE</span><h2>Let’s make your next idea work.</h2><p>No jargon or pressure. Tell us what you want to achieve, and we’ll help you work out a sensible next step.</p></div><a className="button primary" href="/contact/">Request a quote <ArrowUpRight size={18}/></a></section>;}
function Process(){return <section className="container engagement"><div className="section-heading"><div><span className="label">A CLEAR FIRST STEP</span><h2>From your idea to a practical plan.</h2></div></div><div className="engagement-grid">{[["01","Share your brief","Tell us who the website is for, what it needs to do and your preferred timing."],["02","Define the scope","Discuss deliverables, responsibilities, hosting costs and what belongs in the first release."],["03","Review a proposal","Agree the scope, price and payment milestones in writing before development begins."]].map(([step,title,text])=><article key={step}><span className="label">{step}</span><h3>{title}</h3><p>{text}</p></article>)}</div><p className="form-note">Project pricing is quoted for the agreed scope. Third-party subscriptions, hosting and ongoing support should be listed separately in your proposal.</p></section>;}
function Services(){return <><Intro label="OUR SERVICES" title="Technology that fits your business." text="From a clear company website to a custom workflow, we build around the people who will use it."/><section className="container service-list">{services.map((s,i)=><article key={s.title} className="service-detail"><div className="service-icon"><s.icon size={28}/></div><div><span className="label">0{i+1}</span><h2>{s.title}</h2><p>{s.detail}</p><ul className="feature-list">{s.items.map(item=><li key={item}><Check size={16}/>{item}</li>)}</ul></div><a className="text-link" href={'/contact/?service='+encodeURIComponent(s.title)}>Discuss this service <ArrowUpRight size={16}/></a></article>)}</section><Process/><CTA/></>;}
function Projects(){return <><Intro label="SELECTED WORK" title="Ideas made useful." text="Our current platforms show how we connect practical technology with real needs."/><section className="container project-feature"><a className="project-visual" href={bridge} target="_blank" rel="noopener noreferrer" aria-label="Visit SmartBridge FET (opens in a new tab)"><GraduationCap size={44}/><span>SMARTBRIDGE FET</span><h3>Learn.<br/>Prepare.<br/>Move forward.</h3><div className="visual-chips"><span>Study resources</span><span>Tutoring</span><span>Application support</span></div><span className="visual-visit">Visit the live platform ↗</span></a><div className="project-description"><span className="status">Live pilot</span><h2><a href={bridge} target="_blank" rel="noopener noreferrer">SmartBridge FET <ArrowUpRight size={24}/></a></h2><p>A learning platform for South African Grade 10–12 learners, operated by TECH AND GUARD (Pty) Ltd.</p><p>It brings study resources, tutoring and university-application support into one platform. Its school counsellor workspace helps authorised staff follow learner applications after sharing is approved.</p><ul className="feature-list"><li><Check size={16}/>Learner, parent and tutor experiences</li><li><Check size={16}/>Study and application tools</li><li><Check size={16}/>Counsellor sharing controls</li></ul><a className="button primary" href={bridge} target="_blank" rel="noopener noreferrer">Visit SmartBridge FET <ArrowUpRight size={18}/></a></div></section><section className="container project-secondary"><figure className="commerce-art"><ShoppingBag size={100} aria-hidden="true"/><figcaption>Tech & Guard product enquiries</figcaption></figure><div><span className="label">COMMERCE</span><h2>Tech & Guard Store</h2><p>Our independent storefront includes a product catalogue and tools for reviewing imports. Browse our supplied catalogue and request confirmation of stock and delivery. Online checkout is not yet active.</p></div><a className="text-link" href="/store/">Explore the store <ArrowRight size={18}/></a></section><CTA/><section className="container section work-proof" aria-labelledby="work-proof-title">
 <div className="section-heading"><h2 id="work-proof-title">How we build</h2></div>
 <div className="service-grid">
  <article className="service"><h3>SmartBridge FET</h3>
   <p>We brought study resources, tutoring and application support together for South African learners. The pilot gives learners a place to work through those steps and authorised counsellors a workspace for shared applications.</p>
   <a className="text-link" href={bridge} target="_blank" rel="noopener noreferrer">Explore the pilot</a>
  </article>
  <article className="service"><h3>Tech &amp; GUARD Store</h3>
   <p>We built an independent catalogue for products that need availability and delivery confirmation. Shoppers can browse by category, build a basket and start an enquiry without an account. Staff manage the catalogue from Admin.</p>
   <a className="text-link" href="/store/">Explore the storefront</a>
  </article>
 </div>
</section></>;}
function About(){return <><Intro label="ABOUT TECH & GUARD" title="Practical technology. Thoughtful execution." text="A South African technology company connecting business needs with useful digital solutions."/><section className="container about-layout"><div><h2>Built around people.</h2><p>TECH AND GUARD (Pty) Ltd works on websites, online commerce and custom web applications for businesses, organisations and entrepreneurs.</p><p>Our approach starts with understanding the problem. We bring design and development together to create clear experiences, then plan how to maintain and improve them.</p><a className="text-link" href="/services/">See how we can help <ArrowRight size={18}/></a></div><aside className="company-card"><Layers3 size={30}/><h3>Company details</h3><dl><dt>Registered name</dt><dd>TECH AND GUARD (Pty) Ltd</dd><dt>Registration number</dt><dd>2026/155090/07</dd><dt>Registered office</dt><dd>6 Marais Road, Stellenbosch<br/>Western Cape, 7600</dd></dl></aside></section><section className="container principles">{[['Clear','Simple language and straightforward navigation.'],['Practical','Solutions shaped around what people need to do.'],['Evolving','Room to improve as your business develops.']].map(([title,text])=><div key={title}><h3>{title}</h3><p>{text}</p></div>)}</section><CTA/></>;}
function Contact(){
 const initialTopic=new URLSearchParams(window.location.search).get('service')||'';
 return <><Intro label="CONTACT" title="Tell us what you need." text="Ask about a business website, an online store, or a workflow you want to improve."/>
 <section className="container contact-layout">
  <aside><h2>Talk to Tech &amp; GUARD</h2><p>Share what you’re trying to achieve, any deadline, and what you already have. We’ll review your brief and reply with the next step.</p>
   <a className="contact-email" href="mailto:aneleq@techandguard.co.za">aneleq@techandguard.co.za</a>
   <p>Stellenbosch, South Africa</p><a className="text-link" href="/store/">Looking for a product? Visit the Store</a>
  </aside>
  <EnquiryForm kind="service" topics={services.map(service=>service.title)} initialTopic={initialTopic}/>
 </section></>;
}
function Home() {
 return (
  <div className="company-home">
   <section className="company-hero" aria-labelledby="company-home-title">
    <div className="container company-hero-layout">
     <div className="company-hero-copy">
      <p className="company-kicker">Digital solutions · South Africa</p>
      <h1 id="company-home-title">Better websites.<br/> Better ways to work.</h1>
      <p className="company-hero-summary">
       We design and build business websites, online stores and custom web applications from Stellenbosch.
      </p>
      <div className="company-actions">
       <a className="button company-button" href="/contact/">
        Start a project <ArrowUpRight size={19} aria-hidden="true"/>
       </a>
       <a className="company-link" href="#company-work">
        See our work <ArrowRight size={18} aria-hidden="true"/>
       </a>
      </div>
     </div>
     <figure className="company-hero-image">
      <img src="/images/company-collaboration-1280.webp"
       srcSet="/images/company-collaboration-640.webp 640w, /images/company-collaboration-1280.webp 1280w"
       sizes="(max-width: 760px) 92vw, (max-width: 1200px) 47vw, 570px"
       alt="Two colleagues reviewing work together at a laptop" width="1280" height="720"
       fetchPriority="high" decoding="async"/>
     </figure>
    </div>
   </section>
   <section id="company-work" className="container company-section" aria-labelledby="company-work-title">
    <div className="company-section-heading">
     <h2 id="company-work-title">See what we build</h2>
     <a className="company-link" href="/projects/">Explore projects <ArrowRight size={18} aria-hidden="true"/></a>
    </div>
    <div className="company-projects">
     <article className="company-project">
      <div className="company-project-art company-learning-art" aria-hidden="true">
       <GraduationCap size={82} strokeWidth={1.15}/>
      </div>
      <div className="company-project-copy">
       <p className="company-kicker">Education platform · Live pilot</p>
       <h3>SmartBridge FET</h3>
       <p>Study resources, tutoring and university application support for South African Grade 10–12 learners.</p>
       <a className="company-link" href={bridge} target="_blank" rel="noopener noreferrer" aria-label="Explore SmartBridge FET (opens in a new tab)">
        Explore SmartBridge FET <ArrowUpRight size={18} aria-hidden="true"/>
       </a>
      </div>
     </article>
     <article className="company-project">
      <div className="company-project-art">
       <img src="/images/store-editorial.webp" alt="" loading="lazy" decoding="async" width="740" height="260"/>
      </div>
      <div className="company-project-copy">
       <p className="company-kicker">Online commerce</p>
       <h3>Tech &amp; GUARD Store</h3>
       <p>An independent catalogue where shoppers can compare technology essentials and send a product enquiry without an account.</p>
       <a className="company-link" href="/store/">Browse the Store <ArrowRight size={18} aria-hidden="true"/></a>
      </div>
     </article>
    </div>
   </section>
   <section className="company-services" aria-labelledby="company-services-title">
    <div className="container company-services-layout">
     <div className="company-services-intro">
      <h2 id="company-services-title">What we can build for you</h2>
      <p>From your first website to tools that support everyday operations.</p>
      <a className="company-link" href="/services/">View all services <ArrowRight size={18} aria-hidden="true"/></a>
     </div>
     <ul className="company-service-list">
      {services.map(service => (
       <li key={service.title}>
        <a href={'/contact/?service='+encodeURIComponent(service.title)}>
         <span className="company-service-icon"><service.icon size={23} aria-hidden="true"/></span>
         <span><strong>{service.title}</strong><span>{service.summary}</span></span>
         <ArrowUpRight size={19} aria-hidden="true"/>
        </a>
       </li>
      ))}
     </ul>
    </div>
   </section>
   <section className="container company-section" aria-labelledby="company-contact-title">
    <div className="company-contact">
     <div>
      <h2 id="company-contact-title">Tell us what you’re working on.</h2>
      <p>Share what you want customers or staff to be able to do. We’ll work with you to define the scope and prepare a proposal.</p>
     </div>
     <a className="button company-button" href="/contact/">
      Start a conversation <ArrowUpRight size={19} aria-hidden="true"/>
     </a>
    </div>
   </section>
  </div>
 );
}
function App(){const [open,setOpen]=useState(false);const menuButton=useRef<HTMLButtonElement>(null);useEffect(()=>{if(!open)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);menuButton.current?.focus();}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[open]);if(path==='/admin')return <><a className="skip" href="#main" onClick={event=>{const main=document.getElementById('main');if(main){event.preventDefault();main.focus();}}}>Skip to content</a><div><Suspense fallback={<p className="container" role="status">Loading administration…</p>}><StoreAdmin/></Suspense></div></>;return <><a className="skip" href="#main">Skip to content</a><header className="site-header"><div className="container header-inner"><a className="brand" href="/"><span className="brand-mark">T<span>&</span>G</span><span>TECH &amp; GUARD<small>DIGITAL SOLUTIONS</small></span></a><button ref={menuButton} className="menu-toggle" aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open} aria-controls="site-nav" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button><nav onClick={()=>setOpen(false)} id="site-nav" className={open?'nav open':'nav'} aria-label="Main navigation">{navigation.map(([label,url])=><a key={url} href={url} aria-current={path===(url.replace(/\/$/,'')||'/')?'page':undefined}>{label}</a>)}</nav></div></header><main id="main">{path==='/'?<Home/>:path==='/services'?<Services/>:path==='/projects'?<Projects/>:path==='/about'?<About/>:path==='/store'?<Store/>:path==='/contact'?<Contact/>:path==='/account'?<Suspense fallback={<p className="container" role="status">Loading your account…</p>}><AccountPage/></Suspense>:path==='/admin'?<Suspense fallback={<p className="container" role="status">Loading administration…</p>}><StoreAdmin/></Suspense>:<Intro label="PAGE NOT FOUND" title="Let’s get you back on track." text="Use the navigation above to find the page you need."/>}</main><nav className="mobile-bottom-nav" aria-label="Mobile quick navigation"><a href="/" aria-current={path==='/'?'page':undefined}><Globe2 size={21}/>Home</a><a href="/services/" aria-current={path==='/services'?'page':undefined}><Layers3 size={21}/>Services</a><a href="/projects/" aria-current={path==='/projects'?'page':undefined}><GraduationCap size={21}/>Projects</a><a href="/store/" aria-current={path==='/store'?'page':undefined}><ShoppingBag size={21}/>Store</a><a href="/contact/" aria-current={path==='/contact'?'page':undefined}><Mail size={21}/>Contact</a></nav><footer><div className="container footer-grid"><div><a className="brand" href="/"><span className="brand-mark">T<span>&</span>G</span><span>TECH &amp; GUARD<small>DIGITAL SOLUTIONS</small></span></a><p>Practical digital solutions.<br/>Stellenbosch, South Africa.</p></div><div><h4>Explore</h4>{navigation.slice(1).map(([label,url])=><a key={url} href={url}>{label}</a>)}</div><div><h4>Get in touch</h4><a href="mailto:aneleq@techandguard.co.za">aneleq@techandguard.co.za</a><a href={bridge} target="_blank" rel="noopener noreferrer">SmartBridge FET <ArrowUpRight size={14}/></a><a href="/admin/">Store administration</a></div></div><div className="container footer-bottom">© {new Date().getFullYear()} TECH AND GUARD (Pty) Ltd. <span>Registration 2026/155090/07</span></div></footer></>;}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
