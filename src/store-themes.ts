export const businessWebsiteService = 'Business websites';
export const onlineStoreService = 'Independent online stores';
export const customApplicationService = 'Custom web applications';

export const themeServices = [
 {name:businessWebsiteService, anchor:'business-websites'},
 {name:onlineStoreService, anchor:'independent-online-stores'},
 {name:customApplicationService, anchor:'custom-web-applications'},
] as const;

export const designThemes = [
 {
  id:'modern-corporate', service:businessWebsiteService, name:'Modern Corporate',
  description:'A confident company website for professional firms that need to explain their services and turn interest into enquiries.',
  brand:'Meridian Advisory', headline:'Clarity for your next decision.', image:'/images/themes/corporate.webp',
  audience:'Strategy and operations advisory',
 },
 {
  id:'warm-editorial', service:onlineStoreService, name:'Warm Editorial',
  description:'A boutique spa and beauty shop that introduces in-studio treatments, then helps guests build a simple skincare ritual at home.',
  brand:'Maison Serein', headline:'Make time for the ritual.', image:'/images/themes/spa-ritual.webp',
  audience:'Skin studio and beauty shop',
 },
 {
  id:'clean-premium-retail', service:onlineStoreService, name:'Clean Premium Retail',
  description:'A bright catalogue that keeps categories and product information easy to scan.',
  brand:'Common Ground', headline:'Essentials for a better setup.', image:'/images/store-editorial.webp',
  audience:'Everyday tech and accessories',
 },
 {
  id:'product-showcase', service:onlineStoreService, name:'Product Showcase',
  description:'A focused launch storefront for a flagship product, a capsule collection or a limited release.',
  brand:'Form & Frequency', headline:'Designed around sound.', image:'/images/themes/audio.webp',
  audience:'Personal audio',
 },
 {
  id:'bold-studio', service:customApplicationService, name:'Bold Studio',
  description:'A creative project workspace with high-contrast status labels and approvals close at hand.',
  brand:'Studio North', headline:'Project workspace', image:'',
  audience:'Creative project workspace',
 },
] as const;

export type DesignTheme = (typeof designThemes)[number];

export function themeChoices(service:string) {
 const choices = designThemes.filter(theme=>theme.service===service);
 return choices.length ? [...choices,{id:'recommend',name:'Help me choose'}] : [];
}

export function resolveTheme(service:string,id:string) {
 const candidate = id==='editorial'?'warm-editorial':id==='catalogue'?'clean-premium-retail':id;
 return themeChoices(service).find(theme=>theme.id===candidate)?.id ?? '';
}

export function themeBriefLink(service:string, themeId:string) {
 const params = new URLSearchParams({service,theme:themeId});
 return '/contact/?'+params;
}
