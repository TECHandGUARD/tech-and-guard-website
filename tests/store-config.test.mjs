import assert from 'node:assert/strict';
import test from 'node:test';
import {resolveStoreConfig} from '../src/store-config.ts';

const staging={
 VITE_STORE_ENV:'staging',
 VITE_STORE_URL:'https://previewexample.supabase.co',
 VITE_STORE_PUBLIC_KEY:'sb_publishable_preview-example',
};

test('the configured preview points exclusively at its staging project',()=>{
 assert.deepEqual(resolveStoreConfig(staging),{url:staging.VITE_STORE_URL,key:staging.VITE_STORE_PUBLIC_KEY});
});

test('a staging build fails closed without independent public credentials',()=>{
 const prod=resolveStoreConfig();
 assert.throws(()=>resolveStoreConfig({VITE_STORE_ENV:'staging'}),/staging Supabase URL/);
 assert.throws(()=>resolveStoreConfig({...staging,VITE_STORE_URL:prod.url}),/isolated Supabase URL/);
 assert.throws(()=>resolveStoreConfig({...staging,VITE_STORE_PUBLIC_KEY:prod.key}),/isolated Supabase URL/);
 assert.throws(()=>resolveStoreConfig({...staging,VITE_STORE_PUBLIC_KEY:'sb_secret_invalid'}),/publishable key/);
});
