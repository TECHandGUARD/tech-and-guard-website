const productionUrl = 'https://vthjdkwfvbfryofsmtdb.supabase.co';
const productionKey = 'sb_publishable_y__5ddJ5fQo0bdGnQtqgTg_kn6G5Hap';

type StoreEnvironment = Record<string, string | undefined>;

export function resolveStoreConfig(env: StoreEnvironment = {}) {
 const mode = env.VITE_STORE_ENV ?? 'production';
 const url = env.VITE_STORE_URL;
 const key = env.VITE_STORE_PUBLIC_KEY;
 if (mode === 'production' && !url && !key) return {url:productionUrl,key:productionKey};
 if (mode !== 'staging' || !url || !key) {
  throw new Error('Set VITE_STORE_ENV=staging with a staging Supabase URL and publishable key.');
 }
 if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url) || url === productionUrl
     || !/^sb_publishable_[a-zA-Z0-9_-]+$/.test(key) || key === productionKey) {
  throw new Error('Staging requires an isolated Supabase URL and its publishable key.');
 }
 return {url,key};
}
