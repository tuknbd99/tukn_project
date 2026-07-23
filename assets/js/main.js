// ============================================================
// MAIN ENTRY POINT - Initializes Everything
// ============================================================

import { initSupabaseClient, setCurrentAdmin, getCurrentAdmin } from './config.js';
import { initTheme, showToast, showTab, updateVisitorCount, addNotification, updateNotificationUI } from './utils.js';
import { loadMembers, updateAllBadges } from './members.js';
import { loadAllLoans, loadPendingLoanPayments } from './loans.js';
import { loadBranches, loadBranchView, loadBranchReport } from './branches.js';

// ============================================================
// সাইডবার ফাংশন
// ============================================================
function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
        document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
        sidebar.classList.remove('open');
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// ============================================================
// অ্যাডমিন লগআউট
// ============================================================
function adminLogout() {
    if (confirm('আপনি কি নিশ্চিত যে লগআউট করতে চান?')) {
        localStorage.removeItem('tukn_admin');
        sessionStorage.removeItem('tukn_admin');
        showToast('✅ লগআউট সফল!', 'success');
        setTimeout(() => {
            window.location.href = 'admin-login.html';
        }, 1000);
    }
}

// ============================================================
// থিম টগল
// ============================================================
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('tukn_dark_mode', isDark);
    const icon = document.getElementById('darkModeIcon');
    if (icon) {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
    showToast(isDark ? '🌙 ডার্ক মোড সক্রিয়' : '☀️ লাইট মোড সক্রিয়', 'info');
}

function loadTheme() {
    const isDark = localStorage.getItem('tukn_dark_mode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
        const icon = document.getElementById('darkModeIcon');
        if (icon) {
            icon.className = 'fas fa-sun';
        }
    }
}

// ============================================================
// নোটিফিকেশন টগল
// ============================================================
function toggleNotification() {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
        panel.classList.toggle('hidden');
    }
}

// ============================================================
// Dashboard Functions
// ============================================================
async function loadRealDashboard() {
    console.log('📊 ড্যাশবোর্ড লোড হচ্ছে...');
    try {
        const client = initSupabaseClient();
        if (!client) return;
        
        // মোট সদস্য
        const { count: totalMembers, error: membersError } = await client
            .from('members')
            .select('*', { count: 'exact', head: true });
        
        if (!membersError) {
            const el = document.getElementById('totalMembers');
            if (el) el.innerText = totalMembers || 0;
        }
        
        // মোট লোন
        const { count: totalLoans, error: loansError } = await client
            .from('loan_applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'approved');
        
        if (!loansError) {
            const el = document.getElementById('totalLoans');
            if (el) el.innerText = totalLoans || 0;
        }
        
        // পেন্ডিং লোন
        const { count: pendingLoans, error: pendingError } = await client
            .from('loan_applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        
        if (!pendingError) {
            const el = document.getElementById('pendingLoans');
            if (el) el.innerText = pendingLoans || 0;
        }
        
        console.log('✅ ড্যাশবোর্ড লোড সম্পূর্ণ');
    } catch(e) {
        console.error('ড্যাশবোর্ড লোড error:', e);
    }
}

// ============================================================
// প্লেসহোল্ডার ফাংশন (যেগুলো main.js এ কল হচ্ছে)
// ============================================================
function loadPendingPayments() { 
    console.log('📋 পেন্ডিং পেমেন্ট লোড হচ্ছে...');
    try {
        const container = document.getElementById('pendingPaymentsList');
        if (container) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">কোনো পেন্ডিং পেমেন্ট নেই</div>';
        }
    } catch(e) { console.warn('Pending payments error:', e); }
}

function loadPendingWithdrawals() { 
    console.log('📋 পেন্ডিং উইথড্র লোড হচ্ছে...');
    try {
        const container = document.getElementById('pendingWithdrawalsList');
        if (container) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">কোনো পেন্ডিং উইথড্র নেই</div>';
        }
    } catch(e) { console.warn('Pending withdrawals error:', e); }
}

