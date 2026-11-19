import {ArrowRight} from 'lucide-react';
import {storeBriefLink,storeThemes} from './store-themes';
import './store-themes.css';

export function StoreThemes() {
 return <section className="container store-theme-gallery" aria-label="Store theme options">
  {storeThemes.map(theme=><article className="store-theme-card" key={theme.id}>
   <figure>
    <img src={theme.image} alt="" width={720} height={480}/>
    <figcaption>Illustration of the {theme.name.toLowerCase()} style</figcaption>
   </figure>
   <div className="store-theme-copy">
    <h2>{theme.name}</h2>
    <p>{theme.description}</p>
    <a className="button primary" href={storeBriefLink(theme.id)}>Choose {theme.name} <ArrowRight size={18} aria-hidden="true"/></a>
   </div>
  </article>)}
  <div className="store-theme-guidance">
   <a className="text-link" href={storeBriefLink('recommend')}>Help me choose a theme <ArrowRight size={18} aria-hidden="true"/></a>
  </div>
 </section>;
}
