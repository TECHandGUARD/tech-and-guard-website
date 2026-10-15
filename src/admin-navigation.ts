export type AdminSection='dashboard'|'executive'|'analytics'|'finance'|'orders'|'products'|'inventory'|'stock-adjustments'|'customers'|'imports'|'staff'|'permissions'|'audit'|'settings'|'roadmap';
export type AdminNavItem={id:string;label:string;section?:AdminSection;ownerOnly?:boolean};
export const adminGroups:Array<{label:string;items:AdminNavItem[]}>= [
 {label:'Overview',items:[{id:'dashboard',label:'Dashboard',section:'dashboard'},{id:'executive',label:'Executive Dashboard',section:'executive'},{id:'analytics',label:'Analytics',section:'analytics'}]},
 {label:'Sales & catalogue',items:[{id:'orders',label:'Orders',section:'orders'},{id:'customers',label:'Customers',section:'customers'},{id:'products',label:'Products',section:'products'},{id:'categories',label:'Categories & collections'}]},
 {label:'Inventory & suppliers',items:[{id:'inventory',label:'Inventory & alerts',section:'inventory'},{id:'stock-adjustments',label:'Stock Adjustments',section:'stock-adjustments'},{id:'suppliers',label:'Suppliers & purchasing'},{id:'stock-alerts',label:'Back-in-stock subscribers'}]},
 {label:'Customer support',items:[{id:'support',label:'Support inbox & tickets'},{id:'feedback',label:'Feedback & moderation'},{id:'customer-groups',label:'Customer groups'}]},
 {label:'Marketing',items:[{id:'campaigns',label:'Campaigns & newsletters'},{id:'subscribers',label:'Subscribers'},{id:'coupons',label:'Coupons & promotions'},{id:'marketing-analytics',label:'Marketing performance'}]},
 {label:'Shipping & services',items:[{id:'shipping',label:'Shipping & delivery rates'},{id:'dispatch',label:'Dispatch & fulfilment'},{id:'services',label:'Services & bookings'}]},
 {label:'Payments & finance',items:[{id:'finance',label:'Finance overview',section:'finance'},{id:'payments',label:'Payments & gateways'},{id:'invoices',label:'Invoices & financial reports'},{id:'tax',label:'Tax settings & compliance'}]},
 {label:'Documents & content',items:[{id:'documents',label:'Document library'},{id:'content',label:'Website content & SEO'},{id:'email-templates',label:'Email templates'},{id:'course-materials',label:'Course materials'}]},
 {label:'Team & administration',items:[{id:'staff',label:'Staff & Roles',section:'staff',ownerOnly:true},{id:'permissions',label:'Permissions',section:'permissions'},{id:'tasks',label:'Tasks, calendar & shifts'},{id:'imports',label:'Import Center',section:'imports'},{id:'audit',label:'Audit Logs',section:'audit',ownerOnly:true},{id:'system',label:'System health & activity'},{id:'settings',label:'Settings',section:'settings'},{id:'roadmap',label:'Feature readiness',section:'roadmap'}]}
];
export function availableAdminItems(owner:boolean){return adminGroups.flatMap(g=>g.items).filter(i=>!i.ownerOnly||owner);}
export function parseAdminSection(hash:string,owner:boolean):AdminSection{
 let id=hash.replace(/^#\/?/,'');if(id==='inventory-alerts')id='inventory';return availableAdminItems(owner).find(i=>i.section===id)?.section??'dashboard';
}
export function adminTitle(section:AdminSection){return adminGroups.flatMap(g=>g.items).find(i=>i.section===section)?.label??'Dashboard';}
