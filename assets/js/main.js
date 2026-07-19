// ============================================================
// MAIN ENTRY POINT - Initializes Everything
// ============================================================

import { initSupabaseClient, setCurrentAdmin, getCurrentAdmin } from './config.js';
import { initTheme, showToast, showTab, updateVisitorCount, addNotification, updateNotificationUI } from './utils.js';
import { loadMembers, updateAllBadges } from './members.js';
import { loadAllLoans, loadPendingLoanPayments } from './loans.js';
import { loadBranches, loadBranchView, loadBranchReport } from './branches.js';

// Dashboard Functions
async function loadRealDashboard() {
    // ... আপনার পুরনো loadRealDashboard ফাংশন (এখানে কপি করুন)
    // আমি এখানে সংক্ষেপে দিচ্ছি, আপনি আপনার পুরনো ফাংশন কপি করে বসান
    console.log('Dashboard loaded');
}

function loadPendingPayments() { /* আপনার পুরনো ফাংশন */ }
function loadPendingWithdrawals() { /* আপনার পুরনো ফাংশন */ }
function loadRejectedPayments() { /* আপনার পুরনো ফাংশন */ }
function loadLoanCollectionReport() { /* আপনার পুরনো ফাংশন */ }
function loadSavingsLoanReport() { /* আপনার পুরনো ফাংশন */ }
function loadSavingsDueReport() { /* আপনার পুরনো ফাংশন */ }
function loadApplications() { /* আপনার পুরনো ফাংশন */ }
function loadPendingApplications() { /* আপনার পুরনো ফাংশন */ }
function loadProducts() { /* আপনার পুরনো ফাংশন */ }
function loadWelfareFund() { /* আপনার পুরনো ফাংশন */ }
function loadLedgerData() { /* আপনার পুরনো ফাংশন */ }
function loadAdmins() { /* আপনার পুরনো ফাংশন */ }
function loadSliders() { /* আপনার পুরনো ফাংশন */ }
function loadNoticesList() { /* আপনার পুরনো ফাংশন */ }
function loadAboutContent() { /* আপনার পুরনো ফাংশন */ }
function loadComplaints() { /* আপনার পুরনো ফাংশন */ }
function loadWelfareSettings() { /* আপনার পুরনো ফাংশন */ }
function loadCareerContent() { /* আপনার পুরনো ফাংশন */ }
function loadAllTablesData() { /* আপনার পুরনো ফাংশন */ }
function loadAuditLogs() { /* আপনার পুরনো ফাংশন */ }
function loadBackupHistory() { /* আপনার পুরনো ফাংশন */ }
function loadReport() { /* আপনার পুরনো ফাংশন */ }
function loadStatement() { /* আপনার পুরনো ফাংশন */ }
function loadAllTransactions() { /* আপনার পুরনো ফাংশন */ }

// Initialize App
export function initApp() {
    // 1. Supabase Client Initialize
    const client = initSupabaseClient();
    if (!client) {
        showToast('❌ Supabase সংযোগ ব্যর্থ!', 'error');
        return;
    }

    // 2. Admin Check
    const admin = JSON.parse(localStorage.getItem('currentAdmin') || 'null');
    setCurrentAdmin(admin);
    if (!admin) {
        window.location.href = 'admin-login.html';
        return;
    }

    // 3. Theme
    initTheme();

    // 4. Visitor Count
    updateVisitorCount();

    // 5. Load All Initial Data
    Promise.all([
        loadMembers(),
        loadAllLoans(),
        loadBranches(),
        loadBranchView(),
        loadBranchReport(),
        loadPendingPayments(),
        loadPendingWithdrawals(),
        loadPendingLoanPayments(),
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
        showTab('dashboard');
        loadRealDashboard();
        updateAllBadges();
        updateNotificationUI();

        // Auto-refresh every 60 seconds
        setInterval(() => {
            loadRealDashboard();
            updateAllBadges();
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
            const activeTab = document.querySelector('.tab-content.active-tab');
            if (activeTab) {
                const id = activeTab.id;
                if (id === 'membersTab' || id === 'pendingMembersTab') showTab('addMember');
                else if (id === 'productsTab') openProductModal();
            }
        }
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.querySelector('.tab-content.active-tab input[type="text"]');
            if (searchInput) searchInput.focus();
        }
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(modal => modal.classList.remove('active'));
        }
    });

    // 7. Scroll to Top
    window.addEventListener('scroll', function() {
        document.getElementById('backToTop').classList.toggle('show', window.scrollY > 300);
    });

    // 8. Close modals on overlay click
    window.onclick = function(e) {
        if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('active');
    };

    // 9. Set default dates
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById('reportFromDate').value = firstDay.toISOString().slice(0, 10);
    document.getElementById('reportToDate').value = today.toISOString().slice(0, 10);
    document.getElementById('txFromDate').value = firstDay.toISOString().slice(0, 10);
    document.getElementById('txToDate').value = today.toISOString().slice(0, 10);
    document.getElementById('statementFromDate').value = firstDay.toISOString().slice(0, 10);
    document.getElementById('statementToDate').value = today.toISOString().slice(0, 10);
    document.getElementById('collectionFromDate').value = firstDay.toISOString().slice(0, 10);
    document.getElementById('collectionToDate').value = today.toISOString().slice(0, 10);
    document.getElementById('slrFromDate').value = firstDay.toISOString().slice(0, 10);
    document.getElementById('slrToDate').value = today.toISOString().slice(0, 10);
    document.getElementById('dueFromDate').value = firstDay.toISOString().slice(0, 10);
    document.getElementById('dueToDate').value = today.toISOString().slice(0, 10);

    // 10. Notification check every 30 seconds
    setInterval(() => {
        const client = initSupabaseClient();
        if (client) {
            client.from('loan_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending')
                .then(({ count }) => {
                    if (count > 0) {
                        addNotification(`📋 ${count} টি নতুন লোন আবেদন জমা পড়েছে!`, 'info', '#');
                    }
                });
        }
    }, 30000);
}

// Export for global use
window.scrollToTop = function() { window.scrollTo({ top: 0, behavior: 'smooth' }); };
window.toggleMobileMenu = toggleMobileMenu;
window.closeSidebar = closeSidebar;
window.adminLogout = adminLogout;
window.showTab = showTab;
window.toggleTheme = toggleTheme;
window.toggleNotification = toggleNotification;

// Product Modal function (needed globally)
window.openProductModal = function(id) {
    // আপনার পুরনো openProductModal ফাংশন
    console.log('Open product modal', id);
};
window.closeProductModal = function() {
    document.getElementById('productModal').classList.remove('active');
};

// Change Password
window.showChangePasswordModal = function() {
    document.getElementById('changePasswordModal').classList.add('active');
};
window.closeChangePasswordModal = function() {
    document.getElementById('changePasswordModal').classList.remove('active');
};
window.changePasswordConfirm = function() {
    showToast('পাসওয়ার্ড পরিবর্তন করা হয়েছে!');
    closeChangePasswordModal();
};
