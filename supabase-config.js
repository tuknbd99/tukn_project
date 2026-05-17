// supabase-config.js
// TUKNBD - Supabase কনফিগারেশন (কনফ্লিক্ট মুক্ত)

// ==================== Supabase কনফিগারেশন ====================

const SUPABASE_URL = 'https://bffomfsffrtfgxyetzvm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_A0BluIVwJ4M3Zd3JWpBoPg_NJSRu81D';

// ভেরিয়েবল চেক করে ডিক্লেয়ার করুন (ডুপ্লিকেট এড়াতে)
if (typeof window._supabaseClient === 'undefined') {
    window._supabaseClient = null;
}
if (typeof window._supabase === 'undefined') {
    window._supabase = null;
}

// ==================== Supabase ক্লায়েন্ট ইনিশিয়ালাইজেশন ====================

async function initSupabaseConfig() {
    try {
        // Supabase CDN লোড হয়েছে কিনা চেক করুন
        let supabaseLib = null;
        let attempts = 0;
        
        while (!supabaseLib && attempts < 30) {
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                supabaseLib = window.supabase;
            } else if (typeof supabase !== 'undefined' && supabase && typeof supabase.createClient === 'function') {
                supabaseLib = supabase;
            }
            if (!supabaseLib) {
                await new Promise(r => setTimeout(r, 300));
                attempts++;
            }
        }
        
        if (!supabaseLib) {
            console.error('❌ Supabase library not loaded');
            return false;
        }
        
        // ক্লায়েন্ট তৈরি করুন
        const client = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // গ্লোবাল ভেরিয়েবল সেট করুন (রিডিক্লেয়ার না করে)
        window._supabase = client;
        window._supabaseClient = client;
        
        // কম্প্যাটিবিলিটির জন্য (যদি আগে থেকে না থাকে)
        if (typeof window.supabase === 'undefined') {
            window.supabase = client;
        }
        if (typeof window.supabaseClient === 'undefined') {
            window.supabaseClient = client;
        }
        
        console.log('✅ Supabase Config: Client initialized');
        return true;
        
    } catch (err) {
        console.error('❌ Supabase Config Error:', err);
        return false;
    }
}

// ==================== টেবিলের নাম কনস্ট্যান্ট ====================

const TABLES = {
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

if (typeof window.TABLES === 'undefined') {
    window.TABLES = TABLES;
}

// ==================== কানেকশন টেস্ট ====================

async function testSupabaseConfig() {
    try {
        const client = window._supabaseClient || window.supabaseClient;
        if (!client) {
            await initSupabaseConfig();
        }
        
        const finalClient = window._supabaseClient || window.supabaseClient;
        if (!finalClient) {
            console.error('❌ No Supabase client available');
            return false;
        }
        
        const { error } = await finalClient
            .from(TABLES.MEMBERS)
            .select('count', { count: 'exact', head: true });
        
        if (error) throw error;
        
        console.log('✅ Supabase Config: Connection successful');
        return true;
        
    } catch (error) {
        console.error('❌ Supabase Config: Connection failed', error);
        return false;
    }
}

// ==================== প্রোফাইল ইমেজ আপলোড ====================

async function uploadProfileImage(file, memberId) {
    try {
        if (!file || !memberId) return null;
        
        const client = window._supabaseClient || window.supabaseClient;
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
            .from(TABLES.MEMBERS)
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
    
    const client = window._supabaseClient || window.supabaseClient;
    if (!client) return { success: false, message: 'সংযোগ সমস্যা' };
    
    try {
        const { data: referrer } = await client
            .from(TABLES.MEMBERS)
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
        
        await client.from(TABLES.REFERRALS).insert(referralRecord);
        
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

async function calculateAndAddBonus(memberId) {
    const client = window._supabaseClient || window.supabaseClient;
    if (!client) return null;
    
    try {
        const { data: referrals } = await client
            .from(TABLES.REFERRALS)
            .select('*')
            .eq('referrer_id', memberId)
            .eq('status', 'completed');
        
        const referralCount = referrals?.length || 0;
        let bonusAmount = 0;
        let level = 0;
        let perReferralBonus = 0;
        
        if (referralCount >= 1 && referralCount <= 4) {
            perReferralBonus = 50;
            bonusAmount = referralCount * perReferralBonus;
            level = 1;
        } else if (referralCount >= 5 && referralCount <= 14) {
            perReferralBonus = 75;
            bonusAmount = referralCount * perReferralBonus;
            level = 2;
        } else if (referralCount >= 15) {
            perReferralBonus = 100;
            bonusAmount = referralCount * perReferralBonus;
            level = 3;
        }
        
        await client
            .from(TABLES.MEMBERS)
            .update({
                referral_bonus: bonusAmount,
                referral_level: level,
                referral_count: referralCount,
                per_referral_bonus: perReferralBonus
            })
            .eq('member_id', memberId);
        
        return { bonusAmount, level, referralCount, perReferralBonus };
        
    } catch (error) {
        console.error('Calculate bonus error:', error);
        return null;
    }
}

// ==================== লেজার ডাটা ====================

async function loadLedgerData() {
    const client = window._supabaseClient || window.supabaseClient;
    if (!client) return { success: false, members: [], payments: [], loans: [] };
    
    try {
        const { data: members } = await client
            .from(TABLES.MEMBERS)
            .select('member_id, full_name, mobile, status')
            .eq('status', 'active');
        
        const { data: payments } = await client
            .from(TABLES.PAYMENTS)
            .select('*')
            .eq('status', 'approved');
        
        const { data: loans } = await client
            .from(TABLES.LOANS)
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
window.calculateAndAddBonus = calculateAndAddBonus;
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

console.log('✅ supabase-config.js loaded (final version)');
