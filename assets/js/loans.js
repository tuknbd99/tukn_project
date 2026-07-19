// ============================================================
// LOANS MODULE - All Loan Related Functions
// ============================================================

import { supabaseClient, allLoansData, pendingLoanPaymentsData } from './config.js';
import { showToast, formatAmountWithText, addNotification } from './utils.js';

export async function loadAllLoans() {
    const container = document.getElementById('loanApplicationsList');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8"><div class="loading-spinner"></div><p class="text-gray-500 mt-2">লোন লোড হচ্ছে...</p></div>';
    const client = supabaseClient;
    if (!client) { container.innerHTML = '<div class="text-red-500 p-4 text-center">❌ সংযোগ সমস্যা!</div>'; return; }

    try {
        const { data, error } = await client
            .from('loan_applications')
            .select('*, branches(branch_name)')
            .order('submitted_at', { ascending: false });
        if (error) throw error;
        allLoansData.length = 0;
        allLoansData.push(...(data || []));
        renderAllLoansTable();
        await updateAllBadges();
    } catch(e) {
        console.error('Load loans error:', e);
        container.innerHTML = '<div class="text-red-500 p-4 text-center">❌ লোন লোড করতে সমস্যা!</div>';
    }
}

export function renderAllLoansTable() {
    const container = document.getElementById('loanApplicationsList');
    if (!container) return;
    if (allLoansData.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 py-12"><i class="fas fa-inbox text-4xl block mb-3 text-gray-300"></i><p>কোনো লোন আবেদন নেই</p></div>';
        return;
    }

    container.innerHTML = allLoansData.map(loan => {
        const branchName = loan.branches?.branch_name || loan.branch_name || '-';
        return `
        <div class="border rounded-lg p-4 mb-3 ${loan.status === 'pending' ? 'border-yellow-400 bg-yellow-50' : loan.status === 'approved' ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}">
            <div class="flex flex-wrap justify-between items-start gap-2">
                <div class="flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-bold text-gray-800 text-lg">${loan.member_name || '-'}</span>
                        <span class="status-badge ${loan.status === 'pending' ? 'status-pending' : loan.status === 'approved' ? 'status-approved' : 'status-rejected'}">
                            ${loan.status === 'pending' ? '⏳ বিচারাধীন' : loan.status === 'approved' ? '✅ অনুমোদিত' : '❌ বাতিল'}
                        </span>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm">
                        <div><span class="text-gray-500">🆔 আইডি:</span> ${loan.member_id || '-'}</div>
                        <div><span class="text-gray-500">📋 ধরন:</span> ${loan.loan_type || '-'}</div>
                        <div><span class="text-gray-500">💰 পরিমাণ:</span> <span class="font-bold text-emerald-600">${formatAmountWithText(loan.amount)}</span></div>
                        <div><span class="text-gray-500">🏢 ব্রাঞ্চ:</span> <span class="font-medium text-blue-600">${branchName}</span></div>
                        <div><span class="text-gray-500">📅 তারিখ:</span> ${loan.submitted_at ? new Date(loan.submitted_at).toLocaleDateString('bn-BD') : '-'}</div>
                    </div>
                    ${loan.reject_reason ? `<div class="mt-2 text-sm bg-red-50 p-2 rounded border border-red-200"><span class="text-red-600">❌ বাতিলের কারণ:</span><p class="mt-1 text-red-700">${loan.reject_reason}</p></div>` : ''}
                    ${loan.special_note ? `<div class="mt-2 text-sm bg-blue-50 p-2 rounded border border-blue-200"><span class="text-blue-600">📝 বিশেষ নোট:</span><p class="mt-1 text-blue-800">${loan.special_note}</p></div>` : ''}
                </div>
                <div class="flex gap-2 flex-wrap">
                    ${loan.status === 'pending' ? `<button onclick="approveLoan('${loan.id}')" class="btn btn-success btn-sm"><i class="fas fa-check mr-1"></i> অনুমোদন</button><button onclick="rejectLoan('${loan.id}')" class="btn btn-danger btn-sm"><i class="fas fa-times mr-1"></i> বাতিল</button>` : ''}
                    <button onclick="printLoanDetails('${loan.id}')" class="btn btn-purple btn-sm"><i class="fas fa-print mr-1"></i> প্রিন্ট</button>
                </div>
            </div>
        </div>
    `}).join('');
}

