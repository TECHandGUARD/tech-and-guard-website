import {ArrowLeft, ArrowRight, Play} from 'lucide-react';
import {blogHome, lindiFilm, productGuide} from './blog-content';
import {LindiVideo} from './LindiVideo';
import {onlineStoreService} from './store-themes';

const storeQuote = '/contact/?service=' + encodeURIComponent(onlineStoreService);

function BackToBlog() {
  return <a className="journal-back" href={blogHome.path + '/'}><ArrowLeft size={16}/> Marketing &amp; Blog</a>;
}

function BlogHome() {
  return (
    <div className="journal container">
      <header className="journal-masthead">
        <h1>{blogHome.title}</h1>
        <p>Films and field notes for small businesses selling online in South Africa.</p>
      </header>
      <article className="journal-cover" aria-labelledby="cover-title">
        <div className="journal-cover-copy">
          <p className="journal-kicker">Campaign film · 1 minute</p>
          <h2 id="cover-title"><a href={lindiFilm.path + '/'}>{lindiFilm.title}</a></h2>
          <p>At her kitchen table, Lindi packs each reed diffuser by hand. What would it take to give those bottles a shop of their own?</p>
          <a className="journal-play" href={lindiFilm.path + '/'}><Play size={16} fill="currentColor"/> Watch the film</a>
        </div>
        <img className="journal-cover-image" src={lindiFilm.image} alt="Lindi wrapping a reed diffuser at her kitchen table." width="864" height="676"/>
      </article>
      <section className="journal-guides" aria-labelledby="guides-title">
        <h2 id="guides-title">Practical guides</h2>
        <article className="journal-guide-card">
          <img src={productGuide.image} alt="A fragrance shop displayed on a laptop and phone." width="864" height="624" loading="lazy"/>
          <div>
            <p className="journal-kicker">Store design</p>
            <h3><a href={productGuide.path + '/'}>{productGuide.title}</a></h3>
            <p>{productGuide.description}</p>
            <a className="journal-link" href={productGuide.path + '/'}>Read the guide <ArrowRight size={17}/></a>
          </div>
        </article>
      </section>
    </div>
  );
}

function FilmArticle() {
  return (
    <article className="journal container">
      <BackToBlog/>
      <div className="journal-film-detail">
        <header>
          <p className="journal-kicker">Campaign film · 1 minute</p>
          <h1 id="film-title">{lindiFilm.title}</h1>
          <p className="journal-intro">From her kitchen to an online shop.</p>
        </header>
        <LindiVideo labelledBy="film-title"/>
        <div className="journal-film-notes">
          <p>Every bottle on Lindi’s table is ready to go. Finding customers a way to browse her fragrances, choose a scent and place an order is a different kind of work.</p>
          <p>Our short film imagines a storefront built around the products she makes. Watch for the moment her kitchen shelf becomes a catalogue you can browse on a phone.</p>
          <a className="journal-link" href={storeQuote}>Discuss your online store <ArrowRight size={17}/></a>
        </div>
      </div>
      <aside className="journal-related"><span>Related guide</span><a href={productGuide.path + '/'}>{productGuide.title} <ArrowRight size={18}/></a></aside>
    </article>
  );
}

function ProductPageGuide() {
  return (
    <article className="journal container">
      <BackToBlog/>
      <div className="journal-reading">
        <header>
          <p className="journal-kicker">Practical guide · Store design</p>
          <h1>{productGuide.title}</h1>
          <p className="journal-intro">If your last three WhatsApp customers all asked “How big is it?”, you already have the first line of your product page.</p>
        </header>
        <p>Open a recent sales conversation. Which questions did someone need answered before they were ready to order? Pick one product and use those questions to write its page.</p>
        <h2>Give the product a name someone can recognise</h2>
        <p>“Amber reed diffuser, 100 ml” tells a shopper more than “Signature No. 1” on its own. Under the name, show the price in rand, what comes in the box and which sizes or scents they can choose.</p>
        <h2>Show what will arrive</h2>
        <p>Take one clear photo of the full product and another that shows its size or an important detail. For a diffuser, show the bottle beside the reeds. For a shirt, show the fit and the fabric up close. Let shoppers see the version they are ordering.</p>
        <h2>Answer the delivery question</h2>
        <p>Say where you deliver, whether collection is available, and when someone can expect dispatch. If the delivery fee depends on the address, explain when they will see it. Use the terms you can honour for that product.</p>
        <h2>Give customers one clear next step</h2>
        <p>If you take orders on WhatsApp, label the button “Order on WhatsApp” and prefill the product name. If your shop supports checkout, try adding the product to the basket on your phone. Can you select the size, see the price and continue comfortably with one hand?</p>
        <p>Before posting on Instagram or Facebook, send the product link to someone who has never bought from you. Ask them what they would receive, what it costs and how they would order. Their first unanswered question is your next edit.</p>
        <a className="journal-link" href={storeQuote}>Talk to Tech &amp; Guard about your store <ArrowRight size={17}/></a>
      </div>
      <aside className="journal-related"><span>Campaign film</span><a href={lindiFilm.path + '/'}>Watch Lindi’s story <ArrowRight size={18}/></a></aside>
    </article>
  );
}

export function Blog({path}: {path: string}) {
  if (path === lindiFilm.path) return <FilmArticle/>;
  if (path === productGuide.path) return <ProductPageGuide/>;
  return <BlogHome/>;
}
