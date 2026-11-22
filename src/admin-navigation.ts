export type AdminSection='dashboard'|'executive'|'analytics'|'finance'|'enquiries'|'orders'|'products'|'inventory'|'stock-adjustments'|'customers'|'imports'|'staff'|'permissions'|'audit'|'settings'|'roadmap';
export type AdminNavItem={id:string;label:string;section?:AdminSection;ownerOnly?:boolean};
export const adminGroups:Array<{label:string;items:AdminNavItem[]}>= [
 {label:'Store',items:[
  {id:'dashboard',label:'Home',section:'dashboard'},
  {id:'orders',label:'Orders',section:'orders'},
  {id:'enquiries',label:'Enquiries & quotes',section:'enquiries'},
  {id:'customers',label:'Customers',section:'customers'}
 ]},
 {label:'Catalogue',items:[
  {id:'products',label:'Products',section:'products'},
  {id:'inventory',label:'Inventory',section:'inventory'},
  {id:'stock-adjustments',label:'Stock adjustments',section:'stock-adjustments'},
  {id:'imports',label:'Product imports',section:'imports'},
  {id:'categories',label:'Categories & collections'},
  {id:'suppliers',label:'Suppliers & purchasing'},
  {id:'stock-alerts',label:'Back-in-stock subscribers'}
 ]},
 {label:'Reports',items:[
  {id:'executive',label:'Operations summary',section:'executive'},
  {id:'analytics',label:'Request analytics',section:'analytics'},
  {id:'finance',label:'Finance overview',section:'finance'}
 ]},
 {label:'Customer support',items:[{id:'support',label:'Support inbox & tickets'},{id:'feedback',label:'Feedback & moderation'},{id:'customer-groups',label:'Customer groups'}]},
 {label:'Marketing',items:[{id:'campaigns',label:'Campaigns & newsletters'},{id:'subscribers',label:'Subscribers'},{id:'coupons',label:'Coupons & promotions'},{id:'marketing-analytics',label:'Marketing performance'}]},
 {label:'Shipping & services',items:[{id:'shipping',label:'Shipping & delivery rates'},{id:'dispatch',label:'Dispatch & fulfilment'},{id:'services',label:'Services & bookings'}]},
 {label:'Payments & finance',items:[{id:'payments',label:'Payments & gateways'},{id:'invoices',label:'Invoices & financial reports'},{id:'tax',label:'Tax settings & compliance'}]},
 {label:'Documents & content',items:[{id:'documents',label:'Document library'},{id:'content',label:'Website content & SEO'},{id:'email-templates',label:'Email templates'},{id:'course-materials',label:'Course materials'}]},
 {label:'Team & administration',items:[{id:'staff',label:'Staff & Roles',section:'staff',ownerOnly:true},{id:'permissions',label:'Permissions',section:'permissions'},{id:'tasks',label:'Tasks, calendar & shifts'},{id:'audit',label:'Audit Logs',section:'audit',ownerOnly:true},{id:'system',label:'System health & activity'},{id:'settings',label:'Settings',section:'settings'},{id:'roadmap',label:'Feature readiness',section:'roadmap'}]}
];
export function availableAdminItems(owner:boolean){return adminGroups.flatMap(g=>g.items).filter(i=>!i.ownerOnly||owner);}
const taskSections = {
 'to-fulfil':'orders',
 'requests':'orders',
 'awaiting-review':'orders',
 'stock-alerts':'inventory',
 'published':'products',
} as const;

export type AdminTask = keyof typeof taskSections;
export type AdminRoute = {section:AdminSection; task?:AdminTask};

export function adminHash({section, task}:AdminRoute){
 return '#' + section + (task && taskSections[task] === section ? '?view=' + task : '');
}

export function parseAdminRoute(hash:string,owner:boolean):AdminRoute{
 const [path,query] = hash.replace(/^#\/?/,'').split('?');
 const id = path === 'inventory-alerts' ? 'inventory' : path;
 const section = availableAdminItems(owner).find(item=>item.section===id)?.section ?? 'dashboard';
 const candidate = new URLSearchParams(query).get('view');
 const task = Object.keys(taskSections).find(key=>key===candidate) as AdminTask|undefined;
 return task && taskSections[task]===section ? {section,task} : {section};
}

export function parseAdminSection(hash:string,owner:boolean){
 return parseAdminRoute(hash,owner).section;
}
export function adminTitle(section:AdminSection){return adminGroups.flatMap(g=>g.items).find(i=>i.section===section)?.label??'Dashboard';}
