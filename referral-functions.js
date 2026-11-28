/* TUKNBD Member Dashboard — Referral Functions
 * Refactor only: function bodies are moved verbatim from member-dashboard.html.
 * Dependencies (Supabase client, currentUser, userFunds, formatting helpers, etc.)
 * remain in the dashboard and are resolved when these functions execute.
 * Do not load this file as a module; it must remain a classic script for global handlers.
 */

function updateReferralLink() {
    const referralLink = document.getElementById('referralLink');
    if(!referralLink) return;
    
    let refCode = currentUser.referId || currentUser.refer_code;
    if(!refCode) {
        referralLink.value = 'রেফারেল কোড পাওয়া যায়নি';
        return;
    }
    
    // ✅ Ref code normalize
    if(refCode && typeof refCode === 'string') {
        const match = refCode.match(/\d+/);
        if(match) refCode = match[0];
    }
    
    // ✅ FIX: Hardcoded production domain ব্যবহার করুন
    const PRODUCTION_DOMAIN = 'https://www.tuknarif.com.bd';
    referralLink.value = `${PRODUCTION_DOMAIN}/member-signup.html?ref=${refCode}`;
}

async function loadBonusHistory() { 
    document.getElementById('bonusHistoryList').innerHTML = '<div class="text-center text-gray-400 py-4">🤝 কোনো বোনাস পাওয়া যায়নি</div>'; 
}

async function insertReferralBonusLog(memberId, amount, level, note, fromMemberId) {
    const client = await initSupabase();
    if (!client) return false;
    
    try {
        const now = getCurrentBangladeshTime();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        const finalFromMemberId = fromMemberId || currentUser?.id || memberId;
        const finalAmount = Math.round(Number(amount) || 0);
        
        if (finalAmount <= 0) {
            console.log(`ℹ️ [Log] Amount 0, skip: ${memberId}`);
            return false;
        }
        
        // ═══════════════════════════════════════════════════════════
        // ✅ STEP 1: month_key + member_id + level দিয়ে check
        // Timezone-safe! created_at এর range লাগবে না
        // ═══════════════════════════════════════════════════════════
        const { data: existing, error: checkError } = await client
            .from('referral_bonus_log')
            .select('id, amount, month_key, updated_at')
            .eq('member_id', memberId)
            .eq('level', level)
            .eq('month_key', currentMonthKey)   // ✅ Timezone-safe filter
            .order('created_at', { ascending: false });
        
        if (checkError) {
            console.error('❌ [Log] চেক error:', checkError);
            return false;
        }
        
        // ═══════════════════════════════════════════════════════════
        // ✅ STEP 2: লগ থাকলে — overwrite
        // ═══════════════════════════════════════════════════════════
        if (existing && existing.length > 0) {
            const existingLog = existing[0];
            const oldAmount = Number(existingLog.amount) || 0;
            
            // ✅ Same amount → কিছু করবেন না
            if (Math.abs(oldAmount - finalAmount) < 0.01) {
                console.log(`ℹ️ [Log] ${memberId} L${level}: already সঠিক (${finalAmount})`);
                return true;
            }
            
            // ✅ ভিন্ন হলে overwrite
            console.log(`🔄 [Log] ${memberId} L${level}: ${oldAmount} → ${finalAmount}`);
            
            const { error: updateError } = await client
                .from('referral_bonus_log')
                .update({ 
                    amount: finalAmount,
                    note: note,
                    from_member_id: finalFromMemberId,
                    updated_at: new Date().toISOString(),
                    updated_by: currentUser?.id || null
                })
                .eq('id', existingLog.id);
            
            if (updateError) {
                console.error('❌ [Log] আপডেট error:', updateError);
                return false;
            }
            
            // ✅ Extra rows cleanup
            if (existing.length > 1) {
                const extraIds = existing.slice(1).map(e => e.id);
                const { error: deleteError } = await client
                    .from('referral_bonus_log')
                    .delete()
                    .in('id', extraIds);
                
                if (!deleteError) {
                    console.log(`🗑️ [Log] ${extraIds.length} টি duplicate cleanup`);
                }
            }
            
            return true;
        }
        
        // ═══════════════════════════════════════════════════════════
        // ✅ STEP 3: নতুন লগ
        // ═══════════════════════════════════════════════════════════
        const { error: insertError } = await client
            .from('referral_bonus_log')
            .insert([{
                member_id: memberId,
                amount: finalAmount,
                level: level,
                note: note,
                from_member_id: finalFromMemberId,
                month_key: currentMonthKey,
                created_at: new Date().toISOString()
            }]);
        
        if (insertError) {
            console.error('❌ [Log] ইনসার্ট error:', insertError);
            return false;
        }
        
        console.log(`✅ [Log] ${memberId}: নতুন লগ ${finalAmount} টাকা (L${level}, ${currentMonthKey})`);
        return true;
        
    } catch(e) {
        console.error('❌ [Log] insertReferralBonusLog error:', e);
        return false;
    }
}

function goToBonusHistory() {
    console.log('🎯 Going to Bonus History...');
    
    if (typeof switchTab === 'function') {
        switchTab('referral');
    }
    
    setTimeout(() => {
        const bonusSection = document.getElementById('referralBonusHistoryList');
        if (bonusSection) {
            bonusSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            if (bonusSection.parentElement) {
                bonusSection.parentElement.style.transition = 'all 0.3s ease';
                bonusSection.parentElement.style.boxShadow = '0 0 30px rgba(245, 158, 11, 0.5)';
                setTimeout(() => {
                    bonusSection.parentElement.style.boxShadow = '';
                }, 1500);
            }
        }
    }, 500);
}

async function updateReferralBonusSummary() {
    const container = document.getElementById('referralBonusSummary');
    if (!container) return;
    
    if (!currentUser || !currentUser.id) {
        container.classList.add('hidden');
        return;
    }
    
    const client = await initSupabase();
    if (!client) return;
    
    try {
        // ============================================================
        // ১. মোট আয় — log থেকে
        // ============================================================
        const { data: bonusLogs } = await client
            .from('referral_bonus_log')
            .select('amount, level')
            .eq('member_id', currentUser.id);
        
        const totalEarned = (bonusLogs || [])
            .filter(log => {
                const lvl = Number(log.level);
                return lvl >= 1 && lvl <= 10;
            })
            .reduce((sum, log) => sum + Number(log.amount || 0), 0);
        
        // ============================================================
        // ২. ✅ সব debit — withdrawal + internal_transfer
        // ============================================================
        const { data: debits } = await client
            .from('main_ledger')
            .select('amount, source')
            .eq('member_id', currentUser.id)
            .eq('account', 'referral_bonus')
            .eq('action', 'debit');
        
        const totalWithdrawn = (debits || [])
            .filter(d => d.source === 'withdrawal')
            .reduce((sum, d) => sum + Number(d.amount || 0), 0);
        
        const totalTransferred = (debits || [])
            .filter(d => d.source === 'internal_transfer')
            .reduce((sum, d) => sum + Number(d.amount || 0), 0);
        
        // ============================================================
        // ৩. Debt
        // ============================================================
        const { data: debtData } = await client
            .from('referral_bonus_debt')
            .select('excess_amount')
            .eq('member_id', currentUser.id)
            .maybeSingle();
        
        const debt = Number(debtData?.excess_amount) || 0;
        
        // ============================================================
        // ৪. ✅ উপলব্ধ — transfer বাদ
        // ============================================================
        const available = Math.max(0, totalEarned - totalWithdrawn - totalTransferred - debt);
        
        // ============================================================
        // ৫. Count
        // ============================================================
        const { data: downlines } = await client
            .from('members')
            .select('member_id')
            .eq('referred_by', currentUser.refer_code || currentUser.referId);
        
        const count = (downlines || []).length;
        
        // ============================================================
        // ৬. Progress
        // ============================================================
        const totalDebit = totalWithdrawn + totalTransferred;
        const withdrawalProgress = totalEarned > 0 
            ? Math.round((totalDebit / totalEarned) * 100) 
            : 0;
        
        console.log('🎁 Referral Bonus Summary:', {
            totalEarned,
            totalWithdrawn,
            totalTransferred,
            debt,
            available,
            count,
            totalDebit
        });
        
        // ============================================================
        // ৭. কোনো data না থাকলে লুকান
        // ============================================================
        if (totalEarned === 0 && count === 0 && debt === 0) {
            container.classList.add('hidden');
            container.innerHTML = '';
            return;
        }
        
        const formatVal = (v) => {
            const num = Number(v) || 0;
            return num.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        };
        
        // ============================================================
        // ৮. Card Render
        // ============================================================
        container.classList.remove('hidden');
        container.innerHTML = `
            <div class="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-2xl p-4 shadow-md border-2 border-amber-200">
                <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div class="flex items-center gap-2">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                            <i class="fas fa-gift text-white text-lg"></i>
                        </div>
                        <div>
                            <h3 class="text-base font-bold text-amber-800">🎁 Referral Bonus</h3>
                            <p class="text-[10px] text-amber-600">${bnToEn(count)} জন সক্রিয় রেফারেল</p>
                        </div>
                    </div>
                    <span class="bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-full">Level 1-10</span>
                </div>
                
                <div class="grid grid-cols-3 gap-2 mb-3">
                    <div class="bg-white rounded-xl p-3 border-2 border-emerald-200">
                        <p class="text-[9px] text-gray-500 font-semibold mb-1">💰 মোট আয়</p>
                        <p class="text-lg font-extrabold text-emerald-700">৳${bnToEn(formatVal(totalEarned))}</p>
                    </div>
                    <div class="bg-white rounded-xl p-3 border-2 border-red-200">
                        <p class="text-[9px] text-gray-500 font-semibold mb-1">📤 উত্তোলিত</p>
                        <p class="text-lg font-extrabold text-red-700">৳${bnToEn(formatVal(totalWithdrawn))}</p>
                    </div>
                    <div class="bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl p-3 border-2 border-emerald-400">
                        <p class="text-[9px] text-gray-600 font-semibold mb-1">✅ উপলব্ধ</p>
                        <p class="text-lg font-extrabold text-emerald-800">৳${bnToEn(formatVal(available))}</p>
                    </div>
                </div>
                
                ${totalTransferred > 0 ? `
                    <div class="bg-purple-50 border border-purple-300 rounded-lg p-2 mb-3">
                        <p class="text-xs text-purple-700">
                            <i class="fas fa-exchange-alt mr-1"></i>
                            আপনি <strong>৳${bnToEn(formatVal(totalTransferred))}</strong> সঞ্চয় ফান্ডে ট্রান্সফার করেছেন।
                        </p>
                    </div>
                ` : ''}
                
                ${totalWithdrawn > 0 ? `
                    <div class="bg-blue-50 border border-blue-300 rounded-lg p-2 mb-3">
                        <p class="text-xs text-blue-700">
                            <i class="fas fa-info-circle mr-1"></i>
                            আপনি <strong>৳${bnToEn(formatVal(totalWithdrawn))}</strong> উত্তোলন করেছেন।
                        </p>
                    </div>
                ` : ''}
                
                ${debt > 0 ? `
                    <div class="bg-red-50 border-2 border-red-300 rounded-lg p-2 mb-3">
                        <p class="text-xs text-red-700 font-semibold">
                            <i class="fas fa-exclamation-triangle mr-1"></i>
                            ⚠️ ঋণ: ৳${bnToEn(formatVal(debt))}
                        </p>
                        <p class="text-[10px] text-red-600 mt-1">
                            পূর্বের অতিরিক্ত উত্তোলন — পরবর্তী বোনাস থেকে কেটে নেওয়া হবে
                        </p>
                    </div>
                ` : ''}
                
                ${totalEarned > 0 ? `
                    <div class="mb-3">
                        <div class="flex justify-between items-center mb-1">
                            <p class="text-[10px] text-gray-500 font-semibold">উত্তোলন Progress</p>
                            <p class="text-[10px] font-bold text-amber-700">${bnToEn(withdrawalProgress)}%</p>
                        </div>
                        <div class="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
                            <div class="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" style="width: ${Math.min(100, withdrawalProgress)}%"></div>
                        </div>
                    </div>
                ` : ''}
                
                <div class="flex gap-2">
                    <button onclick="goToBonusHistory()" 
                            class="flex-1 bg-white text-amber-700 border-2 border-amber-400 py-2 rounded-lg text-xs font-bold hover:bg-amber-50 transition flex items-center justify-center gap-1">
                        <i class="fas fa-history"></i>
                        <span>Bonus History</span>
                    </button>
                    ${available > 0 ? `
                        <button onclick="openWithdrawModal('bonus')" 
                                class="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2 rounded-lg text-xs font-bold hover:from-amber-600 hover:to-orange-600 transition flex items-center justify-center gap-1 shadow-md">
                            <i class="fas fa-hand-holding-usd"></i>
                            <span>উত্তোলন</span>
                        </button>
                    ` : `
                        <button disabled class="flex-1 bg-gray-300 text-gray-500 py-2 rounded-lg text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1">
                            <i class="fas fa-ban"></i>
                            <span>ব্যালেন্স নেই</span>
                        </button>
                    `}
                </div>
            </div>
        `;
        
    } catch(e) {
        console.error('❌ updateReferralBonusSummary error:', e);
    }
}

