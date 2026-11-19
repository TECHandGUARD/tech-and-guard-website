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
  {id:'collection',label:'Collection',heading:'Take the ritual home',intro:'Shop the oil, balm and body-care set that bring the studio ritual into an ordinary evening.'},
  {id:'product',label:'Product',heading:'Evening face oil',intro:'A light final step for a quiet skincare routine.'},
  {id:'treatments',label:'Treatments',heading:'An hour to slow down',intro:'Explore the studio menu and try selecting a sample appointment.'},
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

type DemoItem = {name:string; detail:string; category:string; price:number; use:string; image?:string};
export const demoItems:Partial<Record<DesignTheme['id'], readonly DemoItem[]>> = {
 'warm-editorial':[
  {name:'Evening face oil',detail:'A silky oil for the last step of your evening routine.',category:'Face',price:690,use:'Warm a few drops between your fingertips and press gently onto clean skin.',image:'/images/themes/spa-ritual.webp'},
  {name:'Silk cleansing balm',detail:'A soft balm that turns into a milk when rinsed.',category:'Cleansing',price:480,use:'Massage onto dry skin, add water and rinse before applying your moisturiser.'},
  {name:'Body ritual set',detail:'A body oil and a soft cloth, packed together for gifting.',category:'Body',price:1140,use:'Use the cloth in a warm shower and apply the oil to damp skin afterwards.'},
 ],
 'clean-premium-retail':[
  {name:'Everyday USB-C charger',detail:'Compact 30 W power for everyday devices.',category:'Power',price:549,use:'Keep a compact spare at your desk or in your work bag.'},
  {name:'Wireless headphones',detail:'Over-ear fit and simple wireless pairing.',category:'Audio',price:899,use:'Pair them with a laptop for calls or your phone for the commute.',image:'/images/themes/audio.webp'},
  {name:'Foldable laptop stand',detail:'An adjustable lift for a clearer desk.',category:'Desk accessories',price:479,use:'Raise your laptop to a comfortable height and fold the stand away when you pack up.'},
 ],
 'product-showcase':[
  {name:'Studio Wireless',detail:'Closed-back headphones with soft ear cushions.',category:'Audio',price:2890,use:'Switch from wireless listening on the move to a wired connection at your desk.',image:'/images/themes/audio.webp'},
 ],
};

export const demoStories = {
 'modern-corporate':{heading:'When growth changes the way you work',text:'A growing team can outpace the processes that got it here. Meridian helps business owners decide what to simplify, where to invest and who should own the next step.',action:'Meet Meridian',page:'about'},
 'warm-editorial':{heading:'From the treatment room to your evening routine',text:'At Maison Serein, a treatment starts with a conversation about how your skin feels and what you already use. The home collection follows the same approach. Start with the essentials, then add only the steps you enjoy.',action:'Explore the studio treatments',page:'treatments'},
 'clean-premium-retail':{heading:'A working day with more than one address',text:'Start at home, take a call on the way, then set up wherever you land. Common Ground stocks compact essentials you can use through the day and pack away when the work is done.',action:'Shop the catalogue',page:'catalogue'},
 'product-showcase':{heading:'From the first track to the last train',text:'Form & Frequency built this collection around one pair of headphones, with a soft over-ear fit and the option to plug in at your desk. Explore how the details change the way you listen.',action:'Explore the specifications',page:'specifications'},
 'bold-studio':{heading:'See what is ready for the client',text:'Studio North brings creative work and sign-off into one workspace. Start with a project, open the review queue and see what moves into approved work.',action:'Open the review queue',page:'approvals'},
} as const;

export const spaTreatments = [
 {name:'Signature facial',duration:'60 minutes',price:920,detail:'A consultation, gentle cleanse, facial massage and a simple routine to take home.'},
 {name:'Rest and restore',duration:'45 minutes',price:750,detail:'A slow facial massage and a warm compress, with time to settle in.'},
] as const;

export const demoProjects = ['Spring campaign','Studio portfolio','Social launch kit'] as const;

export const demoPictures = [
 {path:'/images/themes/corporate.webp',label:'Business website'},
 {path:'/images/themes/spa-ritual.webp',label:'Spa ritual'},
 {path:'/images/themes/editorial.webp',label:'Stoneware collection'},
 {path:'/images/store-editorial.webp',label:'Everyday tech essentials'},
 {path:'/images/themes/audio.webp',label:'Studio headphones'},
] as const;

export const demoAccents = [
 {id:'signature',label:'Theme default'},{id:'forest',label:'Forest'},{id:'clay',label:'Clay'},{id:'navy',label:'Navy'},
] as const;
