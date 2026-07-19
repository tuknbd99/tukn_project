// ============================================================
// BRANCHES MODULE - All Branch Related Functions
// ============================================================

import { supabaseClient } from './config.js';
import { showToast, formatAmountWithText, showTab, addNotification } from './utils.js';

export async function loadBranches() {
    const client = supabaseClient;
    if (!client) return;

    try {
        const { data: branches, error } = await client
            .from('branches')
            .select('*, branch_members(count)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderBranchList(branches || []);
        updateBranchSummary(branches || []);
        populateBranchSelectors(branches || []);

    } catch(e) {
        console.error('Branch load error:', e);
        showToast('ব্রাঞ্চ লোড করতে সমস্যা!', 'error');
    }
}

export function renderBranchList(branches) {
    const container = document.getElementById('branchList');
    if (!container) return;

    if (branches.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-gray-500 py-12">
            <i class="fas fa-store text-4xl block mb-3 text-gray-300"></i>
            <p>কোনো ব্রাঞ্চ তৈরি করা হয়নি</p>
            <button onclick="showAddBranchModal()" class="btn btn-success mt-3">🏢 নতুন ব্রাঞ্চ তৈরি করুন</button>
        </div>`;
        return;
    }

    container.innerHTML = branches.map(b => `
        <div class="bg-white rounded-xl shadow-md overflow-hidden border hover:shadow-lg transition">
            <div class="bg-gradient-to-r from-emerald-600 to-emerald-700 p-3 text-white">
                <div class="flex justify-between items-center">
                    <div>
                        <h4 class="font-bold text-lg">${b.branch_name}</h4>
                        <p class="text-xs opacity-80">${b.branch_code}</p>
                    </div>
                    <span class="bg-white/20 px-3 py-1 rounded-full text-xs">${b.status === 'active' ? '✅ সক্রিয়' : '⏸️ নিষ্ক্রিয়'}</span>
                </div>
            </div>
            <div class="p-3">
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <div><span class="text-gray-500">📍 ${b.district || 'জেলা নেই'}</span></div>
                    <div><span class="text-gray-500">👤 ${b.manager_name || 'ম্যানেজার নেই'}</span></div>
                    <div><span class="text-gray-500">📱 ${b.phone || '-'}</span></div>
                    <div><span class="text-gray-500">👥 ${b.branch_members?.[0]?.count || 0} জন</span></div>
                </div>
                <div class="mt-3 flex gap-2 flex-wrap">
                    <button onclick="viewBranchDetails('${b.id}')" class="btn btn-info btn-sm"><i class="fas fa-eye mr-1"></i> দেখুন</button>
                    <button onclick="editBranch('${b.id}')" class="btn btn-warning btn-sm"><i class="fas fa-edit mr-1"></i> সম্পাদনা</button>
                    <button onclick="toggleBranchStatus('${b.id}')" class="btn ${b.status === 'active' ? 'btn-danger' : 'btn-success'} btn-sm">
                        ${b.status === 'active' ? '<i class="fas fa-pause mr-1"></i> নিষ্ক্রিয়' : '<i class="fas fa-play mr-1"></i> সক্রিয়'}
                    </button>
                    <button onclick="viewBranchReport('${b.id}')" class="btn btn-purple btn-sm"><i class="fas fa-file-alt mr-1"></i> রিপোর্ট</button>
                </div>
            </div>
        </div>
    `).join('');
}

export async function updateBranchSummary(branches) {
    const client = supabaseClient;
    if (!client) return;

    try {
        let totalMembers = 0, totalSavings = 0, totalLoan = 0;

        for (const b of branches) {
            const { count } = await client
                .from('branch_members')
                .select('*', { count: 'exact', head: true })
                .eq('branch_id', b.id);
            totalMembers += count || 0;

            const { data: balance } = await client
                .from('branch_balances')
                .select('total_savings, total_loan_given')
                .eq('branch_id', b.id)
                .single();

            if (balance) {
                totalSavings += balance.total_savings || 0;
                totalLoan += balance.total_loan_given || 0;
            }
        }

        document.getElementById('totalBranches').innerText = branches.length;
        document.getElementById('totalBranchMembers').innerText = totalMembers;
        document.getElementById('totalBranchSavings').innerHTML = formatAmountWithText(totalSavings);
        document.getElementById('totalBranchLoan').innerHTML = formatAmountWithText(totalLoan);

    } catch(e) {
        console.error('Summary update error:', e);
    }
}

export function populateBranchSelectors(branches) {
    const selectors = ['branchViewSelector', 'branchReportSelector'];
    selectors.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const currentVal = el.value;
        el.innerHTML = `<option value="all">🌐 সব ব্রাঞ্চ</option>` +
            branches.map(b => `<option value="${b.id}">${b.branch_name} (${b.branch_code})</option>`).join('');
        if (currentVal) el.value = currentVal;
    });
}

// ============================================================
// BRANCH VIEW
// ============================================================

export async function loadBranchView() {
    const branchId = document.getElementById('branchViewSelector').value;
    const container = document.getElementById('branchViewContent');
    if (!container) return;

    container.innerHTML = '<div class="text-center py-8"><div class="loading-spinner"></div><p class="text-gray-500 mt-2">লোড হচ্ছে...</p></div>';

    const client = supabaseClient;
    if (!client) { container.innerHTML = '<div class="text-red-500 p-4 text-center">❌ সংযোগ সমস্যা!</div>'; return; }

    try {
        let query = client.from('branch_members').select('*, members(*), branches(*)');
        if (branchId !== 'all') query = query.eq('branch_id', branchId);
        const { data: branchMembers } = await query;

        if (!branchMembers || branchMembers.length === 0) {
            container.innerHTML = `<div class="text-center text-gray-500 py-12"><i class="fas fa-users text-4xl block mb-3 text-gray-300"></i><p>এই ব্রাঞ্চে কোনো সদস্য নেই</p></div>`;
            return;
        }

        // Branch loan summary
        let totalLoanGiven = 0, totalLoanCollected = 0;
        const { data: branchLoans } = await client
            .from('loan_applications')
            .select('id, amount')
            .eq('branch_id', branchId !== 'all' ? branchId : branchMembers[0]?.branch_id)
            .eq('status', 'approved');

        if (branchLoans) {
            totalLoanGiven = branchLoans.reduce((s, l) => s + (l.amount || 0), 0);
            const loanIds = branchLoans.map(l => l.id);
            if (loanIds.length > 0) {
                const { data: payments } = await client
                    .from('loan_payments')
                    .select('total_amount, emi_amount')
                    .in('loan_id', loanIds)
                    .eq('status', 'approved');
                if (payments) {
                    totalLoanCollected = payments.reduce((s, p) => s + (p.total_amount || p.emi_amount || 0), 0);
                }
            }
        }

        let html = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div class="bg-blue-50 p-3 rounded-lg border border-blue-200 text-center">
                    <p class="text-sm text-gray-600">💰 মোট লোন প্রদান</p>
                    <p class="text-xl font-bold text-blue-600">${formatAmountWithText(totalLoanGiven)}</p>
                </div>
                <div class="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-center">
                    <p class="text-sm text-gray-600">📥 মোট লোন আদায়</p>
                    <p class="text-xl font-bold text-emerald-600">${formatAmountWithText(totalLoanCollected)}</p>
                </div>
                <div class="bg-red-50 p-3 rounded-lg border border-red-200 text-center">
                    <p class="text-sm text-gray-600">⏳ বকেয়া</p>
                    <p class="text-xl font-bold text-red-600">${formatAmountWithText(totalLoanGiven - totalLoanCollected)}</p>
                </div>
            </div>
        `;

        html += `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">`;

        for (const bm of branchMembers) {
            const m = bm.members;
            const { data: loans } = await client
                .from('loan_applications')
                .select('amount, status, id')
                .eq('member_id', m?.member_id)
                .eq('branch_id', branchId !== 'all' ? branchId : bm.branch_id);

            const totalLoan = loans ? loans.reduce((s, l) => s + (l.amount || 0), 0) : 0;
            const approvedLoan = loans ? loans.filter(l => l.status === 'approved').reduce((s, l) => s + (l.amount || 0), 0) : 0;
            const pendingLoan = loans ? loans.filter(l => l.status === 'pending').reduce((s, l) => s + (l.amount || 0), 0) : 0;

            let memberCollected = 0;
            if (loans && loans.length > 0) {
                const loanIds = loans.filter(l => l.status === 'approved').map(l => l.id);
                if (loanIds.length > 0) {
                    const { data: payments } = await client
                        .from('loan_payments')
                        .select('total_amount, emi_amount')
                        .in('loan_id', loanIds)
                        .eq('status', 'approved');
                    if (payments) {
                        memberCollected = payments.reduce((s, p) => s + (p.total_amount || p.emi_amount || 0), 0);
                    }
                }
            }

            html += `
                <div class="bg-white p-3 rounded-lg border hover:shadow-md transition">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                            ${m?.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                            <p class="font-semibold">${m?.full_name || 'নাম নেই'}</p>
                            <p class="text-xs text-gray-500">${m?.member_id || '-'}</p>
                            <p class="text-xs text-gray-400">${bm.branches?.branch_name || '-'}</p>
                        </div>
                    </div>
                    <div class="mt-2 grid grid-cols-2 gap-1 text-xs">
                        <div><span class="text-gray-500">সঞ্চয়:</span> ${formatAmountWithText(m?.balance || 0)}</div>
                        <div><span class="text-gray-500">রেফারেল:</span> ${formatAmountWithText(m?.referral_bonus || 0)}</div>
                        <div><span class="text-gray-500">মোট লোন:</span> <span class="font-medium">${formatAmountWithText(totalLoan)}</span></div>
                        <div><span class="text-gray-500">অনুমোদিত:</span> <span class="text-emerald-600">${formatAmountWithText(approvedLoan)}</span></div>
                        <div><span class="text-gray-500">লোন আদায়:</span> <span class="text-blue-600">${formatAmountWithText(memberCollected)}</span></div>
                        ${pendingLoan > 0 ? `<div><span class="text-gray-500">⏳ পেন্ডিং:</span> <span class="text-amber-600">${formatAmountWithText(pendingLoan)}</span></div>` : ''}
                        <div class="col-span-2"><span class="text-gray-500">যোগদান:</span> ${bm.joined_at ? new Date(bm.joined_at).toLocaleDateString('bn-BD') : '-'}</div>
                    </div>
                </div>
            `;
        }
        html += `</div>`;
        container.innerHTML = html;

    } catch(e) {
        console.error('Branch view error:', e);
        container.innerHTML = '<div class="text-red-500 p-4 text-center">❌ লোড করতে সমস্যা!</div>';
    }
}

// ============================================================
// BRANCH REPORT
// ============================================================

export async function loadBranchReport() {
    const branchId = document.getElementById('branchReportSelector').value;
    const fromDate = document.getElementById('branchReportFrom').value;
    const toDate = document.getElementById('branchReportTo').value;
    const container = document.getElementById('branchReportContent');
    if (!container) return;

    container.innerHTML = '<div class="text-center py-8"><div class="loading-spinner"></div><p class="text-gray-500 mt-2">রিপোর্ট লোড হচ্ছে...</p></div>';

    const client = supabaseClient;
    if (!client) { container.innerHTML = '<div class="text-red-500 p-4 text-center">❌ সংযোগ সমস্যা!</div>'; return; }

    try {
        let branchQuery = client.from('branches').select('*');
        if (branchId !== 'all') branchQuery = branchQuery.eq('id', branchId);
        const { data: branches } = await branchQuery;

        if (!branches || branches.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 py-12"><p>কোনো ব্রাঞ্চ পাওয়া যায়নি</p></div>';
            return;
        }

        let html = `<div class="overflow-x-auto"><table class="data-table">
            <thead><tr>
                <th>ব্রাঞ্চ</th>
                <th>কোড</th>
                <th class="text-left">মোট সঞ্চয়</th>
                <th class="text-left">মোট লোন</th>
                <th class="text-left">মোট আদায়</th>
                <th class="text-left">মোট উত্তোলন</th>
                <th class="text-left">নীট ব্যালেন্স</th>
                <th>সদস্য</th>
                <th>স্ট্যাটাস</th>
            </tr></thead><tbody>`;

        let grandTotalSavings = 0, grandTotalLoan = 0, grandTotalCollected = 0, grandTotalWithdrawal = 0;

        for (const branch of branches) {
            const { data: balance } = await client
                .from('branch_balances')
                .select('*')
                .eq('branch_id', branch.id)
                .single();

            const { count } = await client
                .from('branch_members')
                .select('*', { count: 'exact', head: true })
                .eq('branch_id', branch.id);

            let collected = 0;
            const { data: branchLoans } = await client
                .from('loan_applications')
                .select('id')
                .eq('branch_id', branch.id)
                .eq('status', 'approved');

            if (branchLoans && branchLoans.length > 0) {
                const loanIds = branchLoans.map(l => l.id);
                const { data: payments } = await client
                    .from('loan_payments')
                    .select('total_amount, emi_amount')
                    .in('loan_id', loanIds)
                    .eq('status', 'approved');
                if (payments) {
                    collected = payments.reduce((s, p) => s + (p.total_amount || p.emi_amount || 0), 0);
                }
            }

            const savings = balance?.total_savings || 0;
            const loan = balance?.total_loan_given || 0;
            const withdrawal = balance?.total_withdrawal || 0;
            const netBalance = savings - loan - withdrawal + collected;

            grandTotalSavings += savings;
            grandTotalLoan += loan;
            grandTotalCollected += collected;
            grandTotalWithdrawal += withdrawal;

            html += `<tr>
                <td><span class="font-medium">${branch.branch_name}</span></td>
                <td class="text-xs text-gray-500">${branch.branch_code}</td>
                <td class="text-left text-emerald-600">${formatAmountWithText(savings)}</td>
                <td class="text-left text-blue-600">${formatAmountWithText(loan)}</td>
                <td class="text-left text-emerald-600">${formatAmountWithText(collected)}</td>
                <td class="text-left text-red-600">${formatAmountWithText(withdrawal)}</td>
                <td class="text-left font-bold ${netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}">${formatAmountWithText(netBalance)}</td>
                <td class="text-center">${count || 0}</td>
                <td><span class="status-badge ${branch.status === 'active' ? 'status-active' : 'status-inactive'}">${branch.status === 'active' ? '✅ সক্রিয়' : '⏸️ নিষ্ক্রিয়'}</span></td>
            </tr>`;
        }

        html += `<tr style="font-weight:700; background:#f3f4f6; border-top:2px solid #059669;">
            <td colspan="2" class="text-left">📊 মোট</td>
            <td class="text-left text-emerald-700">${formatAmountWithText(grandTotalSavings)}</td>
            <td class="text-left text-blue-700">${formatAmountWithText(grandTotalLoan)}</td>
            <td class="text-left text-emerald-700">${formatAmountWithText(grandTotalCollected)}</td>
            <td class="text-left text-red-700">${formatAmountWithText(grandTotalWithdrawal)}</td>
            <td class="text-left text-emerald-700">${formatAmountWithText(grandTotalSavings - grandTotalLoan - grandTotalWithdrawal + grandTotalCollected)}</td>
            <td colspan="2"></td>
        </tr>`;

        html += '</tbody></table></div>';
        container.innerHTML = html;

    } catch(e) {
        console.error('Branch report error:', e);
        container.innerHTML = '<div class="text-red-500 p-4 text-center">❌ রিপোর্ট লোড করতে সমস্যা!</div>';
    }
}

// ============================================================
// BRANCH CRUD OPERATIONS
// ============================================================

export function showAddBranchModal() {
    document.getElementById('addBranchModal').classList.add('active');
    document.getElementById('addBranchForm').reset();
    document.getElementById('branchCode').value = 'BR-' + String(Date.now()).slice(-6);
}

export function closeAddBranchModal() {
    document.getElementById('addBranchModal').classList.remove('active');
}

document.getElementById('addBranchForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const branchData = {
        branch_name: document.getElementById('branchName').value,
        branch_code: document.getElementById('branchCode').value,
        district: document.getElementById('branchDistrict').value,
        manager_name: document.getElementById('branchManager').value,
        phone: document.getElementById('branchPhone').value,
        email: document.getElementById('branchEmail').value,
        address: document.getElementById('branchAddress').value,
        status: 'active',
        created_at: new Date().toISOString()
    };

    const client = supabaseClient;
    if (!client) { showToast('সংযোগ সমস্যা!', 'error'); return; }

    try {
        const { data, error } = await client
            .from('branches')
            .insert([branchData])
            .select();

        if (error) throw error;

        if (data && data[0]) {
            await client
                .from('branch_balances')
                .insert([{
                    branch_id: data[0].id,
                    total_savings: 0,
                    total_loan_given: 0,
                    total_loan_collected: 0,
                    total_withdrawal: 0,
                    total_profit: 0,
                    total_welfare: 0,
                    net_balance: 0
                }]);
        }

        addNotification(`🏢 নতুন ব্রাঞ্চ তৈরি: ${branchData.branch_name}`, 'success');
        showToast('✅ নতুন ব্রাঞ্চ তৈরি হয়েছে!', 'success');
        closeAddBranchModal();
        loadBranches();

    } catch(e) {
        console.error('Branch create error:', e);
        showToast('❌ ব্রাঞ্চ তৈরি ব্যর্থ: ' + e.message, 'error');
    }
});