async function showDebtNotice() {
    const container = document.getElementById('debtNoticeContainer');
    if (!container) return;
    
    const client = await initSupabase();
    if (!client || !currentUser) return;
    
    try {
        const { data: debtData } = await client
            .from('referral_bonus_debt')
            .select('excess_amount, original_excess, adjusted_amount')
            .eq('member_id', currentUser.id)
            .maybeSingle();
        
        const debt = Number(debtData?.excess_amount) || 0;
        const originalDebt = Number(debtData?.original_excess) || 0;
        const adjustedDebt = Number(debtData?.adjusted_amount) || 0;
        
        if (debt <= 0) {
            container.classList.add('hidden');
            container.innerHTML = '';
            return;
        }
        
        const formatVal = (v) => {
            const num = Number(v) || 0;
            return num.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        };
        
        container.classList.remove('hidden');
        container.innerHTML = `
            <div class="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-400 rounded-xl p-4 mb-4 shadow-md">
                <div class="flex items-start gap-3">
                    <div class="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-exclamation-triangle text-white text-lg"></i>
                    </div>
                    <div class="flex-1">
                        <p class="font-bold text-red-800 text-base mb-1">
                            ⚠️ অতিরিক্ত উত্তোলনের নোটিশ
                        </p>
                        <p class="text-sm text-red-700 mb-2">
                            আপনি পূর্বে <strong>৳${formatVal(originalDebt)}</strong> বেশি উত্তোলন করেছেন।
                        </p>
                        <div class="bg-white rounded-lg p-3 border border-red-200 mb-2">
                            <div class="flex justify-between items-center mb-1">
                                <span class="text-xs text-gray-600">মোট অতিরিক্ত উত্তোলন:</span>
                                <span class="text-sm font-bold text-red-700">৳${formatVal(originalDebt)}</span>
                            </div>
                            ${adjustedDebt > 0 ? `
                            <div class="flex justify-between items-center mb-1">
                                <span class="text-xs text-gray-600">ইতিমধ্যে সমন্বয়:</span>
                                <span class="text-sm font-bold text-green-700">৳${formatVal(adjustedDebt)}</span>
                            </div>
                            ` : ''}
                            <div class="flex justify-between items-center border-t border-red-200 pt-1 mt-1">
                                <span class="text-xs font-bold text-gray-800">অবশিষ্ট ঋণ:</span>
                                <span class="text-base font-extrabold text-red-700">৳${formatVal(debt)}</span>
                            </div>
                        </div>
                        <div class="bg-amber-50 border border-amber-300 rounded-lg p-2">
                            <p class="text-xs text-amber-800">
                                <i class="fas fa-info-circle mr-1"></i>
                                <strong>এই ঋণ পরবর্তী রেফারেল বোনাস থেকে স্বয়ংক্রিয়ভাবে কেটে নেওয়া হবে।</strong>
                                আপনার মূল সঞ্চয় থেকে কোনো টাকা কাটা হবে না।
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
    } catch(e) {
        console.error('❌ showDebtNotice error:', e);
    }
}

function updateBonusHistorySection(bonusLogs = []) {
    const container = document.getElementById('referralBonusHistoryList');
    const totalEl = document.getElementById('bonusHistoryTotal');
    const countEl = document.getElementById('bonusHistoryCount');
    
    if (!container) {
        console.warn('⚠️ bonusHistoryList element পাওয়া যায়নি');
        return;
    }
    
    console.log('🎁 Updating Bonus History Section');
    console.log(`   Total logs: ${bonusLogs.length}`);
    
    // Empty State
    if (!bonusLogs || bonusLogs.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-dashed border-gray-300">
                <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <i class="fas fa-gift text-gray-400 text-2xl"></i>
                </div>
                <p class="text-gray-500 font-semibold mb-1">এখনো কোনো বোনাস পাননি</p>
                <p class="text-xs text-gray-400">প্রথম Payment Approve হলে এখানে দেখা যাবে</p>
            </div>
        `;
        
        if (totalEl) totalEl.innerText = 'মোট: ৳০';
        if (countEl) countEl.innerText = '০টি বোনাস';
        return;
    }
    
    // Statistics
    const totalAmount = bonusLogs.reduce((sum, log) => sum + (Number(log.amount) || 0), 0);
    const totalCount = bonusLogs.length;
    
    if (totalEl) totalEl.innerText = `মোট: ৳${bnToEn(totalAmount.toLocaleString('en-US'))}`;
    if (countEl) countEl.innerText = `${bnToEn(totalCount)}টি বোনাস`;
    
    // Save for filtering
    window._bonusHistoryLogs = bonusLogs;
    
    // Render
    renderBonusHistoryLogs(bonusLogs);
    
    console.log('✅ Bonus History Section Updated');
}