function loadRejectedPayments() { 
    console.log('📋 রিজেক্টেড পেমেন্ট লোড হচ্ছে...');
    try {
        const container = document.getElementById('rejectedPaymentsList');
        if (container) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">কোনো রিজেক্টেড পেমেন্ট নেই</div>';
        }
    } catch(e) { console.warn('Rejected payments error:', e); }
}

function loadLoanCollectionReport() { 
    console.log('📊 লোন কালেকশন রিপোর্ট লোড হচ্ছে...');
    try {
        const container = document.getElementById('loanCollectionReport');
        if (container) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">কোনো ডেটা নেই</div>';
        }
    } catch(e) { console.warn('Loan collection report error:', e); }
}

function loadSavingsLoanReport() { 
    console.log('📊 সেভিংস লোন রিপোর্ট লোড হচ্ছে...');
    try {
        const container = document.getElementById('savingsLoanReport');
        if (container) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">কোনো ডেটা নেই</div>';
        }
    } catch(e) { console.warn('Savings loan report error:', e); }
}

function loadSavingsDueReport() { 
    console.log('📊 সেভিংস ডিউ রিপোর্ট লোড হচ্ছে...');
    try {
        const container = document.getElementById('savingsDueReport');
        if (container) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">কোনো ডেটা নেই</div>';
        }
    } catch(e) { console.warn('Savings due report error:', e); }
}

function loadApplications() { 
    console.log('📋 অ্যাপ্লিকেশন লোড হচ্ছে...');
    try {
        const container = document.getElementById('applicationsList');
        if (container) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">কোনো অ্যাপ্লিকেশন নেই</div>';
        }
    } catch(e) { console.warn('Applications load error:', e); }
}

function loadPendingApplications() { 
    console.log('📋 পেন্ডিং অ্যাপ্লিকেশন লোড হচ্ছে...');
    try {
        const container = document.getElementById('pendingApplicationsList');
        if (container) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">কোনো পেন্ডিং অ্যাপ্লিকেশন নেই</div>';
        }
    } catch(e) { console.warn('Pending applications error:', e); }
}

function loadProducts() { 
    console.log('📦 পণ্য লোড হচ্ছে...');
    try {
        const container = document.getElementById('productsList');
        if (container) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">কোনো পণ্য নেই</div>';
        }
    } catch(e) { console.warn('Products load error:', e); }
}

function loadWelfareFund() { 
    console.log('💰 ওয়েলফেয়ার ফান্ড লোড হচ্ছে...');
    try {
        const el = document.getElementById('welfareFundBalance');
        if (el) {
            el.innerHTML = '০ টাকা';
        }
    } catch(e) { console.warn('Welfare fund error:', e); }
}

function loadLedgerData() { 
    console.log('📒 লেজার ডেটা লোড হচ্ছে...');
    try {
        const container = document.getElementById('ledgerTableBody');
        if (container) {
            container.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">কোনো ডেটা নেই</td></tr>';
        }
    } catch(e) { console.warn('Ledger data error:', e); }
}

function loadAdmins() { 
    console.log('👤 অ্যাডমিন লোড হচ্ছে...');
    try {
        const container = document.getElementById('adminsList');
        if (container) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">কোনো অ্যাডমিন নেই</div>';
        }
    } catch(e) { console.warn('Admins load error:', e); }
}

function loadSliders() { 
    console.log('🎠 স্লাইডার লোড হচ্ছে...');
    try {
        const container = document.getElementById('slidersList');
        if (container) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">কোনো স্লাইডার নেই</div>';
        }
    } catch(e) { console.warn('Sliders load error:', e); }
}

function loadNoticesList() { 
    console.log('📢 নোটিশ লোড হচ্ছে...');
    try {
        const container = document.getElementById('noticesList');
        if (container) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">কোনো নোটিশ নেই</div>';
        }
    } catch(e) { console.warn('Notices load error:', e); }
}

