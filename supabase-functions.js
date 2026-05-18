// supabase-functions.js
// TUKNBD - সম্পূর্ণ Supabase ডাটাবেস ফাংশন (ফাইনাল ভার্সন)

// ==================== ভেরিয়েবল চেক (ডুপ্লিকেট এড়াতে) ====================
if (typeof window._supabase === 'undefined') {
    window._supabase = null;
}
if (typeof window._supabaseClient === 'undefined') {
    window._supabaseClient = null;
}

// কম্প্যাটিবিলিটি ভেরিয়েবল (যদি supabase-config.js থেকে না আসে)
if (typeof supabase === 'undefined') {
    var supabase = null;
}
if (typeof supabaseClient === 'undefined') {
    var supabaseClient = null;
}

// ==================== Supabase ক্লায়েন্ট ইনিশিয়ালাইজেশন ====================

async function initSupabaseClient() {
    try {
        // Supabase CDN চেক করুন
        let supabaseLib = null;
        let attempts = 0;
        
        while (!supabaseLib && attempts < 30) {
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                supabaseLib = window.supabase;
            } else if (typeof supabase !== 'undefined' && supabase && typeof supabase.createClient === 'function') {
                supabaseLib = supabase;
            }
            if (!supabaseLib) {
                await new Promise(r => setTimeout(r, 300));
                attempts++;
            }
        }
        
        if (!supabaseLib) {
            console.error('❌ Supabase library not loaded');
            return false;
        }
        
        const SUPABASE_URL = 'https://bffomfsffrtfgxyetzvm.supabase.co';
        const SUPABASE_ANON_KEY = 'sb_publishable_A0BluIVwJ4M3Zd3JWpBoPg_NJSRu81D';
        
        // ক্লায়েন্ট তৈরি করুন
        const client = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // ভেরিয়েবল সেট করুন
        supabase = client;
        supabaseClient = client;
        window._supabase = client;
        window._supabaseClient = client;
        
        // কম্প্যাটিবিলিটি
        if (typeof window.supabase === 'undefined') {
            window.supabase = client;
        }
        if (typeof window.supabaseClient === 'undefined') {
            window.supabaseClient = client;
        }
        
        console.log('✅ Supabase Client Initialized');
        return true;
        
    } catch (err) {
        console.error('❌ Supabase Init Error:', err);
        return false;
    }
}

// ==================== Supabase সংযোগ পরীক্ষা ====================

async function testSupabaseConnection() {
    const client = supabase || window.supabase || window._supabase;
    
    if (!client) {
        const initialized = await initSupabaseClient();
        if (!initialized) return false;
    }
    
    const finalClient = supabase || window.supabase || window._supabase;
    
    try {
        const { data, error } = await finalClient
            .from('members')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            console.error('❌ Connection Error:', error.message);
            return false;
        }
        
        console.log('✅ Supabase Connection Successful');
        return true;
    } catch (err) {
        console.error('❌ Connection Test Failed:', err);
        return false;
    }
}

// ==================== সদস্য (MEMBERS) ফাংশন ====================

async function getAllMembers() {
    const client = supabase || window.supabase || window._supabase;
    try {
        const { data, error } = await client
            .from('members')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        console.log('✅ Fetched all members:', data?.length);
        return data || [];
    } catch (err) {
        console.error('❌ getAllMembers Error:', err);
        showToast('সদস্য তালিকা লোড করতে ত্রুটি', 'error');
        return [];
    }
}

async function getActiveMembers() {
    const client = supabase || window.supabase || window._supabase;
    try {
        const { data, error } = await client
            .from('members')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getActiveMembers Error:', err);
        return [];
    }
}

async function getPendingMembersList() {
    const client = supabase || window.supabase || window._supabase;
    try {
        const { data, error } = await client
            .from('members')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getPendingMembersList Error:', err);
        return [];
    }
}

async function getMemberByMobile(mobile) {
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!mobile || mobile.length < 10) {
            console.warn('⚠️ Invalid mobile number');
            return null;
        }

        const { data, error } = await client
            .from('members')
            .select('*')
            .eq('mobile', mobile)
            .maybeSingle();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    } catch (err) {
        console.error('❌ getMemberByMobile Error:', err);
        return null;
    }
}

