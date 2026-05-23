// supabase-functions.js
// TUKNBD - সম্পূর্ণ Supabase ডাটাবেস ফাংশন (ফিক্সড ভার্সন)

// ==================== ডুপ্লিকেট প্রটেকশন ====================
if (typeof window._supabase_functions_loaded === 'undefined') {
    window._supabase_functions_loaded = true;

// ==================== ভেরিয়েবল চেক ====================
if (typeof window._supabase === 'undefined') {
    window._supabase = null;
}
if (typeof window._supabaseClient === 'undefined') {
    window._supabaseClient = null;
}

// কম্প্যাটিবিলিটি ভেরিয়েবল
if (typeof supabase === 'undefined') {
    var supabase = null;
}
if (typeof supabaseClient === 'undefined') {
    var supabaseClient = null;
}

// ==================== শো টোস্ট ফাংশন (HTML এর সাথে কনফ্লিক্ট এড়াতে) ====================
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

// ==================== সিরিয়াল নম্বর জেনারেট করার ফাংশন (Supabase থেকে সর্বশেষ সিরিয়াল চেক করে) ====================

async function getNextMemberSerial() {
    const client = supabase || window.supabase || window._supabase;
    
    // ক্লায়েন্ট রেডি না হলে অপেক্ষা করুন
    if (!client || typeof client.from !== 'function') {
        console.log('⏳ Waiting for Supabase client...');
        let attempts = 0;
        let retryClient = client;
        while ((!retryClient || typeof retryClient.from !== 'function') && attempts < 20) {
            await new Promise(r => setTimeout(r, 300));
            retryClient = supabase || window.supabase || window._supabase;
            attempts++;
        }
        if (!retryClient || typeof retryClient.from !== 'function') {
            console.error('❌ Supabase client not ready after retries');
            // ব্যাকআপ: ডিফল্ট সিরিয়াল, কিন্তু এটি যেন 1 থেকে শুরু হয়
            return 1;
        }
    }
    
    const finalClient = supabase || window.supabase || window._supabase;
    
    try {
        // সব সদস্যের member_id নিয়ে আসুন
        const { data, error } = await finalClient
            .from('members')
            .select('member_id');
        
        if (error) throw error;
        
        let maxSerial = 0;
        
        // সব member_id থেকে সর্বশেষ সিরিয়াল বের করুন
        if (data && data.length > 0) {
            for (const member of data) {
                if (member.member_id) {
                    // প্যাটার্ন: TUKN T3 260519-0018 অথবা TUKN G 260519-0018
                    const match = member.member_id.match(/-(\d{4})$/);
                    if (match && match[1]) {
                        const serial = parseInt(match[1]);
                        if (serial > maxSerial) {
                            maxSerial = serial;
                        }
                    }
                }
            }
        }
        
        // যদি কোনো সিরিয়াল না পাওয়া যায় (টেবিল খালি), তাহলে 0 থেকে শুরু
        // যদি maxSerial 0 হয়, তাহলে 1 হবে পরবর্তী সিরিয়াল
        const nextSerial = maxSerial + 1;
        
        console.log(`📊 সর্বশেষ সিরিয়াল: ${String(maxSerial).padStart(4, '0')} → পরবর্তী সিরিয়াল: ${String(nextSerial).padStart(4, '0')}`);
        return nextSerial;
        
    } catch (err) {
        console.error('❌ getNextMemberSerial Error:', err);
        // এরর হলে 1 রিটার্ন করুন, যাতে 0018 ফিক্স না থাকে
        return 1;
    }
}

// ==================== মেম্বার আইডি জেনারেট (আপডেটেড) ====================

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
        
        // Supabase থেকে সর্বশেষ সিরিয়াল নিন
        const nextSerial = await getNextMemberSerial();
        const serial = String(nextSerial).padStart(4, '0');
        
        const memberId = `TUKN ${typeCode} ${datePart}-${serial}`;
        console.log(`✅ Generated Member ID: ${memberId}`);
        return memberId;
        
    } catch (err) {
        console.error('❌ generateMemberId Error:', err);
        // ব্যাকআপ: ডাটাবেস চেক না করে লোকালি জেনারেট
        const today = new Date();
        const yy = String(today.getFullYear()).slice(-2);
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        // র্যান্ডম সিরিয়াল তৈরি করুন (ব্যাকআপ হিসেবে)
        const randomSerial = String(Math.floor(Math.random() * 1000) + 1).padStart(4, '0');
        return `TUKN G ${yy}${mm}${dd}-${randomSerial}`;
    }
}