function renderBonusHistoryLogs(logs) {
    const container = document.getElementById('referralBonusHistoryList');
    if (!container) return;
    
    if (!logs || logs.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-400 text-sm">
                <i class="fas fa-filter text-2xl mb-2"></i>
                <p>এই Level-এ কোনো বোনাস নেই</p>
            </div>
        `;
        return;
    }
    
    const levelColors = {
        1: { bg: 'emerald', border: 'emerald', icon: '🥇' },
        2: { bg: 'blue', border: 'blue', icon: '🥈' },
        3: { bg: 'amber', border: 'amber', icon: '🥉' },
        4: { bg: 'purple', border: 'purple', icon: '4️⃣' },
        5: { bg: 'pink', border: 'pink', icon: '5️⃣' },
        6: { bg: 'indigo', border: 'indigo', icon: '6️⃣' },
        7: { bg: 'red', border: 'red', icon: '7️⃣' },
        8: { bg: 'teal', border: 'teal', icon: '8️⃣' },
        9: { bg: 'orange', border: 'orange', icon: '9️⃣' },
        10: { bg: 'cyan', border: 'cyan', icon: '🔟' }
    };
    
    let html = '';
    
    logs.forEach((log) => {
        const level = log.level || 1;
        const colorInfo = levelColors[level] || levelColors[1];
        
        const bonusDate = log.created_at ? formatDateTimeBD(log.created_at) : '-';
        const amount = Number(log.amount) || 0;
        const rate = Number(log.commission_rate) || 0;
        const sourceAmount = Number(log.savings_amount) || 0;
        const fromMemberId = log.from_member_id || '-';
        
        html += `
    <div class="bg-white rounded-xl border-2 border-${colorInfo.border}-200 hover:border-${colorInfo.border}-400 hover:shadow-md transition p-3 mb-2">
        
        <div class="flex items-start gap-3">
            
            <div class="w-10 h-10 rounded-full bg-${colorInfo.bg}-100 flex items-center justify-center flex-shrink-0">
                <span class="text-lg">${colorInfo.icon}</span>
            </div>
            
            <div class="flex-1 min-w-0">
                
                <div class="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="bg-${colorInfo.bg}-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Level ${level}
                        </span>
                        <span class="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            ${bnToEn(rate)}%
                        </span>
                    </div>
                    <p class="text-lg font-extrabold text-emerald-600">
                        +৳${bnToEn(amount.toLocaleString('en-US'))}
                    </p>
                </div>
                
                <p class="text-xs text-gray-600 mb-1">
                    <i class="fas fa-user text-gray-400 mr-1"></i>
                    <strong>থেকে:</strong> ${bnToEn(fromMemberId)}
                </p>
                
                <div class="bg-gray-50 rounded-lg p-2 border border-gray-200 mb-1">
                    <p class="text-[10px] text-gray-600">
                        <i class="fas fa-calculator text-gray-400 mr-1"></i>
                        <strong>হিসাব:</strong> 
                        ৳${bnToEn(sourceAmount.toLocaleString('en-US'))} × 
                        ${bnToEn(rate)}% = 
                        <strong class="text-emerald-600">৳${bnToEn(amount.toLocaleString('en-US'))}</strong>
                    </p>
                </div>
                
                <p class="text-[10px] text-gray-400">
                    <i class="fas fa-clock mr-1"></i>
                    ${bonusDate}
                </p>
                
            </div>
            
        </div>
        
    </div>
`;
    });
    
    container.innerHTML = html;
}

function filterBonusHistory(filterType) {
    const allLogs = window._bonusHistoryLogs || [];
    
    console.log(`🔍 Filtering bonus history: ${filterType}`);
    
    let filteredLogs = [];
    
    if (filterType === 'all') {
        filteredLogs = allLogs;
    } else if (filterType === '3-10') {
        filteredLogs = allLogs.filter(log => {
            const lvl = log.level || 1;
            return lvl >= 3 && lvl <= 10;
        });
    } else {
        filteredLogs = allLogs.filter(log => (log.level || 1) === parseInt(filterType));
    }
    
    // UI Filter Buttons Update
    document.querySelectorAll('.bonus-filter-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-emerald-50', 'text-emerald-700', 'border-emerald-500');
        btn.classList.add('bg-white', 'text-gray-600', 'border-gray-200');
    });
    
    const activeBtn = document.querySelector(`.bonus-filter-btn[data-filter="${filterType}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active', 'bg-emerald-50', 'text-emerald-700', 'border-emerald-500');
        activeBtn.classList.remove('bg-white', 'text-gray-600', 'border-gray-200');
    }
    
    // Render filtered
    renderBonusHistoryLogs(filteredLogs);
    
    console.log(`   Filtered: ${filteredLogs.length} logs`);
}

function findBonusesForMember(member) {
    if (!member) return [];
    
    const map = window._bonusMap || { byMobile: {}, byName: {}, byId: {} };
    
    // ✅ Helper — Level 1-10 ফিল্টার
    const filterLevel = (logs) => {
        if (!logs || !Array.isArray(logs)) return [];
        return logs.filter(log => {
            const lvl = Number(log.level);
            return lvl >= 1 && lvl <= 10;
        });
    };
    
    // Priority 1: Mobile
    const mobile = String(member.mobile || '').replace(/\D/g, '');
    if (mobile && map.byMobile && map.byMobile[mobile]) {
        return filterLevel(map.byMobile[mobile]);
    }
    
    // Priority 2: Name
    const nameKey = String(member.full_name || '').trim().toLowerCase();
    if (nameKey && map.byName && map.byName[nameKey]) {
        return filterLevel(map.byName[nameKey]);
    }
    
    // Priority 3: ID (multiple formats)
    const rawId = String(member.member_id || '').trim();
    if (rawId && map.byId) {
        const idKeys = [
            rawId,
            rawId.replace(/\s+/g, '').replace(/-/g, '').toUpperCase(),
            rawId.replace(/\s+/g, '-'),
            rawId.replace(/-/g, ' '),
            rawId.replace(/-/g, ''),
            rawId.replace(/\s+/g, '')
        ];
        
        for (const k of idKeys) {
            if (map.byId[k] && map.byId[k].length > 0) {
                return filterLevel(map.byId[k]);
            }
        }
    }
    
    return [];
}

async function loadReferralData() {
    if (!currentUser || isLoadingReferral) return;
    
    let client = await initSupabase();
    if (!client) {
        console.log('⏳ Supabase client not ready, retrying...');
        setTimeout(() => loadReferralData(), 1000);
        return;
    }
    
    isLoadingReferral = true;
    
    // Loading state
    for (let i = 1; i <= 10; i++) {
        const container = document.getElementById(`level${i}List`);
        if (container) {
            container.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-emerald-600"></i> লোড হচ্ছে...</div>';
        }
    }
    
    try {
        // ═══════════════════════════════════════════════════════
        // STEP 1: সব সদস্য লোড
        // ═══════════════════════════════════════════════════════
        const { data: allMembers, error } = await client.rpc('get_all_members_for_referral');
        
        if (error) throw error;
        
        if (!allMembers || allMembers.length === 0) {
            console.log('📭 কোনো সদস্য পাওয়া যায়নি');
            resetReferralDisplay('কোনো সদস্য পাওয়া যায়নি');
            isLoadingReferral = false;
            return;
        }
        
        console.log(`✅ মোট ${allMembers.length} জন সদস্য লোড হয়েছে`);
                
        // ═══════════════════════════════════════════════════════
        // STEP 2: Approved First Payments লোড
        // ═══════════════════════════════════════════════════════
        const memberIds = allMembers.map(m => m.member_id).filter(Boolean);
        
        // শুধু first approved payment
        const { data: allPayments } = await client
            .from('payments')
            .select('member_id, amount, approved_at, is_first_payment')
            .in('member_id', memberIds)
            .eq('status', 'approved')
            .eq('is_first_payment', true)
            .order('approved_at', { ascending: true });
        
        // First Payment Map
        const firstPaymentMap = {};
        (allPayments || []).forEach(p => {
            if (!firstPaymentMap[p.member_id]) {
                firstPaymentMap[p.member_id] = Number(p.amount) || 0;
            }
        });
        
        console.log(`✅ ${Object.keys(firstPaymentMap).length} জনের First Payment পাওয়া গেছে`);
               
        // ═══════════════════════════════════════════════════════
        // STEP 3: Commission Rates
        // ═══════════════════════════════════════════════════════
        const commissionRates = {
            1: 0.15, 2: 0.10, 3: 0.05, 4: 0.05, 5: 0.05,
            6: 0.05, 7: 0.05, 8: 0.05, 9: 0.05, 10: 0.05
        };
        
        // ═══════════════════════════════════════════════════════
        // STEP 4: Normalize Members + First Payment যোগ
        // ═══════════════════════════════════════════════════════
        const normalizedMembers = allMembers.map(member => {
            let refCode = member.refer_code;
            let refBy = member.referred_by;
            
            if (refCode && typeof refCode === 'string') {
                const match = refCode.match(/\d+/);
                if (match) refCode = match[0];
            }
            if (refBy && typeof refBy === 'string') {
                const match = refBy.match(/\d+/);
                if (match) refBy = match[0];
            }
            
            return {
                ...member,
                refer_code_normalized: refCode,
                referred_by_normalized: refBy,
                _firstPayment: firstPaymentMap[member.member_id] || null
            };
        });
        
        // ═══════════════════════════════════════════════════════
        // STEP 5: নিজের refer_code
        // ═══════════════════════════════════════════════════════
        let myReferCode = currentUser.referId || currentUser.refer_code;
        
        if (myReferCode && typeof myReferCode === 'string') {
            const match = myReferCode.match(/\d+/);
            if (match) myReferCode = match[0];
        }
        
        console.log('🔑 আমার রেফারেল কোড:', myReferCode);
        
        if (!myReferCode) {
            resetReferralDisplay('আপনার কোনো রেফারেল কোড নেই');
            isLoadingReferral = false;
            return;
        }
        
        // ═══════════════════════════════════════════════════════
        // STEP 6: Level-wise Referrals তৈরি
        // ═══════════════════════════════════════════════════════
        const levelReferrals = {
            1: [], 2: [], 3: [], 4: [], 5: [],
            6: [], 7: [], 8: [], 9: [], 10: []
        };
        
        const myInfo = {
            member_id: String(currentUser.id || '').trim(),
            mobile: (currentUser.mobile || '').trim(),
            email: (currentUser.email || '').trim().toLowerCase(),
            refer_code: String(myReferCode || '').trim()
        };
        
        function isSelfReferral(m) {
            if (!m) return true;
            if (String(m.member_id || '') === myInfo.member_id && myInfo.member_id !== '') return true;
            if (m.refer_code_normalized && m.refer_code_normalized === myInfo.refer_code && myInfo.refer_code !== '') return true;
            const mMobile = (m.mobile || '').trim();
            if (mMobile && myInfo.mobile && mMobile === myInfo.mobile) return true;
            return false;
        }
        
        const visited = new Set();
        visited.add(myReferCode);
        visited.add(myInfo.member_id);
        
        // Level 1
        levelReferrals[1] = normalizedMembers.filter(m => {
            if (m.referred_by_normalized !== myReferCode) return false;
            if (isSelfReferral(m)) return false;
            if (m.status !== 'active' && m.status !== 'approved') return false;
            return true;
        });
        
        levelReferrals[1].forEach(m => {
            if (m.member_id) visited.add(m.member_id);
        });
        
        console.log(`📊 Level 1: ${levelReferrals[1].length} জন`);
        
        // Level 2-10
        let currentLevelMembers = [...levelReferrals[1]];
        
        for (let level = 2; level <= 10; level++) {
            const nextLevelMembers = [];
            
            for (const member of currentLevelMembers) {
                if (isSelfReferral(member)) continue;
                
                const memberReferCode = member.refer_code_normalized;
                if (!memberReferCode) continue;
                
                const childRefs = normalizedMembers.filter(m => {
                    if (m.referred_by_normalized !== memberReferCode) return false;
                    if (visited.has(m.member_id)) return false;
                    if (isSelfReferral(m)) return false;
                    if (m.status !== 'active' && m.status !== 'approved') return false;
                    return true;
                });
                
                for (const child of childRefs) {
                    if (!visited.has(child.member_id)) {
                        visited.add(child.member_id);
                        nextLevelMembers.push(child);
                    }
                }
            }
            
            levelReferrals[level] = nextLevelMembers;
            currentLevelMembers = nextLevelMembers;
            console.log(`📊 Level ${level}: ${nextLevelMembers.length} জন`);
        }
        
                // ═══════════════════════════════════════════════════════
                // STEP 7: Referral Bonus Log লোড
                // ═══════════════════════════════════════════════════════
                const { data: bonusLogs } = await client
                    .from('referral_bonus_log')
                    .select('*')
                    .eq('member_id', currentUser.id)
                    .order('created_at', { ascending: false });
                
                console.log(`📋 Total bonus logs: ${bonusLogs?.length || 0}`);
        
                const { data: allBonusLocks } = await client
            .from('referral_bonus_lock')
            .select('id, level, bonus_amount, downline_id, first_payment_amount, locked_at, note')
            .eq('referrer_id', myInfo.member_id)
            .order('locked_at', { ascending: false });
        
        console.log(`💰 Total Bonus Locks from DB: ${(allBonusLocks || []).length}`);
        console.log(`💰 Total Lock Amount: ${(allBonusLocks || []).reduce((s, b) => s + Number(b.bonus_amount || 0), 0)}`);

        
               // ═══════════════════════════════════════════════════════
            // STEP 8: Bonus Map তৈরি (Mobile + Name + ID)
            // Source: referral_bonus_log + referral_bonus_lock
            // ═══════════════════════════════════════════════════════
            window._bonusMap = {
                byMobile: {},
                byName: {},
                byId: {}
            };
            
            // ─────────────────────────────────────────────────────
            // ৮.১: referral_bonus_log থেকে যোগ করুন
            // ─────────────────────────────────────────────────────
            (bonusLogs || []).forEach(log => {
                const mobileKey = String(log.from_member_mobile || '').replace(/\D/g, '');
                const nameKey = String(log.from_member_name || '').trim().toLowerCase();
                const rawId = String(log.from_member_id || '').trim();
                
                if (mobileKey) {
                    if (!window._bonusMap.byMobile[mobileKey]) window._bonusMap.byMobile[mobileKey] = [];
                    window._bonusMap.byMobile[mobileKey].push(log);
                }
                if (nameKey) {
                    if (!window._bonusMap.byName[nameKey]) window._bonusMap.byName[nameKey] = [];
                    window._bonusMap.byName[nameKey].push(log);
                }
                if (rawId && rawId !== 'UNKNOWN') {
                    const idKeys = [
                        rawId,
                        rawId.replace(/\s+/g, '').replace(/-/g, '').toUpperCase(),
                        rawId.replace(/\s+/g, '-'),
                        rawId.replace(/-/g, ' '),
                        rawId.replace(/-/g, ''),
                        rawId.replace(/\s+/g, '')
                    ];
                    idKeys.forEach(k => {
                        if (!k) return;
                        if (!window._bonusMap.byId[k]) window._bonusMap.byId[k] = [];
                        if (!window._bonusMap.byId[k].find(l => l.id === log.id)) {
                            window._bonusMap.byId[k].push(log);
                        }
                    });
                }
            });
            
            console.log(`📋 From referral_bonus_log: ${(bonusLogs || []).length} logs`);
            
            // ─────────────────────────────────────────────────────
            // ৮.২: referral_bonus_lock থেকে যোগ করুন (actual credits)
            // ─────────────────────────────────────────────────────
            console.log(`💰 Processing ${(allBonusLocks || []).length} bonus locks into _bonusMap`);
            
            // Downline lookup map তৈরি করুন (all format এ)
            const downlineByIdLookup = {};
            const downlineByMobileLookup = {};
            const downlineByNameLookup = {};
            
            normalizedMembers.forEach(m => {
                if (!m) return;
                
                // By ID (multiple formats)
                const rawId = String(m.member_id || '').trim();
                if (rawId) {
                    downlineByIdLookup[rawId] = m;
                    downlineByIdLookup[rawId.replace(/\s+/g, '')] = m;
                    downlineByIdLookup[rawId.replace(/-/g, '')] = m;
                    downlineByIdLookup[rawId.replace(/\s+/g, '-')] = m;
                    downlineByIdLookup[rawId.replace(/-/g, ' ')] = m;
                    downlineByIdLookup[rawId.replace(/\s+/g, '').replace(/-/g, '').toUpperCase()] = m;
                }
                
                // By Mobile
                const mobile = String(m.mobile || '').replace(/\D/g, '');
                if (mobile) {
                    downlineByMobileLookup[mobile] = m;
                }
                
                // By Name
                const nameKey = String(m.full_name || '').trim().toLowerCase();
                if (nameKey) {
                    if (!downlineByNameLookup[nameKey]) downlineByNameLookup[nameKey] = [];
                    downlineByNameLookup[nameKey].push(m);
                }
            });
            
            console.log('📋 Downline Lookup Maps:', {
                byId: Object.keys(downlineByIdLookup).length,
                byMobile: Object.keys(downlineByMobileLookup).length,
                byName: Object.keys(downlineByNameLookup).length
            });
            
            // ─────────────────────────────────────────────────────
            // Helper: downline খুঁজুন (ID → Mobile → Name)
            // ─────────────────────────────────────────────────────
            function findDownlineFromLock(lock) {
                const downlineId = String(lock.downline_id || '').trim();
                
                // Priority 1: ID (multiple formats)
                if (downlineId) {
                    const idKeys = [
                        downlineId,
                        downlineId.replace(/\s+/g, ''),
                        downlineId.replace(/-/g, ''),
                        downlineId.replace(/\s+/g, '-'),
                        downlineId.replace(/-/g, ' '),
                        downlineId.replace(/\s+/g, '').replace(/-/g, '').toUpperCase()
                    ];
                    for (const k of idKeys) {
                        if (downlineByIdLookup[k]) return downlineByIdLookup[k];
                    }
                }
                
                // Priority 2: note থেকে mobile extract
                if (lock.note) {
                    const mobileMatch = String(lock.note).match(/01[3-9]\d{8}/);
                    if (mobileMatch) {
                        const m = downlineByMobileLookup[mobileMatch[0]];
                        if (m) return m;
                    }
                    
                    // Priority 3: note থেকে name extract
                    const parts = String(lock.note).split('—').pop().split('-').pop().trim();
                    if (parts) {
                        const nameKey = parts.toLowerCase();
                        if (downlineByNameLookup[nameKey] && downlineByNameLookup[nameKey].length === 1) {
                            return downlineByNameLookup[nameKey][0];
                        }
                    }
                }
                
                return null;
            }
            
            // ─────────────────────────────────────────────────────
            // Process each lock
            // ─────────────────────────────────────────────────────
            (allBonusLocks || []).forEach(lock => {
                const downlineId = String(lock.downline_id || '').trim();
                const downline = findDownlineFromLock(lock);
                
                // Log format এ convert
                const lockLog = {
                    id: `lock-${lock.id}`,
                    from_member_id: downlineId,
                    from_member_mobile: downline?.mobile || '',
                    from_member_name: downline?.full_name || '',
                    level: Number(lock.level) || 0,
                    amount: Number(lock.bonus_amount) || 0,
                    savings_amount: Number(lock.first_payment_amount) || 0,
                    created_at: lock.locked_at || new Date().toISOString(),
                    note: lock.note || '',
                    _source: 'lock'
                };
                
                // By ID (all formats)
                if (downlineId) {
                    const idKeys = [
                        downlineId,
                        downlineId.replace(/\s+/g, ''),
                        downlineId.replace(/-/g, ''),
                        downlineId.replace(/\s+/g, '-'),
                        downlineId.replace(/-/g, ' '),
                        downlineId.replace(/\s+/g, '').replace(/-/g, '').toUpperCase()
                    ];
                    idKeys.forEach(k => {
                        if (!k) return;
                        if (!window._bonusMap.byId[k]) window._bonusMap.byId[k] = [];
                        if (!window._bonusMap.byId[k].find(l => l.id === lockLog.id)) {
                            window._bonusMap.byId[k].push(lockLog);
                        }
                    });
                }
                
                // By Mobile
                if (downline?.mobile) {
                    const mobileKey = String(downline.mobile).replace(/\D/g, '');
                    if (mobileKey) {
                        if (!window._bonusMap.byMobile[mobileKey]) window._bonusMap.byMobile[mobileKey] = [];
                        if (!window._bonusMap.byMobile[mobileKey].find(l => l.id === lockLog.id)) {
                            window._bonusMap.byMobile[mobileKey].push(lockLog);
                        }
                    }
                }
                
                // By Name
                if (downline?.full_name) {
                    const nameKey = String(downline.full_name).trim().toLowerCase();
                    if (!window._bonusMap.byName[nameKey]) window._bonusMap.byName[nameKey] = [];
                    if (!window._bonusMap.byName[nameKey].find(l => l.id === lockLog.id)) {
                        window._bonusMap.byName[nameKey].push(lockLog);
                    }
                }
            });
            
            console.log('📋 Final Bonus Map:', {
                byId: Object.keys(window._bonusMap.byId).length,
                byMobile: Object.keys(window._bonusMap.byMobile).length,
                byName: Object.keys(window._bonusMap.byName).length,
                totalLocksProcessed: (allBonusLocks || []).length
            });
        
        // ═══════════════════════════════════════════════════════
        // STEP 9: Level-Wise Bonus Statistics
        // ═══════════════════════════════════════════════════════
        const levelStats = {
            1: { members: 0, withBonus: 0, totalBonus: 0 },
            2: { members: 0, withBonus: 0, totalBonus: 0 },
            3: { members: 0, withBonus: 0, totalBonus: 0 },
            4: { members: 0, withBonus: 0, totalBonus: 0 },
            5: { members: 0, withBonus: 0, totalBonus: 0 },
            6: { members: 0, withBonus: 0, totalBonus: 0 },
            7: { members: 0, withBonus: 0, totalBonus: 0 },
            8: { members: 0, withBonus: 0, totalBonus: 0 },
            9: { members: 0, withBonus: 0, totalBonus: 0 },
            10: { members: 0, withBonus: 0, totalBonus: 0 }
        };
        
        let totalAllReferrals = 0;
        let maxActiveLevel = 0;
        
        for (let level = 1; level <= 10; level++) {
            const refs = levelReferrals[level];
            const rate = commissionRates[level] * 100;
            
            levelStats[level].members = refs.length;
            totalAllReferrals += refs.length;
            
            if (refs.length > 0) maxActiveLevel = level;
            
            // Bonus Calculate
            refs.forEach(ref => {
                // ═══════════════════════════════════════════════════
                // Priority 1: referral_bonus_lock থেকে actual credit
                // ═══════════════════════════════════════════════════
                const lockBonuses = (allBonusLocks || []).filter(b =>
                    String(b.downline_id || '').trim() === String(ref.member_id || '').trim() &&
                    Number(b.level) === level
                );
                
                if (lockBonuses.length > 0) {
                    const sum = lockBonuses.reduce((s, b) => s + Number(b.bonus_amount || 0), 0);
                    levelStats[level].totalBonus += sum;
                    levelStats[level].withBonus++;
                    return;
                }
                
                // ═══════════════════════════════════════════════════
                // Priority 2: referral_bonus_log থেকে
                // ═══════════════════════════════════════════════════
                const bonusesFromThis = findBonusesForMember(ref);
                if (bonusesFromThis.length > 0) {
                    const sum = bonusesFromThis.reduce((s, l) => s + Number(l.amount), 0);
                    levelStats[level].totalBonus += sum;
                    levelStats[level].withBonus++;
                    return;
                }
                
                // ═══════════════════════════════════════════════════
                // Priority 3: Expected (fixed rate calculation)
                // ═══════════════════════════════════════════════════
                if (ref._firstPayment) {
                    const expected = Math.round(ref._firstPayment * (rate / 100));
                    levelStats[level].totalBonus += expected;
                    levelStats[level].withBonus++;
                }
            });
            
            // ═══════════════════════════════════════════════════════
            // Count Update (with bonus count)
            // ═══════════════════════════════════════════════════════
            const countEl = document.getElementById(`level${level}Count`);
            if (countEl) {
                const total = refs.length;
                const withBonus = levelStats[level].withBonus || 0;
                
                if (total === 0) {
                    countEl.innerText = '0';
                    countEl.title = 'কোনো সদস্য নেই';
                } else if (withBonus === total) {
                    countEl.innerText = `${bnToEn(total)} ✓`;
                    countEl.title = `${bnToEn(total)} জন সদস্য — সবাই থেকে বোনাস পেয়েছেন`;
                } else if (withBonus > 0) {
                    countEl.innerText = `${bnToEn(withBonus)}/${bnToEn(total)}`;
                    countEl.title = `${bnToEn(total)} জনের মধ্যে ${bnToEn(withBonus)} জন থেকে বোনাস পেয়েছেন`;
                } else {
                    countEl.innerText = bnToEn(total);
                    countEl.title = `${bnToEn(total)} জন সদস্য — এখনো কেউ বোনাস পায়নি`;
                }
            }
            
            // ═══════════════════════════════════════════════════════
            // Commission Update
            // ═══════════════════════════════════════════════════════
            const commissionEl = document.getElementById(`level${level}Commission`);
            if (commissionEl) {
                const bonusTotal = levelStats[level].totalBonus || 0;
                const withBonus = levelStats[level].withBonus || 0;
                const total = refs.length;
                
                commissionEl.innerText = `৳${bnToEn(bonusTotal.toLocaleString('en-US'))}`;
                commissionEl.title = `${bnToEn(withBonus)}/${bnToEn(total)} জন থেকে`;
                commissionEl.className = bonusTotal > 0 
                    ? 'text-emerald-700 font-semibold ml-2' 
                    : 'text-gray-400 font-semibold ml-2';
            }
            
            // Level List Render
            updateLevelList(level, refs, rate);
            }
        
                // ═══════════════════════════════════════════════════════
        // STEP 10: Statistics Cards Update
        // ✅ FIXED: RPC দিয়ে (RLS বাইপাস) + Fallback calculation
        // ═══════════════════════════════════════════════════════
        const { data: currentMemberRows, error: memberErr } = await client.rpc('get_member_by_id', {
            input_id: currentUser.id
        });
        
        if (memberErr) {
            console.error('❌ get_member_by_id error:', memberErr);
        }
        
        const currentMember = currentMemberRows && currentMemberRows.length > 0 ? currentMemberRows[0] : null;
        
        console.log('🔍 currentMember from RPC:', {
            referral_bonus: currentMember?.referral_bonus,
            referral_count: currentMember?.referral_count,
            full_name: currentMember?.full_name
        });
        
        // ✅ totalCommission calculation with 3 fallbacks
        let totalCommission = 0;
        
        // Fallback 1: currentMember.referral_bonus
        if (currentMember?.referral_bonus !== undefined && currentMember?.referral_bonus !== null) {
            totalCommission = Number(currentMember.referral_bonus) || 0;
        }
        
        // Fallback 2: allBonusLocks থেকে sum
        if (totalCommission === 0 && allBonusLocks && allBonusLocks.length > 0) {
            totalCommission = allBonusLocks.reduce((sum, lock) => 
                sum + (Number(lock.bonus_amount) || 0), 0
            );
            console.log('⚠️ referral_bonus 0, lock sum ব্যবহার:', totalCommission);
        }
        
        // Fallback 3: levelStats থেকে sum
        if (totalCommission === 0) {
            let levelSum = 0;
            for (let level = 1; level <= 10; level++) {
                levelSum += levelStats[level].totalBonus || 0;
            }
            totalCommission = levelSum;
            console.log('⚠️ Level-wise sum ব্যবহার:', totalCommission);
        }
        
        console.log('✅ Total Commission:', totalCommission);
        
        const activeRefs = levelReferrals[1].filter(r => {
            const status = String(r.status || '').toLowerCase().trim();
            return status === 'active' || status === 'approved';
        }).length;
        
        const totalRefEl = document.getElementById('totalReferrals');
        const totalComEl = document.getElementById('totalCommission');
        const maxLvlEl = document.getElementById('totalLevels');
        const actRefEl = document.getElementById('activeReferrals');
        
        if (totalRefEl) totalRefEl.innerText = bnToEn(totalAllReferrals);
        if (totalComEl) totalComEl.innerText = bnToEn(totalCommission.toLocaleString('en-US'));
        if (maxLvlEl) maxLvlEl.innerText = bnToEn(maxActiveLevel);
        if (actRefEl) actRefEl.innerText = bnToEn(activeRefs);
        
        console.log('📊 UI updated:', {
            totalReferrals: totalAllReferrals,
            totalCommission: totalCommission,
            maxLevel: maxActiveLevel,
            activeReferrals: activeRefs
        });
        
        // ✅ userFunds Update (সব variable সেট করুন)
        userFunds.referralBonus = totalCommission;
        userFunds.referralCount = totalAllReferrals;
        userFunds.referralBonusTotal = totalCommission;
        userFunds.referralBonusWithdrawn = 0;
        
        // ✅ window variables (referral summary card এর জন্য)
        window._liveReferralBonus = totalCommission;
        window._liveReferralCount = totalAllReferrals;
        window._totalReferrals = totalAllReferrals;
        window._maxActiveLevel = maxActiveLevel;
        window._activeReferrals = activeRefs;
        
        console.log('🔍 Referral variables set:', {
            totalReferrals: totalAllReferrals,
            totalCommission: totalCommission,
            activeReferrals: activeRefs
        });
        
        // ═══════════════════════════════════════════════════════
        // STEP 11: Referral Link Update
        // ═══════════════════════════════════════════════════════
        updateReferralLink();
        updateFundsDisplay();
        
       // ═══════════════════════════════════════════════════════
// Bonus History Section Update (from referral_bonus_lock)
// ═══════════════════════════════════════════════════════
if (typeof updateBonusHistorySection === 'function') {
    try {
        // ─────────────────────────────────────────────────
        // Downline Lookup Maps (Mobile + Name + ID)
        // ─────────────────────────────────────────────────
        const downlineByIdMap = {};
        const downlineByMobileMap = {};
        const downlineByNameMap = {};
        
        normalizedMembers.forEach(m => {
            if (!m) return;
            
            // By member_id (multiple formats)
            const rawId = String(m.member_id || '').trim();
            if (rawId) {
                downlineByIdMap[rawId] = m;
                downlineByIdMap[rawId.replace(/\s+/g, '')] = m;
                downlineByIdMap[rawId.replace(/-/g, '')] = m;
                downlineByIdMap[rawId.replace(/\s+/g, '-')] = m;
                downlineByIdMap[rawId.replace(/-/g, ' ')] = m;
                downlineByIdMap[rawId.replace(/\s+/g, '').replace(/-/g, '').toUpperCase()] = m;
            }
            
            // By mobile (digits only)
            const mobile = String(m.mobile || '').replace(/\D/g, '');
            if (mobile) {
                downlineByMobileMap[mobile] = m;
            }
            
            // By name (trimmed, lowercase)
            const nameKey = String(m.full_name || '').trim().toLowerCase();
            if (nameKey) {
                downlineByNameMap[nameKey] = m;
            }
        });
        
        console.log('📋 Lookup Maps built:', {
            byId: Object.keys(downlineByIdMap).length,
            byMobile: Object.keys(downlineByMobileMap).length,
            byName: Object.keys(downlineByNameMap).length
        });
        
        // ─────────────────────────────────────────────────
        // Helper: Find downline from bonus lock record
        // ─────────────────────────────────────────────────
        function findDownlineFromLock(b) {
            // Priority 1: member_id (multiple formats)
            const rawId = String(b.downline_id || '').trim();
            if (rawId) {
                const idKeys = [
                    rawId,
                    rawId.replace(/\s+/g, ''),
                    rawId.replace(/-/g, ''),
                    rawId.replace(/\s+/g, '-'),
                    rawId.replace(/-/g, ' '),
                    rawId.replace(/\s+/g, '').replace(/-/g, '').toUpperCase()
                ];
                for (const k of idKeys) {
                    if (downlineByIdMap[k]) return downlineByIdMap[k];
                }
            }
            
            // Priority 2: note থেকে mobile extract
            if (b.note) {
                const mobileMatch = String(b.note).match(/01[3-9]\d{8}/);
                if (mobileMatch) {
                    const m = downlineByMobileMap[mobileMatch[0]];
                    if (m) return m;
                }
                
                // Priority 3: note থেকে name extract
                const parts = String(b.note).split('—').pop().split('-').pop().trim();
                if (parts) {
                    const nameKey = parts.toLowerCase();
                    if (downlineByNameMap[nameKey]) return downlineByNameMap[nameKey];
                }
            }
            
            return null;
        }
        
        // ─────────────────────────────────────────────────
        // Convert referral_bonus_lock → bonusLogs format
        // ─────────────────────────────────────────────────
        const bonusHistoryFromLock = (allBonusLocks || []).map(b => {
            const downline = findDownlineFromLock(b);
            
            return {
                id: b.id,
                amount: Number(b.bonus_amount) || 0,
                level: Number(b.level) || 0,
                from_member_id: b.downline_id || '',
                from_member_name: downline?.full_name || 'Unknown',
                from_member_mobile: downline?.mobile || '',
                commission_rate: (b.level === 1 ? 15 : b.level === 2 ? 10 : 5),
                savings_amount: Number(b.first_payment_amount) || 0,
                created_at: b.locked_at || new Date().toISOString(),
                note: b.note || ''
            };
        });
        
        console.log('🎁 Bonus History from lock:', bonusHistoryFromLock.length);
        
        updateBonusHistorySection(bonusHistoryFromLock);
    } catch(e) {
        console.warn('⚠️ Bonus history update error:', e);
    }
}
        
        // Referral Bonus Summary Card Update
        if (typeof updateReferralBonusSummary === 'function') {
            try {
                updateReferralBonusSummary();
            } catch(e) {
                console.warn('⚠️ Referral summary update error:', e);
            }
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Referral Data Loaded');
        console.log(`   Total Referrals: ${totalAllReferrals}`);
        console.log(`   Max Level: ${maxActiveLevel}`);
        console.log(`   Total Bonus: ৳${totalCommission}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
    } catch (error) {
        console.error('❌ Referral error:', error);
        
        for (let i = 1; i <= 10; i++) {
            const container = document.getElementById(`level${i}List`);
            if (container) {
                container.innerHTML = '<p class="text-red-500 text-center py-4">⚠️ তথ্য লোড করতে সমস্যা!</p>';
            }
        }
    } finally {
        isLoadingReferral = false;
    }
}

function resetReferralDisplay(message = 'কোনো রেফারেল নেই') {
    for(let i = 1; i <= 10; i++) {
        const countEl = document.getElementById(`level${i}Count`);
        const commissionEl = document.getElementById(`level${i}Commission`);
        const container = document.getElementById(`level${i}List`);
        
        if(countEl) countEl.innerText = '0';
        if(commissionEl) commissionEl.innerText = '০';
        if(container) {
            container.innerHTML = `<p class="text-gray-500 text-center py-4">${message}</p>`;
        }
    }
    
    const ids = {
        totalReferrals: '0',
        totalCommission: '0',
        totalLevels: '১০',
        activeReferrals: '0'
    };
    
    Object.entries(ids).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if(el) el.innerText = val;
    });
    
    userFunds.referralBonus = 0;
    updateFundsDisplay();
}

function updateLevelList(level, referrals, rate) {
    const container = document.getElementById(`level${level}List`);
    if (!container) return;
    
    // কোনো Referral না থাকলে
    if (!referrals || referrals.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-400 py-4 text-sm">
                <i class="fas fa-inbox text-2xl mb-2"></i>
                <p>Level ${level} — কোনো রেফারেল নেই</p>
            </div>
        `;
        return;
    }
    
    // Level অনুযায়ী color
    const colors = {
        1: 'emerald', 2: 'blue', 3: 'amber', 4: 'purple', 5: 'pink',
        6: 'indigo', 7: 'red', 8: 'teal', 9: 'orange', 10: 'cyan'
    };
    const color = colors[level] || 'gray';
    const levelRate = rate;
    
    let html = '';
    let totalBonusThisLevel = 0;
    let membersWithBonus = 0;
    
    // ═══════════════════════════════════════════════════════════
    // প্রতিটা Referral-এর জন্য Card তৈরি
    // ═══════════════════════════════════════════════════════════
    for (const ref of referrals) {
        const joinDate = ref.created_at ? formatDateBD(ref.created_at) : '-';
        const monthlyAmount = ref.monthly_savings || 500;
        
        // ═══════════════════════════════════════════════════════════
        // 🎁 Bonus Info — ৩টি Case Handle করব
        // ═══════════════════════════════════════════════════════════
        
        // ✅ Case 1: Real Log আছে?
        const bonusesFromThis = findBonusesForMember(ref);
        const hasRealLog = bonusesFromThis.length > 0;
        
        // ✅ Case 2: First Payment Approved?
        const hasPayment = ref._firstPayment && ref._firstPayment > 0;
        
        let bonusInfoHtml = '';
        
        if (hasRealLog) {
            // ═════════════════════════════════════════════════════
            // ✅ Case 1: Real Log → প্রাপ্ত বোনাস (সবুজ)
            // ═════════════════════════════════════════════════════
            const totalFromThisMember = bonusesFromThis.reduce(
                (sum, b) => sum + (Number(b.amount) || 0), 0
            );
            const latestBonus = bonusesFromThis[0];
            const bonusDate = latestBonus.created_at 
                ? formatDateBD(latestBonus.created_at) 
                : '-';
            const bonusPercent = latestBonus.commission_rate || levelRate;
            const sourceAmount = latestBonus.savings_amount || ref._firstPayment || 0;
            
            totalBonusThisLevel += totalFromThisMember;
            membersWithBonus++;
            
            bonusInfoHtml = `
                <div class="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-lg p-3 mt-3">
                    <div class="flex items-center justify-between gap-2 mb-2">
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-check text-white text-xs"></i>
                            </div>
                            <p class="text-xs font-bold text-emerald-800">✅ প্রাপ্ত বোনাস</p>
                        </div>
                        <span class="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            ${bnToEn(bonusPercent)}%
                        </span>
                    </div>
                    
                    <p class="text-lg font-extrabold text-emerald-700 ml-8">
                        ৳${bnToEn(totalFromThisMember.toLocaleString('en-US'))}
                    </p>
                    
                    <div class="ml-8 mt-2 bg-white/60 rounded-lg p-2 border border-emerald-200">
                        <p class="text-[10px] text-emerald-700">
                            <i class="fas fa-calculator mr-1"></i>
                            <strong>হিসাব:</strong> 
                            ৳${bnToEn(sourceAmount.toLocaleString('en-US'))} × 
                            ${bnToEn(bonusPercent)}% = 
                            ৳${bnToEn((Number(latestBonus.amount) || 0).toLocaleString('en-US'))}
                        </p>
                    </div>
                    
                    <div class="ml-8 mt-2 space-y-0.5">
                        <p class="text-[10px] text-emerald-600">
                            <i class="fas fa-calendar-alt mr-1"></i>
                            তারিখ: ${bnToEn(bonusDate)}
                        </p>
                        <p class="text-[10px] text-emerald-600">
                            <i class="fas fa-layer-group mr-1"></i>
                            Level ${level} কমিশন (${bnToEn(bonusPercent)}%)
                        </p>
                    </div>
                </div>
            `;
            
        } else if (hasPayment) {
            // ═════════════════════════════════════════════════════
            // 📊 Case 2: Payment Approved → Expected Bonus (নীল)
            // ═════════════════════════════════════════════════════
            const expectedBonus = Math.round(ref._firstPayment * (levelRate / 100));
            
            totalBonusThisLevel += expectedBonus;
            membersWithBonus++;
            
            bonusInfoHtml = `
                <div class="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-lg p-3 mt-3">
                    <div class="flex items-center justify-between gap-2 mb-2">
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-chart-line text-white text-xs"></i>
                            </div>
                            <p class="text-xs font-bold text-blue-800">📊 প্রাপ্ত বোনাস</p>
                        </div>
                        <span class="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            ${bnToEn(levelRate)}%
                        </span>
                    </div>
                    
                    <p class="text-lg font-extrabold text-blue-700 ml-8">
                        ৳${bnToEn(expectedBonus.toLocaleString('en-US'))}
                    </p>
                    
                    <div class="ml-8 mt-2 bg-white/60 rounded-lg p-2 border border-blue-200">
                        <p class="text-[10px] text-blue-700">
                            <i class="fas fa-calculator mr-1"></i>
                            <strong>হিসাব:</strong> 
                            ৳${bnToEn(ref._firstPayment.toLocaleString('en-US'))} × 
                            ${bnToEn(levelRate)}% = 
                            ৳${bnToEn(expectedBonus.toLocaleString('en-US'))}
                        </p>
                    </div>
                    
                    <div class="ml-8 mt-2 space-y-0.5">
                        <p class="text-[10px] text-blue-600">
                            <i class="fas fa-check-circle mr-1"></i>
                            প্রথম Payment Approved ✓
                        </p>
                        <p class="text-[10px] text-blue-600">
                            <i class="fas fa-layer-group mr-1"></i>
                            Level ${level} কমিশন (${bnToEn(levelRate)}%)
                        </p>
                    </div>
                </div>
            `;
            
        } else {
            // ═════════════════════════════════════════════════════
            // ⏳ Case 3: No Payment → এখনো পায়নি (হলুদ)
            // ═════════════════════════════════════════════════════
            bonusInfoHtml = `
                <div class="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg p-3 mt-3">
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex items-center gap-2 flex-1">
                            <div class="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-clock text-white text-xs"></i>
                            </div>
                            <div class="flex-1">
                                <p class="text-xs font-bold text-amber-800">⏳ এখনো বোনাস যোগ হয়নি।</p>
                                <p class="text-[10px] text-amber-600 mt-0.5">প্রথম Payment Approve হলে পাবেন</p>
                            </div>
                        </div>
                        <span class="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                            ${bnToEn(levelRate)}% আশা
                        </span>
                    </div>
                    
                    <div class="ml-8 mt-2 bg-white/60 rounded-lg p-2 border border-amber-200">
                        <p class="text-[10px] text-amber-700">
                            <i class="fas fa-info-circle mr-1"></i>
                            Approve হলে পাবেন: 
                            ৳${bnToEn(monthlyAmount.toLocaleString('en-US'))} × 
                            ${bnToEn(levelRate)}% = 
                            ৳${bnToEn(Math.round(monthlyAmount * (levelRate / 100)).toLocaleString('en-US'))}
                        </p>
                    </div>
                </div>
            `;
        }
        
        // ═══════════════════════════════════════════════════════════
        // Member Card HTML
        // ═══════════════════════════════════════════════════════════
        html += `
    <div class="bg-white p-4 rounded-xl border-2 border-${color}-100 hover:border-${color}-300 hover:shadow-md transition mb-3">
        
        <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap mb-2">
                    <p class="font-bold text-gray-800 text-base truncate">
                        ${ref.full_name || 'নাম নেই'}
                    </p>
                    <span class="bg-${color}-100 text-${color}-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        L${level}
                    </span>
                </div>
                
                <div class="space-y-1">
                    <p class="text-xs text-gray-600 flex items-center gap-1">
                        <i class="fas fa-mobile-alt text-gray-400 w-4"></i>
                        ${bnToEn(ref.mobile) || 'মোবাইল নেই'}
                    </p>
                    <p class="text-xs text-${color}-600 flex items-center gap-1">
                        <i class="fas fa-id-card w-4"></i>
                        ${bnToEn(ref.member_id)}
                    </p>
                    <p class="text-xs text-gray-400 flex items-center gap-1">
                        <i class="fas fa-calendar-alt w-4"></i>
                        সদস্য: ${bnToEn(joinDate)}
                    </p>
                </div>
            </div>
            
            <div class="text-right flex-shrink-0">
                <div class="bg-${color}-50 px-3 py-2 rounded-lg border border-${color}-200">
                    <p class="text-[9px] text-gray-500 mb-0.5">মাসিক সঞ্চয়</p>
                    <p class="text-sm font-bold text-${color}-700">
                        ৳${bnToEn(monthlyAmount.toLocaleString('en-US'))}
                    </p>
                </div>
                <div class="mt-2">
                    <span class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        <i class="fas fa-circle text-[6px]"></i>
                        সক্রিয়
                    </span>
                </div>
            </div>
        </div>
        
        ${bonusInfoHtml}
        
    </div>
`;
    }
    
    // ═══════════════════════════════════════════════════════════
    // Level Summary Footer
    // ═══════════════════════════════════════════════════════════
    const totalMembers = referrals.length;
    
    html += `
        <div class="bg-gradient-to-r from-${color}-50 to-white border-2 border-${color}-200 rounded-xl p-3 mt-3">
            
            <div class="text-center mb-2 pb-2 border-b border-${color}-200">
                <span class="text-[10px] text-gray-500">Level ${level} — </span>
                <span class="bg-${color}-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                    ${bnToEn(levelRate)}% কমিশন
                </span>
            </div>
            
            <div class="grid grid-cols-3 gap-2 text-center">
                <div>
                    <p class="text-[10px] text-gray-500">মোট সদস্য</p>
                    <p class="text-base font-bold text-${color}-700">${bnToEn(totalMembers)}</p>
                </div>
                <div>
                    <p class="text-[10px] text-gray-500">বোনাস পেয়েছেন</p>
                    <p class="text-base font-bold text-emerald-600">${bnToEn(membersWithBonus)}</p>
                </div>
                <div>
                    <p class="text-[10px] text-gray-500">মোট বোনাস</p>
                    <p class="text-base font-bold text-emerald-700">৳${bnToEn(totalBonusThisLevel.toLocaleString('en-US'))}</p>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function toggleLevel(level) { 
    const el = document.getElementById(`level${level}List`); 
    if(el) el.classList.toggle('hidden'); 
}

function copyReferralLink() { 
    const link = document.getElementById('referralLink').value; 
    navigator.clipboard.writeText(link); 
    showToast('রেফারেল লিংক কপি করা হয়েছে!','success'); 
}

function shareReferralLink() { 
    const link = document.getElementById('referralLink').value; 
    if(navigator.share) navigator.share({ title: 'TUKNBD', text: 'আমার রেফারেল লিংকে জয়েন করুন!', url: link }); 
    else copyReferralLink(); 
}

function whatsappShare() { 
    const link = document.getElementById('referralLink').value; 
    window.open(`https://wa.me/?text=${encodeURIComponent('TUKNBD সদস্যপদে জয়েন করুন: ' + link)}`, '_blank'); 
}

function copyReferId() { 
    const referCode = currentUser.referId || currentUser.refer_code || '';
    navigator.clipboard.writeText(referCode); 
    showToast('রেফার আইডি কপি করা হয়েছে!','success'); 
}

async function fixReferralCode() {
    console.log('🔧 রেফারেল কোড ফিক্স করা হচ্ছে...');
    
    if (!currentUser) {
        console.log('❌ currentUser নেই!');
        return;
    }
    
    // চেক করুন currentUser-এ refer_code আছে কিনা
    if (!currentUser.referId && !currentUser.refer_code) {
        console.log('⚠️ রেফারেল কোড নেই, ডাটাবেস থেকে আনার চেষ্টা...');
        
        const client = await initSupabase();
        if (!client) {
            console.log('❌ Supabase client পাওয়া যায়নি!');
            return;
        }
        
        try {
            const { data, error } = await client
                .from('members')
                .select('refer_code')
                .eq('member_id', currentUser.id)
                .single();
            
            if (error) {
                console.error('❌ রেফারেল কোড ফেচ error:', error);
                return;
            }
            
            if (data && data.refer_code) {
    currentUser.referId = data.refer_code;
    currentUser.refer_code = data.refer_code;
    console.log('✅ রেফারেল কোড পাওয়া গেছে:', data.refer_code);
    
    // ✅ Safe UI আপডেট
    const referEl = document.getElementById('referIdDisplay');
    const cardRefEl = document.getElementById('cardReferId');
    if (referEl) referEl.innerHTML = data.refer_code;
    if (cardRefEl) cardRefEl.innerHTML = data.refer_code;
    updateReferralLink();
    
        // sessionStorage আপডেট
    try {
        const storedUser = sessionStorage.getItem('tukn_logged_member');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            user.refer_code = data.refer_code;
            user.referId = data.refer_code;
            sessionStorage.setItem('tukn_logged_member', JSON.stringify(user));
            console.log('✅ sessionStorage আপডেট করা হয়েছে');
        }
    } catch(e) {
        console.log('sessionStorage আপডেট ব্যর্থ:', e);
    }
    
    showToast('✅ রেফারেল কোড আপডেট করা হয়েছে!', 'success');
} else {
    console.log('❌ ডাটাবেসে রেফারেল কোড নেই!');
    showToast('⚠️ আপনার রেফারেল কোড নেই! অ্যাডমিনের সাথে যোগাযোগ করুন।', 'error');
}
} catch(e) {
    console.error('❌ রেফারেল ফিক্স error:', e);
}
} else {
    console.log('✅ রেফারেল কোড আছে:', currentUser.referId || currentUser.refer_code);
    
    // ✅ Safe UI আপডেট
    const referCode = currentUser.referId || currentUser.refer_code;
    const referEl = document.getElementById('referIdDisplay');
    const cardRefEl = document.getElementById('cardReferId');
    if (referEl) referEl.innerHTML = referCode;
    if (cardRefEl) cardRefEl.innerHTML = referCode;
    updateReferralLink();
    }
}

function generateQRCode() {
        const container = document.getElementById('qrCodeContainer');
        const linkInput = document.getElementById('referralLink');
        
        if (!container || !linkInput) {
            console.warn('⚠️ QR container বা referralLink পাওয়া যায়নি');
            return;
        }
        
        const link = linkInput.value?.trim();
        if (!link || !link.startsWith('http')) {
            console.log('ℹ️ Referral link এখনো তৈরি হয়নি');
            return;
        }
        
        if (container.querySelector('canvas')) {
            return;
        }
        
        if (typeof QRCode === 'undefined') {
            console.warn('⚠️ QRCode library লোড হয়নি (ধাপ ১ চেক করুন)');
            return;
        }
        
        container.innerHTML = '';
        
        try {
            qrCodeInstance = new QRCode(container, {
                text: link,
                width: 200,
                height: 200,
                colorDark: '#064e3b',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
            console.log('✅ QR Code তৈরি হয়েছে:', link);
        } catch(e) {
            console.error('❌ QR generation error:', e);
            container.innerHTML = '<p class="text-red-500 text-xs p-2">QR তৈরি ব্যর্থ</p>';
        }
    }

function downloadQR() {
        const canvas = document.querySelector('#qrCodeContainer canvas');
        if (!canvas) {
            alert('❌ QR কোড এখনো তৈরি হয়নি। একটু অপেক্ষা করুন।');
            return;
        }
        
        try {
            const padding = 40;
            const headerHeight = 80;
            const footerHeight = 60;
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = canvas.width + (padding * 2);
            finalCanvas.height = canvas.height + (padding * 2) + headerHeight + footerHeight;
            
            const ctx = finalCanvas.getContext('2d');
            
            // Background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
            
            // Border
            ctx.strokeStyle = '#059669';
            ctx.lineWidth = 4;
            ctx.strokeRect(2, 2, finalCanvas.width - 4, finalCanvas.height - 4);
            
            // Header
            ctx.fillStyle = '#064e3b';
            ctx.font = 'bold 22px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('TUKNBD', finalCanvas.width / 2, 40);
            
            ctx.fillStyle = '#6b7280';
            ctx.font = '14px Arial, sans-serif';
            ctx.fillText('রেফারেল QR কোড', finalCanvas.width / 2, 62);
            
            // QR
            ctx.drawImage(canvas, padding, headerHeight + padding);
            
            // Footer
            const name = window.currentUser?.name || 'সদস্য';
            const refCode = document.getElementById('referralLink')?.value.split('ref=')[1]?.split('&')[0] || '';
            
            ctx.fillStyle = '#059669';
            ctx.font = 'bold 16px Arial, sans-serif';
            ctx.fillText(name, finalCanvas.width / 2, finalCanvas.height - 35);
            
            ctx.fillStyle = '#6b7280';
            ctx.font = '12px Arial, sans-serif';
            ctx.fillText(`কোড: ${refCode}`, finalCanvas.width / 2, finalCanvas.height - 15);
            
            // Download
            const a = document.createElement('a');
            a.download = `TUKNBD-Referral-${refCode || 'QR'}.png`;
            a.href = finalCanvas.toDataURL('image/png');
            a.click();
            
            if (typeof showToast === 'function') {
                showToast('✅ QR কোড ডাউনলোড হয়েছে!', 'success');
            }
        } catch(e) {
            console.error('❌ Download error:', e);
            alert('❌ ডাউনলোড ব্যর্থ');
        }
    }

function printQR() {
        const canvas = document.querySelector('#qrCodeContainer canvas');
        if (!canvas) {
            alert('❌ QR কোড এখনো তৈরি হয়নি।');
            return;
        }
        
        const name = window.currentUser?.name || 'সদস্য';
        const refCode = document.getElementById('referralLink')?.value.split('ref=')[1]?.split('&')[0] || '';
        const url = document.getElementById('referralLink')?.value || '';
        const qrImage = canvas.toDataURL();
        
        const w = window.open('', '_blank');
        w.document.write(`
            <!DOCTYPE html>
            <html><head><title>TUKNBD QR</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #f0fdf4; margin: 0; }
                .card { background: white; border: 4px solid #059669; border-radius: 20px; padding: 40px; max-width: 500px; margin: 0 auto; }
                h1 { color: #064e3b; margin: 0 0 5px; }
                h2 { color: #6b7280; font-size: 14px; font-weight: normal; margin: 0; }
                img { margin: 20px 0; }
                .name { color: #059669; font-size: 20px; font-weight: bold; margin: 15px 0 5px; }
                .code { color: #6b7280; font-size: 14px; }
                .url { color: #059669; font-size: 11px; word-break: break-all; margin-top: 15px; }
                .footer { margin-top: 20px; color: #9ca3af; font-size: 11px; }
            </style></head>
            <body>
                <div class="card">
                    <h1>🌙 TUKNBD</h1>
                    <h2>ত্বলাবা-উলামা কল্যাণ নেটওয়ার্ক বাংলাদেশ</h2>
                    <img src="${qrImage}" width="250" height="250">
                    <div class="name">${name}</div>
                    <div class="code">রেফারেল কোড: ${refCode}</div>
                    <div class="url">${url}</div>
                    <div class="footer">স্ক্যান করে সদস্য হোন</div>
                </div>
                <script>window.print();<\/script>
            </body></html>
        `);
        w.document.close();
    }

function getShareMessage() {
        const link = document.getElementById('referralLink')?.value || '';
        const name = window.currentUser?.name || 'TUKNBD সদস্য';
        
        return `🌙 আসসালামু আলাইকুম,\n\n` +
               `আমি ${name}, ত্বলাবা-উলামা কল্যাণ নেটওয়ার্ক বাংলাদেশ (TUKNBD)-এর সদস্য।\n\n` +
               `🕌 একটি হালাল ও শরীয়াহ-সম্মত সঞ্চয় ও বিনিয়োগ প্ল্যাটফর্মে আপনাকে আমন্ত্রণ জানাচ্ছি।\n\n` +
               `✅ মেয়াদ শেষে ১০০% ফেরত\n` +
               `✅ আনুপাতিক হারে লভ্যাংশ\n` +
               `✅ ১০ লেভেল পর্যন্ত রেফারেল কমিশন\n` +
               `✅ কোনো সুদ নেই, সম্পূর্ণ হালাল\n\n` +
               `🔗 আমার রেফারেল লিংক:\n${link}\n\n` +
               `📱 লিংকে ক্লিক করে সরাসরি সাইনআপ করুন।\n\n` +
               `জাযাকাল্লাহু খাইরান 🌸`;
    }

function shareWhatsApp() {
        const msg = encodeURIComponent(getShareMessage());
        window.open(`https://wa.me/?text=${msg}`, '_blank');
    }

function shareFacebook() {
        const url = document.getElementById('referralLink')?.value;
        if (!url) { alert('রেফারেল লিংক পাওয়া যায়নি'); return; }
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=500');
    }

function shareTelegram() {
        const url = document.getElementById('referralLink')?.value;
        const msg = getShareMessage();
        if (!url) { alert('রেফারেল লিংক পাওয়া যায়নি'); return; }
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(msg)}`, '_blank');
    }

function shareNative() {
        const url = document.getElementById('referralLink')?.value;
        const msg = getShareMessage();
        
        if (navigator.share) {
            navigator.share({
                title: 'TUKNBD - ত্বলাবা-উলামা কল্যাণ নেটওয়ার্ক',
                text: msg,
                url: url
            }).catch(err => console.log('Share cancelled:', err));
        } else {
            if (typeof copyReferralLink === 'function') {
                copyReferralLink();
            } else {
                navigator.clipboard?.writeText(url);
                alert('✅ লিংক কপি হয়েছে — এখন যেকোনো অ্যাপে পেস্ট করুন!');
            }
        }
    }

async function loadLeaderboard() {
    const container = document.getElementById('leaderboardList');
    if (!container) {
        console.warn('⚠️ #leaderboardList পাওয়া যায়নি');
        return;
    }
    
    container.innerHTML = '<div class="text-center text-gray-400 py-4 text-sm"><i class="fas fa-spinner fa-spin mr-2"></i>লোড হচ্ছে...</div>';
    
    try {
        let client = window.supabaseClient;
        if (!client && typeof window.initSupabaseClient === 'function') {
            client = window.initSupabaseClient();
        }
        if (!client && typeof supabaseClient !== 'undefined') {
            client = supabaseClient;
        }
        if (!client) throw new Error('Supabase client পাওয়া যায়নি');
        
        // ✅ Secure RPC call — শুধু নাম + রেফারেল সংখ্যা
        const { data, error } = await client.rpc('get_public_leaderboard', {
            limit_count: 10
        });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 py-4 text-sm">এখনো কোনো ডেটা নেই</div>';
            return;
        }
        
        const rankIcons = ['🥇', '🥈', '🥉'];
        const rankColors = [
            'from-yellow-400 to-yellow-600',
            'from-gray-300 to-gray-500',
            'from-orange-400 to-orange-600'
        ];
        
        const myId = window.currentUser?.id || window.currentUser?.memberId;
        
        // ✅ Leaderboard render — কমিশন ছাড়া
        container.innerHTML = data.map((member, i) => {
            const isMe = member.member_id === myId;
            const rankIcon = rankIcons[i] || `#${i + 1}`;
            const bgGradient = rankColors[i] || 'from-gray-100 to-gray-200';
            const isTop3 = i < 3;
            
            return `
                <div class="flex items-center gap-3 p-3 rounded-xl transition-all
                            ${isMe ? 'bg-purple-100 border-2 border-purple-400 shadow-md' : 'bg-white border border-gray-200 hover:shadow-sm'}
                            ${isTop3 ? 'shadow-md' : ''}">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br ${bgGradient} 
                                flex items-center justify-center flex-shrink-0 text-lg font-extrabold text-white">
                        ${rankIcon}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="font-bold text-gray-800 text-sm truncate">
                            ${member.full_name || 'সদস্য'}
                            ${isMe ? '<span class="ml-1 text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">আপনি</span>' : ''}
                        </p>
                        <p class="text-xs text-gray-500">${member.referral_count} জন সদস্য</p>
                    </div>
                    <div class="text-right flex-shrink-0">
                        <span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                            ${member.referral_count} 🎯
                        </span>
                    </div>
                </div>
            `;
        }).join('');
        
        // ✅ নিজের কমিশন ও র্যাংক আলাদাভাবে load
        await loadMyReferralStats();
        
        console.log('✅ Leaderboard loaded (secure):', data.length, 'members');
    } catch(e) {
        console.error('❌ Leaderboard error:', e);
        container.innerHTML = '<div class="text-center text-red-500 py-4 text-sm">❌ লোড ব্যর্থ। আবার চেষ্টা করুন।</div>';
    }
}

