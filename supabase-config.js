// supabase-config.js
const SUPABASE_URL = 'https://bffomfsffrtfgxyetzvm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_A0BluIVwJ4M3Zd3JWpBoPg_NJSRu81D';

// গ্লোবাল ক্লায়েন্ট
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('✅ Supabase client initialized');

// টেবিলের নাম কনস্ট্যান্ট
window.TABLES = {
    MEMBERS: 'members',
    MADRASAS: 'madrasas',
    PAYMENTS: 'payments',
    COMPLAINTS: 'complaints',
    NOTICES: 'notices',
    VISITOR_STATS: 'visitor_stats',
    ADMINS: 'admins',
    REPS: 'reps',
    REP_APPLICATIONS: 'rep_applications',
    LOANS: 'loans',
    SLIDERS: 'sliders',
    CAREER: 'career',
    ABOUT: 'about'
};