// ==================== গ্লোবালি এক্সপোর্ট করুন ====================
window.getNextMemberSerial = getNextMemberSerial;
window.generateMemberId = generateMemberId;

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
        window.showToast('সদস্য তালিকা লোড করতে ত্রুটি', 'error');
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

async function addNewMember(memberData) {
    const client = supabase || window.supabase || window._supabase;
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

        const { data, error } = await client
            .from('members')
            .insert([memberData])
            .select();
        
        if (error) throw error;
        
        window.showToast(`✅ ${memberData.full_name} সফলভাবে নিবন্ধিত হয়েছেন!`, 'success');
        console.log('✅ New Member ID:', memberData.member_id);
        return data;
        
    } catch (err) {
        console.error('❌ addNewMember Error:', err);
        window.showToast('❌ সদস্য যোগ করতে ত্রুটি', 'error');
        return null;
    }
}

async function updateMemberStatus(memberId, status) {
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!memberId || !status) {
            window.showToast('❌ সদস্য ID এবং স্ট্যাটাস বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await client
            .from('members')
            .update({ status: status })
            .eq('member_id', memberId)
            .select();
        
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
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!memberId) {
            window.showToast('❌ সদস্য ID প্রয়োজন', 'error');
            return false;
        }

        const confirmed = confirm('সদস্য মুছতে চান? এটি পরিবর্তনযোগ্য নয়।');
        if (!confirmed) return false;

        const { error } = await client
            .from('members')
            .delete()
            .eq('member_id', memberId);
        
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
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!memberId || !updates) {
            window.showToast('❌ ডাটা অপূর্ণ', 'error');
            return null;
        }

        const { data, error } = await client
            .from('members')
            .update(updates)
            .eq('member_id', memberId)
            .select();
        
        if (error) throw error;
        
        window.showToast('✅ তথ্য আপডেট হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ updateMemberInfo Error:', err);
        window.showToast('❌ তথ্য আপডেট ব্যর্থ', 'error');
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
            window.showToast('❌ ইউজারনেম এবং পাসওয়ার্ড দিন', 'error');
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
            window.showToast('❌ ভুল ক্রেডেনশিয়াল', 'error');
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
            window.showToast('❌ ইউজারনেম, পাসওয়ার্ড এবং নাম বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await client
            .from('admins')
            .insert([adminData])
            .select();
        
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
    const client = supabase || window.supabase || window._supabase;
    try {
        const confirmed = confirm('অ্যাডমিন মুছতে চান?');
        if (!confirmed) return false;

        const { error } = await client
            .from('admins')
            .delete()
            .eq('id', adminId);
        
        if (error) throw error;
        
        window.showToast('✅ অ্যাডমিন মুছে দেওয়া হয়েছে', 'success');
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
            window.showToast('❌ নাম এবং জেলা বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await client
            .from('representatives')
            .insert([repData])
            .select();
        
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
    const client = supabase || window.supabase || window._supabase;
    try {
        const confirmed = confirm('প্রতিনিধি মুছতে চান?');
        if (!confirmed) return false;

        const { error } = await client
            .from('representatives')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        window.showToast('✅ প্রতিনিধি মুছে দেওয়া হয়েছে', 'success');
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
            window.showToast('❌ সদস্য এবং জেলা বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await client
            .from('rep_applications')
            .insert([appData])
            .select();
        
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
        
        window.showToast('✅ আবেদন অনুমোদন হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ approveRepApplicationById Error:', err);
        window.showToast('❌ অনুমোদন ব্যর্থ', 'error');
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
        
        window.showToast('✅ আবেদন বাতিল হয়েছে', 'success');
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
            window.showToast('❌ সদস্য ID প্রয়োজন', 'error');
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
            window.showToast('❌ সদস্য এবং লোন পরিমাণ বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await client
            .from('loan_applications')
            .insert([loanData])
            .select();
        
        if (error) throw error;
        
        window.showToast('✅ লোন আবেদন জমা হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ addLoanApplication Error:', err);
        window.showToast('❌ লোন আবেদন জমা ব্যর্থ', 'error');
        return null;
    }
}

async function updateLoanApplicationStatus(id, status) {
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!id || !status) {
            window.showToast('❌ ID এবং স্ট্যাটাস প্রয়োজন', 'error');
            return null;
        }

        const { data, error } = await client
            .from('loan_applications')
            .update({ status: status })
            .eq('id', id)
            .select();
        
        if (error) throw error;
        
        window.showToast(`✅ লোন স্ট্যাটাস ${status} হয়েছে`, 'success');
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
        
        window.showToast('✅ লোন আবেদন মুছে দেওয়া হয়েছে', 'success');
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
            window.showToast('❌ সদস্য এবং পরিমাণ বাধ্যতামূলক', 'error');
            return null;
        }

        transactionData.date = transactionData.date || new Date().toISOString();

        const { data, error } = await client
            .from('transactions')
            .insert([transactionData])
            .select();
        
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
    const client = supabase || window.supabase || window._supabase;
    try {
        const confirmed = confirm('লেনদেন মুছতে চান?');
        if (!confirmed) return false;

        const { error } = await client
            .from('transactions')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        window.showToast('✅ লেনদেন মুছে দেওয়া হয়েছে', 'success');
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
            window.showToast('❌ শিরোনাম এবং বিষয়বস্তু বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await client
            .from('notices')
            .insert([noticeData])
            .select();
        
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
    const client = supabase || window.supabase || window._supabase;
    try {
        const confirmed = confirm('নোটিশ মুছতে চান?');
        if (!confirmed) return false;

        const { error } = await client
            .from('notices')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        window.showToast('✅ নোটিশ মুছে দেওয়া হয়েছে', 'success');
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
            window.showToast('❌ শিরোনাম এবং বর্ণনা বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await client
            .from('complaints')
            .insert([complaintData])
            .select();
        
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
        
        window.showToast(`✅ অভিযোগ স্ট্যাটাস ${status} হয়েছে`, 'success');
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
            window.showToast('❌ শিরোনাম এবং ছবি বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await client
            .from('sliders')
            .insert([sliderData])
            .select();
        
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
    const client = supabase || window.supabase || window._supabase;
    try {
        const confirmed = confirm('স্লাইডার মুছতে চান?');
        if (!confirmed) return false;

        const { error } = await client
            .from('sliders')
            .delete()
            .eq('id', id);
        
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

// ==================== পেমেন্ট অনুমোদন ফাংশন ====================

async function approvePayment(paymentId, adminId, adminName, adminRole) {
    const client = supabase || window.supabase || window._supabase;
    try {
        const { data, error } = await client
            .from('payments')
            .update({ 
                status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by_id: adminId,
                approved_by_name: adminName,
                approved_by_role: adminRole || 'Admin'
            })
            .eq('id', paymentId)
            .select();
        
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
    const client = supabase || window.supabase || window._supabase;
    try {
        const { data, error } = await client
            .from('payments')
            .update({ 
                status: 'rejected',
                rejected_at: new Date().toISOString(),
                rejected_by_id: adminId,
                rejected_by_name: adminName,
                rejection_reason: reason || 'নির্দিষ্ট কারণ উল্লেখ নেই'
            })
            .eq('id', paymentId)
            .select();
        
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
    const client = supabase || window.supabase || window._supabase;
    try {
        const { data, error } = await client
            .from('payments')
            .select('*')
            .eq('status', 'pending')
            .order('submitted_at', { ascending: true });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllPendingPayments Error:', err);
        return [];
    }
}

async function getAllApprovedPayments() {
    const client = supabase || window.supabase || window._supabase;
    try {
        const { data, error } = await client
            .from('payments')
            .select('*')
            .eq('status', 'approved')
            .order('approved_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllApprovedPayments Error:', err);
        return [];
    }
}

async function getPaymentById(paymentId) {
    const client = supabase || window.supabase || window._supabase;
    try {
        const { data, error } = await client
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('❌ getPaymentById Error:', err);
        return null;
    }
}

// ==================== সদস্য লগইন ফাংশন ====================

async function verifyMemberLogin(username, password) {
    const client = supabase || window.supabase || window._supabase;
    try {
        if (!username || !password) {
            window.showToast('সদস্য আইডি/মোবাইল এবং পাসওয়ার্ড দিন', 'error');
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
            window.showToast('সদস্য আইডি/মোবাইল নম্বর সঠিক নয়!', 'error');
            return null;
        }
        
        if (member.password !== password) {
            window.showToast('পাসওয়ার্ড ভুল!', 'error');
            return null;
        }
        
        if (member.status !== 'active' && member.status !== 'approved') {
            window.showToast('আপনার একাউন্ট এখনও অনুমোদিত হয়নি।', 'warning');
            return null;
        }
        
        console.log('✅ Member Login Successful:', member.full_name);
        return member;
        
    } catch (err) {
        console.error('verifyMemberLogin Error:', err);
        window.showToast('লগইন করতে ব্যর্থ হয়েছে!', 'error');
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
        
        sessionStorage.setItem('tukn_logged_member', JSON.stringify(sessionData));
        
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
        let sessionData = localStorage.getItem('tukn_logged_member');
        
        if (!sessionData) {
            sessionData = sessionStorage.getItem('tukn_logged_member');
        }
        
        if (!sessionData) {
            return null;
        }
        
        const member = JSON.parse(sessionData);
        
        if (!member.loggedIn) {
            return null;
        }
        
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
    window.showToast('লগআউট সফল!', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
    return true;
}

// ==================== অ্যাডমিন পারমিশন ম্যানেজমেন্ট ====================

const DEFAULT_PERMISSIONS = {
    'super_admin': {
        can_approve_members: true,
        can_approve_payments: true,
        can_manage_admins: true,
        can_view_all_reports: true,
        can_delete_members: true,
        can_edit_settings: true,
        can_manage_representatives: true
    },
    'admin': {
        can_approve_members: false,
        can_approve_payments: true,
        can_manage_admins: false,
        can_view_all_reports: true,
        can_delete_members: false,
        can_edit_settings: false,
        can_manage_representatives: true
    }
};

async function getAdminPermissions(adminId) {
    const client = supabase || window.supabase || window._supabase;
    try {
        const { data, error } = await client
            .from('admins')
            .select('role, permissions, custom_permissions')
            .eq('id', adminId)
            .single();
        
        if (error) throw error;
        
        if (data.custom_permissions) {
            return data.custom_permissions;
        }
        
        return DEFAULT_PERMISSIONS[data.role] || DEFAULT_PERMISSIONS.admin;
        
    } catch (err) {
        console.error('❌ getAdminPermissions Error:', err);
        return DEFAULT_PERMISSIONS.admin;
    }
}

async function updateAdminPermissions(adminId, permissions) {
    const client = supabase || window.supabase || window._supabase;
    try {
        const { data, error } = await client
            .from('admins')
            .update({ custom_permissions: permissions })
            .eq('id', adminId)
            .select();
        
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

// পেমেন্ট ফাংশন এক্সপোর্ট
window.approvePayment = approvePayment;
window.rejectPayment = rejectPayment;
window.getAllPendingPayments = getAllPendingPayments;
window.getAllApprovedPayments = getAllApprovedPayments;
window.getPaymentById = getPaymentById;

// অ্যাডমিন পারমিশন ফাংশন এক্সপোর্ট
window.getAdminPermissions = getAdminPermissions;
window.updateAdminPermissions = updateAdminPermissions;
window.checkAdminPermission = checkAdminPermission;

// initSupabaseFunctions কে window তেও রাখুন
window.initSupabaseFunctions = initSupabaseFunctions;

console.log('✅ supabase-functions.js loaded (fixed version)');

} // ডুপ্লিকেট প্রটেকশন শেষ
// ========================================
// MEMBER SIGNUP ফাংশন (supabase-functions.js-এ যোগ করুন)
// ========================================

// District Data
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

// Update Districts
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

// Toggle Dynamic Fields
window.toggleDynamicFields = function() {
  const position = document.getElementById("memberPosition")?.value;
  
  document.querySelectorAll(".dynamic-field").forEach(el => {
    el.classList.add("hidden");
  });
  
  if (position === "ছাত্র") {
    document.getElementById("studentFields")?.classList.remove("hidden");
  } else if (position === "ওস্তাদ") {
    document.getElementById("teacherFields")?.classList.remove("hidden");
  } else if (position === "খাদেম") {
    document.getElementById("khadimFields")?.classList.remove("hidden");
  } else if (position === "অন্যান্য") {
    document.getElementById("otherFields")?.classList.remove("hidden");
  }
};

// Generate Referral Code
window.generateReferralCode = function(mobile) {
  const lastSix = mobile.slice(-6);
  const randomTwo = Math.floor(10 + Math.random() * 90);
  return lastSix + randomTwo;
};

// Generate Password
window.generatePassword = function() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const numbers = "0123456789";
  const upperChar = upper[Math.floor(Math.random() * upper.length)];
  let numPart = "";
  for (let i = 0; i < 6; i++) {
    numPart += numbers[Math.floor(Math.random() * numbers.length)];
  }
  return upperChar + numPart + "p";
};

// Register Member Form Handler
window.registerMember = async function(e) {
  e.preventDefault();
  
  const client = supabase || window.supabase || window._supabase;
  
  try {
    // Check Agreement
    const agreement = document.getElementById("agreementCheck");
    if (!agreement?.checked) {
      alert("অনুগ্রহ করে অঙ্গীকারে টিক দিন");
      return;
    }
    
    // Get Values
    const getValue = (id) => document.getElementById(id)?.value.trim() || null;
    
    const full_name = getValue("fullName");
    const father_name = getValue("fatherName");
    const mother_name = getValue("motherName");
    const mobile = getValue("mobile");
    const telegram = getValue("telegram");
    const email = getValue("email");
    const id_number = getValue("idNumber");
    const id_type = document.querySelector('input[name="idType"]:checked')?.value || "জন্মনিবন্ধন";
    
    // Validation
    if (!full_name) { alert("পূর্ণ নাম দিন"); return; }
    if (!mobile) { alert("মোবাইল দিন"); return; }
    if (!/^01[3-9]\d{8}$/.test(mobile)) { alert("সঠিক মোবাইল নাম্বার দিন"); return; }
    
    // Duplicate Check
    const { data: existingMember } = await client.from("members").select("id").eq("mobile", mobile).maybeSingle();
    if (existingMember) { alert("এই মোবাইল নাম্বার ইতোমধ্যে নিবন্ধিত"); return; }
    
    // Member Info
    const memberTerm = parseInt(document.getElementById("memberTerm")?.value) || 0;
    let memberType = "সাধারণ সদস্য";
    if (memberTerm === 3) memberType = "৩ বছর মেয়াদী";
    else if (memberTerm === 5) memberType = "৫ বছর মেয়াদী";
    else if (memberTerm === 7) memberType = "৭ বছর মেয়াদী";
    else if (memberTerm === 10) memberType = "১০ বছর মেয়াদী";
    else if (memberTerm === 12) memberType = "১২ বছর মেয়াদী";
    else if (memberTerm === 15) memberType = "১৫ বছর মেয়াদী";
    
    // Generate IDs
    const member_id = await window.generateMemberId(memberTerm);
    const password = window.generatePassword();
    let referral_code = window.generateReferralCode(mobile);
    
    // Unique Referral Code
    let unique = false;
    while (!unique) {
      const { data } = await client.from("members").select("id").eq("referral_code", referral_code).maybeSingle();
      if (!data) unique = true;
      else referral_code = window.generateReferralCode(mobile);
    }
    
    // Position Details
    const position = getValue("memberPosition");
    const student_class = getValue("studentClass");
    const student_madrasa = getValue("studentMadrasa");
    const student_address = getValue("studentAddress");
    const teacher_madrasa = getValue("teacherMadrasa");
    const khadim_mosque = getValue("khadimMosque");
    const other_description = getValue("otherDescription");
    
    // Address
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
    
    // Nominee
    const nominee_name = getValue("nomineeName");
    const nominee_relation = getValue("nomineeRelation");
    const nominee_nid = getValue("nomineeNid");
    
    // Other Info
    const monthly_savings = parseInt(getValue("monthlySavings")) || 0;
    const profession = getValue("profession");
    const education = getValue("education");
    const referred_by = getValue("referCode");
    
    // Member Data
    const memberData = {
      member_id, full_name, father_name, mother_name, mobile, telegram, email,
      id_type, id_number, password, member_type: memberType, member_term: memberTerm,
      monthly_savings, profession, education, present_village, present_post_office,
      present_thana, present_division, present_district, present_details,
      permanent_village, permanent_post_office, permanent_thana, permanent_division,
      permanent_district, permanent_details, nominee_name, nominee_relation, nominee_nid,
      referral_code, status: "pending", join_date: new Date().toISOString(),
      approved_at: null, approved_by: null, position, student_class, student_madrasa,
      student_address, teacher_madrasa, khadim_mosque, other_description,
      profile_image: null, total_savings: 0, total_commission: 0, withdrawal_balance: 0,
      referred_by, referral_bonus: 0, referral_level: 0, referral_count: 0,
      per_referral_bonus: 0, profit_bonus: 0, capital_balance: monthly_savings
    };
    
    // Insert Member
    const { error } = await client.from("members").insert([memberData]);
    if (error) throw error;
    
    // Referral Bonus
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
    
    // Success Message
    alert(`নিবন্ধন সফল হয়েছে\n\nআইডি: ${member_id}\nপাসওয়ার্ড: ${password}\nরেফারেল কোড: ${referral_code}`);
    
    document.getElementById("signupForm")?.reset();
    location.reload();
    
  } catch (err) {
    console.error(err);
    alert("সার্ভার সমস্যা হয়েছে: " + err.message);
  }
};

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    // Setup event listeners
    const presentDivision = document.getElementById("presentDivision");
    if (presentDivision) {
      presentDivision.addEventListener("change", () => window.updateDistricts("presentDivision", "presentDistrict"));
    }
    
    const permanentDivision = document.getElementById("permanentDivision");
    if (permanentDivision) {
      permanentDivision.addEventListener("change", () => window.updateDistricts("permanentDivision", "permanentDistrict"));
    }
    
    const memberPosition = document.getElementById("memberPosition");
    if (memberPosition) {
      memberPosition.addEventListener("change", window.toggleDynamicFields);
    }
    
    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
      signupForm.addEventListener("submit", window.registerMember);
    }
    
    console.log("✅ Member signup functions initialized");
  });
}
