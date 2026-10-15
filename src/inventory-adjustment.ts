export const adjustmentReasons=[['received','Stock received'],['returned','Return to sellable stock'],['damaged','Damaged stock'],['lost','Lost stock'],['count','Physical stock count']] as const;
export type AdjustmentReason=typeof adjustmentReasons[number][0];
export function adjustmentStock(current:number|null,reason:AdjustmentReason,value:string){
 if(!/^\d{1,7}$/.test(value))throw new Error('Enter a whole number.');
 const quantity=Number(value);
 if(quantity>1000000||(quantity===0&&reason!=='count'))throw new Error('Enter a quantity from 1 to 1,000,000 (a count may be zero).');
 if(current===null&&reason!=='count')throw new Error('Record a physical stock count first.');
 const next=reason==='count'?quantity:reason==='received'||reason==='returned'?current!+quantity:current!-quantity;
 if(next<0||next>1000000)throw new Error('Resulting stock must be between 0 and 1,000,000.');
 return {quantity,next};
}