async function loadMyReferralStats() {
        const myRankCard = document.getElementById('myRankCard');
        
        if (!myRankCard) return;
        
        try {
            let client = window.supabaseClient;
            if (!client && typeof window.initSupabaseClient === 'function') {
                client = window.initSupabaseClient();
            }
            if (!client && typeof supabaseClient !== 'undefined') {
                client = supabaseClient;
            }
            if (!client) return;
            
            const myId = window.currentUser?.id || window.currentUser?.memberId;
            if (!myId) {
                myRankCard.classList.add('hidden');
                return;
            }
            
            // ✅ নিজের কমিশন ও র্যাংক — secure RPC
            const { data, error } = await client.rpc('get_my_referral_stats', {
                input_member_id: myId
            });
            
            if (error) throw error;
            
            if (!data || data.length === 0) {
                myRankCard.classList.add('hidden');
                return;
            }
            
            const me = data[0];
            const count = me.my_referral_count || 0;
            const bonus = me.my_referral_bonus || 0;
            const rank = me.my_rank || 0;
            
            // ✅ নিজের কমিশনসহ কার্ড
            myRankCard.classList.remove('hidden');
            myRankCard.innerHTML = `
                <div class="flex items-center justify-between flex-wrap gap-2">
                    <span class="text-sm font-bold text-purple-800">
                        <i class="fas fa-user-circle mr-1"></i>আপনার অর্জন:
                    </span>
                    <div class="flex items-center gap-3">
                        <div class="text-right">
                            <p class="text-[10px] text-gray-500">র‍্যাংক</p>
                            <p class="text-lg font-extrabold text-purple-700">#${rank}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-[10px] text-gray-500">রেফারেল</p>
                            <p class="text-lg font-extrabold text-blue-700">${count}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-[10px] text-gray-500">কমিশন</p>
                            <p class="text-lg font-extrabold text-emerald-700">৳${bonus.toLocaleString('bn-BD')}</p>
                        </div>
                    </div>
                </div>
                <p class="text-[10px] text-gray-500 mt-2 text-center">
                    🔒 অন্যান্য সদস্যের কমিশন প্রাইভেসি রক্ষার জন্য গোপন রাখা হয়েছে
                </p>
            `;
            
            console.log('✅ My referral stats:', { count, bonus, rank });
        } catch(e) {
            console.error('❌ My stats error:', e);
            myRankCard.classList.add('hidden');
        }
    }

