// ============================================
// supabase-functions.js - TUKNBD
// সম্পূর্ণ আপডেট (সব ফাংশন সহ)
// ============================================

// ==================== ক্লায়েন্ট রেফারেন্স ====================
const getClient = () => window._supabaseClient || window.supabaseClient || window._supabase || window.supabase;

// ==================== ডিস্ট্রিক্ট ডাটা ====================
const divisions = {
    "ঢাকা": ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "টাঙ্গাইল", "কিশোরগঞ্জ", "মানিকগঞ্জ", "মুন্সীগঞ্জ", "নরসিংদী", "ফরিদপুর", "গোপালগঞ্জ", "মাদারীপুর", "রাজবাড়ী", "শরীয়তপুর"],
    "চট্টগ্রাম": ["চট্টগ্রাম", "কক্সবাজার", "রাঙ্গামাটি", "বান্দরবান", "খাগড়াছড়ি", "কুমিল্লা", "ফেনী", "ব্রাহ্মণবাড়িয়া", "নোয়াখালী", "লক্ষ্মীপুর", "চাঁদপুর"],
    "রাজশাহী": ["রাজশাহী", "চাঁপাইনবাবগঞ্জ", "নাটোর", "নওগাঁ", "পাবনা", "সিরাজগঞ্জ", "বগুড়া", "জয়পুরহাট"],
    "খুলনা": ["খুলনা", "বাগেরহাট", "চুয়াডাঙ্গা", "যশোর", "ঝিনাইদহ", "মাগুরা", "নড়াইল", "সাতক্ষীরা", "কুষ্টিয়া", "মেহেরপুর"],
    "বরিশাল": ["বরিশাল", "বরগুনা", "ভোলা", "ঝালকাঠি", "পটুয়াখালী", "পিরোজপুর"],
    "সিলেট": ["সিলেট", "মৌলভীবাজার", "হবিগঞ্জ", "সুনামগঞ্জ"],
    "রংপুর": ["রংপুর", "দিনাজপুর", "কুড়িগ্রাম", "গাইবান্ধা", "লালমনিরহাট", "নীলফামারী", "পঞ্চগড়", "ঠাকুরগাঁও"],
    "ময়মনসিংহ": ["ময়মনসিংহ", "জামালপুর", "নেত্রকোণা", "শেরপুর"]
};