async function getMemberByMemberId(memberId) {
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!memberId) {
            console.warn('⚠️ Invalid member ID');
            return null;
        }

        const { data, error } = await client
            .from('members')
            .select('*')
            .eq('member_id', memberId)
            .maybeSingle();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    } catch (err) {
        console.error('❌ getMemberByMemberId Error:', err);
        return null;
    }
}

// ==================== সিরিয়াল নম্বর জেনারেট করার ফাংশন ====================

async function getNextMemberSerial() {
    const client = supabase || window.supabase || window._supabase;
    try {
        // সব সদস্যকে created_at অনুযায়ী সাজান (সবচেয়ে নতুন প্রথমে)
        const { data, error } = await client
            .from('members')
            .select('member_id')
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (error) throw error;
        
        let lastSerial = 0;
        
        if (data && data.length > 0 && data[0].member_id) {
            const lastId = data[0].member_id;
            // ফরম্যাট: YYMMDD-XXXX (যেমন: 260518-0001)
            const match = lastId.match(/\d{6}-(\d{4})$/);
            if (match && match[1]) {
                lastSerial = parseInt(match[1]);
            }
        }
        
        console.log('📊 Next serial:', lastSerial + 1);
        return lastSerial + 1;
        
    } catch (err) {
        console.error('❌ getNextMemberSerial Error:', err);
        return 1;
    }
}

// ==================== আপডেটেড addNewMember ফাংশন ====================

async function addNewMember(memberData) {
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!memberData.full_name || !memberData.mobile) {
            showToast('❌ নাম এবং মোবাইল বাধ্যতামূলক', 'error');
            return null;
        }

        // মোবাইল নম্বর চেক করুন
        const existing = await getMemberByMobile(memberData.mobile);
        if (existing) {
            showToast('❌ এই মোবাইলে ইতিমধ্যে সদস্য আছে', 'error');
            return null;
        }

        // নতুন member_id জেনারেট করুন (ফরম্যাট: YYMMDD-SERIAL)
        if (!memberData.member_id) {
            const today = new Date();
            const year = today.getFullYear().toString().slice(-2);  // 26
            const month = String(today.getMonth() + 1).padStart(2, '0');  // 05
            const day = String(today.getDate()).padStart(2, '0');  // 18
            
            // পরবর্তী সিরিয়াল নম্বর পান
            const nextSerial = await getNextMemberSerial();
            
            // ফরম্যাট: 260518-0001
            memberData.member_id = `${year}${month}${day}-${String(nextSerial).padStart(4, '0')}`;
        }

        // ডিফল্ট স্ট্যাটাস pending (এডমিন অনুমোদন না করা পর্যন্ত)
        memberData.status = memberData.status || 'pending';
        
        // মাসিক সঞ্চয় সংরক্ষণ করুন
        memberData.monthly_savings = memberData.monthly_savings || 500;
        memberData.join_date = memberData.join_date || new Date().toISOString();

        const { data, error } = await client
            .from('members')
            .insert([memberData])
            .select();
        
        if (error) throw error;
        
        showToast(`✅ ${memberData.full_name} সফলভাবে নিবন্ধিত হয়েছেন!`, 'success');
        console.log('✅ New Member Added with ID:', memberData.member_id);
        return data;
        
    } catch (err) {
        console.error('❌ addNewMember Error:', err);
        showToast('❌ সদস্য যোগ করতে ত্রুটি', 'error');
        return null;
    }
}

async function updateMemberStatus(memberId, status) {
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!memberId || !status) {
            showToast('❌ সদস্য ID এবং স্ট্যাটাস বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await client
            .from('members')
            .update({ status: status })
            .eq('member_id', memberId)
            .select();
        
        if (error) throw error;
        
        showToast(`✅ স্ট্যাটাস ${status} এ আপডেট হয়েছে`, 'success');
        return data;
    } catch (err) {
        console.error('❌ updateMemberStatus Error:', err);
        showToast('❌ স্ট্যাটাস আপডেট ব্যর্থ', 'error');
        return null;
    }
}

