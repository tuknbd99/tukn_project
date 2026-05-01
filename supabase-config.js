// supabase-config.js
// TUKNBD - Supabase Configuration

const SUPABASE_URL = 'https://bffomfsffrtfgxyetzvm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_A0BluIVwJ4M3Zd3JWpBoPg_NJSRu81D';

// চেক করুন supabase ইতিমধ্যে ডিক্লেয়ার হয়েছে কিনা
if (typeof window.supabaseClient === 'undefined') {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// সুবিধার জন্য গ্লোবাল ভেরিয়েবল
const supabase = window.supabaseClient;

// কানেকশন টেস্ট ফাংশন
async function testSupabaseConnection() {
    try {
        const { data, error } = await supabase
            .from('members')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            console.error('❌ Supabase connection error:', error.message);
            return false;
        }
        
        console.log('✅ Supabase connected successfully!');
        return true;
    } catch (err) {
        console.error('❌ Connection failed:', err);
        return false;
    }
}

// পেজ লোড হলে সংযোগ টেস্ট করুন (যদি DOM লোড হয়ে থাকে)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        testSupabaseConnection();
    });
} else {
    testSupabaseConnection();
}

console.log('🚀 Supabase Config Loaded');