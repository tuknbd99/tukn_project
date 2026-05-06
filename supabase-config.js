// supabase-config.js
const SUPABASE_URL = 'https://bffomfsffrtfgxyetzvm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_A0BluIVwJ4M3Zd3JWpBoPg_NJSRu81D';

// গ্লোবাল ক্লায়েন্ট
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('✅ Supabase client initialized');

// টেবিলের নাম কনস্ট্যান্ট
window.TABLES = {
    MEMBERS: 'members',
    MADRASAS: 'madrasas',
    PAYMENTS: 'payments',
    COMPLAINTS: 'complaints',
    NOTICES: 'notices',
    VISITOR_STATS: 'visitor_stats',
    ADMINS: 'admins',
    REPS: 'reps',
    REP_APPLICATIONS: 'rep_applications',
    LOANS: 'loans',
    SLIDERS: 'sliders',
    CAREER: 'career',
    ABOUT: 'about'
};

// ==================== প্রোফাইল ইমেজ ফাংশন ====================
async function uploadProfileImageToSupabase(file, memberId) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${memberId}_${Date.now()}.${fileExt}`;
        const filePath = `profile-images/${fileName}`;
        
        const { data, error } = await supabaseClient.storage
            .from('member-profiles')
            .upload(filePath, file);
        
        if(error) throw error;
        
        const { data: urlData } = supabaseClient.storage
            .from('member-profiles')
            .getPublicUrl(filePath);
        
        const imageUrl = urlData.publicUrl;
        
        // members টেবিলে profile_image আপডেট করুন
        const { error: updateError } = await supabaseClient
            .from('members')
            .update({ profile_image: imageUrl })
            .eq('member_id', memberId);
        
        if(updateError) throw updateError;
        
        return imageUrl;
    } catch(error) {
        console.error('Upload error:', error);
        return null;
    }
}
// ==================== প্রোফাইল ইমেজ ফাংশন ====================
async function uploadProfileImageToSupabase(file, memberId) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${memberId}_${Date.now()}.${fileExt}`;
        const filePath = `profile-images/${fileName}`;
        
        const { data, error } = await supabaseClient.storage
            .from('member-profiles')
            .upload(filePath, file);
        
        if(error) throw error;
        
        const { data: urlData } = supabaseClient.storage
            .from('member-profiles')
            .getPublicUrl(filePath);
        
        const imageUrl = urlData.publicUrl;
        
        // members টেবিলে profile_image আপডেট করুন
        const { error: updateError } = await supabaseClient
            .from('members')
            .update({ profile_image: imageUrl })
            .eq('member_id', memberId);
        
        if(updateError) throw updateError;
        
        return imageUrl;
    } catch(error) {
        console.error('Upload error:', error);
        return null;
    }
}