async function deleteMemberById(memberId) {
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!memberId) {
            showToast('❌ সদস্য ID প্রয়োজন', 'error');
            return false;
        }

        const confirmed = confirm('সদস্য মুছতে চান? এটি পরিবর্তনযোগ্য নয়।');
        if (!confirmed) return false;

        const { error } = await client
            .from('members')
            .delete()
            .eq('member_id', memberId);
        
        if (error) throw error;
        
        showToast('✅ সদস্য মুছে দেওয়া হয়েছে', 'success');
        return true;
    } catch (err) {
        console.error('❌ deleteMemberById Error:', err);
        showToast('❌ সদস্য মুছতে ত্রুটি', 'error');
        return false;
    }
}

async function updateMemberInfo(memberId, updates) {
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!memberId || !updates) {
            showToast('❌ ডাটা অপূর্ণ', 'error');
            return null;
        }

        const { data, error } = await client
            .from('members')
            .update(updates)
            .eq('member_id', memberId)
            .select();
        
        if (error) throw error;
        
        showToast('✅ তথ্য আপডেট হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ updateMemberInfo Error:', err);
        showToast('❌ তথ্য আপডেট ব্যর্থ', 'error');
        return null;
    }
}

// ==================== অ্যাডমিন (ADMINS) ফাংশন ====================

async function getAllAdmins() {
    const client = supabase || window.supabase || window._supabase;
    try {
        const { data, error } = await client
            .from('admins')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllAdmins Error:', err);
        return [];
    }
}

async function verifyAdminLogin(username, password) {
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!username || !password) {
            showToast('❌ ইউজারনেম এবং পাসওয়ার্ড দিন', 'error');
            return null;
        }

        const { data, error } = await client
            .from('admins')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .maybeSingle();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        if (!data) {
            showToast('❌ ভুল ক্রেডেনশিয়াল', 'error');
            return null;
        }

        console.log('✅ Admin Login Successful:', data.name);
        return data;
    } catch (err) {
        console.error('❌ verifyAdminLogin Error:', err);
        return null;
    }
}

async function addNewAdmin(adminData) {
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!adminData.username || !adminData.password || !adminData.name) {
            showToast('❌ ইউজারনেম, পাসওয়ার্ড এবং নাম বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await client
            .from('admins')
            .insert([adminData])
            .select();
        
        if (error) throw error;
        
        showToast('✅ অ্যাডমিন যোগ হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ addNewAdmin Error:', err);
        showToast('❌ অ্যাডমিন যোগ করতে ত্রুটি', 'error');
        return null;
    }
}

async function deleteAdminById(adminId) {
    const client = supabase || window.supabase || window._supabase;
    try {
        const confirmed = confirm('অ্যাডমিন মুছতে চান?');
        if (!confirmed) return false;

        const { error } = await client
            .from('admins')
            .delete()
            .eq('id', adminId);
        
        if (error) throw error;
        
        showToast('✅ অ্যাডমিন মুছে দেওয়া হয়েছে', 'success');
        return true;
    } catch (err) {
        console.error('❌ deleteAdminById Error:', err);
        return false;
    }
}

// ==================== জেলা প্রতিনিধি (REPRESENTATIVES) ফাংশন ====================

async function getAllRepresentatives() {
    const client = supabase || window.supabase || window._supabase;
    try {
        const { data, error } = await client
            .from('representatives')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllRepresentatives Error:', err);
        return [];
    }
}

async function addNewRepresentative(repData) {
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!repData.name || !repData.district) {
            showToast('❌ নাম এবং জেলা বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await client
            .from('representatives')
            .insert([repData])
            .select();
        
        if (error) throw error;
        
        showToast('✅ প্রতিনিধি যোগ হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ addNewRepresentative Error:', err);
        showToast('❌ প্রতিনিধি যোগ করতে ত্রুটি', 'error');
        return null;
    }
}

async function deleteRepresentativeById(id) {
    const client = supabase || window.supabase || window._supabase;
    try {
        const confirmed = confirm('প্রতিনিধি মুছতে চান?');
        if (!confirmed) return false;

        const { error } = await client
            .from('representatives')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showToast('✅ প্রতিনিধি মুছে দেওয়া হয়েছে', 'success');
        return true;
    } catch (err) {
        console.error('❌ deleteRepresentativeById Error:', err);
        return false;
    }
}

