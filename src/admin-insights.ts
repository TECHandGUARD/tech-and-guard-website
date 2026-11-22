import type {Product,OrderRequest,ShopOrder} from './commerce';
export function resolveLowStockLimit(value?:string){
 const limit=Number(value);
 return Number.isSafeInteger(limit) && limit>0 ? limit : 5;
}
export const lowStockLimit = resolveLowStockLimit(import.meta.env?.VITE_LOW_STOCK_LIMIT);

export function needsFulfilment(order:ShopOrder){
 return order.payment_status==='paid' && (order.fulfilment_status==='processing' || order.fulfilment_status==='ready_for_dispatch');
}

export function stockStatus(stock:number|null){return stock===null?'unknown':stock===0?'out':stock<=lowStockLimit?'low':'available';}
export function operationsSummary(products:Product[],orders:OrderRequest[]){
 return {products:products.length,published:products.filter(p=>p.published).length,low:products.filter(p=>stockStatus(p.stock)==='low').length,out:products.filter(p=>p.stock===0).length,unknown:products.filter(p=>p.stock===null).length,units:products.reduce((n,p)=>n+(p.stock??0),0),requests:orders.length,requested:orders.filter(o=>o.status==='requested').length,reviewed:orders.filter(o=>o.status==='reviewed').length,cancelled:orders.filter(o=>o.status==='cancelled').length,requestValue:orders.filter(o=>o.status!=='cancelled').reduce((n,o)=>n+o.subtotal_cents,0)};
}
