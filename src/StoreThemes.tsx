import {designThemes, themeBriefLink, themeServices} from './store-themes';
import {demoPages, demoPhotoSrcSet, themeDemoUrl} from './theme-demo-content';
import './store-themes.css';

export function StoreThemes({service}:{service?:string}) {
 return <div className="container design-gallery">
  {themeServices.filter(group=>!service||group.name===service).map(group=><section className="design-group" id={group.anchor} key={group.name} aria-labelledby={group.anchor+'-title'}>
   <div className="design-group-heading">
    <h2 id={group.anchor+'-title'}>{group.name}</h2>
    <a className="text-link" href={themeBriefLink(group.name,'recommend')}>Help me choose</a>
   </div>
   <div className="store-theme-gallery">
    {designThemes.filter(theme=>theme.service===group.name).map(theme=>{
     const demoUrl=themeDemoUrl(theme.id);
     return <article className="store-theme-card" key={theme.id}>
      <a className={`theme-cover demo-${theme.id}`} href={demoUrl} aria-label={'Preview '+theme.name}>
       {theme.image&&<img src={theme.image} srcSet={demoPhotoSrcSet(theme.image)} sizes="(max-width: 640px) 92vw, (max-width: 1000px) 50vw, 440px" alt="" width={640} height={430} loading="lazy"/>}
       <span>{theme.brand}</span><p>{theme.headline}</p>
      </a>
      <div className="store-theme-copy">
       <h3>{theme.name}</h3>
       <p>{theme.description}</p>
       <ul className="theme-page-links" aria-label={theme.name+' pages'}>
        {demoPages[theme.id].map(page=><li key={page.id}><a href={themeDemoUrl(theme.id,page.id)}>{page.label}</a></li>)}
       </ul>
       <div className="theme-card-actions">
        <a className="button primary" href={demoUrl} aria-label={'Open interactive demo for '+theme.name}>Open interactive demo</a>
        <a className="text-link" href={themeBriefLink(theme.service,theme.id)}>Choose {theme.name}</a>
       </div>
      </div>
     </article>;
    })}
   </div>
  </section>)}
 </div>;
}
