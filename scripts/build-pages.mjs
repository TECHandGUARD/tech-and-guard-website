import fs from 'node:fs';
import {loadEnv} from 'vite';
import {resolveStoreConfig} from '../src/store-config.ts';
const {url:storeUrl} = resolveStoreConfig(loadEnv('production', process.cwd(), 'VITE_STORE_'));
const pages={account:['Your account | Tech & Guard','Protected customer account and order requests.'],services:['Services | Tech & Guard','Business websites, independent online stores, custom applications and technology support.'],projects:['Projects | Tech & Guard','Explore SmartBridge FET and the independent Tech & Guard store.'],about:['About | Tech & Guard','Learn about TECH AND GUARD (Pty) Ltd, a South African technology company.'],store:['Store | Tech & Guard','Browse the published Tech & Guard product catalogue.'],'design-themes':['Design themes | Tech & Guard','Explore design directions for business websites, independent online stores and custom web applications.'],'store-themes':['Build an online store | Tech & Guard','Compare store design options and request a quote for your online store.'],contact:['Contact | Tech & Guard','Discuss your next website, store or digital project with Tech & Guard.'],admin:['Store administration | Tech & Guard','Protected store administrator sign-in.']};
const policy=`default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://images.unsplash.com ${storeUrl}/storage/v1/object/public/corporate-product-images/; connect-src 'self' ${storeUrl}; object-src 'none'; base-uri 'none'; form-action 'self'; upgrade-insecure-requests`;
const html=fs.readFileSync('dist/index.html','utf8').replace('</head>',`<meta http-equiv="Content-Security-Policy" content="${policy}"/><meta name="referrer" content="no-referrer"/></head>`);
fs.writeFileSync('dist/index.html',html.replace('</head>','<link rel="canonical" href="https://www.techandguard.co.za/"/></head>'));
for (const [page, [title, description]] of Object.entries(pages)) {
 const url = `https://www.techandguard.co.za/${page}/`;
 const image = page === 'store' ? 'https://www.techandguard.co.za/images/store-editorial.webp' : null;
 fs.mkdirSync('dist/' + page, {recursive:true});
 let content = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
  .replace(/(<meta name="description" content=")[^"]*/, `$1${description}`)
  .replace(/(<meta property="og:title" content=")[^"]*/, `$1${title}`)
  .replace(/(<meta property="og:description" content=")[^"]*/, `$1${description}`);
 if (image) content = content.replace(/(<meta property="og:image" content=")[^"]*/, `$1${image}`);
 const robots = page === 'admin' || page === 'account' ? '<meta name="robots" content="noindex,nofollow"/>' : '';
 content = content.replace('</head>', `<link rel="canonical" href="${url}"/><meta property="og:url" content="${url}"/>${robots}</head>`);
 fs.writeFileSync('dist/' + page + '/index.html', content);
}
console.log('Built public pages and private account/admin entry routes.');

fs.writeFileSync('dist/robots.txt','User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /account/\nSitemap: https://www.techandguard.co.za/sitemap.xml\n');
fs.writeFileSync('dist/sitemap.xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['',...Object.keys(pages).filter(p=>p!=='admin'&&p!=='account')].map(p=>`<url><loc>https://www.techandguard.co.za/${p?p+'/':''}</loc></url>`).join('')+'</urlset>');