// ==================== শো টোস্ট ফাংশন ====================
if (typeof window.showToast === 'undefined') {
    window.showToast = function(message, type = 'info') {
        try {
            const toast = document.createElement('div');
            const bgColor = type === 'success' ? 'bg-green-600' : 
                           type === 'error' ? 'bg-red-600' : 
                           type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600';
            const icon = type === 'success' ? 'check-circle' : 
                        type === 'error' ? 'exclamation-circle' : 
                        type === 'warning' ? 'exclamation-triangle' : 'info-circle';
            
            toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 ${bgColor}`;
            toast.innerHTML = `<i class="fas fa-${icon} mr-2"></i>${message}`;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        } catch(err) {
            console.log('[Toast]', message);
        }
    };
}

// ==================== সিরিয়াল নম্বর জেনারেট ====================
async function getNextMemberSerial() {
    const client = getClient();
    
    if (!client || typeof client.from !== 'function') {
        console.log('⏳ Waiting for Supabase...');
        let attempts = 0;
        let retryClient = getClient();
        while ((!retryClient || typeof retryClient.from !== 'function') && attempts < 30) {
            await new Promise(r => setTimeout(r, 500));
            retryClient = getClient();
            attempts++;
        }
        if (!retryClient || typeof retryClient.from !== 'function') {
            console.error('❌ Supabase client not ready');
            return 1;
        }
    }
    
    const finalClient = getClient();
    
    try {
        const { data, error } = await finalClient
            .from('members')
            .select('member_id');
        
        if (error) throw error;
        
        let maxSerial = 0;
        if (data && data.length > 0) {
            for (const member of data) {
                if (member.member_id) {
                    const match = member.member_id.match(/-(\d{4})$/);
                    if (match && match[1]) {
                        const serial = parseInt(match[1]);
                        if (serial > maxSerial) maxSerial = serial;
                    }
                }
            }
        }
        
        const nextSerial = maxSerial + 1;
        return nextSerial;
        
    } catch (err) {
        console.error('❌ getNextMemberSerial Error:', err);
        return 1;
    }
}

// ==================== মেম্বার আইডি জেনারেট ====================
async function generateMemberId(memberTerm) {
    try {
        const today = new Date();
        const yy = String(today.getFullYear()).slice(-2);
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const datePart = `${yy}${mm}${dd}`;
        
        let typeCode = 'G';
        if (memberTerm == 3) typeCode = 'T3';
        else if (memberTerm == 5) typeCode = 'T5';
        else if (memberTerm == 7) typeCode = 'T7';
        else if (memberTerm == 10) typeCode = 'T10';
        else if (memberTerm == 12) typeCode = 'T12';
        else if (memberTerm == 15) typeCode = 'T15';
        
        const nextSerial = await getNextMemberSerial();
        const serial = String(nextSerial).padStart(4, '0');
        
        return `TUKN ${typeCode} ${datePart}-${serial}`;
        
    } catch (err) {
        const today = new Date();
        const yy = String(today.getFullYear()).slice(-2);
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `TUKN G ${yy}${mm}${dd}-0001`;
    }
}

// ==================== ইউটিলিটি ফাংশন ====================
window.updateDistricts = function(divisionSelectId, districtSelectId) {
    const divisionSelect = document.getElementById(divisionSelectId);
    const districtSelect = document.getElementById(districtSelectId);
    if (!divisionSelect || !districtSelect) return;
    const selectedDivision = divisionSelect.value;
    districtSelect.innerHTML = '<option value="">জেলা নির্বাচন করুন</option>';
    if (!selectedDivision) {
        districtSelect.disabled = true;
        return;
    }
    districtSelect.disabled = false;
    if (divisions[selectedDivision]) {
        divisions[selectedDivision].forEach(district => {
            const option = document.createElement("option");
            option.value = district;
            option.textContent = district;
            districtSelect.appendChild(option);
        });
    }
};

window.toggleDynamicFields = function() {
    const position = document.getElementById("memberPosition")?.value;
    document.querySelectorAll(".dynamic-field").forEach(el => el.classList.add("hidden"));
    if (position === "ছাত্র") document.getElementById("studentFields")?.classList.remove("hidden");
    else if (position === "ওস্তাদ") document.getElementById("teacherFields")?.classList.remove("hidden");
    else if (position === "খাদেম") document.getElementById("khadimFields")?.classList.remove("hidden");
    else if (position === "অন্যান্য") document.getElementById("otherFields")?.classList.remove("hidden");
};

window.generateReferralCode = function(mobile) {
    const lastSix = mobile.slice(-6);
    const randomTwo = Math.floor(10 + Math.random() * 90);
    return `${lastSix}${randomTwo}`;
};

window.generatePassword = function() {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const numbers = "0123456789";
    const upperChar = upper[Math.floor(Math.random() * upper.length)];
    let numPart = "";
    for (let i = 0; i < 6; i++) numPart += numbers[Math.floor(Math.random() * numbers.length)];
    return upperChar + numPart + "p";
};

// ==================== সদস্য (MEMBERS) ফাংশন ====================
async function getAllMembers() {
    const client = getClient();
    try {
        const { data, error } = await client.from('members').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllMembers Error:', err);
        window.showToast('সদস্য তালিকা লোড করতে ত্রুটি', 'error');
        return [];
    }
}

async function getActiveMembers() {
    const client = getClient();
    try {
        const { data, error } = await client.from('members').select('*').eq('status', 'active').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getActiveMembers Error:', err);
        return [];
    }
}

async function getPendingMembersList() {
    const client = getClient();
    try {
        const { data, error } = await client.from('members').select('*').eq('status', 'pending').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getPendingMembersList Error:', err);
        return [];
    }
}

async function getMemberByMobile(mobile) {
    const client = getClient();
    try {
        if (!mobile || mobile.length < 10) return null;
        const { data, error } = await client.from('members').select('*').eq('mobile', mobile).maybeSingle();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    } catch (err) {
        console.error('❌ getMemberByMobile Error:', err);
        return null;
    }
}

async function getMemberByMemberId(memberId) {
    const client = getClient();
    try {
        if (!memberId) return null;
        const { data, error } = await client.from('members').select('*').eq('member_id', memberId).maybeSingle();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    } catch (err) {
        console.error('❌ getMemberByMemberId Error:', err);
        return null;
    }
}

async function addNewMember(memberData) {
    const client = getClient();
    try {
        if (!memberData.full_name || !memberData.mobile) {
            window.showToast('❌ নাম এবং মোবাইল বাধ্যতামূলক', 'error');
            return null;
        }
        const existing = await getMemberByMobile(memberData.mobile);
        if (existing) {
            window.showToast('❌ এই মোবাইলে ইতিমধ্যে সদস্য আছে', 'error');
            return null;
        }
        if (!memberData.member_id) {
            const today = new Date();
            const year = today.getFullYear().toString().slice(-2);
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const nextSerial = await getNextMemberSerial();
            memberData.member_id = `${year}${month}${day}-${String(nextSerial).padStart(4, '0')}`;
        }
        memberData.status = memberData.status || 'pending';
        memberData.monthly_savings = memberData.monthly_savings || 500;
        memberData.join_date = memberData.join_date || new Date().toISOString();
        const { data, error } = await client.from('members').insert([memberData]).select();
        if (error) throw error;
        window.showToast(`✅ ${memberData.full_name} সফলভাবে নিবন্ধিত হয়েছেন!`, 'success');
        return data;
    } catch (err) {
        console.error('❌ addNewMember Error:', err);
        window.showToast('❌ সদস্য যোগ করতে ত্রুটি', 'error');
        return null;
    }
}

async function updateMemberStatus(memberId, status) {
    const client = getClient();
    try {
        if (!memberId || !status) {
            window.showToast('❌ সদস্য ID এবং স্ট্যাটাস বাধ্যতামূলক', 'error');
            return null;
        }
        const { data, error } = await client.from('members').update({ status: status }).eq('member_id', memberId).select();
        if (error) throw error;
        window.showToast(`✅ স্ট্যাটাস ${status} এ আপডেট হয়েছে`, 'success');
        return data;
    } catch (err) {
        console.error('❌ updateMemberStatus Error:', err);
        window.showToast('❌ স্ট্যাটাস আপডেট ব্যর্থ', 'error');
        return null;
    }
}

async function deleteMemberById(memberId) {
    const client = getClient();
    try {
        if (!memberId) {
            window.showToast('❌ সদস্য ID প্রয়োজন', 'error');
            return false;
        }
        const confirmed = confirm('সদস্য মুছতে চান? এটি পরিবর্তনযোগ্য নয়।');
        if (!confirmed) return false;
        const { error } = await client.from('members').delete().eq('member_id', memberId);
        if (error) throw error;
        window.showToast('✅ সদস্য মুছে দেওয়া হয়েছে', 'success');
        return true;
    } catch (err) {
        console.error('❌ deleteMemberById Error:', err);
        window.showToast('❌ সদস্য মুছতে ত্রুটি', 'error');
        return false;
    }
}

async function updateMemberInfo(memberId, updates) {
    const client = getClient();
    try {
        if (!memberId || !updates) {
            window.showToast('❌ ডাটা অপূর্ণ', 'error');
            return null;
        }
        const { data, error } = await client.from('members').update(updates).eq('member_id', memberId).select();
        if (error) throw error;
        window.showToast('✅ তথ্য আপডেট হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ updateMemberInfo Error:', err);
        window.showToast('❌ তথ্য আপডেট ব্যর্থ', 'error');
        return null;
    }
}

// ==================== হিসেব নিকাশ ফাংশন ====================
async function getMemberFinancialSummary(memberId) {
    const client = getClient();
    try {
        const { data: member, error: memberError } = await client
            .from('members')
            .select('total_savings, total_commission, withdrawal_balance, capital_balance, monthly_savings')
            .eq('member_id', memberId)
            .single();
        if (memberError) throw memberError;
        
        const { data: transactions, error: transError } = await client
            .from('transactions')
            .select('*')
            .eq('member_id', memberId)
            .order('date', { ascending: false });
        if (transError) throw transError;
        
        const { data: loans, error: loanError } = await client
            .from('loan_applications')
            .select('*')
            .eq('member_id', memberId)
            .eq('status', 'approved');
        if (loanError) throw loanError;
        
        const totalLoan = loans?.reduce((sum, loan) => sum + (loan.amount || 0), 0) || 0;
        const totalPaid = loans?.reduce((sum, loan) => sum + ((loan.amount || 0) - (loan.remaining_balance || 0)), 0) || 0;
        const dueLoan = totalLoan - totalPaid;
        
        return {
            success: true,
            data: {
                ...member,
                total_deposit: member?.total_savings || 0,
                total_commission: member?.total_commission || 0,
                withdrawal_balance: member?.withdrawal_balance || 0,
                capital_balance: member?.capital_balance || 0,
                monthly_savings: member?.monthly_savings || 0,
                total_loan: totalLoan,
                paid_loan: totalPaid,
                due_loan: dueLoan,
                recent_transactions: transactions?.slice(0, 10) || []
            }
        };
    } catch (err) {
        console.error('❌ getMemberFinancialSummary Error:', err);
        return { success: false, error: err.message };
    }
}

async function updateCapitalBalance(memberId, amount, type) {
    const client = getClient();
    try {
        const { data: member } = await client.from('members').select('capital_balance').eq('member_id', memberId).single();
        if (!member) throw new Error('Member not found');
        
        let newBalance = member.capital_balance;
        if (type === 'add') newBalance += amount;
        else if (type === 'subtract') newBalance -= amount;
        else throw new Error('Invalid type');
        
        const { error } = await client.from('members').update({ capital_balance: newBalance }).eq('member_id', memberId);
        if (error) throw error;
        
        return { success: true, new_balance: newBalance };
    } catch (err) {
        console.error('❌ updateCapitalBalance Error:', err);
        return { success: false, error: err.message };
    }
}

// ==================== অ্যাডমিন ফাংশন ====================
async function getAllAdmins() {
    const client = getClient();
    try {
        const { data, error } = await client.from('admins').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllAdmins Error:', err);
        return [];
    }
}

async function verifyAdminLogin(username, password) {
    const client = getClient();
    try {
        if (!username || !password) {
            window.showToast('❌ ইউজারনেম এবং পাসওয়ার্ড দিন', 'error');
            return null;
        }
        const { data, error } = await client.from('admins').select('*').eq('username', username).eq('password', password).maybeSingle();
        if (error && error.code !== 'PGRST116') throw error;
        if (!data) {
            window.showToast('❌ ভুল ক্রেডেনশিয়াল', 'error');
            return null;
        }
        return data;
    } catch (err) {
        console.error('❌ verifyAdminLogin Error:', err);
        return null;
    }
}

async function addNewAdmin(adminData) {
    const client = getClient();
    try {
        if (!adminData.username || !adminData.password || !adminData.name) {
            window.showToast('❌ ইউজারনেম, পাসওয়ার্ড এবং নাম বাধ্যতামূলক', 'error');
            return null;
        }
        const { data, error } = await client.from('admins').insert([adminData]).select();
        if (error) throw error;
        window.showToast('✅ অ্যাডমিন যোগ হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ addNewAdmin Error:', err);
        window.showToast('❌ অ্যাডমিন যোগ করতে ত্রুটি', 'error');
        return null;
    }
}

async function deleteAdminById(adminId) {
    const client = getClient();
    try {
        const confirmed = confirm('অ্যাডমিন মুছতে চান?');
        if (!confirmed) return false;
        const { error } = await client.from('admins').delete().eq('id', adminId);
        if (error) throw error;
        window.showToast('✅ অ্যাডমিন মুছে দেওয়া হয়েছে', 'success');
        return true;
    } catch (err) {
        console.error('❌ deleteAdminById Error:', err);
        return false;
    }
}

// ==================== প্রতিনিধি ফাংশন ====================
async function getAllRepresentatives() {
    const client = getClient();
    try {
        const { data, error } = await client.from('representatives').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllRepresentatives Error:', err);
        return [];
    }
}

async function addNewRepresentative(repData) {
    const client = getClient();
    try {
        if (!repData.name || !repData.district) {
            window.showToast('❌ নাম এবং জেলা বাধ্যতামূলক', 'error');
            return null;
        }
        const { data, error } = await client.from('representatives').insert([repData]).select();
        if (error) throw error;
        window.showToast('✅ প্রতিনিধি যোগ হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ addNewRepresentative Error:', err);
        window.showToast('❌ প্রতিনিধি যোগ করতে ত্রুটি', 'error');
        return null;
    }
}

async function deleteRepresentativeById(id) {
    const client = getClient();
    try {
        const confirmed = confirm('প্রতিনিধি মুছতে চান?');
        if (!confirmed) return false;
        const { error } = await client.from('representatives').delete().eq('id', id);
        if (error) throw error;
        window.showToast('✅ প্রতিনিধি মুছে দেওয়া হয়েছে', 'success');
        return true;
    } catch (err) {
        console.error('❌ deleteRepresentativeById Error:', err);
        return false;
    }
}

// ==================== প্রতিনিধি আবেদন ফাংশন ====================
async function getAllRepApplications() {
    const client = getClient();
    try {
        const { data, error } = await client.from('rep_applications').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllRepApplications Error:', err);
        return [];
    }
}

async function addRepApplication(appData) {
    const client = getClient();
    try {
        if (!appData.member_id || !appData.district) {
            window.showToast('❌ সদস্য এবং জেলা বাধ্যতামূলক', 'error');
            return null;
        }
        const { data, error } = await client.from('rep_applications').insert([appData]).select();
        if (error) throw error;
        window.showToast('✅ প্রতিনিধি আবেদন জমা হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ addRepApplication Error:', err);
        window.showToast('❌ আবেদন জমা করতে ত্রুটি', 'error');
        return null;
    }
}

async function approveRepApplicationById(id, approvedBy) {
    const client = getClient();
    try {
        const { data, error } = await client.from('rep_applications').update({ status: 'approved' }).eq('id', id).select();
        if (error) throw error;
        if (data && data[0]) {
            await addNewRepresentative({
                member_id: data[0].member_id,
                name: data[0].name,
                district: data[0].district,
                mobile: data[0].mobile,
                madrasa: data[0].madrasa,
                experience: data[0].experience,
                join_date: new Date().toISOString(),
                approved_by: approvedBy,
                status: 'active'
            });
        }
        window.showToast('✅ আবেদন অনুমোদন হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ approveRepApplicationById Error:', err);
        window.showToast('❌ অনুমোদন ব্যর্থ', 'error');
        return null;
    }
}

async function rejectRepApplicationById(id) {
    const client = getClient();
    try {
        const { data, error } = await client.from('rep_applications').update({ status: 'rejected' }).eq('id', id).select();
        if (error) throw error;
        window.showToast('✅ আবেদন বাতিল হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ rejectRepApplicationById Error:', err);
        return null;
    }
}

// ==================== লোন ফাংশন (আপডেটেড - আপনার টেবিলের জন্য) ====================

// 1. একটি সদস্যের সব অনুমোদিত লোন দেখুন
async function getMemberLoans(memberId) {
    const client = getClient();
    try {
        if (!memberId) {
            console.log('⚠️ No memberId provided');
            return [];
        }
        
        const { data, error } = await client
            .from('loan_applications')
            .select('*')
            .eq('member_id', memberId)
            .eq('status', 'approved')
            .order('approved_at', { ascending: false });
        
        if (error) {
            console.error('❌ getMemberLoans Error:', error);
            return [];
        }
        
        console.log(`📊 Found ${data?.length || 0} approved loans for ${memberId}`);
        return data || [];
        
    } catch (err) {
        console.error('❌ getMemberLoans Error:', err);
        return [];
    }
}

// 2. লোনের সারসংক্ষেপ
async function getMemberLoanSummary(memberId) {
    const client = getClient();
    try {
        if (!memberId) {
            return { 
                total_loan: 0, 
                paid_loan: 0, 
                due_loan: 0,
                total_payable: 0,
                total_remaining: 0,
                loan_count: 0,
                loans: [] 
            };
        }
        
        const { data, error } = await client
            .from('loan_applications')
            .select('*')
            .eq('member_id', memberId)
            .eq('status', 'approved');
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            return { 
                total_loan: 0, 
                paid_loan: 0, 
                due_loan: 0,
                total_payable: 0,
                total_remaining: 0,
                loan_count: 0,
                loans: [] 
            };
        }
        
        let totalAmount = 0;
        let totalPayable = 0;
        let totalRemaining = 0;
        
        data.forEach(loan => {
            totalAmount += loan.amount || 0;
            totalPayable += loan.total_payable || 0;
            totalRemaining += loan.remaining_balance || 0;
        });
        
        const totalPaid = totalAmount - totalRemaining;
        
        return {
            total_loan: totalAmount,
            paid_loan: totalPaid > 0 ? totalPaid : 0,
            due_loan: totalRemaining,
            total_payable: totalPayable,
            total_remaining: totalRemaining,
            loan_count: data.length,
            loans: data
        };
        
    } catch (err) {
        console.error('❌ getMemberLoanSummary Error:', err);
        return { 
            total_loan: 0, 
            paid_loan: 0, 
            due_loan: 0,
            total_payable: 0,
            total_remaining: 0,
            loan_count: 0,
            loans: [] 
        };
    }
}

// 3. লোনের কিস্তি তথ্য
function getLoanInstallmentInfo(loan) {
    const amount = loan.amount || 0;
    const remaining = loan.remaining_balance || 0;
    const emi = loan.emi_amount || 0;
    const duration = loan.duration_months || 0;
    const totalPayable = loan.total_payable || 0;
    const paid = amount - remaining;
    
    let progress = 0;
    if (totalPayable > 0) {
        progress = ((totalPayable - remaining) / totalPayable) * 100;
    }
    
    return {
        amount: amount,
        remaining: remaining,
        paid: paid,
        emi: emi,
        duration: duration,
        totalPayable: totalPayable,
        progress: Math.round(progress),
        nextInstallment: remaining > 0 ? Math.min(emi, remaining) : 0,
        isCompleted: remaining <= 0
    };
}

// 4. লোন আবেদন যোগ করুন
async function addLoanApplication(loanData) {
    const client = getClient();
    try {
        if (!loanData.member_id || !loanData.amount) {
            showToast('❌ সদস্য এবং লোন পরিমাণ বাধ্যতামূলক', 'error');
            return null;
        }
        
        loanData.status = loanData.status || 'pending';
        loanData.submitted_at = loanData.submitted_at || new Date().toISOString();
        loanData.date = loanData.date || new Date().toISOString();
        
        // মেম্বারের তথ্য নিয়ে আসুন
        const { data: member } = await client
            .from('members')
            .select('full_name, mobile')
            .eq('member_id', loanData.member_id)
            .single();
        
        if (member) {
            loanData.member_name = member.full_name;
            loanData.member_mobile = member.mobile;
        }
        
        const { data, error } = await client
            .from('loan_applications')
            .insert([loanData])
            .select();
        
        if (error) throw error;
        
        showToast('✅ লোন আবেদন জমা হয়েছে', 'success');
        return data;
        
    } catch (err) {
        console.error('❌ addLoanApplication Error:', err);
        showToast('❌ লোন আবেদন জমা ব্যর্থ', 'error');
        return null;
    }
}

// 5. লোন স্ট্যাটাস আপডেট করুন
async function updateLoanStatus(loanId, status, adminId = null, adminName = null) {
    const client = getClient();
    try {
        const updateData = { status: status };
        
        if (status === 'approved') {
            updateData.approved_at = new Date().toISOString();
            updateData.approved_by = adminName || adminId;
        } else if (status === 'rejected') {
            updateData.rejected_at = new Date().toISOString();
            updateData.rejected_by = adminName || adminId;
        }
        
        const { data, error } = await client
            .from('loan_applications')
            .update(updateData)
            .eq('id', loanId)
            .select();
        
        if (error) throw error;
        
        showToast(`✅ লোন স্ট্যাটাস ${status} হয়েছে`, 'success');
        return data;
        
    } catch (err) {
        console.error('❌ updateLoanStatus Error:', err);
        showToast('❌ স্ট্যাটাস আপডেট ব্যর্থ', 'error');
        return null;
    }
}

// 6. লোন ডিলিট করুন
async function deleteLoanById(loanId) {
    const client = getClient();
    try {
        const confirmed = confirm('লোন মুছতে চান?');
        if (!confirmed) return false;
        
        const { error } = await client
            .from('loan_applications')
            .delete()
            .eq('id', loanId);
        
        if (error) throw error;
        
        showToast('✅ লোন মুছে দেওয়া হয়েছে', 'success');
        return true;
        
    } catch (err) {
        console.error('❌ deleteLoanById Error:', err);
        showToast('❌ লোন মুছতে ত্রুটি', 'error');
        return false;
    }
}

// 7. সব লোন আবেদন দেখুন (অ্যাডমিন)
async function getAllLoanApplications() {
    const client = getClient();
    try {
        const { data, error } = await client
            .from('loan_applications')
            .select('*')
            .order('submitted_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
        
    } catch (err) {
        console.error('❌ getAllLoanApplications Error:', err);
        return [];
    }
}

// 8. pending লোন আবেদন দেখুন (অ্যাডমিন)
async function getPendingLoanApplications() {
    const client = getClient();
    try {
        const { data, error } = await client
            .from('loan_applications')
            .select('*')
            .eq('status', 'pending')
            .order('submitted_at', { ascending: true });
        
        if (error) throw error;
        return data || [];
        
    } catch (err) {
        console.error('❌ getPendingLoanApplications Error:', err);
        return [];
    }
}

// ==================== লেনদেন ফাংশন ====================
async function getAllTransactions() {
    const client = getClient();
    try {
        const { data, error } = await client.from('transactions').select('*').order('date', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllTransactions Error:', err);
        return [];
    }
}

async function addTransaction(transactionData) {
    const client = getClient();
    try {
        if (!transactionData.member_id || !transactionData.amount) {
            window.showToast('❌ সদস্য এবং পরিমাণ বাধ্যতামূলক', 'error');
            return null;
        }
        transactionData.date = transactionData.date || new Date().toISOString();
        const { data, error } = await client.from('transactions').insert([transactionData]).select();
        if (error) throw error;
        window.showToast('✅ লেনদেন যোগ হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ addTransaction Error:', err);
        window.showToast('❌ লেনদেন যোগ ব্যর্থ', 'error');
        return null;
    }
}

async function deleteTransactionById(id) {
    const client = getClient();
    try {
        const confirmed = confirm('লেনদেন মুছতে চান?');
        if (!confirmed) return false;
        const { error } = await client.from('transactions').delete().eq('id', id);
        if (error) throw error;
        window.showToast('✅ লেনদেন মুছে দেওয়া হয়েছে', 'success');
        return true;
    } catch (err) {
        console.error('❌ deleteTransactionById Error:', err);
        return false;
    }
}

// ==================== নোটিশ ফাংশন ====================
async function getAllNotices() {
    const client = getClient();
    try {
        const { data, error } = await client.from('notices').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllNotices Error:', err);
        return [];
    }
}

async function addNewNotice(noticeData) {
    const client = getClient();
    try {
        if (!noticeData.title || !noticeData.content) {
            window.showToast('❌ শিরোনাম এবং বিষয়বস্তু বাধ্যতামূলক', 'error');
            return null;
        }
        const { data, error } = await client.from('notices').insert([noticeData]).select();
        if (error) throw error;
        window.showToast('✅ নোটিশ যোগ হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ addNewNotice Error:', err);
        window.showToast('❌ নোটিশ যোগ ব্যর্থ', 'error');
        return null;
    }
}

async function deleteNoticeById(id) {
    const client = getClient();
    try {
        const confirmed = confirm('নোটিশ মুছতে চান?');
        if (!confirmed) return false;
        const { error } = await client.from('notices').delete().eq('id', id);
        if (error) throw error;
        window.showToast('✅ নোটিশ মুছে দেওয়া হয়েছে', 'success');
        return true;
    } catch (err) {
        console.error('❌ deleteNoticeById Error:', err);
        return false;
    }
}

// ==================== অভিযোগ ফাংশন ====================
async function getAllComplaints() {
    const client = getClient();
    try {
        const { data, error } = await client.from('complaints').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllComplaints Error:', err);
        return [];
    }
}

async function getUnreadComplaints() {
    const client = getClient();
    try {
        const { data, error } = await client.from('complaints').select('*').eq('read', false).order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getUnreadComplaints Error:', err);
        return [];
    }
}

async function addNewComplaint(complaintData) {
    const client = getClient();
    try {
        if (!complaintData.title || !complaintData.description) {
            window.showToast('❌ শিরোনাম এবং বর্ণনা বাধ্যতামূলক', 'error');
            return null;
        }
        const { data, error } = await client.from('complaints').insert([complaintData]).select();
        if (error) throw error;
        window.showToast('✅ অভিযোগ জমা হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ addNewComplaint Error:', err);
        window.showToast('❌ অভিযোগ জমা ব্যর্থ', 'error');
        return null;
    }
}

async function updateComplaintStatusById(id, status) {
    const client = getClient();
    try {
        const updateData = { 
            status: status,
            resolved_at: status === 'resolved' ? new Date().toISOString() : null
        };
        const { data, error } = await client.from('complaints').update(updateData).eq('id', id).select();
        if (error) throw error;
        window.showToast(`✅ অভিযোগ স্ট্যাটাস ${status} হয়েছে`, 'success');
        return data;
    } catch (err) {
        console.error('❌ updateComplaintStatusById Error:', err);
        return null;
    }
}

// ==================== স্লাইডার ফাংশন ====================
async function getAllSliders() {
    const client = getClient();
    try {
        const { data, error } = await client.from('sliders').select('*').order('display_order', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllSliders Error:', err);
        return [];
    }
}

async function addNewSlider(sliderData) {
    const client = getClient();
    try {
        if (!sliderData.title || !sliderData.image_url) {
            window.showToast('❌ শিরোনাম এবং ছবি বাধ্যতামূলক', 'error');
            return null;
        }
        const { data, error } = await client.from('sliders').insert([sliderData]).select();
        if (error) throw error;
        window.showToast('✅ স্লাইডার যোগ হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ addNewSlider Error:', err);
        window.showToast('❌ স্লাইডার যোগ ব্যর্থ', 'error');
        return null;
    }
}

async function deleteSliderById(id) {
    const client = getClient();
    try {
        const confirmed = confirm('স্লাইডার মুছতে চান?');
        if (!confirmed) return false;
        const { error } = await client.from('sliders').delete().eq('id', id);
        if (error) throw error;
        window.showToast('✅ স্লাইডার মুছে দেওয়া হয়েছে', 'success');
        return true;
    } catch (err) {
        console.error('❌ deleteSliderById Error:', err);
        return false;
    }
}

// ==================== ভিজিটর কাউন্ট ====================
async function getVisitorCount() {
    const client = getClient();
    try {
        const { data, error } = await client.from('visitor_count').select('count').eq('id', 1).single();
        if (error && error.code !== 'PGRST116') throw error;
        return data?.count || 0;
    } catch (err) {
        console.error('❌ getVisitorCount Error:', err);
        return 0;
    }
}

async function incrementVisitorCount() {
    const client = getClient();
    try {
        const currentCount = await getVisitorCount();
        const newCount = currentCount + 1;
        const { error } = await client.from('visitor_count').update({ count: newCount, last_updated: new Date().toISOString() }).eq('id', 1);
        if (error) throw error;
        return newCount;
    } catch (err) {
        console.error('❌ incrementVisitorCount Error:', err);
        return 0;
    }
}

// ==================== পেমেন্ট ফাংশন ====================
async function approvePayment(paymentId, adminId, adminName, adminRole) {
    const client = getClient();
    try {
        const { data, error } = await client.from('payments').update({ 
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by_id: adminId,
            approved_by_name: adminName,
            approved_by_role: adminRole || 'Admin'
        }).eq('id', paymentId).select();
        if (error) throw error;
        window.showToast('✅ পেমেন্ট অনুমোদন করা হয়েছে!', 'success');
        return data;
    } catch (err) {
        console.error('❌ approvePayment Error:', err);
        window.showToast('❌ অনুমোদন ব্যর্থ!', 'error');
        return null;
    }
}

async function rejectPayment(paymentId, adminId, adminName, reason) {
    const client = getClient();
    try {
        const { data, error } = await client.from('payments').update({ 
            status: 'rejected',
            rejected_at: new Date().toISOString(),
            rejected_by_id: adminId,
            rejected_by_name: adminName,
            rejection_reason: reason || 'নির্দিষ্ট কারণ উল্লেখ নেই'
        }).eq('id', paymentId).select();
        if (error) throw error;
        window.showToast('✅ পেমেন্ট বাতিল করা হয়েছে!', 'warning');
        return data;
    } catch (err) {
        console.error('❌ rejectPayment Error:', err);
        window.showToast('❌ বাতিল করতে ব্যর্থ!', 'error');
        return null;
    }
}

async function getAllPendingPayments() {
    const client = getClient();
    try {
        const { data, error } = await client.from('payments').select('*').eq('status', 'pending').order('submitted_at', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllPendingPayments Error:', err);
        return [];
    }
}

async function getAllApprovedPayments() {
    const client = getClient();
    try {
        const { data, error } = await client.from('payments').select('*').eq('status', 'approved').order('approved_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllApprovedPayments Error:', err);
        return [];
    }
}

async function getPaymentById(paymentId) {
    const client = getClient();
    try {
        const { data, error } = await client.from('payments').select('*').eq('id', paymentId).single();
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('❌ getPaymentById Error:', err);
        return null;
    }
}

// ==================== সদস্য লগইন ফাংশন (আপডেটেড - লোন সহ) ====================
async function verifyMemberLogin(username, password) {
    const client = getClient();
    try {
        if (!username || !password) {
            showCenterNotification('সদস্য আইডি/মোবাইল এবং পাসওয়ার্ড দিন', 'error');
            return null;
        }
        
        let query = client.from('members').select('*');
        
        if(username.match(/^01[3-9]\d{8}$/)) {
            query = query.eq('mobile', username);
        } else {
            query = query.eq('member_id', username);
        }
        
        const { data, error } = await query;
        
        if (error && error.code !== 'PGRST116') throw error;
        
        const member = data?.[0];
        
        if (!member) {
            showCenterNotification('সদস্য আইডি/মোবাইল নম্বর সঠিক নয়!', 'error');
            return null;
        }
        
        if (member.password !== password) {
            showCenterNotification('পাসওয়ার্ড ভুল!', 'error');
            return null;
        }
        
        if (member.status !== 'active' && member.status !== 'approved') {
            showCenterNotification('আপনার একাউন্ট এখনও অনুমোদিত হয়নি।', 'warning');
            return null;
        }
        
        // ============================================
        // লোনের তথ্য নিয়ে আসুন
        // ============================================
        try {
            const loanSummary = await getMemberLoanSummary(member.member_id);
            
            member.loan_summary = loanSummary;
            member.has_loan = loanSummary.loans && loanSummary.loans.length > 0;
            member.total_loan = loanSummary.total_loan || 0;
            member.total_payable = loanSummary.total_payable || 0;
            member.due_loan = loanSummary.due_loan || 0;
            member.loan_count = loanSummary.loan_count || 0;
            
            console.log(`📊 Loan data loaded for ${member.full_name}:`, loanSummary);
            
        } catch (loanErr) {
            console.warn('⚠️ Could not fetch loan data:', loanErr);
            member.loan_summary = { 
                total_loan: 0, 
                paid_loan: 0, 
                due_loan: 0,
                total_payable: 0,
                total_remaining: 0,
                loan_count: 0,
                loans: [] 
            };
            member.has_loan = false;
            member.loan_count = 0;
        }
        
        return member;
        
    } catch (err) {
        console.error('verifyMemberLogin Error:', err);
        showCenterNotification('লগইন করতে ব্যর্থ হয়েছে!', 'error');
        return null;
    }
}

function saveMemberSession(member, rememberMe = false) {
    try {
        const sessionData = {
            member_id: member.member_id,
            full_name: member.full_name,
            mobile: member.mobile,
            referral_code: member.referral_code,
            join_date: member.join_date,
            member_type: member.member_type || 'সাধারণ সদস্য',
            monthly_savings: member.monthly_savings || 500,
            status: member.status,
            has_loan: member.has_loan || false,
            loan_count: member.loan_count || 0,
            total_loan: member.total_loan || 0,
            due_loan: member.due_loan || 0,
            loggedIn: true,
            loginTime: new Date().toISOString()
        };
        sessionStorage.setItem('tukn_logged_member', JSON.stringify(sessionData));
        if (rememberMe) localStorage.setItem('tukn_logged_member', JSON.stringify(sessionData));
        return true;
    } catch (err) {
        console.error('saveMemberSession Error:', err);
        return false;
    }
}

function getMemberSession() {
    try {
        let sessionData = localStorage.getItem('tukn_logged_member');
        if (!sessionData) sessionData = sessionStorage.getItem('tukn_logged_member');
        if (!sessionData) return null;
        const member = JSON.parse(sessionData);
        if (!member.loggedIn) return null;
        if (member.status !== 'active' && member.status !== 'approved') return null;
        return member;
    } catch (err) {
        console.error('getMemberSession Error:', err);
        return null;
    }
}

function clearMemberSession() {
    localStorage.removeItem('tukn_logged_member');
    sessionStorage.removeItem('tukn_logged_member');
}

function isMemberLoggedIn() {
    return getMemberSession() !== null;
}

function memberLogout() {
    clearMemberSession();
    window.showToast('লগআউট সফল!', 'success');
    setTimeout(() => window.location.href = 'index.html', 1000);
    return true;
}

// ==================== অ্যাডমিন পারমিশন ====================
const DEFAULT_PERMISSIONS = {
    'super_admin': {
        can_approve_members: true,
        can_approve_payments: true,
        can_manage_admins: true,
        can_view_all_reports: true,
        can_delete_members: true,
        can_edit_settings: true,
        can_manage_representatives: true,
        can_approve_loans: true
    },
    'admin': {
        can_approve_members: false,
        can_approve_payments: true,
        can_manage_admins: false,
        can_view_all_reports: true,
        can_delete_members: false,
        can_edit_settings: false,
        can_manage_representatives: true,
        can_approve_loans: true
    }
};

async function getAdminPermissions(adminId) {
    const client = getClient();
    try {
        const { data, error } = await client.from('admins').select('role, permissions, custom_permissions').eq('id', adminId).single();
        if (error) throw error;
        if (data.custom_permissions) return data.custom_permissions;
        return DEFAULT_PERMISSIONS[data.role] || DEFAULT_PERMISSIONS.admin;
    } catch (err) {
        console.error('❌ getAdminPermissions Error:', err);
        return DEFAULT_PERMISSIONS.admin;
    }
}

async function updateAdminPermissions(adminId, permissions) {
    const client = getClient();
    try {
        const { data, error } = await client.from('admins').update({ custom_permissions: permissions }).eq('id', adminId).select();
        if (error) throw error;
        window.showToast('✅ পারমিশন আপডেট হয়েছে!', 'success');
        return data;
    } catch (err) {
        console.error('❌ updateAdminPermissions Error:', err);
        window.showToast('❌ পারমিশন আপডেট ব্যর্থ!', 'error');
        return null;
    }
}

async function checkAdminPermission(adminId, permissionName) {
    const permissions = await getAdminPermissions(adminId);
    return permissions[permissionName] === true;
}

// ==================== রেজিস্টার মেম্বার (সাইনআপ ফর্মের জন্য) ====================
window.registerMember = async function(e) {
    e.preventDefault();
    
    const client = getClient();
    
    if (!client || typeof client.from !== 'function') {
        showCenterNotification('সার্ভারের সাথে সংযোগ স্থাপন করা যাচ্ছে না। পেজ রিফ্রেশ করে আবার চেষ্টা করুন।', 'error');
        return;
    }
    
    try {
        const agreement = document.getElementById("agreementCheck");
        if (!agreement?.checked) {
            showCenterNotification('অনুগ্রহ করে অঙ্গীকারে টিক দিন', 'error');
            return;
        }
        
        const getValue = (id) => document.getElementById(id)?.value.trim() || null;
        
        const full_name = getValue("fullName");
        const father_name = getValue("fatherName");
        const mother_name = getValue("motherName");
        const mobile = getValue("mobile");
        const telegram = getValue("telegram");
        const email = getValue("email");
        const id_number = getValue("idNumber");
        const id_type = document.querySelector('input[name="idType"]:checked')?.value || "জন্মনিবন্ধন";
        
        if (!full_name) { showCenterNotification('পূর্ণ নাম দিন', 'error'); return; }
        if (!mobile) { showCenterNotification('মোবাইল দিন', 'error'); return; }
        if (!/^01[3-9]\d{8}$/.test(mobile)) { showCenterNotification('সঠিক মোবাইল নাম্বার দিন', 'error'); return; }
        
        const { data: existingMember } = await client.from("members").select("id").eq("mobile", mobile).maybeSingle();
        if (existingMember) { 
            showCenterNotification('এই মোবাইল নাম্বার ইতিমধ্যে নিবন্ধিত', 'error'); 
            return; 
        }
        
        const memberTerm = parseInt(document.getElementById("memberTerm")?.value) || 0;
        let memberType = "সাধারণ সদস্য";
        if (memberTerm === 3) memberType = "৩ বছর মেয়াদী";
        else if (memberTerm === 5) memberType = "৫ বছর মেয়াদী";
        else if (memberTerm === 7) memberType = "৭ বছর মেয়াদী";
        else if (memberTerm === 10) memberType = "১০ বছর মেয়াদী";
        else if (memberTerm === 12) memberType = "১২ বছর মেয়াদী";
        else if (memberTerm === 15) memberType = "১৫ বছর মেয়াদী";
        
        const member_id = await generateMemberId(memberTerm);
        const password = window.generatePassword();
        let referral_code = window.generateReferralCode(mobile);
        
        let unique = false;
        while (!unique) {
            const { data } = await client.from("members").select("id").eq("referral_code", referral_code).maybeSingle();
            if (!data) unique = true;
            else referral_code = window.generateReferralCode(mobile);
        }
        
        const position = getValue("memberPosition");
        
        let position_details = {};
        if (position === "ছাত্র") {
            position_details = {
                student_class: getValue("studentClass"),
                student_madrasa: getValue("studentMadrasa"),
                student_address: getValue("studentAddress")
            };
        } else if (position === "ওস্তাদ") {
            position_details = {
                teacher_madrasa: getValue("teacherMadrasa")
            };
        } else if (position === "খাদেম") {
            position_details = {
                khadim_mosque: getValue("khadimMosque")
            };
        } else if (position === "অন্যান্য") {
            position_details = {
                other_description: getValue("otherDescription")
            };
        }
        
        const present_village = getValue("presentVillage");
        const present_post_office = getValue("presentPostOffice");
        const present_thana = getValue("presentThana");
        const present_division = getValue("presentDivision");
        const present_district = getValue("presentDistrict");
        const present_details = getValue("presentDetails");
        
        const permanent_village = getValue("permanentVillage");
        const permanent_post_office = getValue("permanentPostOffice");
        const permanent_thana = getValue("permanentThana");
        const permanent_division = getValue("permanentDivision");
        const permanent_district = getValue("permanentDistrict");
        const permanent_details = getValue("permanentDetails");
        
        const nominee_name = getValue("nomineeName");
        const nominee_relation = getValue("nomineeRelation");
        const nominee_nid = getValue("nomineeNid");
        
        const monthly_savings = parseInt(getValue("monthlySavings")) || 0;
        const profession = getValue("profession");
        const education = getValue("education");
        const referred_by = getValue("referCode");
        
        const memberData = {
            member_id: member_id,
            full_name: full_name,
            father_name: father_name,
            mother_name: mother_name,
            mobile: mobile,
            telegram: telegram,
            email: email,
            id_type: id_type,
            id_number: id_number,
            password: password,
            member_type: memberType,
            member_term: memberTerm,
            monthly_savings: monthly_savings,
            profession: profession,
            education: education,
            present_village: present_village,
            present_post_office: present_post_office,
            present_thana: present_thana,
            present_division: present_division,
            present_district: present_district,
            present_details: present_details,
            permanent_village: permanent_village,
            permanent_post_office: permanent_post_office,
            permanent_thana: permanent_thana,
            permanent_division: permanent_division,
            permanent_district: permanent_district,
            permanent_details: permanent_details,
            nominee_name: nominee_name,
            nominee_relation: nominee_relation,
            nominee_nid: nominee_nid,
            referral_code: referral_code,
            status: "pending",
            join_date: new Date().toISOString(),
            approved_at: null,
            approved_by: null,
            position: position,
            position_details: position_details,
            profile_image: null,
            total_savings: 0,
            total_commission: 0,
            withdrawal_balance: 0,
            referred_by: referred_by,
            referral_bonus: 0,
            referral_level: 0,
            referral_count: 0,
            per_referral_bonus: 0,
            profit_bonus: 0,
            capital_balance: monthly_savings
        };
        
        const { error } = await client.from("members").insert([memberData]);
        if (error) throw error;
        
        if (referred_by) {
            const { data: refUser } = await client.from("members").select("*").eq("referral_code", referred_by).maybeSingle();
            if (refUser) {
                const bonus = 10;
                await client.from("members").update({
                    referral_bonus: (refUser.referral_bonus || 0) + bonus,
                    referral_count: (refUser.referral_count || 0) + 1,
                    total_commission: (refUser.total_commission || 0) + bonus,
                    withdrawal_balance: (refUser.withdrawal_balance || 0) + bonus
                }).eq("id", refUser.id);
            }
        }
        
        // ============================================
        // ✅ সাফল্যের ডায়লগ দেখান
        // ============================================
        const dialogHtml = `
            <div class="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4" id="successDialog">
                <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative" style="animation: fadeInScale 0.3s ease;">
                    <button onclick="document.getElementById('successDialog').remove()" 
                            class="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-xl">
                        &times;
                    </button>
                    <div class="text-center mb-4">
                        <i class="fas fa-check-circle text-green-500 text-5xl mb-2"></i>
                        <h2 class="text-2xl font-bold text-emerald-700">নিবন্ধন সফল!</h2>
                    </div>
                    <div class="bg-emerald-50 p-4 rounded-lg mb-4">
                        <p class="font-bold text-emerald-800 mb-2">📋 আপনার সদস্য তথ্য:</p>
                        <div class="space-y-2 text-sm">
                            <p><span class="font-semibold">সদস্য আইডি:</span> 
                               <span class="font-mono bg-white px-2 py-1 rounded font-bold text-emerald-700">${member_id}</span></p>
                            <p><span class="font-semibold">রেফারেল কোড:</span> 
                               <span class="font-mono bg-white px-2 py-1 rounded font-bold text-emerald-700">${referral_code}</span></p>
                            <p><span class="font-semibold">মোবাইল নং:</span> 
                               <span class="font-bold">${mobile}</span></p>
                            <p><span class="font-semibold">পাসওয়ার্ড:</span> 
                               <span class="font-mono bg-white px-2 py-1 rounded font-bold text-red-600">${password}</span></p>
                        </div>
                    </div>
                    <div class="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg mb-4">
                        <p class="font-bold text-amber-700 mb-2">⚠️ গুরুত্বপূর্ণ নির্দেশনা:</p>
                        <ul class="list-disc list-inside text-sm text-gray-700 space-y-2">
                            <li>আপনার পেমেন্ট সম্পন্ন হবার পর <span class="font-bold text-red-600">সদস্যপদ অনুমোদন</span> করা হবে</li>
                            <li><span class="font-bold">Send Money</span> করার সময় রেফার হিসেবে <span class="font-bold text-emerald-700">${referral_code}</span> লিখুন</li>
                            <li>অনুমোদনের পর <span class="font-bold">"আমাদের সেবা"</span> মেনু থেকে সঞ্চয় জমার অনুরোধ করুন</li>
                        </ul>
                    </div>
                    <button onclick="document.getElementById('successDialog').remove()" 
                            class="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition text-base font-bold">
                        <i class="fas fa-check mr-2"></i> বুঝতে পেরেছি
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', dialogHtml);
        
        document.getElementById("signupForm")?.reset();
        
    } catch (err) {
        console.error("Registration error:", err);
        showCenterNotification('সার্ভার সমস্যা হয়েছে: ' + (err.message || 'অজানা ত্রুটি'), 'error');
    }
};

// ==================== গ্লোবাল এক্সপোর্ট ====================
window.getNextMemberSerial = getNextMemberSerial;
window.generateMemberId = generateMemberId;
window.getAllMembers = getAllMembers;
window.getActiveMembers = getActiveMembers;
window.getPendingMembersList = getPendingMembersList;
window.getMemberByMobile = getMemberByMobile;
window.getMemberByMemberId = getMemberByMemberId;
window.addNewMember = addNewMember;
window.updateMemberStatus = updateMemberStatus;
window.deleteMemberById = deleteMemberById;
window.updateMemberInfo = updateMemberInfo;
window.getMemberFinancialSummary = getMemberFinancialSummary;
window.updateCapitalBalance = updateCapitalBalance;
window.getAllAdmins = getAllAdmins;
window.verifyAdminLogin = verifyAdminLogin;
window.addNewAdmin = addNewAdmin;
window.deleteAdminById = deleteAdminById;
window.getAllRepresentatives = getAllRepresentatives;
window.addNewRepresentative = addNewRepresentative;
window.deleteRepresentativeById = deleteRepresentativeById;
window.getAllRepApplications = getAllRepApplications;
window.addRepApplication = addRepApplication;
window.approveRepApplicationById = approveRepApplicationById;
window.rejectRepApplicationById = rejectRepApplicationById;
window.getMemberLoans = getMemberLoans;
window.getMemberLoanSummary = getMemberLoanSummary;
window.getLoanInstallmentInfo = getLoanInstallmentInfo;
window.addLoanApplication = addLoanApplication;
window.updateLoanStatus = updateLoanStatus;
window.deleteLoanById = deleteLoanById;
window.getAllLoanApplications = getAllLoanApplications;
window.getPendingLoanApplications = getPendingLoanApplications;
window.getAllTransactions = getAllTransactions;
window.addTransaction = addTransaction;
window.deleteTransactionById = deleteTransactionById;
window.getAllNotices = getAllNotices;
window.addNewNotice = addNewNotice;
window.deleteNoticeById = deleteNoticeById;
window.getAllComplaints = getAllComplaints;
window.getUnreadComplaints = getUnreadComplaints;
window.addNewComplaint = addNewComplaint;
window.updateComplaintStatusById = updateComplaintStatusById;
window.getAllSliders = getAllSliders;
window.addNewSlider = addNewSlider;
window.deleteSliderById = deleteSliderById;
window.getVisitorCount = getVisitorCount;
window.incrementVisitorCount = incrementVisitorCount;
window.approvePayment = approvePayment;
window.rejectPayment = rejectPayment;
window.getAllPendingPayments = getAllPendingPayments;
window.getAllApprovedPayments = getAllApprovedPayments;
window.getPaymentById = getPaymentById;
window.verifyMemberLogin = verifyMemberLogin;
window.saveMemberSession = saveMemberSession;
window.getMemberSession = getMemberSession;
window.clearMemberSession = clearMemberSession;
window.isMemberLoggedIn = isMemberLoggedIn;
window.memberLogout = memberLogout;
window.getAdminPermissions = getAdminPermissions;
window.updateAdminPermissions = updateAdminPermissions;
window.checkAdminPermission = checkAdminPermission;
window.divisions = divisions;

console.log('✅ supabase-functions.js loaded (all features included)');