// ==================== প্রতিনিধি আবেদন (REP_APPLICATIONS) ফাংশন ====================

async function getAllRepApplications() {
    const client = supabase || window.supabase || window._supabase;
    try {
        const { data, error } = await client
            .from('rep_applications')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllRepApplications Error:', err);
        return [];
    }
}

async function addRepApplication(appData) {
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!appData.member_id || !appData.district) {
            showToast('❌ সদস্য এবং জেলা বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await client
            .from('rep_applications')
            .insert([appData])
            .select();
        
        if (error) throw error;
        
        showToast('✅ প্রতিনিধি আবেদন জমা হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ addRepApplication Error:', err);
        showToast('❌ আবেদন জমা করতে ত্রুটি', 'error');
        return null;
    }
}

async function approveRepApplicationById(id, approvedBy) {
    const client = supabase || window.supabase || window._supabase;
    try {
        const { data, error } = await client
            .from('rep_applications')
            .update({ status: 'approved' })
            .eq('id', id)
            .select();
        
        if (error) throw error;
        
        if (data && data[0]) {
            const app = data[0];
            await addNewRepresentative({
                member_id: app.member_id,
                name: app.name,
                district: app.district,
                mobile: app.mobile,
                madrasa: app.madrasa,
                experience: app.experience,
                join_date: new Date().toISOString(),
                approved_by: approvedBy,
                status: 'active'
            });
        }
        
        showToast('✅ আবেদন অনুমোদন হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ approveRepApplicationById Error:', err);
        showToast('❌ অনুমোদন ব্যর্থ', 'error');
        return null;
    }
}

async function rejectRepApplicationById(id) {
    const client = supabase || window.supabase || window._supabase;
    try {
        const { data, error } = await client
            .from('rep_applications')
            .update({ status: 'rejected' })
            .eq('id', id)
            .select();
        
        if (error) throw error;
        
        showToast('✅ আবেদন বাতিল হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ rejectRepApplicationById Error:', err);
        return null;
    }
}

// ==================== লোন আবেদন (LOAN_APPLICATIONS) ফাংশন ====================

async function getAllLoanApplications() {
    const client = supabase || window.supabase || window._supabase;
    try {
        const { data, error } = await client
            .from('loan_applications')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllLoanApplications Error:', err);
        return [];
    }
}

async function getLoanApplicationsByMemberId(memberId) {
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!memberId) {
            showToast('❌ সদস্য ID প্রয়োজন', 'error');
            return [];
        }

        const { data, error } = await client
            .from('loan_applications')
            .select('*')
            .eq('member_id', memberId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getLoanApplicationsByMemberId Error:', err);
        return [];
    }
}

async function addLoanApplication(loanData) {
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!loanData.member_id || !loanData.loan_amount) {
            showToast('❌ সদস্য এবং লোন পরিমাণ বাধ্যতামূলক', 'error');
            return null;
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

async function updateLoanApplicationStatus(id, status) {
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!id || !status) {
            showToast('❌ ID এবং স্ট্যাটাস প্রয়োজন', 'error');
            return null;
        }

        const { data, error } = await client
            .from('loan_applications')
            .update({ status: status })
            .eq('id', id)
            .select();
        
        if (error) throw error;
        
        showToast(`✅ লোন স্ট্যাটাস ${status} হয়েছে`, 'success');
        return data;
    } catch (err) {
        console.error('❌ updateLoanApplicationStatus Error:', err);
        return null;
    }
}

async function deleteLoanApplicationById(id) {
    const client = supabase || window.supabase || window._supabase;
    try {
        const confirmed = confirm('লোন আবেদন মুছতে চান?');
        if (!confirmed) return false;

        const { error } = await client
            .from('loan_applications')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showToast('✅ লোন আবেদন মুছে দেওয়া হয়েছে', 'success');
        return true;
    } catch (err) {
        console.error('❌ deleteLoanApplicationById Error:', err);
        return false;
    }
}

// ==================== লেনদেন (TRANSACTIONS) ফাংশন ====================

