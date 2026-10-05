import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {
  ArrowRight,
  ArrowUpRight,
  Cloud,
  Code2,
  Globe2,
  Headset,
  Layers3,
  Menu,
  PanelsTopLeft,
  Send,
  ShieldCheck,
  ShoppingBag,
  X,
} from 'lucide-react';
import './styles.css';

type NavItem = {
  label: string;
  href: string;
};

type Service = {
  icon: typeof Globe2;
  title: string;
  detail: string;
  tags: string[];
};

const navItems: NavItem[] = [
  {label: 'Work', href: '#work'},
  {label: 'Services', href: '#services'},
  {label: 'Process', href: '#process'},
  {label: 'About', href: '#about'},
  {label: 'Contact', href: '#contact'},
];

const services: Service[] = [
  {
    icon: Globe2,
    title: 'Premium web experiences',
    detail: 'Strategic business websites designed to sharpen trust, clarity and conversion from the very first scroll.',
    tags: ['Brand strategy', 'UX design', 'Performance']
  },
  {
    icon: ShoppingBag,
    title: 'E-commerce systems',
    detail: 'Conversion-driven storefronts and digital commerce experiences built for clarity, confidence and measurable growth.',
    tags: ['Shop UX', 'Checkout flow', 'Catalog design']
  },
  {
    icon: PanelsTopLeft,
    title: 'Custom platforms',
    detail: 'Purpose-built digital tools for teams that need more than off-the-shelf software and better control over outcomes.',
    tags: ['Dashboards', 'Portals', 'Operations']
  },
  {
    icon: Cloud,
    title: 'Cloud & support',
    detail: 'Deployment, maintenance and performance tuning that keeps your digital presence stable and trusted over time.',
    tags: ['Hosting', 'Monitoring', 'Updates']
  },
  {
    icon: Headset,
    title: 'Technology consulting',
    detail: 'Clear advice on systems, technology decisions and digital investments aligned to business reality.',
    tags: ['Planning', 'Systems', 'Roadmaps']
  },
];

const stats = [
  {value: '5+', label: 'delivery disciplines'},
  {value: '100%', label: 'human-centred design'},
  {value: '24/7', label: 'support mindset'},
];

const processSteps = [
  'Discover opportunities',
  'Design with purpose',
  'Build with precision',
  'Deploy with confidence',
  'Support the next stage',
];

const workSamples = [
  {id: '01', title: 'Executive platform', text: 'A business-facing digital presence that reframed complex services into a confident, premium experience.'},
  {id: '02', title: 'E-commerce concept', text: 'A product-led storefront pattern with clarity, trust cues and minimal friction across purchase journeys.'},
  {id: '03', title: 'Operations dashboard', text: 'A streamlined internal tool for visibility, collaboration and decision-making across service delivery.'},
];

