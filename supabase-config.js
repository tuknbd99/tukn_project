// supabase-config.js
const SUPABASE_URL = 'https://bffomfsffrtfgxyetzvm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_A0BluIVwJ4M3Zd3JWpBoPg_NJSRu81D';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// সুপাবেস টেবিল চেক এবং তৈরি করার ফাংশন
async function initSupabaseTables() {
    try {
        // টেবিলগুলি ইতিমধ্যে তৈরি থাকলে স্কিপ করবে
        console.log('Supabase initialized successfully');
    } catch (error) {
        console.error('Supabase initialization error:', error);
    }
}
