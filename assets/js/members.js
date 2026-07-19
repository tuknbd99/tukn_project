// ============================================================
// MEMBERS MODULE - All Member Related Functions
// ============================================================

import { supabaseClient, membersData, getCurrentAdmin } from './config.js';
import { showToast, showTab, formatAmountWithText, addNotification } from './utils.js';

export async function loadMembers() {
    const client = supabaseClient;
    if (!client) return;
    try {
        const { data } = await client.from('members').select('*').order('created_at', { ascending: false });
        membersData.length = 0;
        membersData.push(...(data || []));
        renderMembersList();
        renderPendingMembersList();
        renderDeletedMembersList();
        await updateAllBadges();
    } catch(e) { console.error('Members load error:', e); }
}

export function renderMembersList() {
    const tbody = document.getElementById('membersList');
    if (!tbody) return;
    const search = document.getElementById('searchMember')?.value?.toLowerCase() || '';
    let filtered = membersData.filter(m => (m.full_name?.toLowerCase().includes(search) || m.mobile?.includes(search)) && m.status !== 'deleted');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="text-center p-4">কোনো সদস্য নেই</td></tr>';
        return;
    }
    tbody.innerHTML = filtered.map(m => `<tr>
        <td>${m.member_id || '-'}</td>
        <td>${m.full_name || '-'}</td>
        <td>${m.mobile || '-'}</td>
        <td>${m.password || '123456'}</td>
        <td>${m.present_district || '-'}</td>
        <td><span class="status-badge ${m.status==='active'?'status-active':m.status==='pending'?'status-pending':'status-inactive'}">${m.status==='active'?'সক্রিয়':m.status==='pending'?'পেন্ডিং':'নিষ্ক্রিয়'}</span></td>
        <td>${formatAmountWithText(m.balance || 0)}</td>
        <td>${formatAmountWithText(m.referral_bonus || 0)}</td>
        <td>${formatAmountWithText(m.profit_balance_savings || 0)}</td>
        <td>${formatAmountWithText(m.profit_balance_investment || 0)}</td>
        <td>${formatAmountWithText(m.profit_balance_referral || 0)}</td>
        <td><button onclick="editMember('${m.member_id}')" class="btn btn-info btn-sm"><i class="fas fa-edit"></i></button></td>
    </tr>`).join('');
}

export function renderPendingMembersList() {
    const tbody = document.getElementById('pendingMembersList');
    if (!tbody) return;
    const pending = membersData.filter(m => m.status === 'pending');
    if (pending.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center p-4"><i class="fas fa-check-circle text-green-500 text-2xl"></i> কোনো পেন্ডিং সদস্য নেই</td></tr>';
        return;
    }
    tbody.innerHTML = pending.map(m => `<tr>
        <td>${m.created_at ? new Date(m.created_at).toLocaleDateString('bn-BD') : '-'}</td>
        <td>${m.full_name}</td>
        <td>${m.mobile}</td>
        <td>${m.present_district || '-'}</td>
        <td class="text-right font-bold text-emerald-600">${(m.monthly_savings||500).toLocaleString()} টাকা</td>
        <td><button onclick="approveMember('${m.member_id}')" class="btn btn-success btn-sm">✅ অনুমোদন</button></td>
        <td><button onclick="deleteMember('${m.member_id}')" class="btn btn-danger btn-sm">🗑️ বাতিল</button></td>
    </tr>`).join('');
}

export function renderDeletedMembersList() {
    const tbody = document.getElementById('deletedMembersList');
    if (!tbody) return;
    const deleted = membersData.filter(m => m.status === 'deleted');
    if (deleted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4">কোনো বাতিলকৃত সদস্য নেই</td></tr>';
        return;
    }
    tbody.innerHTML = deleted.map(m => `<tr>
        <td>${m.full_name}</td>
        <td>${m.mobile}</td>
        <td>${m.present_district||'-'}</td>
        <td>${m.deleted_at ? new Date(m.deleted_at).toLocaleDateString('bn-BD') : '-'}</td>
        <td><button onclick="restoreMember('${m.member_id}')" class="btn btn-warning btn-sm">↩️ পুনরুদ্ধার</button></td>
    </tr>`).join('');
}

