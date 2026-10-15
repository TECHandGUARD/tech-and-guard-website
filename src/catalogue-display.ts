export function catalogueImage(value:string){
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!/generated_image/i.test(url.pathname)?url.href:'';}catch{return '';}
}
export function catalogueText(value:string){return value.replace(/\\"/g,'"');}
