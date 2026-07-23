// ============================================================
// UTILITY FUNCTIONS - All Common Functions
// ============================================================

import { supabaseClient } from './config.js';

// ============================================================
// টোস্ট নোটিফিকেশন
// ============================================================
export function showToast(message, type = 'success') {
    // পুরনো টোস্ট রিমুভ
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-red-600' : type === 'warning' ? 'bg-amber-600' : 'bg-blue-600'}`;
    toast.innerHTML = `
        <div class="flex items-center gap-3">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 14px 24px;
        border-radius: 12px;
        color: white;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 90%;
        font-family: 'Noto Sans Bengali', sans-serif;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// ============================================================
// ট্যাব সুইচিং
// ============================================================
export function showTab(tabId) {
    // সব ট্যাব কন্টেন্ট হাইড
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.remove('active');
        el.classList.remove('active-tab');
    });
    
    // সব ট্যাব বাটন থেকে active ক্লাস রিমুভ
    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('active');
        el.classList.remove('tab-active');
    });
    
    // টার্গেট ট্যাব দেখান
    const target = document.getElementById(tabId);
    if (target) {
        target.classList.add('active');
        target.classList.add('active-tab');
    }
    
    // টার্গেট বাটন active করুন
    const btn = document.querySelector(`[data-tab="${tabId}"]`);
    if (btn) {
        btn.classList.add('active');
        btn.classList.add('tab-active');
    }
}

// ============================================================
// থিম
// ============================================================
export function initTheme() {
    const isDark = localStorage.getItem('tukn_dark_mode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
        const icon = document.getElementById('darkModeIcon');
        if (icon) icon.className = 'fas fa-sun';
    }
}

// ============================================================
// নোটিফিকেশন সিস্টেম
// ============================================================
let notifications = [];

export function addNotification(message, type = 'info', link = '#') {
    notifications.push({ message, type, link, time: new Date() });
    if (notifications.length > 50) notifications.shift();
    localStorage.setItem('tukn_notifications', JSON.stringify(notifications));
    updateNotificationUI();
}

export function updateNotificationUI() {
    const container = document.getElementById('notificationList');
    const badge = document.getElementById('notificationBadge');
    
    if (!container) return;
    
    try {
        const saved = localStorage.getItem('tukn_notifications');
        if (saved) notifications = JSON.parse(saved);
    } catch(e) { notifications = []; }
    
    if (notifications.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 py-4">কোনো নোটিফিকেশন নেই</div>';
        if (badge) badge.style.display = 'none';
        return;
    }
    
    container.innerHTML = notifications.slice().reverse().map(n => `
        <div class="notification-item p-3 border-b hover:bg-gray-50 transition cursor-pointer" onclick="window.location.href='${n.link}'">
            <div class="flex items-start gap-3">
                <i class="fas ${n.type === 'success' ? 'fa-check-circle text-emerald-500' : n.type === 'error' ? 'fa-exclamation-circle text-red-500' : n.type === 'warning' ? 'fa-exclamation-triangle text-amber-500' : 'fa-info-circle text-blue-500'} mt-1"></i>
                <div>
                    <p class="text-sm">${n.message}</p>
                    <p class="text-xs text-gray-400">${new Date(n.time).toLocaleString('bn-BD')}</p>
                </div>
            </div>
        </div>
    `).join('');
    
    if (badge) {
        badge.style.display = 'flex';
        badge.innerText = notifications.length;
    }
}

// ============================================================
// ব্যাজ আপডেট
// ============================================================
export function updateAllBadges() {
    // বিভিন্ন কাউন্ট আপডেট
    const client = supabaseClient;
    if (!client) return;
    
    // পেন্ডিং লোন
    client.from('loan_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        .then(({ count }) => {
            const badge = document.getElementById('pendingLoanBadge');
            if (badge) {
                if (count > 0) {
                    badge.style.display = 'flex';
                    badge.innerText = count;
                } else {
                    badge.style.display = 'none';
                }
            }
        })
        .catch(e => console.warn('Badge update error:', e));
    
    // পেন্ডিং পেমেন্ট
    client.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        .then(({ count }) => {
            const badge = document.getElementById('pendingPaymentBadge');
            if (badge) {
                if (count > 0) {
                    badge.style.display = 'flex';
                    badge.innerText = count;
                } else {
                    badge.style.display = 'none';
                }
            }
        })
        .catch(e => console.warn('Badge update error:', e));
}

// ============================================================
// ভিজিটর কাউন্ট (সম্পূর্ণ আপডেটেড)
// ============================================================
export async function updateVisitorCount() {
    const visitorElement = document.getElementById('topVisitors');
    if (!visitorElement) {
        console.warn('⚠️ topVisitors element not found');
        return;
    }

    try {
        const client = supabaseClient;
        if (!client) {
            // Supabase না থাকলে লোকাল কাউন্ট দেখান
            const localCount = parseInt(localStorage.getItem('tukn_visitor_count_total') || '0');
            visitorElement.innerHTML = localCount.toLocaleString();
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const sessionKey = `tukn_visited_${today}`;

        // ✅ আজকে এই ব্রাউজারে ভিজিট করেছেন কিনা চেক করুন
        if (!sessionStorage.getItem(sessionKey)) {
            try {
                // আজকের রেকর্ড খুঁজুন
                let { data: existing, error: findError } = await client
                    .from('visitor_stats')
                    .select('id, today_count, total_count')
                    .eq('visit_date', today)
                    .maybeSingle();

                if (findError) {
                    console.error('Find error:', findError);
                }

                if (existing) {
                    // আপডেট করুন
                    const { error: updateError } = await client
                        .from('visitor_stats')
                        .update({ 
                            today_count: (existing.today_count || 0) + 1,
                            total_count: (existing.total_count || 0) + 1,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existing.id);

                    if (updateError) {
                        console.error('Update error:', updateError);
                    } else {
                        console.log(`✅ ভিজিটর কাউন্ট আপডেট: আজ ${(existing.today_count || 0) + 1}, মোট ${(existing.total_count || 0) + 1}`);
                    }
                } else {
                    // নতুন রেকর্ড তৈরি করুন
                    const { error: insertError } = await client
                        .from('visitor_stats')
                        .insert([{ 
                            visit_date: today, 
                            today_count: 1,
                            total_count: 1,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }]);

                    if (insertError) {
                        console.error('Insert error:', insertError);
                    } else {
                        console.log('✅ নতুন ভিজিটর রেকর্ড তৈরি হয়েছে');
                    }
                }

                // সেশন সেট করুন (আজকে আর কাউন্ট বাড়বে না)
                sessionStorage.setItem(sessionKey, 'true');

            } catch(e) {
                console.error('Visitor count update error:', e);
            }
        }

        // ✅ সর্বমোট ভিজিটর কাউন্ট দেখান
        try {
            const { data: allVisitors, error: countError } = await client
                .from('visitor_stats')
                .select('total_count');

            if (countError) throw countError;

            let totalVisitors = 0;
            if (allVisitors && allVisitors.length > 0) {
                totalVisitors = allVisitors.reduce((sum, row) => sum + (row.total_count || 0), 0);
                localStorage.setItem('tukn_visitor_count_total', totalVisitors);
            } else {
                // কোনো রেকর্ড না থাকলে লোকাল কাউন্ট ব্যবহার করুন
                totalVisitors = parseInt(localStorage.getItem('tukn_visitor_count_total') || '0');
            }
            
            visitorElement.innerHTML = totalVisitors.toLocaleString();
            console.log(`👁️ মোট ভিজিটর: ${totalVisitors}`);

        } catch(e) {
            console.error('Count error:', e);
            const localCount = parseInt(localStorage.getItem('tukn_visitor_count_total') || '0');
            visitorElement.innerHTML = localCount.toLocaleString();
        }

    } catch(error) {
        console.error('Visitor update error:', error);
        const localCount = parseInt(localStorage.getItem('tukn_visitor_count_total') || '0');
        visitorElement.innerHTML = localCount.toLocaleString();
    }
}

// ============================================================
// ফরম্যাট ইউটিলিটি
// ============================================================
export function formatAmount(amount) {
    return Number(amount || 0).toLocaleString('en-IN');
}

export function formatAmountWithText(amount) {
    const num = Number(amount || 0);
    if (num === 0) return '০ টাকা';
    return num.toLocaleString('en-IN') + ' টাকা';
}

export function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('bn-BD', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    } catch(e) { return '-'; }
}

export function formatDateTime(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleString('bn-BD', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch(e) { return '-'; }
}

// ============================================================
// র‍্যান্ডম আইডি জেনারেটর
// ============================================================
export function generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}${timestamp}${random}`.toUpperCase();
}

// ============================================================
// ডিবাউন্স
// ============================================================
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================================
// স্ট্রিং ট্রাঙ্কেট
// ============================================================
export function truncateText(text, maxLength = 50) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// ============================================================
// গ্লোবাল ফাংশন এক্সপোর্ট
// ============================================================
window.showToast = showToast;
window.showTab = showTab;
window.updateVisitorCount = updateVisitorCount;
window.addNotification = addNotification;
window.updateNotificationUI = updateNotificationUI;
window.updateAllBadges = updateAllBadges;
window.formatAmount = formatAmount;
window.formatAmountWithText = formatAmountWithText;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;

console.log('✅ utils.js loaded successfully');
