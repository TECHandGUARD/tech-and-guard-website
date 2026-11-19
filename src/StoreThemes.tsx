import {useState} from 'react';
import {designThemes, themeBriefLink, themeServices, type DesignTheme} from './store-themes';
import {themeDemoUrl} from './theme-demo-content';
import './store-themes.css';

const projects = [
 {name:'Spring campaign',status:'Needs review'},
 {name:'Studio portfolio',status:'Approved'},
 {name:'Social launch kit',status:'Needs review'},
];

const sectionCopy:Record<string,string> = {
 Advisory:'Get a second perspective on a big business decision.',
 Operations:'Build clearer processes for the work your team does every day.',
 'Growth planning':'Decide which opportunities to pursue and how to measure progress.',
 Tableware:'Hand-glazed bowls and mugs for a slower start to the day.',
 'Serving pieces':'Stoneware platters and trays for sharing a meal.',
 Decor:'Sculptural vessels and small objects in warm, natural finishes.',
 Power:'Compact chargers, braided cables and portable power.',
 Audio:'Wireless headphones and speakers for work and study.',
 'Desk accessories':'Laptop stands, sleeves and storage for an organised desk.',
 Sound:'Over-ear sound with a closed-back design for focused listening.',
 'Fit & finish':'Soft ear cushions, a padded headband and midnight-blue finishes.',
 Specifications:'Sample product details include wireless connectivity and USB-C charging.',
};

function DesignPreview({theme}:{theme:DesignTheme}) {
 const [active,setActive] = useState<string>(theme.sections[0]);
 return <details className="theme-demo">
  <summary>Open {theme.name} preview</summary>
  <div className={`demo-surface demo-${theme.id}`}>
   <div className="demo-brand">{theme.brand}</div>
   <div className="demo-hero">
    <h4>{theme.headline}</h4>
    {theme.image && <img src={theme.image} alt="" width={640} height={430} loading="lazy"/>}
   </div>
   <div className="demo-options" role="group" aria-label={theme.id==='bold-studio'?'Filter demo projects':'Explore example sections'}>
    {theme.sections.map(section=><button key={section} type="button" aria-pressed={active===section} onClick={()=>setActive(section)}>{section}</button>)}
   </div>
   <div className="demo-result" aria-live="polite">
    {theme.id==='bold-studio'?
     <ul>{projects.filter(project=>active==='All projects'||active===project.status).map(project=><li key={project.name}><strong>{project.name}</strong><span>{project.status}</span></li>)}</ul>:
     <p><strong>{active}</strong> <span>{sectionCopy[active]}</span></p>}
   </div>
  </div>
 </details>;
}

export function StoreThemes({service}:{service?:string}) {
 return <div className="container design-gallery">
  {themeServices.filter(group=>!service||group.name===service).map(group=><section className="design-group" id={group.anchor} key={group.name} aria-labelledby={group.anchor+'-title'}>
   <div className="design-group-heading">
    <h2 id={group.anchor+'-title'}>{group.name}</h2>
    <a className="text-link" href={themeBriefLink(group.name,'recommend')}>Help me choose</a>
   </div>
   <div className="store-theme-gallery">
    {designThemes.filter(theme=>theme.service===group.name).map(theme=><article className="store-theme-card" key={theme.id}>
     <div className={`theme-cover demo-${theme.id}`}>
      {theme.image&&<img src={theme.image} alt="" width={640} height={430} loading="lazy"/>}
      <span>{theme.brand}</span><p>{theme.headline}</p>
     </div>
     <div className="store-theme-copy">
      <h3>{theme.name}</h3>
      <p>{theme.description}</p>
      <div className="theme-card-actions">
       <a className="button primary" href={themeDemoUrl(theme.id)}>Explore {theme.name}</a>
       <a className="text-link" href={themeBriefLink(theme.service,theme.id)}>Choose {theme.name}</a>
      </div>
      <DesignPreview theme={theme}/>
     </div>
    </article>)}
   </div>
  </section>)}
 </div>;
}
