import test from 'node:test';import assert from 'node:assert/strict';
import {importProducts,parseCSV,inspectTheme} from '../src/store-import.ts';
test('Shopify variants preserve titles, options, quoted descriptions and cents',()=>{
 const csv='Handle,Title,Body (HTML),Variant SKU,Variant Price,Variant Inventory Qty,Option1 Value,Image Src\r\nhoodie,Hoodie,"<p>Soft, warm</p>",H-S,199.99,4,Small,https://example.com/a.png\r\nhoodie,,,H-L,229.50,0,Large,\r\n';
 const {products,errors}=importProducts(csv);assert.deepEqual(errors,[]);assert.equal(products.length,2);assert.equal(products[1].title,'Hoodie');assert.equal(products[0].price_cents,19999);assert.equal(products[1].options,'Large');assert.equal(products[1].stock,0);assert.equal(products[0].description,'Soft, warm');
});
test('CSV import rejects duplicates, invalid prices, unsafe image links and damaged quotes',()=>{
 for(const body of ['a,Thing,0,https://example.com/a','a,Thing,1.234,https://example.com/a','a,Thing,10,javascript:alert(1)'])assert.ok(importProducts('SKU,Title,Price,Image URL\n'+body).errors.length);
 assert.ok(importProducts('SKU,Title,Price\na,Thing,10\na,Thing,20').errors.some(e=>e.includes('duplicate')));
 assert.throws(()=>parseCSV('Title,Price\n"broken,10'),/Unclosed/);
 assert.deepEqual(parseCSV('Title,Price\n"Line\nTwo",10'),[['Title','Price'],['Line\nTwo','10']]);
});
test('theme upload rejects executable non-archives and malformed ZIPs',async()=>{
 await assert.rejects(()=>inspectTheme(new File(['script'],'theme.zip')),/Invalid ZIP/);
 await assert.rejects(()=>inspectTheme(new File(['script'],'theme.js')),/ZIP/);
});
