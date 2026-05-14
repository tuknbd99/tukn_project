// supabase-functions.js
// TUKNBD - সম্পূর্ণ Supabase ডাটাবেস ফাংশন (সব ফিচার সহ)

// ==================== Supabase ক্লায়েন্ট ইনিশিয়ালাইজেশন ====================

let supabase = null;

async function initSupabaseClient() {
    try {
        if (!window.supabase) {
            console.error('❌ Supabase library not loaded');
            return false;
        }
        
        const SUPABASE_URL = 'https://bffomfsffrtfgxyetzvm.supabase.co';
        const SUPABASE_ANON_KEY = 'sb_publishable_A0BluIVwJ4M3Zd3JWpBoPg_NJSRu81D';
        
        window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        supabase = window.supabase;
        
        console.log('✅ Supabase Client Initialized');
        return true;
    } catch (err) {
        console.error('❌ Supabase Init Error:', err);
        return false;
    }
}

// ==================== Supabase সংযোগ পরীক্ষা ====================

async function testSupabaseConnection() {
    if (!supabase) {
        const initialized = await initSupabaseClient();
        if (!initialized) return false;
    }
    
    try {
        const { data, error } = await supabase
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
    try {
        const { data, error } = await supabase
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
    try {
        const { data, error } = await supabase
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
    try {
        const { data, error } = await supabase
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
    try {
        if (!mobile || mobile.length < 10) {
            console.warn('⚠️ Invalid mobile number');
            return null;
        }

        const { data, error } = await supabase
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
    try {
        if (!memberId) {
            console.warn('⚠️ Invalid member ID');
            return null;
        }

        const { data, error } = await supabase
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
    try {
        // Validation
        if (!memberData.full_name || !memberData.mobile) {
            showToast('❌ নাম এবং মোবাইল বাধ্যতামূলক', 'error');
            return null;
        }

        // Duplicate Check
        const existing = await getMemberByMobile(memberData.mobile);
        if (existing) {
            showToast('❌ এই মোবাইলে ইতিমধ্যে সদস্য আছে', 'error');
            return null;
        }

        // Generate Member ID if not provided
        if (!memberData.member_id) {
            const today = new Date();
            const dateCode = 'TUKN-' +
                today.getFullYear().toString().slice(-2) +
                String(today.getMonth() + 1).padStart(2, '0') +
                String(today.getDate()).padStart(2, '0') + '-' +
                String(Math.floor(Math.random() * 9000) + 1000);
            memberData.member_id = dateCode;
        }

        const { data, error } = await supabase
            .from('members')
            .insert([memberData])
            .select();
        
        if (error) throw error;
        
        showToast(`✅ ${memberData.full_name} সফলভাবে নিবন্ধিত হয়েছেন!`, 'success');
        console.log('✅ New Member Added:', data);
        return data;
    } catch (err) {
        console.error('❌ addNewMember Error:', err);
        showToast('❌ সদস্য যোগ করতে ত্রুটি', 'error');
        return null;
    }
}

async function updateMemberStatus(memberId, status) {
    try {
        if (!memberId || !status) {
            showToast('❌ সদস্য ID এবং স্ট্যাটাস বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await supabase
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
    try {
        if (!memberId) {
            showToast('❌ সদস্য ID প্রয়োজন', 'error');
            return false;
        }

        const confirmed = confirm('সদস্য মুছতে চান? এটি পরিবর্তনযোগ্য নয়।');
        if (!confirmed) return false;

        const { error } = await supabase
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
    try {
        if (!memberId || !updates) {
            showToast('❌ ডাটা অপূর্ণ', 'error');
            return null;
        }

        const { data, error } = await supabase
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
    try {
        const { data, error } = await supabase
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
    try {
        if (!username || !password) {
            showToast('❌ ইউজারনেম এবং পাসওয়ার্ড দিন', 'error');
            return null;
        }

        const { data, error } = await supabase
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
    try {
        if (!adminData.username || !adminData.password || !adminData.name) {
            showToast('❌ ইউজারনেম, পাসওয়ার্ড এবং নাম বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await supabase
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
    try {
        const confirmed = confirm('অ্যাডমিন মুছতে চান?');
        if (!confirmed) return false;

        const { error } = await supabase
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

async function updateAdminLastLogin(id) {
    try {
        const { error } = await supabase
            .from('admins')
            .update({ last_login: new Date().toISOString() })
            .eq('id', id);
        
        if (error) throw error;
        console.log('✅ Last login updated');
        return true;
    } catch (err) {
        console.error('❌ updateAdminLastLogin Error:', err);
        return false;
    }
}

// ==================== জেলা প্রতিনিধি (REPRESENTATIVES) ফাংশন ====================

async function getAllRepresentatives() {
    try {
        const { data, error } = await supabase
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
    try {
        if (!repData.name || !repData.district) {
            showToast('❌ নাম এবং জেলা বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await supabase
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
    try {
        const confirmed = confirm('প্রতিনিধি মুছতে চান?');
        if (!confirmed) return false;

        const { error } = await supabase
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
    try {
        const { data, error } = await supabase
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
    try {
        if (!appData.member_id || !appData.district) {
            showToast('❌ সদস্য এবং জেলা বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await supabase
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
    try {
        const { data, error } = await supabase
            .from('rep_applications')
            .update({ status: 'approved' })
            .eq('id', id)
            .select();
        
        if (error) throw error;
        
        // অনুমোদিত আবেদনকে প্রতিনিধি হিসেবে যোগ করুন
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
    try {
        const { data, error } = await supabase
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
    try {
        const { data, error } = await supabase
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
    try {
        if (!memberId) {
            showToast('❌ সদস্য ID প্রয়োজন', 'error');
            return [];
        }

        const { data, error } = await supabase
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
    try {
        if (!loanData.member_id || !loanData.loan_amount) {
            showToast('❌ সদস্য এবং লোন পরিমাণ বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await supabase
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
    try {
        if (!id || !status) {
            showToast('❌ ID এবং স্ট্যাটাস প্রয়োজন', 'error');
            return null;
        }

        const { data, error } = await supabase
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
    try {
        const confirmed = confirm('লোন আবেদন মুছতে চান?');
        if (!confirmed) return false;

        const { error } = await supabase
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
    try {
        const { data, error } = await supabase
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
    try {
        if (!transactionData.member_id || !transactionData.amount) {
            showToast('❌ সদস্য এবং পরিমাণ বাধ্যতামূলক', 'error');
            return null;
        }

        transactionData.date = transactionData.date || new Date().toISOString();

        const { data, error } = await supabase
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
    try {
        const confirmed = confirm('লেনদেন মুছতে চান?');
        if (!confirmed) return false;

        const { error } = await supabase
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
    try {
        const { data, error } = await supabase
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
    try {
        if (!noticeData.title || !noticeData.content) {
            showToast('❌ শিরোনাম এবং বিষয়বস্তু বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await supabase
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
    try {
        const confirmed = confirm('নোটিশ মুছতে চান?');
        if (!confirmed) return false;

        const { error } = await supabase
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
    try {
        const { data, error } = await supabase
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
    try {
        const { data, error } = await supabase
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
    try {
        if (!complaintData.title || !complaintData.description) {
            showToast('❌ শিরোনাম এবং বর্ণনা বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await supabase
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

async function markComplaintAsReadById(id) {
    try {
        const { data, error } = await supabase
            .from('complaints')
            .update({ read: true })
            .eq('id', id)
            .select();
        
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('❌ markComplaintAsReadById Error:', err);
        return null;
    }
}

async function updateComplaintStatusById(id, status) {
    try {
        const updateData = { 
            status: status,
            resolved_at: status === 'resolved' ? new Date().toISOString() : null
        };

        const { data, error } = await supabase
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

// ==================== অভিযোগ রিপ্লাই (COMPLAINT_REPLIES) ফাংশন ====================

async function getComplaintRepliesById(complaintId) {
    try {
        if (!complaintId) {
            console.warn('⚠️ Complaint ID required');
            return [];
        }

        const { data, error } = await supabase
            .from('complaint_replies')
            .select('*')
            .eq('complaint_id', complaintId)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getComplaintRepliesById Error:', err);
        return [];
    }
}

async function addComplaintReply(replyData) {
    try {
        if (!replyData.complaint_id || !replyData.reply_text) {
            showToast('❌ অভিযোগ এবং রিপ্লাই টেক্সট বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await supabase
            .from('complaint_replies')
            .insert([replyData])
            .select();
        
        if (error) throw error;

        // অভিযোগে নতুন রিপ্লাই চিহ্ন যোগ করুন
        await supabase
            .from('complaints')
            .update({ has_new_reply: true })
            .eq('id', replyData.complaint_id);
        
        showToast('✅ রিপ্লাই যোগ হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ addComplaintReply Error:', err);
        showToast('❌ রিপ্লাই যোগ ব্যর্থ', 'error');
        return null;
    }
}

// ==================== ব্রাঞ্চ (BRANCHES) ফাংশন ====================

async function getAllBranches() {
    try {
        const { data, error } = await supabase
            .from('branches')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllBranches Error:', err);
        return [];
    }
}

async function addNewBranch(branchData) {
    try {
        if (!branchData.name || !branchData.district) {
            showToast('❌ ব্রাঞ্চ নাম এবং জেলা বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await supabase
            .from('branches')
            .insert([branchData])
            .select();
        
        if (error) throw error;
        
        showToast('✅ ব্রাঞ্চ যোগ হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ addNewBranch Error:', err);
        showToast('❌ ব্রাঞ্চ যোগ ব্যর্থ', 'error');
        return null;
    }
}

async function updateBranchStatusById(id, status) {
    try {
        const { data, error } = await supabase
            .from('branches')
            .update({ status: status })
            .eq('id', id)
            .select();
        
        if (error) throw error;
        
        showToast(`✅ ব্রাঞ্চ স্ট্যাটাস ${status} হয়েছে`, 'success');
        return data;
    } catch (err) {
        console.error('❌ updateBranchStatusById Error:', err);
        return null;
    }
}

async function deleteBranchById(id) {
    try {
        const confirmed = confirm('ব্রাঞ্চ মুছতে চান?');
        if (!confirmed) return false;

        const { error } = await supabase
            .from('branches')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showToast('✅ ব্রাঞ্চ মুছে দেওয়া হয়েছে', 'success');
        return true;
    } catch (err) {
        console.error('❌ deleteBranchById Error:', err);
        return false;
    }
}

// ==================== স্লাইডার (SLIDERS) ফাংশন ====================

async function getAllSliders() {
    try {
        const { data, error } = await supabase
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

async function getActiveSliders() {
    try {
        const { data, error } = await supabase
            .from('sliders')
            .select('*')
            .eq('active', true)
            .order('display_order', { ascending: true });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getActiveSliders Error:', err);
        return [];
    }
}

async function addNewSlider(sliderData) {
    try {
        if (!sliderData.title || !sliderData.image_url) {
            showToast('❌ শিরোনাম এবং ছবি বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await supabase
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

async function updateSliderOrder(updates) {
    try {
        for (const update of updates) {
            const { error } = await supabase
                .from('sliders')
                .update({ display_order: update.order })
                .eq('id', update.id);
            
            if (error) throw error;
        }
        
        showToast('✅ ক্রম আপডেট হয়েছে', 'success');
        return true;
    } catch (err) {
        console.error('❌ updateSliderOrder Error:', err);
        return false;
    }
}

async function toggleSliderActiveStatus(id, active) {
    try {
        const { data, error } = await supabase
            .from('sliders')
            .update({ active: active })
            .eq('id', id)
            .select();
        
        if (error) throw error;
        
        showToast(`✅ স্লাইডার ${active ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`, 'success');
        return data;
    } catch (err) {
        console.error('❌ toggleSliderActiveStatus Error:', err);
        return null;
    }
}

async function deleteSliderById(id) {
    try {
        const confirmed = confirm('স্লাইডার মুছতে চান?');
        if (!confirmed) return false;

        const { error } = await supabase
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

// ==================== বিতরণ ইতিহাস (DISTRIBUTION_HISTORY) ফাংশন ====================

async function getAllDistributionHistory() {
    try {
        const { data, error } = await supabase
            .from('distribution_history')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllDistributionHistory Error:', err);
        return [];
    }
}

async function addDistributionHistory(historyData) {
    try {
        if (!historyData.month || !historyData.year) {
            showToast('❌ মাস এবং বছর বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await supabase
            .from('distribution_history')
            .insert([historyData])
            .select();
        
        if (error) throw error;
        
        showToast('✅ বিতরণ রেকর্ড যোগ হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ addDistributionHistory Error:', err);
        showToast('❌ বিতরণ যোগ ব্যর্থ', 'error');
        return null;
    }
}

// ==================== পেন্ডিং সদস্য (PENDING_MEMBERS) ফাংশন ====================

async function getAllPendingMembers() {
    try {
        const { data, error } = await supabase
            .from('pending_members')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllPendingMembers Error:', err);
        return [];
    }
}

async function addPendingMember(memberData) {
    try {
        if (!memberData.full_name || !memberData.mobile) {
            showToast('❌ নাম এবং মোবাইল বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await supabase
            .from('pending_members')
            .insert([memberData])
            .select();
        
        if (error) throw error;
        
        showToast('✅ পেন্ডিং সদস্য যোগ হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ addPendingMember Error:', err);
        showToast('❌ পেন্ডিং সদস্য যোগ ব্যর্থ', 'error');
        return null;
    }
}

async function deletePendingMemberById(id) {
    try {
        const confirmed = confirm('পেন্ডিং সদস্য মুছতে চান?');
        if (!confirmed) return false;

        const { error } = await supabase
            .from('pending_members')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showToast('✅ পেন্ডিং সদস্য মুছে দেওয়া হয়েছে', 'success');
        return true;
    } catch (err) {
        console.error('❌ deletePendingMemberById Error:', err);
        return false;
    }
}

// ==================== ক্যারিয়ার (CAREER) ফাংশন ====================

async function getCareerInfo() {
    try {
        const { data, error } = await supabase
            .from('career')
            .select('*')
            .limit(1)
            .maybeSingle();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    } catch (err) {
        console.error('❌ getCareerInfo Error:', err);
        return null;
    }
}

async function updateCareerInfo(careerData) {
    try {
        const existing = await getCareerInfo();
        
        if (existing) {
            const { data, error } = await supabase
                .from('career')
                .update({
                    description: careerData.description,
                    pdf_url: careerData.pdf_url,
                    pdf_name: careerData.pdf_name,
                    contact: careerData.contact,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select();
            
            if (error) throw error;
            showToast('✅ ক্যারিয়ার তথ্য আপডেট হয়েছে', 'success');
            return data;
        } else {
            const { data, error } = await supabase
                .from('career')
                .insert([{
                    description: careerData.description,
                    pdf_url: careerData.pdf_url,
                    pdf_name: careerData.pdf_name,
                    contact: careerData.contact,
                    updated_at: new Date().toISOString()
                }])
                .select();
            
            if (error) throw error;
            showToast('✅ ক্যারিয়ার তথ্য যোগ হয়েছে', 'success');
            return data;
        }
    } catch (err) {
        console.error('❌ updateCareerInfo Error:', err);
        showToast('❌ ক্যারিয়ার আপডেট ব্যর্থ', 'error');
        return null;
    }
}

// ==================== আমাদের সম্পর্কে (ABOUT) ফাংশন ====================

async function getAboutInfo() {
    try {
        const { data, error } = await supabase
            .from('about')
            .select('*')
            .limit(1)
            .maybeSingle();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    } catch (err) {
        console.error('❌ getAboutInfo Error:', err);
        return null;
    }
}

async function updateAboutInfo(aboutData) {
    try {
        const existing = await getAboutInfo();
        
        if (existing) {
            const { data, error } = await supabase
                .from('about')
                .update({
                    org_name: aboutData.org_name,
                    org_description: aboutData.org_description,
                    org_mission: aboutData.org_mission,
                    org_vision: aboutData.org_vision,
                    org_values: aboutData.org_values,
                    org_establish_date: aboutData.org_establish_date,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select();
            
            if (error) throw error;
            showToast('✅ আমাদের সম্পর্কে আপডেট হয়েছে', 'success');
            return data;
        } else {
            const { data, error } = await supabase
                .from('about')
                .insert([{
                    org_name: aboutData.org_name,
                    org_description: aboutData.org_description,
                    org_mission: aboutData.org_mission,
                    org_vision: aboutData.org_vision,
                    org_values: aboutData.org_values,
                    org_establish_date: aboutData.org_establish_date,
                    updated_at: new Date().toISOString()
                }])
                .select();
            
            if (error) throw error;
            showToast('✅ আমাদের সম্পর্কে যোগ হয়েছে', 'success');
            return data;
        }
    } catch (err) {
        console.error('❌ updateAboutInfo Error:', err);
        showToast('❌ আপডেট ব্যর্থ', 'error');
        return null;
    }
}

// ==================== মাদরাসা (MADRASAS) ফাংশন ====================

async function getAllMadrasas() {
    try {
        const { data, error } = await supabase
            .from('madrasas')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllMadrasas Error:', err);
        return [];
    }
}

async function getMadrasaByIlhak(ilhakNo) {
    try {
        if (!ilhakNo) {
            console.warn('⚠️ Ilhak number required');
            return null;
        }

        const { data, error } = await supabase
            .from('madrasas')
            .select('*')
            .eq('ilhak_no', ilhakNo)
            .maybeSingle();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    } catch (err) {
        console.error('❌ getMadrasaByIlhak Error:', err);
        return null;
    }
}

async function addMadrasa(madrasaData) {
    try {
        if (!madrasaData.name || !madrasaData.ilhak_no) {
            showToast('❌ মাদরাসা নাম এবং ইলহাক নম্বর বাধ্যতামূলক', 'error');
            return null;
        }

        const { data, error } = await supabase
            .from('madrasas')
            .insert([madrasaData])
            .select();
        
        if (error) throw error;
        
        showToast('✅ মাদরাসা যোগ হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ addMadrasa Error:', err);
        showToast('❌ মাদরাসা যোগ ব্যর্থ', 'error');
        return null;
    }
}

async function updateMadrasa(ilhakNo, madrasaData) {
    try {
        if (!ilhakNo) {
            showToast('❌ ইলহাক নম্বর প্রয়োজন', 'error');
            return null;
        }

        const { data, error } = await supabase
            .from('madrasas')
            .update(madrasaData)
            .eq('ilhak_no', ilhakNo)
            .select();
        
        if (error) throw error;
        
        showToast('✅ মাদরাসা আপডেট হয়েছে', 'success');
        return data;
    } catch (err) {
        console.error('❌ updateMadrasa Error:', err);
        showToast('❌ মাদরাসা আপডেট ব্যর্থ', 'error');
        return null;
    }
}

async function generateMadrasaSerialNo() {
    try {
        const { data, error } = await supabase
            .from('madrasas')
            .select('serial_no', { count: 'exact' });
        
        if (error) throw error;
        const count = data?.length || 0;
        return `TUKNBD M-${String(count + 1).padStart(4, '0')}`;
    } catch (err) {
        console.error('❌ generateMadrasaSerialNo Error:', err);
        return null;
    }
}

// ==================== জেলা (DISTRICTS) ফাংশন ====================

async function getAllDistricts() {
    try {
        const { data, error } = await supabase
            .from('districts')
            .select('*')
            .order('name', { ascending: true });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllDistricts Error:', err);
        return [];
    }
}

async function getDistrictCount() {
    try {
        const { count, error } = await supabase
            .from('districts')
            .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        return count || 64;
    } catch (err) {
        console.error('❌ getDistrictCount Error:', err);
        return 64;
    }
}

// ==================== প্রকল্প (PROJECTS) ফাংশন ====================

async function getAllProjects() {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('❌ getAllProjects Error:', err);
        return [];
    }
}

async function getProjectCount() {
    try {
        const { count, error } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        return count || 0;
    } catch (err) {
        console.error('❌ getProjectCount Error:', err);
        return 0;
    }
}

// ==================== ভিজিটর কাউন্ট (VISITOR_COUNT) ফাংশন ====================

async function getVisitorCount() {
    try {
        const { data, error } = await supabase
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
    try {
        const currentCount = await getVisitorCount();
        const newCount = currentCount + 1;
        
        const { data, error } = await supabase
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

// পেজ লোড হলে ইনিশিয়ালাইজ করুন
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupabaseFunctions);
} else {
    initSupabaseFunctions();
}

console.log('✅ supabase-functions.js loaded successfully');