function toggleLeaderboardSection() {
        const content = document.getElementById('leaderboardContent');
        const icon = document.getElementById('leaderboardToggleIcon');
        
        if (!content) return;
        
        leaderboardSectionOpen = !leaderboardSectionOpen;
        
        if (leaderboardSectionOpen) {
            // ✅ Expand
            content.style.maxHeight = '600px';
            content.style.opacity = '1';
            content.classList.remove('max-h-0', 'opacity-0');
            content.classList.add('max-h-[600px]', 'opacity-100');
            
            if (icon) icon.style.transform = 'rotate(180deg)';
            
            // Data auto-load (যদি এখনো না হয়ে থাকে)
            if (typeof loadLeaderboard === 'function') {
                const list = document.getElementById('leaderboardList');
                const isLoading = list?.innerHTML.includes('লোড হচ্ছে');
                const hasData = list && list.children.length > 0 && !isLoading;
                
                if (!hasData) {
                    console.log('🚀 Leaderboard load (on expand)...');
                    loadLeaderboard();
                }
            }
            
            console.log('📖 Leaderboard section: EXPANDED');
        } else {
            // ❌ Collapse
            content.style.maxHeight = '0';
            content.style.opacity = '0';
            content.classList.add('max-h-0', 'opacity-0');
            content.classList.remove('max-h-[600px]', 'opacity-100');
            
            if (icon) icon.style.transform = 'rotate(0deg)';
            
            console.log('📕 Leaderboard section: COLLAPSED');
        }
        
        // State save
        try {
            sessionStorage.setItem('leaderboard_section_open', leaderboardSectionOpen ? '1' : '0');
        } catch(e) {}
    }

