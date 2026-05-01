// supabase-functions.js
// TUKNBD - All Database Functions

// ==================== Supabase কানেকশন টেস্ট ====================

async function testSupabaseConnection() {
    try {
        const { data, error } = await supabase
            .from('members')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            console.error('❌ Supabase connection error:', error.message);
            return false;
        }
        
        console.log('✅ Supabase connected successfully!');
        return true;
    } catch (err) {
        console.error('❌ Connection failed:', err);
        return false;
    }
}

// ==================== সদস্য (members) ফাংশন ====================

async function getAllMembers() {
    const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('id', { ascending: false });
    if (error) throw error;
    return data;
}

async function getActiveMembers() {
    const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('status', 'active')
        .order('id', { ascending: false });
    if (error) throw error;
    return data;
}

async function getPendingMembersList() {
    const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('status', 'pending')
        .order('id', { ascending: false });
    if (error) throw error;
    return data;
}

async function getMemberByMobile(mobile) {
    const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('mobile', mobile)
        .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

async function getMemberByMemberId(memberId) {
    const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('member_id', memberId)
        .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

async function addNewMember(memberData) {
    const { data, error } = await supabase
        .from('members')
        .insert([memberData])
        .select();
    if (error) throw error;
    return data;
}

async function updateMemberStatus(memberId, status) {
    const { data, error } = await supabase
        .from('members')
        .update({ status: status })
        .eq('member_id', memberId)
        .select();
    if (error) throw error;
    return data;
}

async function deleteMemberById(memberId) {
    const { error } = await supabase
        .from('members')
        .delete()
        .eq('member_id', memberId);
    if (error) throw error;
    return true;
}

async function updateMemberInfo(memberId, updates) {
    const { data, error } = await supabase
        .from('members')
        .update(updates)
        .eq('member_id', memberId)
        .select();
    if (error) throw error;
    return data;
}

// ==================== অ্যাডমিন (admins) ফাংশন ====================

async function getAllAdmins() {
    const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('id', { ascending: false });
    if (error) throw error;
    return data;
}

async function verifyAdminLogin(username, password) {
    const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .maybeSingle();
    if (error) return null;
    return data;
}

async function addNewAdmin(adminData) {
    const { data, error } = await supabase
        .from('admins')
        .insert([adminData])
        .select();
    if (error) throw error;
    return data;
}

async function deleteAdminById(adminId) {
    const { error } = await supabase
        .from('admins')
        .delete()
        .eq('id', adminId);
    if (error) throw error;
    return true;
}

async function updateAdminLastLogin(id) {
    const { error } = await supabase
        .from('admins')
        .update({ last_login: new Date() })
        .eq('id', id);
    if (error) throw error;
    return true;
}

// ==================== জেলা প্রতিনিধি (representatives) ফাংশন ====================

async function getAllRepresentatives() {
    const { data, error } = await supabase
        .from('representatives')
        .select('*')
        .order('id', { ascending: false });
    if (error) throw error;
    return data;
}

async function addNewRepresentative(repData) {
    const { data, error } = await supabase
        .from('representatives')
        .insert([repData])
        .select();
    if (error) throw error;
    return data;
}

async function deleteRepresentativeById(id) {
    const { error } = await supabase
        .from('representatives')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// ==================== প্রতিনিধি আবেদন (rep_applications) ফাংশন ====================

async function getAllRepApplications() {
    const { data, error } = await supabase
        .from('rep_applications')
        .select('*')
        .order('id', { ascending: false });
    if (error) throw error;
    return data;
}

async function addRepApplication(appData) {
    const { data, error } = await supabase
        .from('rep_applications')
        .insert([appData])
        .select();
    if (error) throw error;
    return data;
}

async function approveRepApplicationById(id, approvedBy) {
    const { data, error } = await supabase
        .from('rep_applications')
        .update({ status: 'approved' })
        .eq('id', id)
        .select();
    if (error) throw error;
    
    if (data && data[0]) {
        const app = data[0];
        await addNewRepresentative({
            name: app.name,
            district: app.district,
            mobile: app.mobile,
            madrasa: app.madrasa,
            experience: app.experience,
            join_date: new Date(),
            approved_by: approvedBy,
            approved_at: new Date()
        });
    }
    return data;
}

async function rejectRepApplicationById(id) {
    const { data, error } = await supabase
        .from('rep_applications')
        .update({ status: 'rejected' })
        .eq('id', id)
        .select();
    if (error) throw error;
    return data;
}

// ==================== লোন আবেদন (loan_applications) ফাংশন ====================

async function getAllLoanApplications() {
    const { data, error } = await supabase
        .from('loan_applications')
        .select('*')
        .order('id', { ascending: false });
    if (error) throw error;
    return data;
}

async function getLoanApplicationsByMemberId(memberId) {
    const { data, error } = await supabase
        .from('loan_applications')
        .select('*')
        .eq('member_id', memberId)
        .order('id', { ascending: false });
    if (error) throw error;
    return data;
}

async function addLoanApplication(loanData) {
    const { data, error } = await supabase
        .from('loan_applications')
        .insert([loanData])
        .select();
    if (error) throw error;
    return data;
}

async function updateLoanApplicationStatus(id, status) {
    const { data, error } = await supabase
        .from('loan_applications')
        .update({ status: status })
        .eq('id', id)
        .select();
    if (error) throw error;
    return data;
}

async function deleteLoanApplicationById(id) {
    const { error } = await supabase
        .from('loan_applications')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// ==================== লেনদেন (transactions) ফাংশন ====================

async function getAllTransactions() {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
    if (error) throw error;
    return data;
}

async function addTransaction(transactionData) {
    const { data, error } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select();
    if (error) throw error;
    return data;
}

async function deleteTransactionById(id) {
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// ==================== নোটিশ (notices) ফাংশন ====================

async function getAllNotices() {
    const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('id', { ascending: false });
    if (error) throw error;
    return data;
}

async function addNewNotice(noticeData) {
    const { data, error } = await supabase
        .from('notices')
        .insert([noticeData])
        .select();
    if (error) throw error;
    return data;
}

async function deleteNoticeById(id) {
    const { error } = await supabase
        .from('notices')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// ==================== অভিযোগ (complaints) ফাংশন ====================

async function getAllComplaints() {
    const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('id', { ascending: false });
    if (error) throw error;
    return data;
}

async function getUnreadComplaints() {
    const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('read', false)
        .order('id', { ascending: false });
    if (error) throw error;
    return data;
}

async function addNewComplaint(complaintData) {
    const { data, error } = await supabase
        .from('complaints')
        .insert([complaintData])
        .select();
    if (error) throw error;
    return data;
}

async function markComplaintAsReadById(id) {
    const { data, error } = await supabase
        .from('complaints')
        .update({ read: true })
        .eq('id', id)
        .select();
    if (error) throw error;
    return data;
}

async function updateComplaintStatusById(id, status) {
    const { data, error } = await supabase
        .from('complaints')
        .update({ 
            status: status,
            resolved_at: status === 'resolved' ? new Date() : null
        })
        .eq('id', id)
        .select();
    if (error) throw error;
    return data;
}

// ==================== অভিযোগের রিপ্লাই (complaint_replies) ফাংশন ====================

async function getComplaintRepliesById(complaintId) {
    const { data, error } = await supabase
        .from('complaint_replies')
        .select('*')
        .eq('complaint_id', complaintId)
        .order('id', { ascending: true });
    if (error) throw error;
    return data;
}

async function addComplaintReply(replyData) {
    const { data, error } = await supabase
        .from('complaint_replies')
        .insert([replyData])
        .select();
    if (error) throw error;
    
    await supabase
        .from('complaints')
        .update({ has_new_reply: true })
        .eq('id', replyData.complaint_id);
    
    return data;
}

// ==================== ব্রাঞ্চ (branches) ফাংশন ====================

async function getAllBranches() {
    const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('id', { ascending: false });
    if (error) throw error;
    return data;
}

async function addNewBranch(branchData) {
    const { data, error } = await supabase
        .from('branches')
        .insert([branchData])
        .select();
    if (error) throw error;
    return data;
}

async function updateBranchStatusById(id, status) {
    const { data, error } = await supabase
        .from('branches')
        .update({ status: status })
        .eq('id', id)
        .select();
    if (error) throw error;
    return data;
}

async function deleteBranchById(id) {
    const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// ==================== স্লাইডার (sliders) ফাংশন ====================

async function getAllSliders() {
    const { data, error } = await supabase
        .from('sliders')
        .select('*')
        .order('display_order', { ascending: true });
    if (error) throw error;
    return data;
}

async function getActiveSliders() {
    const { data, error } = await supabase
        .from('sliders')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true });
    if (error) throw error;
    return data;
}

async function addNewSlider(sliderData) {
    const { data, error } = await supabase
        .from('sliders')
        .insert([sliderData])
        .select();
    if (error) throw error;
    return data;
}

async function updateSliderOrder(updates) {
    for (const update of updates) {
        const { error } = await supabase
            .from('sliders')
            .update({ display_order: update.order })
            .eq('id', update.id);
        if (error) throw error;
    }
    return true;
}

async function toggleSliderActiveStatus(id, active) {
    const { data, error } = await supabase
        .from('sliders')
        .update({ active: active })
        .eq('id', id)
        .select();
    if (error) throw error;
    return data;
}

async function deleteSliderById(id) {
    const { error } = await supabase
        .from('sliders')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// ==================== লভ্যাংশ বন্টন ইতিহাস (distribution_history) ফাংশন ====================

async function getAllDistributionHistory() {
    const { data, error } = await supabase
        .from('distribution_history')
        .select('*')
        .order('id', { ascending: false });
    if (error) throw error;
    return data;
}

async function addDistributionHistory(historyData) {
    const { data, error } = await supabase
        .from('distribution_history')
        .insert([historyData])
        .select();
    if (error) throw error;
    return data;
}

// ==================== পেন্ডিং সদস্য (pending_members) ফাংশন ====================

async function getAllPendingMembers() {
    const { data, error } = await supabase
        .from('pending_members')
        .select('*')
        .order('id', { ascending: false });
    if (error) throw error;
    return data;
}

async function addPendingMember(memberData) {
    const { data, error } = await supabase
        .from('pending_members')
        .insert([memberData])
        .select();
    if (error) throw error;
    return data;
}

async function deletePendingMemberById(id) {
    const { error } = await supabase
        .from('pending_members')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

// ==================== ক্যারিয়ার (career) ফাংশন ====================

async function getCareerInfo() {
    const { data, error } = await supabase
        .from('career')
        .select('*')
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return data;
}

async function updateCareerInfo(careerData) {
    const existing = await getCareerInfo();
    
    if (existing) {
        const { data, error } = await supabase
            .from('career')
            .update({
                description: careerData.description,
                pdf_url: careerData.pdf_url,
                pdf_name: careerData.pdf_name,
                contact: careerData.contact,
                updated_at: new Date()
            })
            .eq('id', existing.id)
            .select();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase
            .from('career')
            .insert([{
                description: careerData.description,
                pdf_url: careerData.pdf_url,
                pdf_name: careerData.pdf_name,
                contact: careerData.contact,
                updated_at: new Date()
            }])
            .select();
        if (error) throw error;
        return data;
    }
}

// ==================== আমাদের সম্পর্কে (about) ফাংশন ====================

async function getAboutInfo() {
    const { data, error } = await supabase
        .from('about')
        .select('*')
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return data;
}

async function updateAboutInfo(aboutData) {
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
                updated_at: new Date()
            })
            .eq('id', existing.id)
            .select();
        if (error) throw error;
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
                updated_at: new Date()
            }])
            .select();
        if (error) throw error;
        return data;
    }
}

// ==================== মাদরাসা (madrasas) ফাংশন ====================

async function getAllMadrasas() {
    const { data, error } = await supabase
        .from('madrasas')
        .select('*')
        .order('id', { ascending: false });
    if (error) throw error;
    return data;
}

async function getMadrasaByIlhak(ilhakNo) {
    const { data, error } = await supabase
        .from('madrasas')
        .select('*')
        .eq('ilhak_no', ilhakNo)
        .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

async function addMadrasa(madrasaData) {
    const { data, error } = await supabase
        .from('madrasas')
        .insert([madrasaData])
        .select();
    if (error) throw error;
    return data;
}

async function updateMadrasa(ilhakNo, madrasaData) {
    const { data, error } = await supabase
        .from('madrasas')
        .update(madrasaData)
        .eq('ilhak_no', ilhakNo)
        .select();
    if (error) throw error;
    return data;
}

async function generateMadrasaSerialNo() {
    const { data, error } = await supabase
        .from('madrasas')
        .select('serial_no', { count: 'exact' });
    if (error) throw error;
    const count = data?.length || 0;
    return `TUKNBD M-${String(count + 1).padStart(4, '0')}`;
}

// ==================== জেলা (districts) ফাংশন ====================

async function getAllDistricts() {
    const { data, error } = await supabase
        .from('districts')
        .select('*')
        .order('name', { ascending: true });
    if (error) throw error;
    return data;
}

async function getDistrictCount() {
    const { count, error } = await supabase
        .from('districts')
        .select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count || 64;
}

// ==================== প্রকল্প (projects) ফাংশন ====================

async function getAllProjects() {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('id', { ascending: false });
    if (error) throw error;
    return data;
}

async function getProjectCount() {
    const { count, error } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count || 250;
}

// ==================== ভিজিটর কাউন্ট (visitor_count) ফাংশন ====================

async function getVisitorCount() {
    const { data, error } = await supabase
        .from('visitor_count')
        .select('count')
        .eq('id', 1)
        .single();
    if (error) throw error;
    return data?.count || 0;
}

async function incrementVisitorCount() {
    const currentCount = await getVisitorCount();
    const newCount = currentCount + 1;
    
    const { data, error } = await supabase
        .from('visitor_count')
        .update({ count: newCount, last_updated: new Date() })
        .eq('id', 1)
        .select();
    if (error) throw error;
    return newCount;
}

// ==================== টেস্ট ফাংশন ====================

async function addTestMemberIfNotExists() {
    const existing = await getMemberByMobile('01734913809');
    if (!existing) {
        const testMember = {
            member_id: 'TUKN-260501-0001',
            full_name: 'পরীক্ষা সদস্য',
            mobile: '01734913809',
            password: '1234',
            status: 'active',
            member_type: 'সাধারণ সদস্য',
            monthly_savings: 500
        };
        await addNewMember(testMember);
        console.log('✅ টেস্ট সদস্য যোগ করা হয়েছে');
    } else {
        console.log('✅ টেস্ট সদস্য ইতিমধ্যে আছে');
    }
}

// ==================== ইউটিলিটি ফাংশন ====================

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 ${type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} mr-2"></i>${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ==================== ইনিশিয়ালাইজেশন ====================

async function initSupabaseFunctions() {
    const connected = await testSupabaseConnection();
    if (connected) {
        await addTestMemberIfNotExists();
    }
    console.log('🚀 Supabase Functions Ready!');
}

// পেজ লোড হলে ইনিশিয়ালাইজ
document.addEventListener('DOMContentLoaded', () => {
    initSupabaseFunctions();
});

console.log('✅ supabase-functions.js loaded successfully');