export async function approveMember(id) {
    const client = supabaseClient;
    if (!client) return;
    await client.from('members').update({ status: 'active', approved_at: new Date().toISOString() }).eq('member_id', id);
    addNotification(`✅ সদস্য ${id} অনুমোদিত হয়েছে`, 'success');
    loadMembers();
    showToast('✅ সদস্য অনুমোদিত হয়েছে');
}

export function deleteMember(id) {
    if (!confirm('সদস্য বাতিল করবেন? (পরে পুনরুদ্ধার করা যাবে)')) return;
    const client = supabaseClient;
    if (client) client.from('members').update({ status: 'deleted', deleted_at: new Date().toISOString() }).eq('member_id', id);
    loadMembers();
    showToast('✅ সদস্য বাতিল করা হয়েছে');
}

export function restoreMember(id) {
    const client = supabaseClient;
    if (client) client.from('members').update({ status: 'pending', deleted_at: null }).eq('member_id', id);
    loadMembers();
    showToast('✅ সদস্য পুনরুদ্ধার করা হয়েছে');
}

export function editMember(id) {
    showTab('memberDetails');
    setTimeout(() => selectMemberForFullInfo(id), 300);
}

// Member Details Functions
export function searchMemberForFullInfo() {
    const searchTerm = document.getElementById('fullInfoSearchInput')?.value?.trim() || '';
    if (!searchTerm) { showToast('আইডি বা মোবাইল নম্বর দিন!', 'error'); return; }
    const member = membersData.find(m => m.member_id === searchTerm || m.mobile === searchTerm);
    const resultsDiv = document.getElementById('fullInfoSearchResults');
    if (!member) {
        resultsDiv.innerHTML = `<div class="text-red-500 p-3 border rounded-lg bg-red-50"><i class="fas fa-exclamation-circle mr-2"></i>❌ এই আইডি/মোবাইলে কোনো সদস্য নেই!</div>`;
        resultsDiv.classList.remove('hidden');
        return;
    }
    resultsDiv.innerHTML = `<div class="p-3 border rounded-lg bg-green-50 cursor-pointer hover:bg-green-100 transition" onclick="selectMemberForFullInfo('${member.member_id}')"><div class="font-bold text-gray-800">${member.full_name || 'নাম নেই'}</div><div class="text-sm text-gray-600">🆔 আইডি: ${member.member_id} | 📱 মোবাইল: ${member.mobile || 'N/A'}</div><div class="text-xs text-gray-500 mt-1">📍 জেলা: ${member.present_district || 'N/A'}</div></div>`;
    resultsDiv.classList.remove('hidden');
}

export function selectMemberForFullInfo(memberId) {
    const member = membersData.find(m => m.member_id === memberId);
    if (!member) { showToast('সদস্য পাওয়া যায়নি!', 'error'); return; }
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    const setHtml = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html || '০ টাকা'; };

    setVal('fullInfoMemberId', member.member_id);
    setVal('fullInfoMemberIdShow', member.member_id);
    setVal('fullInfoFullName', member.full_name);
    setVal('fullInfoMobile', member.mobile);
    setVal('fullInfoPassword', member.password || '123456');
    setVal('fullInfoDistrict', member.present_district || '');
    setVal('fullInfoFatherName', member.father_name || '');
    setVal('fullInfoMotherName', member.mother_name || '');
    setVal('fullInfoProfession', member.profession || '');
    setVal('fullInfoMemberType', member.member_type || 'সাধারণ সদস্য');
    setVal('fullInfoMonthlySavings', member.monthly_savings || 500);
    setVal('fullInfoStatus', member.status || 'pending');
    setVal('fullInfoReferralBonus', member.referral_bonus || 0);
    setVal('fullInfoPresentAddress', member.present_address || '');

    const savingsBalance = member.balance || 0;
    const referralBonus = member.referral_bonus || 0;
    const totalProfit = (member.profit_balance_savings || 0) + (member.profit_balance_investment || 0) + (member.profit_balance_referral || 0);
    const totalFund = savingsBalance + referralBonus + totalProfit;

    setHtml('fullInfoBalance', formatAmountWithText(savingsBalance));
    setHtml('fullInfoReferralBonusDisplay', formatAmountWithText(referralBonus));
    setHtml('fullInfoTotalProfit', formatAmountWithText(totalProfit));
    setHtml('fullInfoTotalFund', formatAmountWithText(totalFund));

    document.getElementById('fullInfoSection').classList.remove('hidden');
    document.getElementById('fullInfoSearchResults').classList.add('hidden');
    document.getElementById('fullInfoSearchInput').value = '';
    showToast('✅ সদস্যের তথ্য লোড করা হয়েছে!', 'success');
}

