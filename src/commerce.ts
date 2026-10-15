export type Product={sku:string;title:string;description:string;price_cents:number;stock:number|null;published:boolean;updated_at:string};
export type OrderRequest={id:string;customer_name:string;email:string;notes:string;subtotal_cents:number;status:'requested'|'reviewed'|'cancelled';created_at:string;updated_at:string;items:Array<{sku:string;title:string;quantity:number;unit_price_cents:number}>};
export function priceToCents(value:string){
 if(!/^\d{1,7}(\.\d{1,2})?$/.test(value))throw new Error('Enter a positive rand price with at most two decimal places.');
 const [rand,cents='']=value.split('.');const result=Number(rand)*100+Number(cents.padEnd(2,'0'));
 if(!Number.isSafeInteger(result)||result<=0)throw new Error('Price must be greater than zero.');return result;
}
export function stockQuantity(value:string){if(value==='')return null;if(!/^\d{1,7}$/.test(value)||Number(value)>1000000)throw new Error('Stock must be a whole number from 0 to 1,000,000, or blank for unknown.');return Number(value);}
export function money(cents:number){return new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'}).format(cents/100);}
export function commerceError(code:unknown){
 const known:Record<string,string>={invalid_adjustment:'Check the adjustment type, whole quantity and reason (3–500 characters).',adjustment_changed:'This adjustment reference was already used with different details. Check stock history before continuing.',stock_unknown:'Record a physical stock count before adding or removing units.',stock_bounds:'This adjustment would put stock below zero or above 1,000,000.',catalogue_changed:'A product is unavailable or has insufficient listed stock. Refresh the catalogue before retrying.',record_changed:'This record changed in another session. Refresh before saving.',request_changed:'This submission was already used. Refresh to start a new request.',request_limit:'You have reached the daily request limit. Please contact us.',verified_account_required:'Sign in with a verified email account before submitting.',invalid_request:'Check the request details and quantities.',invalid_product:'Check the product title, price and stock.',invalid_status:'That status change is not allowed.'};
 return typeof code==='string'?known[code]:undefined;
}