function loadAboutContent() { 
    console.log('ℹ️ অ্যাবাউট কন্টেন্ট লোড হচ্ছে...');
    try {
        const el = document.getElementById('aboutContent');
        if (el) {
            el.innerHTML = '<p class="text-gray-500">কোনো কন্টেন্ট নেই</p>';
        }
    } catch(e) { console.warn('About content error:', e); }
}

function loadComplaints() { 
    console.log('📝 কমপ্লেইন্ট লোড হচ্ছে...');
    try {
        const container = document.getElementById('complaintsList');
        if (container) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">কোনো কমপ্লেইন্ট নেই</div>';
        }
    } catch(e) { console.warn('Complaints load error:', e); }
}

function loadWelfareSettings() { 
    console.log('⚙️ ওয়েলফেয়ার সেটিংস লোড হচ্ছে...');
    try {
        const el = document.getElementById('welfareSettings');
        if (el) {
            el.innerHTML = '<p class="text-gray-500">সেটিংস লোড হয়েছে</p>';
        }
    } catch(e) { console.warn('Welfare settings error:', e); }
}

function loadCareerContent() { 
    console.log('💼 ক্যারিয়ার কন্টেন্ট লোড হচ্ছে...');
    try {
        const el = document.getElementById('careerContent');
        if (el) {
            el.innerHTML = '<p class="text-gray-500">কোনো ক্যারিয়ার কন্টেন্ট নেই</p>';
        }
    } catch(e) { console.warn('Career content error:', e); }
}

function loadAllTablesData() { 
    console.log('📊 সব টেবিল ডেটা লোড হচ্ছে...');
    try {
        // বিভিন্ন টেবিল আপডেট
        const tables = document.querySelectorAll('.data-table');
        tables.forEach(table => {
            const tbody = table.querySelector('tbody');
            if (tbody && tbody.children.length === 0) {
                tbody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-gray-500">কোনো ডেটা নেই</td></tr>';
            }
        });
    } catch(e) { console.warn('All tables data error:', e); }
}

function loadAuditLogs() { 
    console.log('📜 অডিট লগ লোড হচ্ছে...');
    try {
        const container = document.getElementById('auditLogsList');
        if (container) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">কোনো লগ নেই</div>';
        }
    } catch(e) { console.warn('Audit logs error:', e); }
}

function loadBackupHistory() { 
    console.log('💾 ব্যাকআপ হিস্ট্রি লোড হচ্ছে...');
    try {
        const container = document.getElementById('backupHistoryList');
        if (container) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">কোনো ব্যাকআপ নেই</div>';
        }
    } catch(e) { console.warn('Backup history error:', e); }
}

function loadReport() { 
    console.log('📊 রিপোর্ট লোড হচ্ছে...');
    try {
        const container = document.getElementById('reportContent');
        if (container) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">রিপোর্ট জেনারেট করুন</div>';
        }
    } catch(e) { console.warn('Report error:', e); }
}

function loadStatement() { 
    console.log('📄 স্টেটমেন্ট লোড হচ্ছে...');
    try {
        const container = document.getElementById('statementContent');
        if (container) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">স্টেটমেন্ট জেনারেট করুন</div>';
        }
    } catch(e) { console.warn('Statement error:', e); }
}

function loadAllTransactions() { 
    console.log('💳 সব ট্রানজেকশন লোড হচ্ছে...');
    try {
        const container = document.getElementById('transactionsList');
        if (container) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4">কোনো ট্রানজেকশন নেই</div>';
        }
    } catch(e) { console.warn('Transactions error:', e); }
}

// ============================================================
// প্রোডাক্ট মডাল
// ============================================================
function openProductModal(id) {
    console.log('📦 প্রোডাক্ট মডাল খোলা হচ্ছে', id);
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.classList.add('active');
    } else {
        console.warn('⚠️ productModal element not found');
    }
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// ============================================================
// পাসওয়ার্ড পরিবর্তন
// ============================================================
function showChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.classList.add('active');
    } else {
        console.warn('⚠️ changePasswordModal element not found');
    }
}