export function resetFullInfoForm() {
    document.getElementById('fullInfoSection').classList.add('hidden');
    document.getElementById('fullInfoSearchInput').value = '';
    document.getElementById('fullInfoSearchResults').classList.add('hidden');
}

// Add Member
export async function addMember(formData) {
    const client = supabaseClient;
    if (!client) return;
    const newMember = {
        member_id: 'TUKN-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        full_name: formData.fullName,
        mobile: formData.mobile,
        present_district: formData.district || '',
        member_type: formData.memberType || 'সাধারণ সদস্য',
        monthly_savings: parseFloat(formData.monthlySavings) || 500,
        password: formData.password || '123456',
        status: 'pending',
        balance: 0,
        referral_bonus: 0,
        profit_balance_savings: 0,
        profit_balance_investment: 0,
        profit_balance_referral: 0,
        created_at: new Date().toISOString()
    };
    membersData.push(newMember);
    await client.from('members').insert([newMember]);
    addNotification(`📝 নতুন সদস্য ${newMember.full_name} যোগ হয়েছে`, 'info');
    showToast('✅ নতুন সদস্য যোগ করা হয়েছে');
}

// Update Badges
export async function updateAllBadges() {
    const client = supabaseClient;
    if (!client) return;
    try {
        const { count: pendingMembers } = await client.from('members').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const badge1 = document.getElementById('pendingMemberBadge');
        if (badge1) { badge1.innerText = pendingMembers || 0; badge1.style.display = (pendingMembers || 0) > 0 ? 'flex' : 'none'; }

        const { count: pendingPayments } = await client.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const badge2 = document.getElementById('pendingPaymentBadge');
        if (badge2) { badge2.innerText = pendingPayments || 0; badge2.style.display = (pendingPayments || 0) > 0 ? 'flex' : 'none'; }

        const { count: pendingWithdrawals } = await client.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const badge3 = document.getElementById('pendingWithdrawalBadge');
        if (badge3) { badge3.innerText = pendingWithdrawals || 0; badge3.style.display = (pendingWithdrawals || 0) > 0 ? 'flex' : 'none'; }

        const { count: pendingLoans } = await client.from('loan_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const badge4 = document.getElementById('pendingLoanBadge');
        if (badge4) { badge4.innerText = pendingLoans || 0; badge4.style.display = (pendingLoans || 0) > 0 ? 'flex' : 'none'; }

        const { count: pendingLoanPayments } = await client.from('loan_payments').select('*', { count: 'exact', head: true }).eq('status', 'pending_verification');
        const badge5 = document.getElementById('pendingLoanPaymentBadge');
        if (badge5) { badge5.innerText = pendingLoanPayments || 0; badge5.style.display = (pendingLoanPayments || 0) > 0 ? 'flex' : 'none'; }

        const { count: pendingApps } = await client.from('representative_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const badge6 = document.getElementById('pendingApplicationBadge');
        if (badge6) { badge6.innerText = pendingApps || 0; badge6.style.display = (pendingApps || 0) > 0 ? 'flex' : 'none'; }
    } catch(e) { console.error('Badge update error:', e); }
}

// Export for global use
window.editMember = editMember;
window.searchMemberForFullInfo = searchMemberForFullInfo;
window.selectMemberForFullInfo = selectMemberForFullInfo;
window.resetFullInfoForm = resetFullInfoForm;