export async function loadPendingLoans() {
    const container = document.getElementById('pendingLoansList');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8"><div class="loading-spinner"></div><p class="text-gray-500 mt-2">পেন্ডিং লোন লোড হচ্ছে...</p></div>';
    const client = supabaseClient;
    if (!client) { container.innerHTML = '<div class="text-red-500 p-4 text-center">❌ সংযোগ সমস্যা!</div>'; return; }
    const { data } = await client.from('loan_applications').select('*').eq('status', 'pending').order('submitted_at', { ascending: false });
    const pendingLoans = data || [];
    if (pendingLoans.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 py-12"><i class="fas fa-check-circle text-4xl block mb-3 text-green-500"></i><p>✅ কোনো পেন্ডিং লোন নেই</p></div>';
        return;
    }
    container.innerHTML = pendingLoans.map(loan => `
        <div class="border rounded-lg p-4 mb-3 bg-yellow-50 border-yellow-400">
            <div class="flex flex-wrap justify-between items-start gap-2">
                <div class="flex-1">
                    <div class="flex items-center gap-2 flex-wrap"><span class="font-bold text-gray-800 text-lg">${loan.member_name || '-'}</span><span class="status-badge status-pending">⏳ বিচারাধীন</span></div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm">
                        <div><span class="text-gray-500">🆔 আইডি:</span> ${loan.member_id || '-'}</div>
                        <div><span class="text-gray-500">📋 ধরন:</span> ${loan.loan_type || '-'}</div>
                        <div><span class="text-gray-500">💰 পরিমাণ:</span> <span class="font-bold text-emerald-600">${formatAmountWithText(loan.amount)}</span></div>
                        <div><span class="text-gray-500">📅 তারিখ:</span> ${loan.submitted_at ? new Date(loan.submitted_at).toLocaleDateString('bn-BD') : '-'}</div>
                    </div>
                </div>
                <div class="flex gap-2 flex-wrap">
                    <button onclick="approveLoan('${loan.id}')" class="btn btn-success btn-sm"><i class="fas fa-check mr-1"></i> অনুমোদন</button>
                    <button onclick="rejectLoan('${loan.id}')" class="btn btn-danger btn-sm"><i class="fas fa-times mr-1"></i> বাতিল</button>
                </div>
            </div>
        </div>
    `).join('');
    await updateAllBadges();
}

export async function approveLoan(loanId) {
    if (!confirm('লোন অনুমোদন দেবেন?')) return;
    const client = supabaseClient;
    if (!client) { showToast('সংযোগ সমস্যা!', 'error'); return; }

    try {
        const { data: loan, error: loanError } = await client
            .from('loan_applications')
            .select('branch_id, amount, member_name')
            .eq('id', loanId)
            .single();
        if (loanError) throw loanError;

        const { error: updateError } = await client
            .from('loan_applications')
            .update({
                status: 'approved',
                approved_by: getCurrentAdmin()?.username || 'system',
                approved_at: new Date().toISOString()
            })
            .eq('id', loanId);
        if (updateError) throw updateError;

        if (loan && loan.branch_id) {
            const { data: balance, error: balanceError } = await client
                .from('branch_balances')
                .select('*')
                .eq('branch_id', loan.branch_id)
                .single();

            if (balanceError && balanceError.code !== 'PGRST116') throw balanceError;

            if (balance) {
                await client
                    .from('branch_balances')
                    .update({
                        total_loan_given: (balance.total_loan_given || 0) + loan.amount,
                        net_balance: (balance.net_balance || 0) - loan.amount,
                        updated_at: new Date().toISOString()
                    })
                    .eq('branch_id', loan.branch_id);
            } else {
                await client
                    .from('branch_balances')
                    .insert([{
                        branch_id: loan.branch_id,
                        total_loan_given: loan.amount,
                        net_balance: -loan.amount,
                        updated_at: new Date().toISOString()
                    }]);
            }
        }

        addNotification(`✅ লোন অনুমোদিত: ${loan?.member_name || ''} (${formatAmountWithText(loan?.amount)})`, 'success');
        loadAllLoans();
        loadPendingLoans();
        loadBranchReport();
        await updateAllBadges();
        showToast('✅ লোন অনুমোদিত হয়েছে!');
    } catch(e) {
        console.error('Loan approval error:', e);
        showToast('❌ লোন অনুমোদন ব্যর্থ: ' + (e.message || 'অজানা ত্রুটি'), 'error');
    }
}