function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function changePasswordConfirm() {
    const currentPass = document.getElementById('currentPassword');
    const newPass = document.getElementById('newPassword');
    const confirmPass = document.getElementById('confirmPassword');
    
    if (!currentPass || !newPass || !confirmPass) {
        showToast('❌ পাসওয়ার্ড ফিল্ড পাওয়া যায়নি!', 'error');
        return;
    }
    
    if (newPass.value !== confirmPass.value) {
        showToast('❌ নতুন পাসওয়ার্ড মিলছে না!', 'error');
        return;
    }
    
    if (newPass.value.length < 6) {
        showToast('❌ পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে!', 'error');
        return;
    }
    
    showToast('✅ পাসওয়ার্ড পরিবর্তন করা হয়েছে!', 'success');
    closeChangePasswordModal();
    
    // ফিল্ড ক্লিয়ার
    currentPass.value = '';
    newPass.value = '';
    confirmPass.value = '';
}

// ============================================================
// Initialize App
// ============================================================
export function initApp() {
    console.log('🚀 অ্যাপ ইনিশিয়ালাইজ হচ্ছে...');
    
    // 1. থিম লোড
    loadTheme();
    
    // 2. Supabase Client Initialize
    const client = initSupabaseClient();
    if (!client) {
        showToast('❌ Supabase সংযোগ ব্যর্থ!', 'error');
        return;
    }

    // 3. Admin Check
    const adminData = localStorage.getItem('currentAdmin');
    let admin = null;
    try {
        admin = adminData ? JSON.parse(adminData) : null;
    } catch(e) {
        console.warn('Admin data parse error:', e);
    }
    
    setCurrentAdmin(admin);
    if (!admin) {
        window.location.href = 'admin-login.html';
        return;
    }

    // 4. Visitor Count
    try {
        updateVisitorCount();
    } catch(e) {
        console.warn('Visitor count error:', e);
    }

    // 5. Load All Initial Data
    Promise.all([
        loadMembers().catch(e => { console.warn('Members load error:', e); return; }),
        loadAllLoans().catch(e => { console.warn('Loans load error:', e); return; }),
        loadBranches().catch(e => { console.warn('Branches load error:', e); return; }),
        loadBranchView().catch(e => { console.warn('Branch view load error:', e); return; }),
        loadBranchReport().catch(e => { console.warn('Branch report load error:', e); return; }),
        loadPendingPayments(),
        loadPendingWithdrawals(),
        loadPendingLoanPayments().catch(e => { console.warn('Pending loan payments load error:', e); return; }),
        loadLoanCollectionReport(),
        loadSavingsLoanReport(),
        loadSavingsDueReport(),
        loadApplications(),
        loadPendingApplications(),
        loadProducts(),
        loadWelfareFund(),
        loadLedgerData(),
        loadAdmins(),
        loadSliders(),
        loadNoticesList(),
        loadAboutContent(),
        loadCareerContent(),
        loadComplaints(),
        loadWelfareSettings(),
        loadRejectedPayments(),
        loadAllTablesData(),
        loadAuditLogs(),
        loadBackupHistory(),
        loadReport(),
        loadAllTransactions()
    ]).then(() => {
        // Show Dashboard
        try {
            showTab('dashboard');
        } catch(e) {
            console.warn('Show tab error:', e);
        }
        
        try {
            loadRealDashboard();
        } catch(e) {
            console.warn('Dashboard load error:', e);
        }
        
        try {
            updateAllBadges();
        } catch(e) {
            console.warn('Badge update error:', e);
        }
        
        try {
            updateNotificationUI();
        } catch(e) {
            console.warn('Notification UI error:', e);
        }

        // Auto-refresh every 60 seconds
        setInterval(() => {
            try {
                loadRealDashboard();
                updateAllBadges();
            } catch(e) {
                console.warn('Auto-refresh error:', e);
            }
        }, 60000);

        console.log('✅ TUKNBD Super Admin Panel Loaded Successfully!');
    }).catch(e => {
        console.error('Initialization error:', e);
        showToast('❌ কিছু ডেটা লোড করতে সমস্যা!', 'error');
    });

    // 6. Event Listeners
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            try {
                const activeTab = document.querySelector('.tab-content.active-tab');
                if (activeTab) {
                    const id = activeTab.id;
                    if (id === 'membersTab' || id === 'pendingMembersTab') {
                        showTab('addMember');
                    } else if (id === 'productsTab') {
                        openProductModal();
                    }
                }
            } catch(e) { console.warn('Ctrl+N error:', e); }
        }
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            try {
                const searchInput = document.querySelector('.tab-content.active-tab input[type="text"]');
                if (searchInput) searchInput.focus();
            } catch(e) { console.warn('Ctrl+F error:', e); }
        }
        if (e.key === 'Escape') {
            try {
                document.querySelectorAll('.modal-overlay.active').forEach(modal => modal.classList.remove('active'));
            } catch(e) { console.warn('Escape error:', e); }
        }
    });

    // 7. Scroll to Top
    const backBtn = document.getElementById('backToTop');
    if (backBtn) {
        window.addEventListener('scroll', function() {
            backBtn.classList.toggle('show', window.scrollY > 300);
        });
    }

    // 8. Close modals on overlay click
    window.onclick = function(e) {
        if (e.target && e.target.classList && e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('active');
        }
    };

    // 9. Set default dates (নাল চেক সহ)
    try {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const dateStr = firstDay.toISOString().slice(0, 10);
        const todayStr = today.toISOString().slice(0, 10);
        
        const dateElements = [
            'reportFromDate', 'reportToDate', 'txFromDate', 'txToDate',
            'statementFromDate', 'statementToDate', 'collectionFromDate',
            'collectionToDate', 'slrFromDate', 'slrToDate',
            'dueFromDate', 'dueToDate'
        ];
        
        dateElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id.toLowerCase().includes('from')) {
                    el.value = dateStr;
                } else {
                    el.value = todayStr;
                }
            }
        });
    } catch(e) {
        console.warn('Date setting error:', e);
    }

    // 10. Notification check every 30 seconds
    setInterval(() => {
        try {
            const client = initSupabaseClient();
            if (client) {
                client.from('loan_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending')
                    .then(({ count, error }) => {
                        if (!error && count > 0) {
                            addNotification(`📋 ${count} টি নতুন লোন আবেদন জমা পড়েছে!`, 'info', '#');
                        }
                    })
                    .catch(e => console.warn('Notification check error:', e));
            }
        } catch(e) {
            console.warn('Notification interval error:', e);
        }
    }, 30000);
}

// ============================================================
// গ্লোবাল ফাংশন এক্সপোর্ট (window এর সাথে attach)
// ============================================================
window.scrollToTop = function() { 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
};

window.toggleMobileMenu = toggleMobileMenu;
window.closeSidebar = closeSidebar;
window.adminLogout = adminLogout;
window.showTab = showTab;
window.toggleTheme = toggleTheme;
window.toggleNotification = toggleNotification;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.showChangePasswordModal = showChangePasswordModal;
window.closeChangePasswordModal = closeChangePasswordModal;
window.changePasswordConfirm = changePasswordConfirm;

// ============================================================
// ডম লোড হলে ইনিশিয়ালাইজ
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, initializing app...');
    try {
        initApp();
    } catch(e) {
        console.error('❌ App initialization failed:', e);
        showToast('❌ অ্যাপ লোড করতে সমস্যা!', 'error');
    }
});

console.log('✅ main.js loaded successfully');
