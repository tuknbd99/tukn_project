// supabase-config.js
// TUKNBD - Supabase Configuration (15 টেবিল সহ প্রজেক্ট)

const SUPABASE_URL = 'https://bffomfsffrtfgxyetzvm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_A0BluIVwJ4M3Zd3JWpBoPg_NJSRu81D';

// Supabase ক্লায়েন্ট ইনিশিয়ালাইজ
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
        console.log('📊 Project:', SUPABASE_URL);
        return true;
    } catch (err) {
        console.error('❌ Connection failed:', err);
        return false;
    }
}

// পেজ লোড হলে সংযোগ টেস্ট করুন
document.addEventListener('DOMContentLoaded', () => {
    testSupabaseConnection();
});

console.log('🚀 Supabase Config Loaded');