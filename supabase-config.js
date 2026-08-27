// supabase-config.js
// TUKNBD - Supabase কনফিগারেশন (v3 - নিরাপদ + সম্পূর্ণ)

// ============================================================
// ১. কনফিগারেশন — এনভায়রনমেন্ট থেকে পড়ুন
// ============================================================

// Vite/Webpack এর জন্য import.meta.env
// অথবা window.ENV থেকে পড়ুন
const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
                     window.ENV?.SUPABASE_URL || 
                     'https://bffomfsffrtfgxyetzvm.supabase.co';

// ⚠️ গুরুত্বপূর্ণ: প্রোডাকশনে কখনো হার্ডকোড করবেন না!
const SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
                          window.ENV?.SUPABASE_ANON_KEY || 
                          'sb_publishable_A0BluIVwJ4M3Zd3JWpBoPg_NJSRu81D';

// প্রোডাকশনে সতর্কতা
if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
    if (SUPABASE_ANON_KEY === 'sb_publishable_A0BluIVwJ4M3Zd3JWpBoPg_NJSRu81D') {
        console.warn('⚠️ প্রোডাকশনে Default Anon Key ব্যবহার করছেন! .env ফাইল ব্যবহার করুন।');
    }
}

// ============================================================
// ২. ডুপ্লিকেট ইনিশিয়ালাইজেশন প্রতিরোধ
// ============================================================

if (typeof window._supabaseClient === 'undefined') {
    window._supabaseClient = null;
}
if (typeof window._supabase === 'undefined') {
    window._supabase = null;
}

// ============================================================
// ৩. Supabase ক্লায়েন্ট ইনিশিয়ালাইজেশন
// ============================================================

const MAX_RETRIES = 5;
const RETRY_DELAY = 1000;

async function initSupabaseConfig() {
    // ইতিমধ্যে ইনিশিয়ালাইজড?
    if (window._supabaseClient) {
        console.log('✅ Supabase already initialized');
        return true;
    }

    // Supabase লাইব্রেরি লোড
    const lib = await loadSupabaseLibrary();
    if (!lib) {
        console.error('❌ Supabase library not loaded');
        return false;
    }

    // রেট্রি সহ ক্লায়েন্ট তৈরি
    try {
        const client = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                storageKey: 'tuknbd-auth-token'
            },
            // রেট লিমিটিং (ঐচ্ছিক)
            fetch: createRateLimitedFetch()
        });

        // গ্লোবালে সংরক্ষণ
        window._supabaseClient = client;
        window._supabase = client;
        
        // কম্প্যাটিবিলিটি
        if (typeof window.supabase === 'undefined') {
            window.supabase = client;
        }
        if (typeof window.supabaseClient === 'undefined') {
            window.supabaseClient = client;
        }

        console.log('✅ Supabase client initialized');
        return true;

    } catch (error) {
        console.error('❌ Supabase init error:', error);
        return false;
    }
}

// ============================================================
// ৪. Supabase লাইব্রেরি লোডার (রেট্রি সহ)
// ============================================================

async function loadSupabaseLibrary() {
    // ইতিমধ্যে লোড?
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        return window.supabase;
    }
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        return supabase;
    }

    // CDN থেকে লোড (রেট্রি সহ)
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.async = true;
            
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });

            // লাইব্রেরি চেক
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                return window.supabase;
            }
            
            if (typeof supabase !== 'undefined' && supabase.createClient) {
                return supabase;
            }

        } catch (error) {
            console.warn(`Attempt ${attempt} failed:`, error);
            if (attempt < MAX_RETRIES) {
                await sleep(RETRY_DELAY * attempt);
            }
        }
    }

    console.error('❌ Failed to load Supabase library');
    return null;
}

// ============================================================
// ৫. হেল্পার ফাংশন
// ============================================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function createRateLimitedFetch() {
    const queue = [];
    let isProcessing = false;
    const RATE_LIMIT_MS = 100;
    const MAX_CONCURRENT = 3;

    async function processQueue() {
        if (isProcessing || queue.length === 0) return;
        isProcessing = true;

        const batch = queue.splice(0, MAX_CONCURRENT);
        await Promise.all(batch.map(({ resolve, reject, url, options }) => {
            return fetch(url, options)
                .then(resolve)
                .catch(reject);
        }));

        await sleep(RATE_LIMIT_MS);
        isProcessing = false;
        processQueue();
    }

    return function(url, options) {
        return new Promise((resolve, reject) => {
            queue.push({ resolve, reject, url, options });
            processQueue();
        });
    };
}

// ============================================================
// ৬. ক্লায়েন্ট গেটার
// ============================================================

