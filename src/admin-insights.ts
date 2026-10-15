import type {Product,OrderRequest} from './commerce';
export function stockStatus(stock:number|null){return stock===null?'unknown':stock===0?'out':stock<=5?'low':'available';}
export function operationsSummary(products:Product[],orders:OrderRequest[]){
 return {products:products.length,published:products.filter(p=>p.published).length,low:products.filter(p=>stockStatus(p.stock)==='low').length,out:products.filter(p=>p.stock===0).length,unknown:products.filter(p=>p.stock===null).length,units:products.reduce((n,p)=>n+(p.stock??0),0),requests:orders.length,requested:orders.filter(o=>o.status==='requested').length,reviewed:orders.filter(o=>o.status==='reviewed').length,cancelled:orders.filter(o=>o.status==='cancelled').length,requestValue:orders.filter(o=>o.status!=='cancelled').reduce((n,o)=>n+o.subtotal_cents,0)};
}
