export type RequestItem={sku:string;quantity:number};
type Payload={request_items:RequestItem[];customer_name:string;notes:string;request_key:string};
// Keep an immutable attempt in memory: an uncertain network result must reuse
// both the key and the exact payload, even when the cart changes meanwhile.
export function createRequestAttempt(){
 let payload:Payload|null=null;
 return {
  prepare(items:RequestItem[],name:string,notes:string){
   if(!payload){
    if(!name.trim()||name.trim().length>120||notes.length>2000||!items.length||items.length>25||new Set(items.map(i=>i.sku)).size!==items.length||items.some(i=>!i.sku||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>99))throw new Error('Check your name, products and quantities before submitting.');
    payload={request_items:items.map(i=>({...i})),customer_name:name.trim(),notes,request_key:crypto.randomUUID()};
   }
   return JSON.stringify(payload);
  },
  rejected(){payload=null;}
 };
}
