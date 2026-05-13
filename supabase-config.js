// supabase-config.js
// TUKNBD - Supabase Master Configuration File (Complete)

// ==================== Supabase কনফিগারেশন ====================
const SUPABASE_URL = 'https://bffomfsffrtfgxyetzvm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_A0BluIVwJ4M3Zd3JWpBoPg_NJSRu81D';

// Supabase ক্লায়েন্ট ইনিশিয়ালাইজেশন - সঠিক উপায়
async function initSupabase() {
    try {
        // Check if Supabase CDN is loaded
        if (typeof window.supabase === 'undefined' && typeof supabase === 'undefined') {
            console.error('❌ Supabase library not loaded! Make sure supabase CDN is included.');
            return false;
        }
        
        // Get the supabase object from window or global
        const supabaseLib = window.supabase || supabase;
        
        if (!supabaseLib || !supabaseLib.createClient) {
            console.error('❌ Supabase createClient not available!');
            return false;
        }
        
        // Create client
        supabaseClient = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.supabaseClient = supabaseClient;
        supabase = supabaseClient;  // Set global for compatibility
        
        console.log('✅ Supabase client initialized successfully');
        return true;
        
    } catch (err) {
        console.error('❌ Supabase initialization error:', err);
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

// ==================== প্রোফাইল ইমেজ ফাংশন ====================

async function uploadProfileImageToSupabase(file, memberId) {
    try {
        if (!file || !memberId) {
            console.error('File or MemberId missing');
            return null;
        }
        
        if (!supabaseClient) {
            await initSupabase();
        }
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${memberId}_${Date.now()}.${fileExt}`;
        const filePath = `profile-images/${fileName}`;
        
        const { data, error } = await supabaseClient.storage
            .from('member-profiles')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) throw error;
        
        const { data: urlData } = supabaseClient.storage
            .from('member-profiles')
            .getPublicUrl(filePath);
        
        const imageUrl = urlData.publicUrl;
        
        const { error: updateError } = await supabaseClient
            .from(window.TABLES.MEMBERS)
            .update({ profile_image: imageUrl })
            .eq('member_id', memberId);
        
        if (updateError) throw updateError;
        
        console.log('✅ Profile image uploaded successfully');
        return imageUrl;
        
    } catch(error) {
        console.error('Upload error:', error);
        return null;
    }
}

// ==================== রেফারেল ফাংশন ====================

// ১. রেফারেল কোড জেনারেটর
function generateReferralCode(name = '') {
    const prefix = 'TUKN';
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const nameCode = name ? name.substring(0, 3).toUpperCase() : '';
    return `${prefix}${nameCode}${random}`;
}

// ২. রেফারেল প্রসেসিং (নিবন্ধনের সময়)
async function processReferral(referralCode, newMemberId, newMemberName) {
    if (!referralCode) return { success: false, message: 'কোন রেফারেল কোড নেই' };
    
    try {
        if (!supabaseClient) await initSupabase();
        
        const { data: referrer, error: referrerError } = await supabaseClient
            .from(window.TABLES.MEMBERS)
            .select('member_id, full_name, referral_code, referral_count, referral_bonus')
            .eq('referral_code', referralCode)
            .single();
        
        if (referrerError || !referrer) {
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
            created_at: new Date().toISOString(),
            bonus_amount: 0
        };
        
        const { error: insertError } = await supabaseClient
            .from(window.TABLES.REFERRALS)
            .insert(referralRecord);
        
        if (insertError) throw insertError;
        
        return { 
            success: true, 
            message: `${referrer.full_name} এর মাধ্যমে রেফার করা হয়েছে! অনুমোদনের পর বোনাস পাবেন।`,
            referrer: referrer
        };
        
    } catch(error) {
        console.error('Referral process error:', error);
        return { success: false, message: 'রেফারেল প্রসেসিং এ সমস্যা হয়েছে!' };
    }
}

// ৩. সদস্য অনুমোদনের সময় রেফারেল সম্পন্ন করা
async function completeReferralOnApproval(memberId) {
    try {
        if (!supabaseClient) await initSupabase();
        
        const { data: referral, error: referralError } = await supabaseClient
            .from(window.TABLES.REFERRALS)
            .select('*')
            .eq('referred_id', memberId)
            .eq('status', 'pending')
            .single();
        
        if (referralError || !referral) {
            console.log('No pending referral found for member:', memberId);
            return null;
        }
        
        const { error: updateError } = await supabaseClient
            .from(window.TABLES.REFERRALS)
            .update({ 
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', referral.id);
        
        if (updateError) throw updateError;
        
        const bonusResult = await calculateAndAddBonus(referral.referrer_id);
        
        return { success: true, referrerId: referral.referrer_id, bonusResult };
        
    } catch(error) {
        console.error('Complete referral error:', error);
        return null;
    }
}

// ৪. বোনাস ক্যালকুলেশন এবং আপডেট
async function calculateAndAddBonus(memberId) {
    try {
        if (!supabaseClient) await initSupabase();
        
        const { data: referrals, error: referralsError } = await supabaseClient
            .from(window.TABLES.REFERRALS)
            .select('*')
            .eq('referrer_id', memberId)
            .eq('status', 'completed');
        
        if (referralsError) throw referralsError;
        
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
        
        const { error: updateError } = await supabaseClient
            .from(window.TABLES.MEMBERS)
            .update({
                referral_bonus: bonusAmount,
                referral_level: level,
                referral_count: referralCount,
                per_referral_bonus: perReferralBonus
            })
            .eq('member_id', memberId);
        
        if (updateError) throw updateError;
        
        console.log(`Bonus updated for ${memberId}: ${bonusAmount} tk, Level: ${level}, Count: ${referralCount}`);
        
        return { bonusAmount, level, referralCount, perReferralBonus };
        
    } catch(error) {
        console.error('Calculate bonus error:', error);
        return { bonusAmount: 0, level: 0, referralCount: 0, perReferralBonus: 0 };
    }
}

// ৫. নির্দিষ্ট মেম্বারের রেফারেল তথ্য লোড করা
async function loadReferralInfo(memberId) {
    try {
        if (!supabaseClient) await initSupabase();
        
        const { data: member, error: memberError } = await supabaseClient
            .from(window.TABLES.MEMBERS)
            .select('referral_bonus, referral_level, referral_count, referral_code, per_referral_bonus, full_name')
            .eq('member_id', memberId)
            .single();
        
        if (memberError) throw memberError;
        
        let referralCode = member.referral_code;
        if (!referralCode) {
            referralCode = generateReferralCode(member.full_name);
            await supabaseClient
                .from(window.TABLES.MEMBERS)
                .update({ referral_code: referralCode })
                .eq('member_id', memberId);
        }
        
        const { data: myReferrals, error: referralsError } = await supabaseClient
            .from(window.TABLES.REFERRALS)
            .select('referred_name, referred_id, status, created_at, completed_at')
            .eq('referrer_id', memberId)
            .order('created_at', { ascending: false });
        
        return {
            referralCode,
            referralBonus: member.referral_bonus || 0,
            referralLevel: member.referral_level || 0,
            referralCount: member.referral_count || 0,
            perReferralBonus: member.per_referral_bonus || 0,
            referrals: myReferrals || []
        };
        
    } catch(error) {
        console.error('Load referral info error:', error);
        return null;
    }
}

// ৬. রেফারেল লিংক শেয়ার করার জন্য টেক্সট
function getReferralShareText(memberName, referralCode) {
    return `আমি ${memberName} TUKNBD তে সদস্য হয়েছি! আমার রেফারেল কোড: ${referralCode}\n\nআপনিও সদস্য হয়ে বোনাস পেতে পারেন।`;
}

// ==================== লেজারের জন্য ডাটা লোড ফাংশন ====================

async function loadLedgerData() {
    try {
        if (!supabaseClient) await initSupabase();
        
        // members লোড
        const { data: members, error: membersError } = await supabaseClient
            .from(window.TABLES.MEMBERS)
            .select('member_id, full_name, mobile, status')
            .eq('status', 'active');
        
        if (membersError) throw membersError;
        
        // payments লোড (approved payments)
        const { data: payments, error: paymentsError } = await supabaseClient
            .from(window.TABLES.PAYMENTS)
            .select('*')
            .eq('status', 'approved')
            .order('submitted_at', { ascending: true });
        
        if (paymentsError) throw paymentsError;
        
        // loans লোড
        const { data: loans, error: loansError } = await supabaseClient
            .from(window.TABLES.LOANS)
            .select('*');
        
        if (loansError) throw loansError;
        
        return {
            success: true,
            members: members || [],
            payments: payments || [],
            loans: loans || []
        };
        
    } catch(error) {
        console.error('Load ledger data error:', error);
        return {
            success: false,
            error: error.message,
            members: [],
            payments: [],
            loans: []
        };
    }
}

// ==================== কানেকশন টেস্ট ফাংশন ====================

async function testSupabaseConnection() {
    try {
        if (!supabaseClient) {
            const initialized = await initSupabase();
            if (!initialized) {
                console.error('❌ Could not initialize Supabase client');
                return false;
            }
        }
        
        const { data, error } = await supabaseClient
            .from(window.TABLES.MEMBERS)
            .select('count', { count: 'exact', head: true });
        
        if (error) throw error;
        
        console.log('✅ Supabase connection successful');
        console.log('📊 Members table exists and accessible');
        return true;
        
    } catch(error) {
        console.error('❌ Supabase connection failed:', error);
        console.log('💡 Make sure tables exist in Supabase');
        return false;
    }
}

// ==================== সহায়ক ফাংশন ====================

function showToast(message, type = 'info') {
    try {
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-600' : 
                       type === 'error' ? 'bg-red-600' : 'bg-blue-600';
        const icon = type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' : 'info-circle';
        
        toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 ${bgColor} animate-pulse`;
        toast.innerHTML = `<i class="fas fa-${icon} mr-2"></i>${message}`;
        
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    } catch (err) {
        console.log('[Toast]', message);
    }
}

// ==================== গ্লোবাল ফাংশন এক্সপোর্ট ====================

// Make all functions available globally
window.initSupabase = initSupabase;
window.supabaseClient = supabaseClient;
window.uploadProfileImageToSupabase = uploadProfileImageToSupabase;
window.generateReferralCode = generateReferralCode;
window.processReferral = processReferral;
window.completeReferralOnApproval = completeReferralOnApproval;
window.calculateAndAddBonus = calculateAndAddBonus;
window.loadReferralInfo = loadReferralInfo;
window.getReferralShareText = getReferralShareText;
window.loadLedgerData = loadLedgerData;
window.testSupabaseConnection = testSupabaseConnection;
window.showToast = showToast;

// ==================== অটো ইনিশিয়ালাইজেশন ====================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await initSupabase();
        await testSupabaseConnection();
    });
} else {
    (async () => {
        await initSupabase();
        await testSupabaseConnection();
    })();
}

console.log('✅ supabase-config.js loaded successfully');
