export const onlineStoreService = 'Independent online stores';

export const storeThemes = [
 {
  id: 'editorial',
  name: 'Editorial',
  description: 'Large photographs and curated collections for fashion, beauty and lifestyle products.',
  image: '/images/commerce-editorial.webp'
 },
 {
  id: 'catalogue',
  name: 'Catalogue',
  description: 'A product-first layout for tech, accessories and stores with several categories.',
  image: '/images/store-editorial.webp'
 }
] as const;

export const storeThemeChoices = [
 ...storeThemes.map(({id,name})=>({id,name})),
 {id:'recommend',name:'Help me choose'}
];

export function storeBriefLink(themeId:string) {
 return '/contact/?'+new URLSearchParams({service:onlineStoreService,theme:themeId});
}
