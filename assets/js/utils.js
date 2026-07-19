// ============================================================
// UTILITY FUNCTIONS - Toast, Format, Navigation, etc.
// ============================================================

export function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    const colors = {
        success: 'bg-emerald-600',
        error: 'bg-red-600',
        warning: 'bg-amber-600',
        info: 'bg-blue-600'
    };
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    toast.className = `toast-notification ${colors[type] || colors.success}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.success} mr-2"></i>${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

export function formatAmount(amt) {
    if (typeof amt !== 'number' || isNaN(amt)) return '0.00';
    return amt.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatAmountWithText(amt) {
    return formatAmount(amt) + ' টাকা';
}

export function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

let isDarkMode = false;

export function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('tukn_theme', isDarkMode ? 'dark' : 'light');
    const icon = document.getElementById('themeIcon');
    const headerIcon = document.getElementById('headerThemeIcon');
    if (icon) icon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
    if (headerIcon) headerIcon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
}

export function initTheme() {
    const savedTheme = localStorage.getItem('tukn_theme');
    if (savedTheme === 'dark') {
        isDarkMode = true;
        document.body.classList.add('dark-mode');
        const icon = document.getElementById('themeIcon');
        const headerIcon = document.getElementById('headerThemeIcon');
        if (icon) icon.className = 'fas fa-sun';
        if (headerIcon) headerIcon.className = 'fas fa-sun';
    }
}

export function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active-tab'));
    const tab = document.getElementById(tabName + 'Tab');
    if (tab) tab.classList.add('active-tab');
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
    if (btn) btn.classList.add('active');
    closeSidebar();
}

export function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebarMenu');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
    document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
}

export function closeSidebar() {
    const sidebar = document.getElementById('sidebarMenu');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

export function adminLogout() {
    if (confirm('লগআউট?')) {
        localStorage.removeItem('currentAdmin');
        localStorage.removeItem('currentBranchAdmin');
        sessionStorage.removeItem('currentAdmin');
        window.location.href = 'admin-login.html';
    }
}

export function updateVisitorCount() {
    let count = parseInt(localStorage.getItem('tukn_visitor_count_super_admin') || '0');
    count++;
    localStorage.setItem('tukn_visitor_count_super_admin', count);
    const el = document.getElementById('visitorCount');
    if (el) el.innerText = count;
}

// Notification System
export let notificationCount = 0;
export let notifications = [];

export function addNotification(message, type = 'info', link = null) {
    notifications.unshift({
        id: Date.now(),
        message,
        type,
        link,
        read: false,
        created_at: new Date().toISOString()
    });
    if (notifications.length > 50) notifications.pop();
    updateNotificationUI();
}

export function updateNotificationUI() {
    const count = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notifCount');
    if (badge) {
        badge.innerText = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
    const list = document.getElementById('notifList');
    if (list) {
        list.innerHTML = notifications.slice(0, 10).map(n => `
            <div class="p-2 border-b hover:bg-gray-50 cursor-pointer ${n.read ? 'opacity-60' : ''}"
                 onclick="${n.link ? `window.location.href='${n.link}'` : `markNotificationRead(${n.id})`}">
                <p class="text-sm">${n.message}</p>
                <span class="text-xs text-gray-400">${new Date(n.created_at).toLocaleString('bn-BD')}</span>
            </div>
        `).join('') || '<p class="text-sm text-gray-400 p-2">কোনো নোটিফিকেশন নেই</p>';
    }
}

window.markNotificationRead = function(id) {
    const notif = notifications.find(n => n.id === id);
    if (notif) notif.read = true;
    updateNotificationUI();
};

window.toggleNotification = function() {
    const dropdown = document.getElementById('notifDropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
};