export async function rejectLoan(loanId) {
    const reason = prompt('বাতিলের কারণ লিখুন:');
    if (!reason) return;
    const client = supabaseClient;
    if (!client) { showToast('সংযোগ সমস্যা!', 'error'); return; }
    await client.from('loan_applications').update({
        status: 'rejected',
        reject_reason: reason,
        rejected_by: getCurrentAdmin()?.username || 'system',
        rejected_at: new Date().toISOString()
    }).eq('id', loanId);
    loadAllLoans();
    loadPendingLoans();
    await updateAllBadges();
    showToast('❌ লোন বাতিল করা হয়েছে!');
}

export function printLoanDetails(loanId) {
    const loan = allLoansData.find(l => l.id == loanId);
    if (!loan) { showToast('লোন পাওয়া যায়নি!', 'error'); return; }
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { showToast('পপ-আপ ব্লক করা হয়েছে!', 'error'); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>লোন বিস্তারিত</title><style>body{font-family:'Noto Sans Bengali',sans-serif;padding:30px;}</style></head><body>
        <h1>লোন আবেদন বিস্তারিত</h1>
        <p><strong>সদস্য:</strong> ${loan.member_name}</p>
        <p><strong>আইডি:</strong> ${loan.member_id}</p>
        <p><strong>লোনের ধরন:</strong> ${loan.loan_type}</p>
        <p><strong>পরিমাণ:</strong> ${formatAmountWithText(loan.amount)}</p>
        <p><strong>স্ট্যাটাস:</strong> ${loan.status}</p>
        <p><strong>তারিখ:</strong> ${loan.submitted_at ? new Date(loan.submitted_at).toLocaleString('bn-BD') : '-'}</p>
        ${loan.special_note ? `<p><strong>বিশেষ নোট:</strong> ${loan.special_note}</p>` : ''}
        ${loan.reject_reason ? `<p><strong>বাতিলের কারণ:</strong> ${loan.reject_reason}</p>` : ''}
        <button onclick="window.print()">প্রিন্ট</button>
    </body></html>`);
    win.document.close();
}

export function toggleLoanMemberSection() {
    const isMember = document.getElementById('memberYes').checked;
    document.getElementById('memberInfoSection').style.display = isMember ? 'block' : 'none';
    document.getElementById('nonMemberSection').style.display = isMember ? 'none' : 'block';
}

export async function fetchLoanMemberName() {
    const memberId = document.getElementById('loanMemberId').value.trim();
    if (!memberId) { showToast('সদস্য আইডি দিন!', 'error'); return; }
    const client = supabaseClient;
    if (!client) { showToast('সংযোগ সমস্যা!', 'error'); return; }

    try {
        const { data: member, error: memberError } = await client
            .from('members')
            .select('full_name, status')
            .eq('member_id', memberId)
            .single();

        if (memberError || !member) {
            showToast('❌ এই আইডিতে কোনো সদস্য নেই!', 'error');
            return;
        }
        if (member.status !== 'active') {
            showToast('❌ সদস্যটি সক্রিয় নয়!', 'error');
            return;
        }

        document.getElementById('loanMemberName').value = member.full_name || 'অজানা';
        showToast(`✅ সদস্য পাওয়া গেছে: ${member.full_name}`);

        const { data: branchMembers, error: branchError } = await client
            .from('branch_members')
            .select('branches(id, branch_name)')
            .eq('member_id', memberId);

        const branchSelect = document.getElementById('loanBranchSelect');
        const branchSection = document.getElementById('loanBranchSection');

        if (branchError) throw branchError;

        if (branchMembers && branchMembers.length > 0) {
            branchSection.style.display = 'block';
            branchSelect.innerHTML = '<option value="">-- ব্রাঞ্চ নির্বাচন করুন --</option>' +
                branchMembers.map(b => `<option value="${b.branches.id}">${b.branches.branch_name}</option>`).join('');
        } else {
            branchSection.style.display = 'none';
            branchSelect.innerHTML = '<option value="">-- ব্রাঞ্চ নির্বাচন করুন --</option>';
            showToast('⚠️ এই সদস্য কোনো ব্রাঞ্চের সাথে যুক্ত নয়!', 'warning');
        }
    } catch(e) {
        console.error('Fetch member error:', e);
        showToast('❌ সদস্যের তথ্য লোড করতে সমস্যা!', 'error');
    }
}

export async function submitLoanApp() {
    const isMember = document.getElementById('memberYes').checked;
    if (!isMember) {
        showToast('শুধুমাত্র সদস্যরা লোন আবেদন করতে পারেন!', 'error');
        return;
    }

    const memberId = document.getElementById('loanMemberId').value.trim();
    const loanType = document.getElementById('loanType').value;
    const amount = parseFloat(document.getElementById('loanAmount').value);
    const branchId = document.getElementById('loanBranchSelect').value;

    if (!memberId) { showToast('সদস্য আইডি দিন!', 'error'); return; }
    if (!loanType) { showToast('লোনের ধরন নির্বাচন করুন!', 'error'); return; }
    if (!amount || amount <= 0) { showToast('সঠিক লোনের পরিমাণ দিন!', 'error'); return; }
    if (!branchId) { showToast('ব্রাঞ্চ নির্বাচন করুন!', 'error'); return; }

    const client = supabaseClient;
    if (!client) { showToast('সংযোগ সমস্যা!', 'error'); return; }

    try {
        const { data: member, error: memberError } = await client
            .from('members')
            .select('full_name')
            .eq('member_id', memberId)
            .single();

        if (memberError || !member) {
            showToast('❌ এই আইডিতে কোনো সদস্য নেই!', 'error');
            return;
        }

        const { error: insertError } = await client.from('loan_applications').insert([{
            member_id: memberId,
            member_name: member.full_name,
            loan_type: loanType,
            amount,
            branch_id: branchId,
            status: 'pending',
            submitted_at: new Date().toISOString(),
            submitted_by: getCurrentAdmin()?.username || 'web_user'
        }]);

        if (insertError) throw insertError;

        addNotification(`📝 নতুন লোন আবেদন: ${member.full_name} (${formatAmountWithText(amount)})`, 'info');
        showToast('✅ লোন আবেদন জমা হয়েছে!');
        document.getElementById('loanMemberId').value = '';
        document.getElementById('loanMemberName').value = '';
        document.getElementById('loanType').value = '';
        document.getElementById('loanAmount').value = '';
        document.getElementById('loanBranchSelect').value = '';
        document.getElementById('loanBranchSection').style.display = 'none';
        loadAllLoans();
    } catch(e) {
        console.error('Submit loan error:', e);
        showToast('❌ লোন আবেদন জমা দিতে সমস্যা!', 'error');
    }
}

// Calculate EMI
export function calculateEMI() {
    const P = parseFloat(document.getElementById('loanAmount').value) || 0;
    const r = (parseFloat(document.getElementById('loanInterestRate').value) || 0) / 12 / 100;
    const n = parseFloat(document.getElementById('loanTenure').value) || 1;
    const emi = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    document.getElementById('emiDisplay').innerHTML = `মাসিক কিস্তি: ${formatAmountWithText(emi || 0)}`;
    document.getElementById('totalPayable').innerHTML = `মোট পরিশোধ্য: ${formatAmountWithText((emi || 0) * n)}`;
}

// ============================================================
// LOAN PAYMENT FUNCTIONS
// ============================================================

export async function loadPendingLoanPayments() {
    const container = document.getElementById('pendingLoanPaymentsList');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-8"><div class="loading-spinner"></div><p class="text-gray-500 mt-2">লোড হচ্ছে...</p></div>';

    const client = supabaseClient;
    if (!client) {
        container.innerHTML = '<div class="text-red-500 p-4 text-center">❌ সংযোগ সমস্যা!</div>';
        return;
    }

    try {
        const { data: payments, error } = await client
            .from('loan_payments')
            .select('*')
            .eq('status', 'pending_verification')
            .order('payment_date', { ascending: false });

        if (error) {
            console.error('Payment fetch error:', error);
            if (error.code === '42P01') {
                container.innerHTML = `
                    <div class="text-center text-amber-500 py-8">
                        <i class="fas fa-exclamation-triangle text-4xl block mb-3"></i>
                        <p>⚠️ loan_payments টেবিল এখনও তৈরি হয়নি!</p>
                        <p class="text-sm text-gray-400 mt-2">দয়া করে ডাটাবেসে টেবিল তৈরি করুন।</p>
                    </div>
                `;
                return;
            }
            throw error;
        }

        pendingLoanPaymentsData.length = 0;
        pendingLoanPaymentsData.push(...(payments || []));

        if (pendingLoanPaymentsData.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-12">
                    <i class="fas fa-check-circle text-4xl block mb-3 text-green-500"></i>
                    <p>✅ কোনো পেন্ডিং লোন পেমেন্ট নেই</p>
                </div>
            `;
            const badge = document.getElementById('pendingLoanPaymentBadge');
            if (badge) badge.style.display = 'none';
            return;
        }

        const badge = document.getElementById('pendingLoanPaymentBadge');
        if (badge) {
            badge.innerText = pendingLoanPaymentsData.length;
            badge.style.display = 'flex';
        }

        let html = `<div class="table-scroll"><table class="data-table">
            <thead><tr>
                <th>তারিখ</th>
                <th>সদস্য</th>
                <th>লোন আইডি</th>
                <th>কিস্তি #</th>
                <th>পরিমাণ</th>
                <th>লেনদেন আইডি</th>
                <th>পদ্ধতি</th>
                <th>অ্যাকশন</th>
            </tr></thead><tbody>`;

        for (const payment of pendingLoanPaymentsData) {
            let loanInfo = {};
            if (payment.loan_id) {
                try {
                    const { data: loanData } = await client
                        .from('loan_applications')
                        .select('member_id, member_name, loan_type, amount')
                        .eq('id', payment.loan_id)
                        .single();
                    if (loanData) loanInfo = loanData;
                } catch(e) {
                    console.log('Loan info not found for:', payment.loan_id);
                }
            }

            const emiAmount = payment.emi_amount || 0;
            const lateFee = payment.late_fee || 0;
            const totalAmount = payment.total_amount || (emiAmount + lateFee);
            const paymentId = Number(payment.id);

            let methodColor = 'bg-blue-100 text-blue-700';
            if (payment.payment_method === 'bKash') methodColor = 'bg-green-100 text-green-700';
            else if (payment.payment_method === 'Nagad') methodColor = 'bg-orange-100 text-orange-700';
            else if (payment.payment_method === 'Rocket') methodColor = 'bg-purple-100 text-purple-700';
            else if (payment.payment_method === 'bank') methodColor = 'bg-indigo-100 text-indigo-700';
            else if (payment.payment_method === 'cash') methodColor = 'bg-yellow-100 text-yellow-700';

            html += `
                <tr>
                    <td class="text-xs whitespace-nowrap">${payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('bn-BD') : '-'}</td>
                    <td>
                        <span class="text-sm font-medium">${loanInfo.member_name || '-'}</span>
                        <span class="text-xs text-gray-400 block">${loanInfo.member_id || ''}</span>
                    </td>
                    <td class="text-xs">${payment.loan_id || '-'}</td>
                    <td class="text-center font-bold">#${payment.installment_no || '-'}</td>
                    <td class="text-right font-bold text-emerald-600">${formatAmountWithText(totalAmount)}</td>
                    <td><span class="text-xs font-mono bg-gray-100 px-2 py-1 rounded">${payment.transaction_id || '-'}</span></td>
                    <td><span class="px-2 py-1 rounded-full text-xs ${methodColor}">${payment.payment_method || 'cash'}</span></td>
                    <td>
                        <div class="flex gap-1 flex-wrap">
                            <button onclick="approveLoanPayment(${paymentId})" class="btn btn-success btn-xs" title="অনুমোদন"><i class="fas fa-check"></i></button>
                            <button onclick="rejectLoanPayment(${paymentId})" class="btn btn-danger btn-xs" title="বাতিল"><i class="fas fa-times"></i></button>
                            <button onclick="viewLoanPaymentDetails(${paymentId})" class="btn btn-info btn-xs" title="বিস্তারিত"><i class="fas fa-eye"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }

        html += `</tbody></table></div>`;
        container.innerHTML = html;

        console.log('✅ পেন্ডিং লোন পেমেন্ট লোড সম্পূর্ণ:', pendingLoanPaymentsData.length);

    } catch(e) {
        console.error('Load pending loan payments error:', e);
        container.innerHTML = `
            <div class="text-red-500 p-4 text-center">
                <i class="fas fa-exclamation-circle text-3xl block mb-2"></i>
                <p>❌ লোড করতে সমস্যা!</p>
                <p class="text-sm text-gray-400 mt-2">${e.message || 'অজানা ত্রুটি'}</p>
                <button onclick="loadPendingLoanPayments()" class="btn btn-info btn-sm mt-3">পুনরায় চেষ্টা করুন</button>
            </div>
        `;
    }
}

export async function approveLoanPayment(paymentId) {
    const id = parseInt(paymentId);
    if (isNaN(id) || id <= 0) {
        showToast('❌ পেমেন্ট আইডি সঠিক নয়!', 'error');
        return;
    }
    if (!confirm('এই লোন পেমেন্টটি অনুমোদন দেবেন?')) return;
    const client = supabaseClient;
    if (!client) { showToast('সংযোগ সমস্যা!', 'error'); return; }
    try {
        const { data: checkPayment, error: checkError } = await client
            .from('loan_payments')
            .select('id, loan_id, total_amount, emi_amount')
            .eq('id', id)
            .maybeSingle();
        if (checkError || !checkPayment) {
            showToast('❌ পেমেন্ট খুঁজে পাওয়া যায়নি!', 'error');
            return;
        }
        const { error: updateError } = await client
            .from('loan_payments')
            .update({ status: 'approved', approved_by: getCurrentAdmin()?.username || 'system', approved_at: new Date().toISOString() })
            .eq('id', id);
        if (updateError) throw updateError;
        if (checkPayment && checkPayment.loan_id) {
            const totalAmount = checkPayment.total_amount || checkPayment.emi_amount || 0;
            const { data: loan, error: loanError } = await client
                .from('loan_applications')
                .select('remaining_balance')
                .eq('id', checkPayment.loan_id)
                .single();
            if (!loanError && loan) {
                const newRemaining = Math.max(0, (loan.remaining_balance || 0) - totalAmount);
                await client.from('loan_applications').update({ remaining_balance: newRemaining }).eq('id', checkPayment.loan_id);
            }
        }
        addNotification(`✅ লোন পেমেন্ট অনুমোদিত: #${paymentId}`, 'success');
        showToast('✅ লোন পেমেন্ট অনুমোদিত হয়েছে!', 'success');
        loadPendingLoanPayments();
        loadAllLoans();
        loadLoanCollectionReport();
        await updateAllBadges();
    } catch(e) {
        console.error('Approve loan payment error:', e);
        showToast('❌ অনুমোদন ব্যর্থ: ' + (e.message || 'অজানা ত্রুটি'), 'error');
    }
}