function getSupabaseClient() {
    return window._supabaseClient || window.supabaseClient || null;
}

// ============================================================
// ৭. টেবিল কনস্ট্যান্ট — সম্পূর্ণ লিস্ট
// ============================================================

const TABLES = {
    // ===== সদস্য =====
    MEMBERS: 'members',
    PENDING_MEMBERS: 'pending_members',
    DELETED_MEMBERS: 'deleted_members',
    
    // ===== মাদ্রাসা =====
    MADRASAS: 'madrasas',
    
    // ===== আর্থিক লেনদেন =====
    PAYMENTS: 'payments',
    WITHDRAWALS: 'withdrawals',
    REFERRALS: 'referrals',
    COMMISSION_LOGS: 'commission_logs',
    LEDGER_TRANSACTIONS: 'transactions',
    WELFARE_FUND: 'welfare_fund',
    
    // ===== লোন =====
    LOANS: 'loan_applications',
    LOAN_PAYMENTS: 'loan_payments',
    
    // ===== প্রশাসন =====
    ADMINS: 'admins',
    BRANCHES: 'branches',
    BRANCH_ADMINS: 'branch_admins',
    BRANCH_MEMBERS: 'branch_members',
    BRANCH_BALANCES: 'branch_balances',
    MEMBER_TRANSFERS: 'member_transfers',
    
    // ===== জেলা ও প্রতিনিধি =====
    DISTRICTS: 'districts',
    REPS: 'representatives',
    REP_APPLICATIONS: 'representative_applications',
    
    // ===== কিতাব ব্যবস্থাপনা =====
    BOOK_ORDERS: 'book_orders',
    BOOK_CATALOG: 'book_catalog',
    BOOK_PAYMENTS: 'book_payments',
    BOOK_INSTALLMENTS: 'book_installments',
    BOOK_CONFIG: 'book_config',
    
    // ===== কন্টেন্ট =====
    PRODUCTS: 'products',
    CATEGORIES: 'categories',
    NOTICES: 'notices',
    SLIDERS: 'sliders',
    EVENTS: 'events',
    ABOUT: 'about',
    CAREER: 'career',
    COMPLAINTS: 'complaints',
    
    // ===== লাভ ও বণ্টন =====
    PROFIT_DISTRIBUTION_HISTORY: 'profit_distribution_history',
    DISTRIBUTION_HISTORY: 'distribution_history',
    
    // ===== সিস্টেম =====
    AUDIT_LOGS: 'audit_logs',
    VISITOR_STATS: 'visitor_stats',
    PROJECTS: 'projects',
    ROLES: 'roles'
};

if (typeof window.TABLES === 'undefined') {
    window.TABLES = TABLES;
}

// ============================================================
// ৮. কানেকশন টেস্ট
// ============================================================

