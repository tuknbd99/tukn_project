// supabase-config.js
// TUKNBD - Supabase কনফিগারেশন ফাইল (কনফ্লিক্ট মুক্ত সংস্করণ)

// ==================== Supabase কনফিগারেশন ====================

const SUPABASE_URL = 'https://bffomfsffrtfgxyetzvm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_A0BluIVwJ4M3Zd3JWpBoPg_NJSRu81D';

// ভেরিয়েবল চেক করে ডিক্লেয়ার করুন - আগে থেকে না থাকলে তবেই ডিক্লেয়ার করবে
if (typeof window.supabaseClient === 'undefined') {
    window.supabaseClient = null;
}
if (typeof window.supabase === 'undefined') {
    window.supabase = null;
}

// ==================== Supabase ক্লায়েন্ট ইনিশিয়ালাইজেশন ====================

async function initSupabaseConfig() {
    try {
        // Supabase CDN লোড হয়েছে কিনা চেক করুন
        const supabaseLib = window.supabase || (typeof supabase !== 'undefined' ? supabase : null);
        
        if (!supabaseLib || typeof supabaseLib.createClient !== 'function') {
            // CDN না থাকলে অপেক্ষা করুন
            let attempts = 0;
            while (attempts < 20 && (!window.supabase || typeof window.supabase.createClient !== 'function')) {
                await new Promise(r => setTimeout(r, 300));
                attempts++;
            }
        }
        
        const finalLib = window.supabase || (typeof supabase !== 'undefined' ? supabase : null);
        
        if (!finalLib || typeof finalLib.createClient !== 'function') {
            console.error('❌ Supabase library not loaded!');
            return false;
        }
        
        // ক্লায়েন্ট তৈরি করুন
        const client = finalLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // শুধুমাত্র window এ সেট করুন (ভেরিয়েবল রি-ডিক্লেয়ার করবেন না)
        window.supabase = client;
        window.supabaseClient = client;
        
        console.log('✅ Supabase Config: Client initialized');
        return true;
        
    } catch (err) {
        console.error('❌ Supabase Config Error:', err);
        return false;
    }
}

// ==================== টেবিলের নাম কনস্ট্যান্ট ====================

window.TABLES = {
    MEMBERS: 'members',
    MADRASAS: 'madrasas',
    PAYMENTS: 'payments',
    COMPLAINTS: 'complaints',
    NOTICES: 'notices',
    VISITOR_STATS: 'visitor_stats',
    ADMINS: 'admins',
    REPS: 'representatives',
    REP_APPLICATIONS: 'rep_applications',
    LOANS: 'loan_applications',
    SLIDERS: 'sliders',
    CAREER: 'career',
    ABOUT: 'about',
    REFERRALS: 'referrals',
    COMMISSION_LOGS: 'commission_logs',
    LEDGER_TRANSACTIONS: 'transactions',
    BRANCHES: 'branches',
    DISTRICTS: 'districts',
    PROJECTS: 'projects',
    DISTRIBUTION_HISTORY: 'distribution_history',
    PENDING_MEMBERS: 'pending_members'
};

// ==================== কানেকশন টেস্ট ====================

async function testSupabaseConfig() {
    try {
        if (!window.supabaseClient) {
            await initSupabaseConfig();
        }
        
        if (!window.supabaseClient) {
            console.error('❌ No Supabase client available');
            return false;
        }
        
        const { error } = await window.supabaseClient
            .from('members')
            .select('count', { count: 'exact', head: true });
        
        if (error) throw error;
        
        console.log('✅ Supabase Config: Connection successful');
        return true;
        
    } catch (error) {
        console.error('❌ Supabase Config: Connection failed', error);
        return false;
    }
}

// ==================== প্রোফাইল ইমেজ ফাংশন ====================

async function uploadProfileImage(file, memberId) {
    try {
        if (!file || !memberId) return null;
        
        const client = window.supabaseClient;
        if (!client) return null;
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${memberId}_${Date.now()}.${fileExt}`;
        const filePath = `profile-images/${fileName}`;
        
        const { error: uploadError } = await client.storage
            .from('member-profiles')
            .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = client.storage
            .from('member-profiles')
            .getPublicUrl(filePath);
        
        const imageUrl = urlData.publicUrl;
        
        await client
            .from('members')
            .update({ profile_image: imageUrl })
            .eq('member_id', memberId);
        
        console.log('✅ Profile image uploaded');
        return imageUrl;
        
    } catch (error) {
        console.error('Upload error:', error);
        return null;
    }
}

// ==================== রেফারেল ফাংশন ====================

function generateReferralCode(name = '') {
    const prefix = 'TUKN';
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const nameCode = name ? name.substring(0, 3).toUpperCase() : '';
    return `${prefix}${nameCode}${random}`;
}

async function processReferral(referralCode, newMemberId, newMemberName) {
    if (!referralCode) return { success: false, message: 'কোন রেফারেল কোড নেই' };
    
    const client = window.supabaseClient;
    if (!client) return { success: false, message: 'সংযোগ সমস্যা' };
    
    try {
        const { data: referrer } = await client
            .from('members')
            .select('member_id, full_name, referral_code, referral_count, referral_bonus')
            .eq('referral_code', referralCode)
            .single();
        
        if (!referrer) {
            return { success: false, message: 'রেফারেল কোডটি বৈধ নয়!' };
        }
        
        if (referrer.member_id === newMemberId) {
            return { success: false, message: 'আপনি নিজেকে রেফার করতে পারবেন না!' };
        }
        
        const referralRecord = {
            referrer_id: referrer.member_id,
            referred_id: newMemberId,
            referred_name: newMemberName,
            referral_code: referralCode,
            status: 'pending',
            created_at: new Date().toISOString()
        };
        
        await client.from('referrals').insert(referralRecord);
        
        return { 
            success: true, 
            message: `${referrer.full_name} এর মাধ্যমে রেফার করা হয়েছে!`,
            referrer: referrer
        };
        
    } catch (error) {
        console.error('Referral error:', error);
        return { success: false, message: 'রেফারেল প্রসেসিং এ সমস্যা হয়েছে!' };
    }
}

// ==================== লেজার ডাটা ====================

async function loadLedgerData() {
    const client = window.supabaseClient;
    if (!client) return { success: false, members: [], payments: [], loans: [] };
    
    try {
        const { data: members } = await client
            .from('members')
            .select('member_id, full_name, mobile, status')
            .eq('status', 'active');
        
        const { data: payments } = await client
            .from('payments')
            .select('*')
            .eq('status', 'approved');
        
        const { data: loans } = await client
            .from('loan_applications')
            .select('*');
        
        return {
            success: true,
            members: members || [],
            payments: payments || [],
            loans: loans || []
        };
        
    } catch (error) {
        console.error('Ledger error:', error);
        return { success: false, members: [], payments: [], loans: [] };
    }
}

// ==================== গ্লোবাল এক্সপোর্ট ====================

window.initSupabaseConfig = initSupabaseConfig;
window.testSupabaseConfig = testSupabaseConfig;
window.uploadProfileImage = uploadProfileImage;
window.generateReferralCode = generateReferralCode;
window.processReferral = processReferral;
window.loadLedgerData = loadLedgerData;

// ==================== অটো ইনিশিয়ালাইজেশন ====================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await initSupabaseConfig();
        await testSupabaseConfig();
    });
} else {
    (async () => {
        await initSupabaseConfig();
        await testSupabaseConfig();
    })();
}

console.log('✅ supabase-config.js loaded (conflict-free version)');
