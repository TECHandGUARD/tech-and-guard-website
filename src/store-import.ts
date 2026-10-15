export type ProductDraft={sku:string;handle:string;title:string;description:string;price_cents:number;stock:number|null;image_url:string;options:string};
export function parseCSV(text:string):string[][]{
 if(text.length>5*1024*1024)throw new Error('CSV must be under 5 MB.');
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c==='"'){if(cell||closed)throw new Error('Invalid CSV quoting.');quoted=true;}
  else if(c===','){row.push(cell);cell='';closed=false;}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';closed=false;}
  else {if(closed)throw new Error('Unexpected text after CSV quote.');cell+=c;}
 }
 if(quoted)throw new Error('Unclosed CSV quote.');row.push(cell);if(row.some(Boolean))rows.push(row);
 if(!rows.length)throw new Error('CSV is empty.');rows[0][0]=rows[0][0].replace(/^\uFEFF/,'');return rows;
}
export function importProducts(text:string):{products:ProductDraft[];errors:string[];warnings:string[]}{
 const rows=parseCSV(text),headers=rows.shift()!.map(x=>x.trim().toLowerCase());
 const warnings:string[]=[];
 if(headers.includes('is_published'))warnings.push('Publication flags are ignored. All imported products are saved as drafts.');
 const extra=headers.filter(h=>['id','compare_at_price','category','images','colors','sizes','badge','materials','rating','reviews','is_featured','is_deal'].includes(h));
 if(extra.length)warnings.push('Not imported by this catalogue: '+extra.join(', ')+'. Keep the original file for review.');
 if(headers.includes('colors')||headers.includes('sizes'))warnings.push('Colour/size lists are not individual variants. Provide one SKU, price and stock quantity per sellable variant before offering variant choices.');
 if(headers.includes('rating')||headers.includes('reviews'))warnings.push('Ratings and review counts are not published. Use verified customer reviews only.');
 const get=(row:string[],...keys:string[])=>{for(const key of keys){const i=headers.indexOf(key.toLowerCase());if(i>=0&&row[i]?.trim())return row[i].trim();}return '';};
 if(!headers.includes('variant price')&&!headers.includes('price'))throw new Error('Missing Price or Variant Price column.');
 if(!headers.includes('title')&&!headers.includes('name'))throw new Error('Missing Title or Name column.');
 const products:ProductDraft[]=[],errors:string[]=[],seen=new Set<string>(),groups=new Map<string,{title:string;description:string;image:string}>();
 rows.forEach((row,index)=>{
  const line=index+2;if(row.length!==headers.length){errors.push(`Row ${line}: column count differs from the header.`);return;}
  const handle=get(row,'Handle'),title=get(row,'Title','Name'),description=get(row,'Body (HTML)','Description').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  const image=get(row,'Variant Image','Image Src','Image URL','image_url');
  const prior=groups.get(handle)||{title:'',description:'',image:''};
  const info={title:title||prior.title,description:description||prior.description,image:image||prior.image};if(handle)groups.set(handle,info);
  const price=get(row,'Variant Price','Price');if(!price&&!get(row,'Variant SKU','SKU'))return;
  const options=['Option1 Value','Option2 Value','Option3 Value'].map(key=>get(row,key)).filter(Boolean).join(' / ');
  const sku=get(row,'Variant SKU','SKU')||(handle?handle+(options?' / '+options:''):'');
  if(!sku||!info.title){errors.push(`Row ${line}: product title and SKU (or Handle) required.`);return;}
  if(!/^\d+(?:\.\d{1,2})?$/.test(price)||Number(price)<=0||Number(price)>21474836.47){errors.push(`Row ${line}: invalid positive ZAR price.`);return;}
  if(seen.has(sku)){errors.push(`Row ${line}: duplicate SKU ${sku}.`);return;}seen.add(sku);
  const stock=get(row,'Variant Inventory Qty','Stock','stock_count');if(stock&&!/^\d+$/.test(stock)){errors.push(`Row ${line}: stock must be a non-negative whole number.`);return;}
  if(stock&&Number(stock)>1000000){errors.push(`Row ${line}: stock is too large.`);return;}
  if(info.image){try{const u=new URL(info.image);if(u.protocol!=='https:'||u.username||u.password)throw new Error();}catch{errors.push(`Row ${line}: image must be an HTTPS URL.`);return;}}
  if(sku.length>160||info.title.length>300||info.description.length>10000){errors.push(`Row ${line}: product text exceeds supported limits.`);return;}
  products.push({sku,handle,title:info.title,description:info.description,price_cents:Math.round(Number(price)*100),stock:stock?Number(stock):null,image_url:info.image,options});
 });
 if(products.length>2000)errors.push('Import up to 2,000 variants at a time.');if(!products.length)errors.push('No product variants found.');return {products,errors,warnings};
}
export async function inspectTheme(file:File){
 if(!file.name.toLowerCase().endsWith('.zip')||file.size>20*1024*1024)throw new Error('Upload a ZIP under 20 MB.');
 const bytes=await file.arrayBuffer(),v=new DataView(bytes);let end=-1;
 for(let i=v.byteLength-22;i>=Math.max(0,v.byteLength-65557);i--)if(v.getUint32(i,true)===0x06054b50){end=i;break;}
 if(end<0)throw new Error('Invalid ZIP archive.');
 const count=v.getUint16(end+10,true),offset=v.getUint32(end+16,true),size=v.getUint32(end+12,true);
 if(v.getUint16(end+4,true)||v.getUint16(end+6,true)||!count||count>2000||offset+size>end)throw new Error('Unsupported or oversized ZIP.');
 let pos=offset,total=0;const names:string[]=[];
 for(let i=0;i<count;i++){
  if(pos+46>v.byteLength||v.getUint32(pos,true)!==0x02014b50)throw new Error('Invalid ZIP directory.');
  if(v.getUint16(pos+8,true)&1)throw new Error('Encrypted ZIPs are unsupported.');
  total+=v.getUint32(pos+24,true);if(total>100*1024*1024)throw new Error('Expanded ZIP exceeds 100 MB.');
  const length=v.getUint16(pos+28,true),extra=v.getUint16(pos+30,true),comment=v.getUint16(pos+32,true);
  if(pos+46+length+extra+comment>offset+size)throw new Error('Invalid ZIP entry.');
  const name=new TextDecoder().decode(new Uint8Array(bytes,pos+46,length));
  if(name.startsWith('/')||name.includes('\\')||name.split('/').includes('..')||name.includes('\0'))throw new Error('Unsafe ZIP file path.');
  names.push(name);pos+=46+length+extra+comment;
 }
 if(!names.some(n=>n.endsWith('.liquid')))throw new Error('This does not appear to be a Shopify theme ZIP.');
 return {files:count,liquid:names.filter(n=>n.endsWith('.liquid')).length,assets:names.filter(n=>n.includes('assets/')).length};
}