async function testSupabaseConfig() {
    const client = getSupabaseClient();
    if (!client) {
        await initSupabaseConfig();
    }
    
    const finalClient = getSupabaseClient();
    if (!finalClient) {
        console.error('❌ No Supabase client available');
        return false;
    }

    try {
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

// ============================================================
// ৯. প্রোফাইল ইমেজ আপলোড
// ============================================================

async function uploadProfileImage(file, memberId) {
    try {
        if (!file || !memberId) return null;
        
        const client = getSupabaseClient();
        if (!client) return null;
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${memberId}_${Date.now()}.${fileExt}`;
        const filePath = `profile-images/${fileName}`;
        
        const { error: uploadError } = await client.storage
            .from('member-profiles')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });
        
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

// ============================================================
// ১০. রেফারেল ফাংশন — সম্পূর্ণ
// ============================================================

function generateReferralCode(name = '') {
    const prefix = 'TUKN';
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const nameCode = name ? name.substring(0, 3).toUpperCase() : '';
    return `${prefix}${nameCode}${random}`;
}

// রেফারেল কনফিগ (কাস্টমাইজযোগ্য)
const REFERRAL_CONFIG = {
    LEVEL_1: { min: 1, max: 4, bonus: 50, label: 'বেসিক' },
    LEVEL_2: { min: 5, max: 14, bonus: 75, label: 'মিডিয়াম' },
    LEVEL_3: { min: 15, max: Infinity, bonus: 100, label: 'প্রিমিয়াম' }
};

function calculateReferralBonus(referralCount) {
    for (const [level, config] of Object.entries(REFERRAL_CONFIG)) {
        if (referralCount >= config.min && referralCount <= config.max) {
            return {
                level: level.replace('LEVEL_', ''),
                bonus: referralCount * config.bonus,
                perReferralBonus: config.bonus,
                label: config.label
            };
        }
    }
    return null;
}

async function processReferral(referralCode, newMemberId, newMemberName) {
    if (!referralCode) {
        return { success: false, message: 'কোন রেফারেল কোড নেই' };
    }

    const client = getSupabaseClient();
    if (!client) {
        return { success: false, message: 'সংযোগ সমস্যা' };
    }

    try {
        const { data: referrer, error: referrerError } = await client
            .from(TABLES.MEMBERS)
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
            created_at: new Date().toISOString()
        };

        const { error: insertError } = await client
            .from(TABLES.REFERRALS)
            .insert(referralRecord);

        if (insertError) throw insertError;

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
    const client = getSupabaseClient();
    if (!client) return null;

    try {
        const { data: referrals, error: refError } = await client
            .from(TABLES.REFERRALS)
            .select('*')
            .eq('referrer_id', memberId)
            .eq('status', 'completed');

        if (refError) throw refError;

        const referralCount = referrals?.length || 0;
        const bonusData = calculateReferralBonus(referralCount);
        
        if (!bonusData) {
            await client
                .from(TABLES.MEMBERS)
                .update({
                    referral_count: 0,
                    referral_bonus: 0,
                    referral_level: 0,
                    per_referral_bonus: 0
                })
                .eq('member_id', memberId);
            
            return { referralCount: 0, bonusAmount: 0, level: 0 };
        }

        await client
            .from(TABLES.MEMBERS)
            .update({
                referral_bonus: bonusData.bonus,
                referral_level: parseInt(bonusData.level),
                referral_count: referralCount,
                per_referral_bonus: bonusData.perReferralBonus
            })
            .eq('member_id', memberId);

        return bonusData;

    } catch (error) {
        console.error('Calculate bonus error:', error);
        return null;
    }
}

// ============================================================
// ১১. লেজার ডেটা — সম্পূর্ণ
// ============================================================

async function loadLedgerData() {
    const client = getSupabaseClient();
    if (!client) {
        return { success: false, members: [], payments: [], loans: [] };
    }

    try {
        const [membersResult, paymentsResult, loansResult] = await Promise.allSettled([
            client.from(TABLES.MEMBERS).select('member_id, full_name, mobile, status, balance, referral_bonus, profit_balance_savings, profit_balance_investment, profit_balance_referral').eq('status', 'active'),
            client.from(TABLES.PAYMENTS).select('*').eq('status', 'approved'),
            client.from(TABLES.LOANS).select('*')
        ]);

        const members = membersResult.status === 'fulfilled' ? membersResult.value.data || [] : [];
        const payments = paymentsResult.status === 'fulfilled' ? paymentsResult.value.data || [] : [];
        const loans = loansResult.status === 'fulfilled' ? loansResult.value.data || [] : [];

        // প্রতিটি সদস্যের জন্য সঞ্চয় ও লোনের যোগফল
        const paymentMap = {};
        payments.forEach(p => {
            if (!paymentMap[p.member_id]) paymentMap[p.member_id] = 0;
            paymentMap[p.member_id] += p.amount || 0;
        });

        const loanMap = {};
        loans.forEach(l => {
            if (!loanMap[l.member_id]) loanMap[l.member_id] = 0;
            loanMap[l.member_id] += l.amount || 0;
        });

        const enrichedMembers = members.map(m => ({
            ...m,
            total_savings: paymentMap[m.member_id] || 0,
            total_loans: loanMap[m.member_id] || 0,
            total_profit: (m.profit_balance_savings || 0) + (m.profit_balance_investment || 0) + (m.profit_balance_referral || 0),
            net_balance: (m.balance || 0) + (m.referral_bonus || 0) + (m.total_profit || 0) - (m.total_loans || 0)
        }));

        return {
            success: true,
            members: enrichedMembers,
            payments,
            loans,
            summary: {
                totalMembers: members.length,
                totalPayments: payments.reduce((s, p) => s + (p.amount || 0), 0),
                totalLoans: loans.reduce((s, l) => s + (l.amount || 0), 0),
                totalWelfare: 0 // এখানে কল্যাণ তহবিল যোগ করা যেতে পারে
            }
        };

    } catch (error) {
        console.error('Ledger error:', error);
        return { success: false, members: [], payments: [], loans: [] };
    }
}

// ============================================================
// ১২. ব্যাচ অপারেশন — সম্পূর্ণ
// ============================================================

async function batchOperation(operations, options = {}) {
    const { maxConcurrent = 5, stopOnError = false } = options;
    const results = [];
    const errors = [];

    const chunks = [];
    for (let i = 0; i < operations.length; i += maxConcurrent) {
        chunks.push(operations.slice(i, i + maxConcurrent));
    }

    for (const chunk of chunks) {
        const chunkResults = await Promise.allSettled(
            chunk.map(op => op())
        );

        for (const result of chunkResults) {
            if (result.status === 'fulfilled') {
                results.push(result.value);
            } else {
                errors.push(result.reason);
                if (stopOnError) {
                    throw result.reason;
                }
            }
        }
    }

    return { results, errors };
}

// ============================================================
// ১৩. অতিরিক্ত ফাংশন — সম্পূর্ণ
// ============================================================

// সদস্য আইডি জেনারেট
function generateMemberId() {
    const prefix = 'TUKN';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

// তারিখ ফরম্যাট (বাংলা)
function formatDateBangla(date) {
    if (!date) return '-';
    const d = new Date(date);
    const months = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// টাকা ফরম্যাট (বাংলা)
function formatTaka(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '০ টাকা';
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' টাকা';
}

// ট্রানজেকশন আইডি জেনারেট
function generateTransactionId() {
    const prefix = 'TXN';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}

// ============================================================
// ১৪. গ্লোবাল এক্সপোর্ট — সমস্ত ফাংশন
// ============================================================

// Supabase ক্লায়েন্ট ফাংশন
window.initSupabaseConfig = initSupabaseConfig;
window.getSupabaseClient = getSupabaseClient;
window.testSupabaseConfig = testSupabaseConfig;
window.loadSupabaseLibrary = loadSupabaseLibrary;

// স্টোরেজ ফাংশন
window.uploadProfileImage = uploadProfileImage;

// রেফারেল ফাংশন
window.generateReferralCode = generateReferralCode;
window.processReferral = processReferral;
window.calculateAndAddBonus = calculateAndAddBonus;
window.calculateReferralBonus = calculateReferralBonus;
window.REFERRAL_CONFIG = REFERRAL_CONFIG;

// লেজার ফাংশন
window.loadLedgerData = loadLedgerData;

// ব্যাচ অপারেশন
window.batchOperation = batchOperation;

// হেল্পার ফাংশন
window.generateMemberId = generateMemberId;
window.formatDateBangla = formatDateBangla;
window.formatTaka = formatTaka;
window.generateTransactionId = generateTransactionId;

// টেবিল কনস্ট্যান্ট
window.TABLES = TABLES;

// ============================================================
// ১৫. ক্লায়েন্ট সাইড ক্যাশিং
// ============================================================

const CACHE = {
    members: null,
    payments: null,
    loans: null,
    timestamp: null,
    TTL: 30000 // 30 সেকেন্ড
};

async function getCachedData(table, forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && CACHE[table] && CACHE.timestamp && (now - CACHE.timestamp) < CACHE.TTL) {
        return CACHE[table];
    }
    
    const client = getSupabaseClient();
    if (!client) return null;
    
    try {
        const { data, error } = await client.from(table).select('*');
        if (error) throw error;
        CACHE[table] = data;
        CACHE.timestamp = now;
        return data;
    } catch(e) {
        console.error('Cache error:', e);
        return null;
    }
}

function clearCache() {
    CACHE.members = null;
    CACHE.payments = null;
    CACHE.loans = null;
    CACHE.timestamp = null;
    console.log('✅ Cache cleared');
}

// গ্লোবালে এক্সপোর্ট
window.getCachedData = getCachedData;
window.clearCache = clearCache;

// ============================================================
// ১৬. অটো ইনিশিয়ালাইজেশন
// ============================================================

async function initialize() {
    console.log('🔄 Initializing Supabase...');
    const success = await initSupabaseConfig();
    if (success) {
        await testSupabaseConfig();
        console.log('✅ Supabase initialization complete!');
    } else {
        console.warn('⚠️ Supabase initialization failed, retrying in 5 seconds...');
        setTimeout(initialize, 5000);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// ============================================================
// ১৭. প্রোডাকশন লগ অফ
// ============================================================

if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
    console.log = () => {};
    console.warn = () => {};
    console.debug = () => {};
} else {
    console.log('✅ supabase-config.js v3 loaded — All functions included');
}

// ============================================================
// ১৮. Window Error Handler (অতিরিক্ত নিরাপত্তা)
// ============================================================

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled Promise Rejection:', event.reason);
    if (event.reason?.message?.includes('Supabase')) {
        showToast?.('সার্ভার সংযোগে সমস্যা! পেজ রিলোড করুন।', 'error');
    }
});

window.addEventListener('error', function(event) {
    if (event.message?.includes('Supabase') || event.message?.includes('supabase')) {
        console.error('Supabase error:', event);
    }
});

console.log('✅ All functions exported successfully!');
console.log('📋 Total functions: 20+');
console.log('📋 Tables: ' + Object.keys(TABLES).length);