function restoreLeaderboardSectionState() {
        try {
            const wasOpen = sessionStorage.getItem('leaderboard_section_open') === '1';
            if (wasOpen) {
                setTimeout(toggleLeaderboardSection, 200);
            }
        } catch(e) {}
    }

function toggleLeaderboardHeight() {
    const list = document.getElementById('leaderboardList');
    const btn = document.getElementById('leaderboardToggleBtn');
    
    if (!list || !btn) return;
    
    leaderboardExpanded = !leaderboardExpanded;
    
    if (leaderboardExpanded) {
        // Expand — full height
        list.style.maxHeight = 'none';
        list.classList.remove('max-h-[400px]');
        btn.innerHTML = '<i class="fas fa-chevron-up mr-1"></i>ছোট করুন';
        btn.classList.remove('bg-orange-100', 'text-orange-700');
        btn.classList.add('bg-red-100', 'text-red-700');
    } else {
        // Collapse — 400px
        list.style.maxHeight = '400px';
        list.classList.add('max-h-[400px]');
        btn.innerHTML = '<i class="fas fa-chevron-down mr-1"></i>সব দেখুন';
        btn.classList.remove('bg-red-100', 'text-red-700');
        btn.classList.add('bg-orange-100', 'text-orange-700');
    }
    
    console.log('📏 Leaderboard:', leaderboardExpanded ? 'expanded' : 'collapsed');
}