async function getAllTransactions() {
    const client = supabase || window.supabase || window._supabase;
    try {
        const { data, error } = await client
            .from('transactions')
            .select('*')
            .order('date', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllTransactions Error:', err);
        return [];
    }
}

async function addTransaction(transactionData) {
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!transactionData.member_id || !transactionData.amount) {
            showToast('❌ সদস্য এবং পরিমাণ বাধ্যতামূলক', 'error');
            return null;
        }

        transactionData.date = transactionData.date || new Date().toISOString();

        const { data, error } = await client
            .from('transactions')
            .insert([transactionData])
            .select();
        
        if (error) throw error;
        
        showToast('✅ লেনদেন যোগ হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ addTransaction Error:', err);
        showToast('❌ লেনদেন যোগ ব্যর্থ', 'error');
        return null;
    }
}

async function deleteTransactionById(id) {
    const client = supabase || window.supabase || window._supabase;
    try {
        const confirmed = confirm('লেনদেন মুছতে চান?');
        if (!confirmed) return false;

        const { error } = await client
            .from('transactions')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showToast('✅ লেনদেন মুছে দেওয়া হয়েছে', 'success');
        return true;
    } catch (err) {
        console.error('❌ deleteTransactionById Error:', err);
        return false;
    }
}

// ==================== নোটিশ (NOTICES) ফাংশন ====================

async function getAllNotices() {
    const client = supabase || window.supabase || window._supabase;
    try {
        const { data, error } = await client
            .from('notices')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllNotices Error:', err);
        return [];
    }
}

async function addNewNotice(noticeData) {
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!noticeData.title || !noticeData.content) {
            showToast('❌ শিরোনাম এবং বিষয়বস্তু বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await client
            .from('notices')
            .insert([noticeData])
            .select();
        
        if (error) throw error;
        
        showToast('✅ নোটিশ যোগ হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ addNewNotice Error:', err);
        showToast('❌ নোটিশ যোগ ব্যর্থ', 'error');
        return null;
    }
}

async function deleteNoticeById(id) {
    const client = supabase || window.supabase || window._supabase;
    try {
        const confirmed = confirm('নোটিশ মুছতে চান?');
        if (!confirmed) return false;

        const { error } = await client
            .from('notices')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showToast('✅ নোটিশ মুছে দেওয়া হয়েছে', 'success');
        return true;
    } catch (err) {
        console.error('❌ deleteNoticeById Error:', err);
        return false;
    }
}

// ==================== অভিযোগ (COMPLAINTS) ফাংশন ====================

async function getAllComplaints() {
    const client = supabase || window.supabase || window._supabase;
    try {
        const { data, error } = await client
            .from('complaints')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllComplaints Error:', err);
        return [];
    }
}

async function getUnreadComplaints() {
    const client = supabase || window.supabase || window._supabase;
    try {
        const { data, error } = await client
            .from('complaints')
            .select('*')
            .eq('read', false)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getUnreadComplaints Error:', err);
        return [];
    }
}

async function addNewComplaint(complaintData) {
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!complaintData.title || !complaintData.description) {
            showToast('❌ শিরোনাম এবং বর্ণনা বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await client
            .from('complaints')
            .insert([complaintData])
            .select();
        
        if (error) throw error;
        
        showToast('✅ অভিযোগ জমা হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ addNewComplaint Error:', err);
        showToast('❌ অভিযোগ জমা ব্যর্থ', 'error');
        return null;
    }
}

async function updateComplaintStatusById(id, status) {
    const client = supabase || window.supabase || window._supabase;
    try {
        const updateData = { 
            status: status,
            resolved_at: status === 'resolved' ? new Date().toISOString() : null
        };

        const { data, error } = await client
            .from('complaints')
            .update(updateData)
            .eq('id', id)
            .select();
        
        if (error) throw error;
        
        showToast(`✅ অভিযোগ স্ট্যাটাস ${status} হয়েছে`, 'success');
        return data;
    } catch (err) {
        console.error('❌ updateComplaintStatusById Error:', err);
        return null;
    }
}

// ==================== স্লাইডার (SLIDERS) ফাংশন ====================

async function getAllSliders() {
    const client = supabase || window.supabase || window._supabase;
    try {
        const { data, error } = await client
            .from('sliders')
            .select('*')
            .order('display_order', { ascending: true });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllSliders Error:', err);
        return [];
    }
}

