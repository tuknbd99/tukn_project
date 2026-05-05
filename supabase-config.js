// supabase-config.js
const SUPABASE_URL = 'https://bffomfsffrtfgxyetzvm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_A0BluIVwJ4M3Zd3JWpBoPg_NJSRu81D';

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('Supabase client initialized');