export async function rejectLoanPayment(paymentId) {
    const id = parseInt(paymentId);
    if (isNaN(id) || id <= 0) {
        showToast('❌ পেমেন্ট আইডি সঠিক নয়!', 'error');
        return;
    }
    const reason = prompt('বাতিলের কারণ লিখুন:');
    if (reason === null || !reason.trim()) {
        showToast('বাতিলের কারণ লিখুন!', 'error');
        return;
    }
    const client = supabaseClient;
    if (!client) { showToast('সংযোগ সমস্যা!', 'error'); return; }
    try {
        const { data: checkPayment, error: checkError } = await client
            .from('loan_payments')
            .select('id')
            .eq('id', id)
            .maybeSingle();
        if (checkError || !checkPayment) {
            showToast('❌ পেমেন্ট খুঁজে পাওয়া যায়নি!', 'error');
            return;
        }
        const { error } = await client
            .from('loan_payments')
            .update({ status: 'rejected', reject_reason: reason.trim(), rejected_by: getCurrentAdmin()?.username || 'system', rejected_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
        showToast('❌ লোন পেমেন্ট বাতিল করা হয়েছে!', 'warning');
        loadPendingLoanPayments();
        await updateAllBadges();
    } catch(e) {
        console.error('Reject loan payment error:', e);
        showToast('❌ বাতিল করতে সমস্যা: ' + (e.message || 'অজানা ত্রুটি'), 'error');
    }
}

export function viewLoanPaymentDetails(paymentId) {
    const payment = pendingLoanPaymentsData.find(p => Number(p.id) === Number(paymentId));
    if (!payment) {
        showToast('পেমেন্ট তথ্য পাওয়া যায়নি!', 'error');
        return;
    }
    const client = supabaseClient;
    if (!client) { showToast('সংযোগ সমস্যা!', 'error'); return; }
    const modal = document.getElementById('paymentSlipModal');
    if (modal) {
        document.getElementById('slipPrintArea').innerHTML = '<div class="text-center py-8"><div class="loading-spinner"></div><p class="text-gray-500 mt-2">লোড হচ্ছে...</p></div>';
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    client.from('loan_applications').select('member_id, member_name, loan_type, amount').eq('id', payment.loan_id).single()
        .then(({ data: loanData, error }) => {
            const loanInfo = loanData || {};
            const totalAmount = payment.total_amount || payment.emi_amount || 0;
            const lateFee = payment.late_fee || 0;
            let methodColor = 'bg-blue-100 text-blue-700';
            if (payment.payment_method === 'bKash') methodColor = 'bg-green-100 text-green-700';
            else if (payment.payment_method === 'Nagad') methodColor = 'bg-orange-100 text-orange-700';
            else if (payment.payment_method === 'Rocket') methodColor = 'bg-purple-100 text-purple-700';
            else if (payment.payment_method === 'bank') methodColor = 'bg-indigo-100 text-indigo-700';
            else if (payment.payment_method === 'cash') methodColor = 'bg-yellow-100 text-yellow-700';
            const details = `
                <div class="bg-gradient-to-r from-emerald-50 to-blue-50 p-4 rounded-lg border mb-4">
                    <h4 class="font-bold text-emerald-700 text-lg mb-3"><i class="fas fa-receipt mr-2"></i>লোন পেমেন্ট বিস্তারিত</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div class="bg-white p-3 rounded-lg shadow-sm"><span class="text-gray-500">পেমেন্ট আইডি</span><p class="font-semibold text-gray-800">#${payment.id}</p></div>
                        <div class="bg-white p-3 rounded-lg shadow-sm"><span class="text-gray-500">কিস্তি নম্বর</span><p class="font-semibold text-gray-800">#${payment.installment_no}</p></div>
                        <div class="bg-white p-3 rounded-lg shadow-sm"><span class="text-gray-500">সদস্য</span><p class="font-semibold text-gray-800">${loanInfo.member_name || '-'}</p></div>
                        <div class="bg-white p-3 rounded-lg shadow-sm"><span class="text-gray-500">সদস্য আইডি</span><p class="font-semibold text-gray-800">${loanInfo.member_id || '-'}</p></div>
                        <div class="bg-white p-3 rounded-lg shadow-sm"><span class="text-gray-500">লোনের ধরন</span><p class="font-semibold text-gray-800">${loanInfo.loan_type || '-'}</p></div>
                        <div class="bg-white p-3 rounded-lg shadow-sm"><span class="text-gray-500">লোন পরিমাণ</span><p class="font-semibold text-emerald-600">${formatAmountWithText(loanInfo.amount)}</p></div>
                        <div class="bg-white p-3 rounded-lg shadow-sm"><span class="text-gray-500">কিস্তির পরিমাণ</span><p class="font-semibold text-emerald-600">${formatAmountWithText(payment.emi_amount)}</p></div>
                        <div class="bg-white p-3 rounded-lg shadow-sm"><span class="text-gray-500">বিলম্ব ফি</span><p class="font-semibold ${lateFee > 0 ? 'text-red-600' : 'text-gray-400'}">${formatAmountWithText(lateFee)}</p></div>
                        <div class="bg-white p-3 rounded-lg shadow-sm col-span-1 md:col-span-2"><span class="text-gray-500">মোট পরিশোধ</span><p class="font-bold text-blue-600 text-xl">${formatAmountWithText(totalAmount)}</p></div>
                        <div class="bg-white p-3 rounded-lg shadow-sm"><span class="text-gray-500">পেমেন্ট মাধ্যম</span><p><span class="px-2 py-1 rounded-full text-xs ${methodColor}">${payment.payment_method || 'cash'}</span></p></div>
                        <div class="bg-white p-3 rounded-lg shadow-sm"><span class="text-gray-500">লেনদেন আইডি</span><p class="font-semibold font-mono text-xs break-all">${payment.transaction_id || '-'}</p></div>
                        <div class="bg-white p-3 rounded-lg shadow-sm"><span class="text-gray-500">তারিখ</span><p class="font-semibold text-gray-800">${payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('bn-BD') : '-'}</p></div>
                        <div class="bg-white p-3 rounded-lg shadow-sm"><span class="text-gray-500">স্ট্যাটাস</span><p><span class="px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700">⏳ যাচাইকরণে</span></p></div>
                        ${payment.sender_mobile ? `<div class="bg-white p-3 rounded-lg shadow-sm"><span class="text-gray-500">সেন্ডার মোবাইল</span><p class="font-semibold text-gray-800">${payment.sender_mobile}</p></div>` : ''}
                        ${payment.bank_name ? `<div class="bg-white p-3 rounded-lg shadow-sm"><span class="text-gray-500">ব্যাংকের নাম</span><p class="font-semibold text-gray-800">${payment.bank_name}</p></div>` : ''}
                        ${payment.account_number ? `<div class="bg-white p-3 rounded-lg shadow-sm"><span class="text-gray-500">একাউন্ট নম্বর</span><p class="font-semibold text-gray-800">${payment.account_number}</p></div>` : ''}
                    </div>
                </div>
                <div class="flex gap-2 justify-center no-print">
                    <button onclick="window.print()" class="btn btn-purple btn-sm"><i class="fas fa-print mr-1"></i> প্রিন্ট</button>
                    <button onclick="closePaymentSlipModal()" class="btn btn-danger btn-sm"><i class="fas fa-times mr-1"></i> বন্ধ</button>
                </div>
            `;
            const printArea = document.getElementById('slipPrintArea');
            if (printArea) printArea.innerHTML = details;
        })
        .catch(error => {
            console.error('Error loading loan details:', error);
            document.getElementById('slipPrintArea').innerHTML = `<div class="text-red-500 p-4 text-center"><i class="fas fa-exclamation-circle text-3xl block mb-2"></i><p>❌ তথ্য লোড করতে সমস্যা!</p></div>`;
        });
}

// Import from branches for loan collection report
import { loadBranchReport } from './branches.js';
import { getCurrentAdmin } from './config.js';