async function addNewSlider(sliderData) {
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!sliderData.title || !sliderData.image_url) {
            showToast('❌ শিরোনাম এবং ছবি বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await client
            .from('sliders')
            .insert([sliderData])
            .select();
        
        if (error) throw error;
        
        showToast('✅ স্লাইডার যোগ হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ addNewSlider Error:', err);
        showToast('❌ স্লাইডার যোগ ব্যর্থ', 'error');
        return null;
    }
}

async function deleteSliderById(id) {
    const client = supabase || window.supabase || window._supabase;
    try {
        const confirmed = confirm('স্লাইডার মুছতে চান?');
        if (!confirmed) return false;

        const { error } = await client
            .from('sliders')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showToast('✅ স্লাইডার মুছে দেওয়া হয়েছে', 'success');
        return true;
    } catch (err) {
        console.error('❌ deleteSliderById Error:', err);
        return false;
    }
}

// ==================== ভিজিটর কাউন্ট ====================

async function getVisitorCount() {
    const client = supabase || window.supabase || window._supabase;
    try {
        const { data, error } = await client
            .from('visitor_count')
            .select('count')
            .eq('id', 1)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data?.count || 0;
    } catch (err) {
        console.error('❌ getVisitorCount Error:', err);
        return 0;
    }
}

async function incrementVisitorCount() {
    const client = supabase || window.supabase || window._supabase;
    try {
        const currentCount = await getVisitorCount();
        const newCount = currentCount + 1;
        
        const { data, error } = await client
            .from('visitor_count')
            .update({ count: newCount, last_updated: new Date().toISOString() })
            .eq('id', 1)
            .select();
        
        if (error) throw error;
        console.log('✅ Visitor count incremented:', newCount);
        return newCount;
    } catch (err) {
        console.error('❌ incrementVisitorCount Error:', err);
        return 0;
    }
}

// ==================== টেস্ট ডাটা ফাংশন ====================

async function addTestMemberIfNotExists() {
    try {
        const existing = await getMemberByMobile('01734913809');
        if (existing) {
            console.log('✅ Test member already exists');
            return;
        }

        const testMember = {
            member_id: 'TUKN-TEST-0001',
            full_name: 'পরীক্ষা সদস্য',
            mobile: '01734913809',
            password: '1234',
            status: 'active',
            member_type: 'সাধারণ সদস্য',
            monthly_savings: 500
        };

        await addNewMember(testMember);
        console.log('✅ Test member created successfully');
    } catch (err) {
        console.error('❌ Test member creation error:', err);
    }
}

// ==================== ইউটিলিটি ফাংশন ====================

