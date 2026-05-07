// supabase-config.js

// Supabase কনফিগারেশন
const SUPABASE_URL = 'https://bffomfsffrtfgxyetzvm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_A0BluIVwJ4M3Zd3JWpBoPg_NJSRu81D';

// গ্লোবাল ক্লায়েন্ট তৈরি (supabase CDN থেকে আসা supabase অবজেক্ট ব্যবহার করে)
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

// ==================== প্রোফাইল ইমেজ ফাংশন (একবারই) ====================
async function uploadProfileImageToSupabase(file, memberId) {
    try {
        if (!file || !memberId) {
            console.error('File or MemberId missing');
            return null;
        }
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${memberId}_${Date.now()}.${fileExt}`;
        const filePath = `profile-images/${fileName}`;
        
        // স্টোরেজ বাকেট চেক করুন (প্রথমে বাকেট তৈরি করুন: member-profiles)
        const { data, error } = await window.supabaseClient.storage
            .from('member-profiles')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) throw error;
        
        // পাবলিক URL পাওয়া
        const { data: urlData } = window.supabaseClient.storage
            .from('member-profiles')
            .getPublicUrl(filePath);
        
        const imageUrl = urlData.publicUrl;
        
        // members টেবিলে profile_image আপডেট করুন
        const { error: updateError } = await window.supabaseClient
            .from(window.TABLES.MEMBERS)
            .update({ profile_image: imageUrl })
            .eq('member_id', memberId);
        
        if (updateError) throw updateError;
        
        console.log('✅ Profile image uploaded successfully');
        return imageUrl;
        
    } catch(error) {
        console.error('Upload error:', error);
        return null;
    }
}

// গ্লোবাল ফাংশন এক্সপোর্ট
window.uploadProfileImageToSupabase = uploadProfileImageToSupabase;

// কানেকশন টেস্ট ফাংশন (অপশনাল)
async function testSupabaseConnection() {
    try {
        const { data, error } = await window.supabaseClient
            .from(window.TABLES.MEMBERS)
            .select('count', { count: 'exact', head: true });
        
        if (error) throw error;
        console.log('✅ Supabase connection successful');
        return true;
    } catch(error) {
        console.error('❌ Supabase connection failed:', error);
        return false;
    }
}

window.testSupabaseConnection = testSupabaseConnection;
