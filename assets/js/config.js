// ============================================================
// CONFIGURATION - Supabase Setup & Global Variables
// ============================================================

export const SUPABASE_URL = 'https://bffomfsffrtfgxyetzvm.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_A0BluIVwJ4M3Zd3JWpBoPg_NJSRu81D';

export let supabaseClient = null;
export let currentAdmin = null;
export let membersData = [];
export let allLoansData = [];
export let pendingPaymentsData = [];
export let pendingWithdrawalsData = [];
export let allProducts = [];
export let allCategories = [];
export let adminsData = [];
export let auditLogsData = [];
export let pendingLoanPaymentsData = [];
export let allApplicationsData = [];

export function initSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    try {
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log("✅ Supabase client initialized");
        }
    } catch(e) { console.error("Supabase init error:", e); }
    return supabaseClient;
}

export function setCurrentAdmin(admin) {
    currentAdmin = admin;
    if (admin) {
        localStorage.setItem('currentAdmin', JSON.stringify(admin));
    } else {
        localStorage.removeItem('currentAdmin');
    }
}

export function getCurrentAdmin() {
    if (currentAdmin) return currentAdmin;
    const stored = localStorage.getItem('currentAdmin');
    if (stored) {
        try {
            currentAdmin = JSON.parse(stored);
            return currentAdmin;
        } catch(e) { return null; }
    }
    return null;
}