function showToast(message, type = 'info') {
    try {
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-600' : 
                       type === 'error' ? 'bg-red-600' : 'bg-blue-600';
        const icon = type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' : 'info-circle';
        
        toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 ${bgColor} animate-pulse`;
        toast.innerHTML = `<i class="fas fa-${icon} mr-2"></i>${message}`;
        
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    } catch (err) {
        console.log('[Toast]', message);
    }
}

// ==================== ইনিশিয়ালাইজেশন ====================

async function initSupabaseFunctions() {
    try {
        console.log('🚀 Initializing Supabase Functions...');
        
        const initialized = await initSupabaseClient();
        if (!initialized) {
            console.warn('⚠️ Supabase initialization failed');
            return;
        }
        
        const connected = await testSupabaseConnection();
        if (connected) {
            await addTestMemberIfNotExists();
            console.log('✅ Supabase Functions Ready!');
        }
    } catch (err) {
        console.error('❌ Initialization Error:', err);
    }
}

// ==================== সদস্য লগইন ফাংশন ====================

async function verifyMemberLogin(username, password) {
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!username || !password) {
            showToast('সদস্য আইডি/মোবাইল এবং পাসওয়ার্ড দিন', 'error');
            return null;
        }

        let query = client.from('members').select('*');
        
        // চেক করুন username মোবাইল নম্বর কিনা
        if(username.match(/^01[3-9]\d{8}$/)) {
            query = query.eq('mobile', username);
        } else {
            query = query.eq('member_id', username);
        }
        
        const { data, error } = await query;
        
        if (error && error.code !== 'PGRST116') throw error;
        
        const member = data?.[0];
        
        if (!member) {
            showToast('সদস্য আইডি/মোবাইল নম্বর সঠিক নয়!', 'error');
            return null;
        }
        
        if (member.password !== password) {
            showToast('পাসওয়ার্ড ভুল!', 'error');
            return null;
        }
        
        if (member.status !== 'active' && member.status !== 'approved') {
            showToast('আপনার একাউন্ট এখনও অনুমোদিত হয়নি।', 'warning');
            return null;
        }
        
        console.log('✅ Member Login Successful:', member.full_name);
        return member;
        
    } catch (err) {
        console.error('verifyMemberLogin Error:', err);
        showToast('লগইন করতে ব্যর্থ হয়েছে!', 'error');
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
            loggedIn: true,
            loginTime: new Date().toISOString()
        };
        
        // সব সময় sessionStorage এ রাখুন
        sessionStorage.setItem('tukn_logged_member', JSON.stringify(sessionData));
        
        // rememberMe চেক করা থাকলে localStorage এ রাখুন
        if (rememberMe) {
            localStorage.setItem('tukn_logged_member', JSON.stringify(sessionData));
        }
        
        console.log('✅ Member session saved');
        return true;
        
    } catch (err) {
        console.error('saveMemberSession Error:', err);
        return false;
    }
}

function getMemberSession() {
    try {
        // প্রথমে localStorage চেক করুন
        let sessionData = localStorage.getItem('tukn_logged_member');
        
        // না পেলে sessionStorage চেক করুন
        if (!sessionData) {
            sessionData = sessionStorage.getItem('tukn_logged_member');
        }
        
        if (!sessionData) {
            return null;
        }
        
        const member = JSON.parse(sessionData);
        
        // চেক করুন লগইন বৈধ কিনা
        if (!member.loggedIn) {
            return null;
        }
        
        // স্ট্যাটাস চেক
        if (member.status !== 'active' && member.status !== 'approved') {
            return null;
        }
        
        return member;
        
    } catch (err) {
        console.error('getMemberSession Error:', err);
        return null;
    }
}

function clearMemberSession() {
    localStorage.removeItem('tukn_logged_member');
    sessionStorage.removeItem('tukn_logged_member');
    console.log('✅ Member session cleared');
}

function isMemberLoggedIn() {
    return getMemberSession() !== null;
}

function memberLogout() {
    clearMemberSession();
    showToast('লগআউট সফল!', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
    return true;
}

// ==================== গ্লোবাল এক্সপোর্ট ====================

// লগইন ফাংশন এক্সপোর্ট
window.verifyMemberLogin = verifyMemberLogin;
window.saveMemberSession = saveMemberSession;
window.getMemberSession = getMemberSession;
window.clearMemberSession = clearMemberSession;
window.isMemberLoggedIn = isMemberLoggedIn;
window.memberLogout = memberLogout;

// কোর ফাংশন এক্সপোর্ট
window.getNextMemberSerial = getNextMemberSerial;
window.initSupabaseClient = initSupabaseClient;
window.testSupabaseConnection = testSupabaseConnection;
window.getAllMembers = getAllMembers;
window.getActiveMembers = getActiveMembers;
window.getPendingMembersList = getPendingMembersList;
window.getMemberByMobile = getMemberByMobile;
window.getMemberByMemberId = getMemberByMemberId;
window.addNewMember = addNewMember;
window.updateMemberStatus = updateMemberStatus;
window.deleteMemberById = deleteMemberById;
window.updateMemberInfo = updateMemberInfo;
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
window.getAllLoanApplications = getAllLoanApplications;
window.getLoanApplicationsByMemberId = getLoanApplicationsByMemberId;
window.addLoanApplication = addLoanApplication;
window.updateLoanApplicationStatus = updateLoanApplicationStatus;
window.deleteLoanApplicationById = deleteLoanApplicationById;
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
window.showToast = showToast;

// পেজ লোড হলে ইনিশিয়ালাইজ করুন
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupabaseFunctions);
} else {
    initSupabaseFunctions();
}

console.log('✅ supabase-functions.js loaded (final version)');