// ============================================================
// BRANCH HELPER FUNCTIONS
// ============================================================

export function viewBranchDetails(branchId) {
    showTab('branchView');
    setTimeout(() => {
        const selector = document.getElementById('branchViewSelector');
        if (selector) {
            selector.value = branchId;
            loadBranchView();
        }
    }, 300);
}

export function editBranch(branchId) {
    showToast('📝 ব্রাঞ্চ সম্পাদনা ফিচার শীঘ্রই যোগ হবে', 'info');
}

export async function toggleBranchStatus(branchId) {
    const client = supabaseClient;
    if (!client) { showToast('সংযোগ সমস্যা!', 'error'); return; }
    try {
        const { data: branch, error } = await client
            .from('branches')
            .select('status')
            .eq('id', branchId)
            .single();
        if (error) throw error;
        const newStatus = branch.status === 'active' ? 'inactive' : 'active';
        await client
            .from('branches')
            .update({ status: newStatus })
            .eq('id', branchId);
        loadBranches();
        showToast(`ব্রাঞ্চ ${newStatus === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে!`, 'success');
    } catch(e) {
        console.error('Status toggle error:', e);
        showToast('স্ট্যাটাস পরিবর্তন ব্যর্থ!', 'error');
    }
}

export function viewBranchReport(branchId) {
    showTab('branchReport');
    setTimeout(() => {
        const selector = document.getElementById('branchReportSelector');
        if (selector) {
            selector.value = branchId;
            loadBranchReport();
        }
    }, 300);
}

export function exportBranchReport() {
    const table = document.querySelector('#branchReportContent table');
    if (!table) { showToast('কোনো ডেটা নেই!', 'error'); return; }
    let csv = "ব্রাঞ্চ,কোড,মোট সঞ্চয়,মোট লোন,মোট আদায়,মোট উত্তোলন,নীট ব্যালেন্স,সদস্য,স্ট্যাটাস\n";
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 9) {
            csv += `"${cells[0]?.textContent.trim() || ''}","${cells[1]?.textContent.trim() || ''}","${cells[2]?.textContent.trim() || ''}","${cells[3]?.textContent.trim() || ''}","${cells[4]?.textContent.trim() || ''}","${cells[5]?.textContent.trim() || ''}","${cells[6]?.textContent.trim() || ''}","${cells[7]?.textContent.trim() || ''}","${cells[8]?.textContent.trim() || ''}"\n`;
        }
    });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `branch_report_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    showToast('✅ ব্রাঞ্চ রিপোর্ট এক্সপোর্ট সম্পূর্ণ!');
}
