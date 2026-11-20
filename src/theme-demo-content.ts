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
  {id:'specifications',label:'Specs',heading:'What’s inside',intro:'See the materials, connections and accessories behind the flagship design.'},
  {id:'catalogue',label:'Collection',heading:'The listening collection',intro:'Explore headphones, speakers and accessories for your own listening setup.'},
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

export const advisoryOffers = [
 {name:'Strategy workshop',group:'Strategy',detail:'Get the leadership team aligned on priorities and decisions for the next quarter.'},
 {name:'Expansion decision',group:'Strategy',detail:'Compare locations, capacity and trade-offs before committing to a new market.'},
 {name:'Commercial positioning',group:'Strategy',detail:'Clarify your audience, offer and message before planning the next campaign.'},
 {name:'Annual operating plan',group:'Strategy',detail:'Turn the year’s goals into milestones, owners and a review schedule.'},
 {name:'Process review',group:'Operations',detail:'Follow a job from first enquiry to completion and find where it keeps getting stuck.'},
 {name:'Team handover design',group:'Operations',detail:'Make ownership and next steps clear when work moves between teams.'},
 {name:'Service delivery review',group:'Operations',detail:'Identify where customer expectations and the team’s capacity have drifted apart.'},
 {name:'Systems selection',group:'Operations',detail:'Compare the tools that fit your actual workflow before buying another subscription.'},
 {name:'Customer journey review',group:'Growth',detail:'See where prospects lose momentum and what would make it easier to act.'},
 {name:'New offer validation',group:'Growth',detail:'Define what to learn before investing in a new product or service.'},
 {name:'Performance scorecard',group:'Growth',detail:'Agree the few measures that should guide each monthly decision.'},
 {name:'90-day implementation plan',group:'Growth',detail:'Leave with sequencing, owners and review dates for the work that matters first.'},
] as const;

export const demoProjects = [
 {name:'Spring campaign',type:'Campaign',detail:'Review the portrait crop and the final headline before the campaign goes to print.'},
 {name:'Studio portfolio',type:'Website',detail:'The published case study layout sets the direction for the next portfolio entries.'},
 {name:'Social launch kit',type:'Social',detail:'Choose the lead post and check the cover artwork in the vertical format.'},
 {name:'Guesthouse identity',type:'Brand',detail:'Compare the quieter wordmark with the alternate treatment for signage.'},
 {name:'Skincare launch',type:'Campaign',detail:'Approve the first product story and confirm how the range appears together.'},
 {name:'Retail lookbook',type:'Editorial',detail:'Sequence the product photography and check that each spread has one clear focus.'},
 {name:'Coffee packaging',type:'Packaging',detail:'Review the sample bag artwork and the placement of the roast label.'},
 {name:'Listening room event',type:'Campaign',detail:'Check the invitation date, venue and final artwork across phone and print formats.'},
 {name:'Interior studio website',type:'Website',detail:'Choose which completed project should introduce the studio on the homepage.'},
 {name:'Member welcome pack',type:'Editorial',detail:'Confirm the order of documents and the language in the opening note.'},
 {name:'Wayfinding for open day',type:'Brand',detail:'Review the directional information and check it remains legible at a distance.'},
 {name:'Holiday gift edit',type:'Retail',detail:'Make the hero product clear and review the alternate crop for mobile.'},
] as const;

export const demoPictures = [
 {path:'/images/themes/advisory-team.webp',label:'Advisory team'},
 {path:'/images/themes/corporate.webp',label:'Business website'},
 {path:'/images/themes/spa-ritual.webp',label:'Spa ritual'},
 {path:'/images/themes/editorial.webp',label:'Stoneware collection'},
 {path:'/images/themes/retail-workspace.webp',label:'Everyday desk and travel kit'},
 {path:'/images/store-editorial.webp',label:'Everyday tech essentials'},
 {path:'/images/themes/audio.webp',label:'Studio headphones'},
 {path:'/images/themes/studio-review.webp',label:'Creative studio'},
] as const;

const responsiveDemoPhotos:Record<string,number> = {
 'advisory-team':1440,
 'retail-workspace':1440,
 'studio-review':1380,
 'spa-ritual':1440,
 'audio':1000,
};

export function demoPhotoSrcSet(path:string) {
 const name=path.split('/').pop()?.replace('.webp','')??'';
 const width=responsiveDemoPhotos[name];
 return width?path.replace('.webp','-640.webp')+' 640w, '+path+' '+width+'w':undefined;
}

export const demoAccents = [
 {id:'signature',label:'Theme default'},{id:'forest',label:'Forest'},{id:'clay',label:'Clay'},{id:'navy',label:'Navy'},
] as const;