const trustPoints = [
  'Senior-level thinking and commercial clarity',
  'A premium visual language with measurable UX intent',
  'Thoughtful execution that balances brand and performance',
];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const copyBrief = async () => {
    const projectBrief = `Hello Tech & GUARD,\n\nMy name is: \nMy organisation: \nI need help with: \nProject details: \nPreferred contact: `;

    try {
      await navigator.clipboard.writeText(projectBrief);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>

      <div className="site-shell">
        <header className="site-header">
          <div className="container header-inner">
            <a className="brand" href="#top" onClick={closeMenu} aria-label="Tech and GUARD home">
              <span className="brand-mark">T</span>
              <span className="brand-text">
                <strong>Tech &amp; GUARD</strong>
              </span>
            </a>

            <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
              {navItems.map((item) => (
                <a key={item.href} href={item.href} onClick={closeMenu}>{item.label}</a>
              ))}
            </nav>

            <button
              type="button"
              className="menu-toggle"
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </header>

        <main id="main">
          <section id="top" className="hero">
            <div className="hero-glow" aria-hidden="true" />
            <div className="hero-grid" aria-hidden="true" />

            <div className="container hero-inner">
              <div className="hero-copy">
                <div className="eyebrow">
                  <span className="pulse" aria-hidden="true" />
                  Digital strategy. Business clarity. Premium execution.
                </div>

                <h1>
                  Technology built to feel as strong as your business looks.
                </h1>

                <p className="hero-lead">
                  We design and build digital experiences for ambitious organisations that want clarity,
                  confidence and performance without the noise.
                </p>

                <div className="hero-actions">
                  <a className="btn btn-primary" href="#contact">
                    Book a consultation
                    <ArrowRight size={18} />
                  </a>
                  <a className="btn btn-secondary" href="#work">
                    View our work
                  </a>
                </div>

                <div className="stat-row" aria-label="Business metrics">
                  {stats.map((stat) => (
                    <div key={stat.label} className="stat-box">
                      <strong>{stat.value}</strong>
                      <span>{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hero-panel" aria-label="Key service overview">
                <div className="panel-topbar">
                  <span className="dot dot-1" />
                  <span className="dot dot-2" />
                  <span className="dot dot-3" />
                </div>

                <div className="panel-body">
                  <div className="mini-label">Operating model</div>
                  <h2>Trust. Tech. Delivered.</h2>

                  <ul>
                    <li>
                      <ShieldCheck size={16} />
                      Strategy and digital clarity
                    </li>
                    <li>
                      <Code2 size={16} />
                      Premium web and platform build
                    </li>
                    <li>
                      <Layers3 size={16} />
                      Scalable support and maintenance
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="statement container">
            <span className="label">/ Our point of view</span>
            <p>
              Good technology does not distract from your business. It makes the complex feel simple,
              the experience feel premium and the next step feel obvious.
            </p>
          </section>

          <section id="services" className="section services">
            <div className="container">
              <div className="section-heading">
                <div>
                  <span className="label">01 / Expertise</span>
                  <h2>Technology shaped around your growth.</h2>
                </div>
                <a href="#contact" className="text-link">
                  Start a conversation
                  <ArrowUpRight size={16} />
                </a>
              </div>

              <div className="services-grid">
                {services.map((service) => {
                  const Icon = service.icon;

                  return (
                    <article className="service-card" key={service.title}>
                      <div className="icon-wrap">
                        <Icon size={22} />
                      </div>
                      <h3>{service.title}</h3>
                      <p>{service.detail}</p>
                      <div className="tag-list">
                        {service.tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section id="work" className="section work">
            <div className="container">
              <div className="section-heading">
                <div>
                  <span className="label">02 / Selected work</span>
                  <h2>From concept to confident execution.</h2>
                </div>
              </div>

              <div className="work-grid">
                {workSamples.map((sample) => (
                  <article className="work-card" key={sample.id}>
                    <div className="work-header">
                      <span>{sample.id}</span>
                      <ArrowUpRight size={16} />
                    </div>
                    <h3>{sample.title}</h3>
                    <p>{sample.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="process" className="section process">
            <div className="container">
              <div className="section-heading">
                <div>
                  <span className="label">03 / Approach</span>
                  <h2>Simple steps. Serious outcomes.</h2>
                </div>
              </div>

              <div className="process-grid">
                {processSteps.map((step, index) => (
                  <div className="process-step" key={step}>
                    <span>{`0${index + 1}`}</span>
                    <h3>{step}</h3>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="about" className="section about">
            <div className="container about-grid">
              <div>
                <span className="label">04 / About us</span>
                <h2>Technology with purpose.</h2>
              </div>

              <div className="about-copy">
                <p>
                  Tech &amp; GUARD exists to help organisations turn complexity into clarity. We combine
                  strategy, UX and software craftsmanship to build digital systems that are trustworthy,
                  usable and built for lasting value.
                </p>

                <ul className="trust-list">
                  {trustPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section id="contact" className="section contact">
            <div className="container contact-inner">
              <div className="contact-copy">
                <span className="label">05 / Get in touch</span>
                <h2>Have a problem worth solving?</h2>
                <p>
                  Start with a short conversation. We will help clarify the challenge, outcomes and the right
                  next step for your business.
                </p>
              </div>

              <div className="contact-card">
                <button type="button" className="copy-button" onClick={copyBrief}>
                  {copied ? 'Copied to clipboard' : 'Copy project brief'}
                  <Send size={16} />
                </button>
                <a className="btn btn-primary" href="mailto:hello@techandguard.com">
                  hello@techandguard.com
                  <ArrowUpRight size={16} />
                </a>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

export default App;






















































































































































































































































































































































































































































































 
