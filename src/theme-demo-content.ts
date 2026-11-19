import {designThemes, type DesignTheme} from './store-themes.ts';

export type DemoPage = {id:string; label:string; heading:string; intro:string};
const home = {id:'', label:'Home',heading:'',intro:''};
const basket = {id:'basket',label:'Basket',heading:'Your basket',intro:'Review your selections before asking about availability.'};

export const demoPages:Record<DesignTheme['id'], readonly DemoPage[]> = {
 'modern-corporate':[
  home,
  {id:'services',label:'Services',heading:'Advisory services',intro:'Practical support for the decisions that shape your business.'},
  {id:'about',label:'About',heading:'Meet Meridian',intro:'Strategy and operations advice for growing South African businesses.'},
  {id:'contact',label:'Contact',heading:'Let’s talk about your next step',intro:'See how a client enquiry would look on this website.'},
 ],
 'warm-editorial':[
  home,
  {id:'collection',label:'Collection',heading:'The everyday collection',intro:'Quiet, useful objects for the rituals that make a home.'},
  {id:'product',label:'Product',heading:'Hand-glazed stoneware bowl',intro:'A softly curved bowl finished in a warm, natural glaze.'},
  basket,
 ],
 'clean-premium-retail':[
  home,
  {id:'catalogue',label:'Catalogue',heading:'Shop tech essentials',intro:'Browse a sample catalogue by category.'},
  {id:'product',label:'Product',heading:'Everyday USB-C charger',intro:'A compact charger for your work bag or desk.'},
  basket,
 ],
 'product-showcase':[
  home,
  {id:'details',label:'Product',heading:'Studio Wireless',intro:'A closer look at the materials, fit and controls.'},
  {id:'specifications',label:'Specs',heading:'What’s inside',intro:'Compare the sample specifications before choosing a finish.'},
  basket,
 ],
 'bold-studio':[
  {id:'',label:'Overview',heading:'',intro:''},
  {id:'projects',label:'Projects',heading:'Studio projects',intro:'Follow active work from first draft to sign-off.'},
  {id:'approvals',label:'Approvals',heading:'Review queue',intro:'Open a sample project and try marking it approved.'},
  {id:'approved',label:'Approved',heading:'Approved work',intro:'Projects appear here after they’ve been approved in the demo.'},
 ],
};

export function themeDemoUrl(themeId:DesignTheme['id'], page='') {
 return '/design-themes/'+themeId+'/'+(page?page+'/':'');
}

export function resolveThemeDemo(path:string) {
 const [,section,id,page='',...rest]=path.split('/');
 if(section!=='design-themes'||!id||rest.length) return;
 const theme=designThemes.find(item=>item.id===id);
 const current=theme&&demoPages[theme.id].find(item=>item.id===page);
 if(theme&&current) return {theme,current};
}

type DemoItem = {name:string; detail:string; category:string; price:number};
export const demoItems:Partial<Record<DesignTheme['id'], readonly DemoItem[]>> = {
 'warm-editorial':[
  {name:'Hand-glazed stoneware bowl',detail:'Warm glaze, finished by hand.',category:'Tableware',price:480},
  {name:'Wide serving platter',detail:'A gently curved rim for sharing plates.',category:'Serving pieces',price:720},
  {name:'Small sculptural vessel',detail:'A matte finish in soft limestone.',category:'Decor',price:540},
 ],
 'clean-premium-retail':[
  {name:'Everyday USB-C charger',detail:'Compact 30 W power for everyday devices.',category:'Power',price:549},
  {name:'Wireless headphones',detail:'Over-ear fit and simple wireless pairing.',category:'Audio',price:899},
  {name:'Foldable laptop stand',detail:'An adjustable lift for a clearer desk.',category:'Desk accessories',price:479},
 ],
 'product-showcase':[
  {name:'Studio Wireless',detail:'Closed-back headphones with soft ear cushions.',category:'Audio',price:2890},
 ],
};

export const demoProjects = ['Spring campaign','Studio portfolio','Social launch kit'] as const;

export const demoPictures = [
 {path:'/images/themes/corporate.webp',label:'Business website'},
 {path:'/images/themes/editorial.webp',label:'Stoneware collection'},
 {path:'/images/store-editorial.webp',label:'Everyday tech essentials'},
 {path:'/images/themes/audio.webp',label:'Studio headphones'},
] as const;

export const demoAccents = [
 {id:'signature',label:'Theme default'},{id:'forest',label:'Forest'},{id:'clay',label:'Clay'},{id:'navy',label:'Navy'},
] as const;
