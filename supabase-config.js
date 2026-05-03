// supabase-config.js
// Supabase ক্লায়েন্ট কনফিগারেশন

const SUPABASE_URL = 'https://bffomfsffrtfgxyetzvm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_A0BluIVwJ4M3Zd3JWpBoPg_NJSRu81D';

// গ্লোবাল স্কোপ চেক করে ক্লায়েন্ট তৈরি করা
if (typeof window.supabaseClient === 'undefined') {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

console.log('Supabase client initialized');
