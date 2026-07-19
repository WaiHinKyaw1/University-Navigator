import pg from 'pg';
const { Client } = pg;
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set!');
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: connectionString.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : undefined,
});
await client.connect();
console.log('✅ Connected to database');

// ─── Helper ───────────────────────────────────────────────────────────────────
async function query(sql, params = []) {
  const res = await client.query(sql, params);
  return res.rows;
}

// ─── Check if tables exist ──────────────────────────────────────────────────
async function tableExists(tableName) {
  const result = await query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = $1
    )`,
    [tableName]
  );
  return result[0].exists;
}

// ─── Clear existing data (in correct order for FK constraints) ────────────────
console.log('🗑️  Clearing existing data...');

// Only delete from tables that exist
const tablesToClear = [
  'chatbot_messages',  
  'admission_guides',
  'university_majors',
  'news',
  'chat_messages',
  'chat_room_participants',
  'chat_rooms',
  'audit_logs',
  'universities',
  'majors',
  'profiles',
  'users'
];

for (const table of tablesToClear) {
  const exists = await tableExists(table);
  if (exists) {
    await query(`DELETE FROM ${table}`);
    console.log(`   ✅ Cleared ${table}`);
  } else {
    console.log(`   ⏭️  Skipped ${table} (does not exist)`);
  }
}

// ─── Seed Majors from PDF Data ──────────────────────────────────────────────
console.log('🎓 Seeding majors from PDF data...');

// From PDF Page 23-25: All majors listed
const majors = [
  // Medical (Page 27-38)
  { name: 'ဆေးပညာ (MB,BS)', name_en: 'Medicine (MB,BS)', category: 'medical', description: 'ဆေးပညာဘွဲ့ - ဆေးတက္ကသိုလ်များတွင် ၆ နှစ် တက်ရောက်ရသည်။ ဝင်ခွင့်အတွက် STEAMS-1 ဘာသာတွဲ၊ စုစုပေါင်းရမှတ် ၄၅၀ နှင့်အထက် ရရှိရမည်။' },
  { name: 'သွားဘက်ဆိုင်ရာဆေးပညာ (B.D.S)', name_en: 'Dental Surgery (B.D.S)', category: 'medical', description: 'သွားဘက်ဆိုင်ရာဆေးပညာဘွဲ့ - ၅ နှစ် တက်ရောက်ရသည်။ STEAMS-1 ဘာသာတွဲ၊ ရမှတ် ၄၅၀ အထက်။' },
  { name: 'ဆေးဝါးပညာ (B.Pharm)', name_en: 'Pharmacy (B.Pharm)', category: 'medical', description: 'ဆေးဝါးပညာဘွဲ့ - ၄ နှစ် တက်ရောက်ရသည်။ STEAMS-1 ဘာသာတွဲ။' },
  { name: 'ဆေးဘက်ဆိုင်ရာနည်းပညာ (B.Med.Tech)', name_en: 'Medical Technology (B.Med.Tech)', category: 'medical', description: 'ဆေးဘက်ဆိုင်ရာနည်းပညာဘွဲ့ - ၄ နှစ်။ ဓာတ်ခွဲနည်းပညာ၊ ဓာတ်မှန်နည်းပညာ၊ ခန္ဓာသန်စွမ်းမှုနည်းပညာ၊ ကျန်းမာရေးသတင်းအချက်အလက်နည်းပညာ၊ ဓာတ်ရောင်ခြည်ကုသမှုနည်းပညာ။' },
  { name: 'သူနာပြုပညာ (B.N.Sc)', name_en: 'Nursing Science (B.N.Sc)', category: 'medical', description: 'သူနာပြုသိပ္ပံဘွဲ့ - ၄ နှစ်။ STEAMS-1 ဘာသာတွဲ။ အမျိုးသမီး ၉၀%၊ အမျိုးသား ၁၀% လက်ခံသည်။' },
  { name: 'အခြေခံကျန်းမာရေးပညာ (B.Comm.H)', name_en: 'Community Health (B.Comm.H)', category: 'medical', description: 'ကျန်းမာရေးသိပ္ပံဘွဲ့ (အခြေခံကျန်းမာရေး) - ၄ နှစ်။ အမျိုးသား ၈၀%၊ အမျိုးသမီး ၂၀% လက်ခံသည်။' },
  { name: 'တိုင်းရင်းဆေးပညာ (B.M.T.M)', name_en: 'Traditional Medicine (B.M.T.M)', category: 'medical', description: 'မြန်မာ့တိုင်းရင်းဆေးပညာဘွဲ့ - ၅ နှစ်။ STEAMS-1 ဘာသာတွဲ။' },

  // Engineering (Page 40-55)
  { name: 'မြို့ပြအင်ဂျင်နီယာ (B.E Civil)', name_en: 'Civil Engineering (B.E)', category: 'engineering', description: 'မြို့ပြအင်ဂျင်နီယာဘွဲ့ - ၅ နှစ်။ ရူပဗေဒ၊ ဓာတုဗေဒ၊ သင်္ချာ၊ အင်္ဂလိပ်စာ (၄)ဘာသာပေါင်းရမှတ် ၃၀၀ နှင့်အထက် ရရှိရမည်။' },
  { name: 'လျှပ်စစ်စွမ်းအားအင်ဂျင်နီယာ (B.E EP)', name_en: 'Electrical Power Engineering (B.E)', category: 'engineering', description: 'လျှပ်စစ်စွမ်းအားအင်ဂျင်နီယာဘွဲ့ - ၅ နှစ်။ ရူပဗေဒ၊ ဓာတုဗေဒ၊ သင်္ချာ၊ အင်္ဂလိပ်စာ ရမှတ် ၃၀၀ အထက်။' },
  { name: 'စက်မှုအင်ဂျင်နီယာ (B.E Mechanical)', name_en: 'Mechanical Engineering (B.E)', category: 'engineering', description: 'စက်မှုအင်ဂျင်နီယာဘွဲ့ - ၅ နှစ်။ ရူပဗေဒ၊ ဓာတုဗေဒ၊ သင်္ချာ၊ အင်္ဂလိပ်စာ ရမှတ် ၃၀၀ အထက်။' },
  { name: 'အီလက်ထရောနစ်အင်ဂျင်နီယာ (B.E Electronics)', name_en: 'Electronic Engineering (B.E)', category: 'engineering', description: 'အီလက်ထရောနစ်အင်ဂျင်နီယာဘွဲ့ - ၅ နှစ်။ ရူပဗေဒ၊ ဓာတုဗေဒ၊ သင်္ချာ၊ အင်္ဂလိပ်စာ ရမှတ် ၃၀၀ အထက်။' },
  { name: 'ကွန်ပျူတာအင်ဂျင်နီယာ (B.E CEIT)', name_en: 'Computer Engineering (B.E)', category: 'engineering', description: 'ကွန်ပျူတာအင်ဂျင်နီယာနှင့်သတင်းအချက်အလက်နည်းပညာဘွဲ့ - ၅ နှစ်။ ရူပဗေဒ၊ ဓာတုဗေဒ၊ သင်္ချာ၊ အင်္ဂလိပ်စာ ရမှတ် ၃၀၀ အထက်။' },
  { name: 'ဓာတုအင်ဂျင်နီယာ (B.E Chemical)', name_en: 'Chemical Engineering (B.E)', category: 'engineering', description: 'ဓာတုအင်ဂျင်နီယာဘွဲ့ - ၅ နှစ်။ ရန်ကုန်နည်းပညာတက္ကသိုလ်တွင် ဖွင့်လှစ်သည်။' },
  { name: 'သတ္တုတူးဖော်ရေးအင်ဂျင်နီယာ (B.E Mining)', name_en: 'Mining Engineering (B.E)', category: 'engineering', description: 'သတ္တုတူးဖော်ရေးအင်ဂျင်နီယာဘွဲ့ - ၅ နှစ်။' },
  { name: 'ရေနံအင်ဂျင်နီယာ (B.E Petroleum)', name_en: 'Petroleum Engineering (B.E)', category: 'engineering', description: 'ရေနံအင်ဂျင်နီယာဘွဲ့ - ၅ နှစ်။' },
  { name: 'ဗိသုကာပညာ (B.Arch)', name_en: 'Architecture (B.Arch)', category: 'engineering', description: 'ဗိသုကာဘွဲ့ - ၅ နှစ်။ ရူပဗေဒ၊ ဓာတုဗေဒ၊ သင်္ချာ၊ အင်္ဂလိပ်စာ ရမှတ် ၃၀၀ အထက်။' },
  { name: 'စိုက်ပျိုးရေးအင်ဂျင်နီယာ (B.E Agricultural)', name_en: 'Agricultural Engineering (B.E)', category: 'engineering', description: 'စိုက်ပျိုးရေးအင်ဂျင်နီယာဘွဲ့ - ၅ နှစ်။ Naypyitaw State Polytechnic University တွင် ဖွင့်လှစ်သည်။' },
  { name: 'ရေကြောင်းအင်ဂျင်နီယာ (B.E Marine)', name_en: 'Marine Engineering (B.E)', category: 'engineering', description: 'ရေကြောင်းအင်ဂျင်နီယာဘွဲ့ - ၅ နှစ်။ မြန်မာနိုင်ငံရေကြောင်းပညာတက္ကသိုလ်တွင် ဖွင့်လှစ်သည်။' },

  // Computer Science (Page 57-65)
  { name: 'ကွန်ပျူတာသိပ္ပံ (B.C.Sc)', name_en: 'Computer Science (B.C.Sc)', category: 'science', description: 'ကွန်ပျူတာသိပ္ပံဘွဲ့ - ၄ နှစ်။ ရန်ကုန်ကွန်ပျူတာတက္ကသိုလ်တွင် Software Engineering, Knowledge Engineering, Business Information Systems, Computer Security and Forensics, High Performance Computing စသည့် အထူးပြုဘာသာရပ်များဖြင့် ဖွင့်လှစ်သည်။' },
  { name: 'ကွန်ပျူတာနည်းပညာ (B.C.Tech)', name_en: 'Computer Technology (B.C.Tech)', category: 'science', description: 'ကွန်ပျူတာနည်းပညာဘွဲ့ - ၄ နှစ်။ Embedded Systems, Computer Communication and Networks, Cyber Security စသည့် အထူးပြုဘာသာရပ်များဖြင့် ဖွင့်လှစ်သည်။' },

  // Science (Page 23-25)
  { name: 'ရူပဗေဒ (B.Sc Physics)', name_en: 'Physics (B.Sc)', category: 'science', description: 'ရူပဗေဒဘွဲ့ - ၄ နှစ်။ ရန်ကုန်တက္ကသိုလ်နှင့် မန္တလေးတက္ကသိုလ်တို့တွင် ဖွင့်လှစ်သည်။' },
  { name: 'ဓာတုဗေဒ (B.Sc Chemistry)', name_en: 'Chemistry (B.Sc)', category: 'science', description: 'ဓာတုဗေဒဘွဲ့ - ၄ နှစ်။ ကုန်ထုတ်ဓာတုဗေဒ၊ ဇီဝဓာတုဗေဒဟူ၍ အထူးပြုဘာသာရပ်များဖြင့် ဖွင့်လှစ်သည်။' },
  { name: 'ဇီဝဗေဒ (B.Sc Biology)', name_en: 'Biology (B.Sc)', category: 'science', description: 'ဇီဝဗေဒဘွဲ့ - ၄ နှစ်။ ရန်ကုန်တက္ကသိုလ်နှင့် မန္တလေးတက္ကသိုလ်တို့တွင် ဖွင့်လှစ်သည်။' },
  { name: 'သင်္ချာ (B.Sc Mathematics)', name_en: 'Mathematics (B.Sc)', category: 'science', description: 'သင်္ချာဘွဲ့ - ၄ နှစ်။ သိပ္ပံဘာသာရပ်တစ်ခုဖြစ်သည်။' },
  { name: 'ဘူမိဗေဒ (B.Sc Geology)', name_en: 'Geology (B.Sc)', category: 'science', description: 'ဘူမိဗေဒဘွဲ့ - ၄ နှစ်။ ရန်ကုန်တက္ကသိုလ်၊ မန္တလေးတက္ကသိုလ်၊ မော်လမြိုင်တက္ကသိုလ်၊ တောင်ကြီးတက္ကသိုလ်တို့တွင် ဖွင့်လှစ်သည်။' },
  { name: 'အဏုဇီဝဗေဒ (B.Sc Microbiology)', name_en: 'Microbiology (B.Sc)', category: 'science', description: 'အဏုဇီဝဗေဒဘွဲ့ - ၄ နှစ်။ ရန်ကုန်တက္ကသိုလ်၊ မန္တလေးတက္ကသိုလ်တို့တွင် ဖွင့်လှစ်သည်။' },
  { name: 'သတ္တဗေဒ (B.Sc Zoology)', name_en: 'Zoology (B.Sc)', category: 'science', description: 'သတ္တဗေဒဘွဲ့ - ၄ နှစ်။' },
  { name: 'ရုက္ခဗေဒ (B.Sc Botany)', name_en: 'Botany (B.Sc)', category: 'science', description: 'ရုက္ခဗေဒဘွဲ့ - ၄ နှစ်။' },
  { name: 'ပတ်ဝန်းကျင်သိပ္ပံ (B.Sc Environmental)', name_en: 'Environmental Science (B.Sc)', category: 'science', description: 'ပတ်ဝန်းကျင်သိပ္ပံဘွဲ့ - ၄ နှစ်။ ရန်ကုန်တက္ကသိုလ်၊ မန္တလေးတက္ကသိုလ်တို့တွင် ဖွင့်လှစ်သည်။' },
  { name: 'ဇီဝနည်းပညာ (B.S Biotechnology)', name_en: 'Biotechnology (B.S)', category: 'science', description: 'ဇီဝနည်းပညာဘွဲ့ - ၄ နှစ်။ မန္တလေးနည်းပညာတက္ကသိုလ်တွင် ဖွင့်လှစ်သည်။' },

  // Arts (Page 66-68)
  { name: 'မြန်မာစာ (B.A Myanmar)', name_en: 'Myanmar (B.A)', category: 'arts', description: 'မြန်မာစာဘွဲ့ - ၄ နှစ်။ ဝိဇ္ဇာဘာသာရပ်တစ်ခုဖြစ်သည်။' },
  { name: 'အင်္ဂလိပ်စာ (B.A English)', name_en: 'English (B.A)', category: 'arts', description: 'အင်္ဂလိပ်စာဘွဲ့ - ၄ နှစ်။ အင်္ဂလိပ်စာ ရမှတ် ၆၀ နှင့်အထက် ရရှိရမည်။' },
  { name: 'ပထဝီဝင် (B.A Geography)', name_en: 'Geography (B.A)', category: 'arts', description: 'ပထဝီဝင်ဘွဲ့ - ၄ နှစ်။' },
  { name: 'သမိုင်း (B.A History)', name_en: 'History (B.A)', category: 'arts', description: 'သမိုင်းဘွဲ့ - ၄ နှစ်။' },
  { name: 'ဒဿနိကဗေဒ (B.A Philosophy)', name_en: 'Philosophy (B.A)', category: 'arts', description: 'ဒဿနိကဗေဒဘွဲ့ - ၄ နှစ်။' },
  { name: 'စိတ်ပညာ (B.A Psychology)', name_en: 'Psychology (B.A)', category: 'arts', description: 'စိတ်ပညာဘွဲ့ - ၄ နှစ်။' },
  { name: 'အရှေ့တိုင်းပညာ (B.A Oriental Studies)', name_en: 'Oriental Studies (B.A)', category: 'arts', description: 'အရှေ့တိုင်းပညာဘွဲ့ - ၄ နှစ်။' },
  { name: 'ရှေးဟောင်းသုတေသနပညာ (B.A Archaeology)', name_en: 'Archaeology (B.A)', category: 'arts', description: 'ရှေးဟောင်းသုတေသနပညာဘွဲ့ - ၄ နှစ်။ ရန်ကုန်တက္ကသိုလ်၊ မန္တလေးတက္ကသိုလ်တို့တွင် ဖွင့်လှစ်သည်။' },
  { name: 'မြန်မာမှုပညာ (B.A Myanmar Studies)', name_en: 'Myanmar Studies (B.A)', category: 'arts', description: 'မြန်မာမှုပညာဘွဲ့ - ၄ နှစ်။ ရန်ကုန်တက္ကသိုလ်၊ မန္တလေးတက္ကသိုလ်တို့တွင် ဖွင့်လှစ်သည်။' },
  { name: 'စာကြည့်တိုက်နှင့်သုတပညာ (B.A Library Science)', name_en: 'Library Science (B.A)', category: 'arts', description: 'စာကြည့်တိုက်နှင့်သုတပညာဘွဲ့ - ၄ နှစ်။' },

  // Business (Page 67-72)
  { name: 'စီးပွားရေးပညာ (B.Econ Economics)', name_en: 'Economics (B.Econ)', category: 'business', description: 'စီးပွားရေးပညာဘွဲ့ - ၄ နှစ်။ ရန်ကုန်စီးပွားရေးတက္ကသိုလ်တွင် ဖွင့်လှစ်သည်။' },
  { name: 'စာရင်းအင်းပညာ (B.Econ Statistics)', name_en: 'Economics (B.Econ Statistics)', category: 'business', description: 'စာရင်းအင်းပညာဘွဲ့ - ၄ နှစ်။' },
  { name: 'ကုန်သွယ်မှုပညာ (B.Com)', name_en: 'Commerce (B.Com)', category: 'business', description: 'ကုန်သွယ်မှုပညာဘွဲ့ - ၄ နှစ်။' },
  { name: 'စာရင်းကိုင်ပညာ (B.Act)', name_en: 'Accounting (B.Act)', category: 'business', description: 'စာရင်းကိုင်ပညာဘွဲ့ - ၄ နှစ်။' },
  { name: 'စီးပွားရေးစီမံခန့်ခွဲမှုပညာ (BBA)', name_en: 'Business Administration (BBA)', category: 'business', description: 'စီးပွားရေးစီမံခန့်ခွဲမှုပညာဘွဲ့ - ၄ နှစ်။' },
  { name: 'အာမခံသိပ္ပံပညာ (B.A.S)', name_en: 'Actuarial Science (B.A.S)', category: 'business', description: 'အာမခံသိပ္ပံပညာဘွဲ့ - ၄ နှစ်။' },
  { name: 'ခရီးသွားလုပ်ငန်းနှင့်ဧည့်ဝန်ဆောင်မှုစီမံခန့်ခွဲမှုပညာ (BTHM)', name_en: 'Tourism and Hospitality Management (BTHM)', category: 'business', description: 'ခရီးသွားလုပ်ငန်းနှင့်ဧည့်ဝန်ဆောင်မှုစီမံခန့်ခွဲမှုပညာဘွဲ့ - ၄ နှစ်။' },

  // Education
  { name: 'ပညာရေးဘွဲ့ (B.Ed)', name_en: 'Education (B.Ed)', category: 'education', description: 'ပညာရေးဘွဲ့ - ၅ နှစ်။ ရန်ကုန်ပညာရေးတက္ကသိုလ်၊ စစ်ကိုင်းပညာရေးတက္ကသိုလ်တို့တွင် ဖွင့်လှစ်သည်။' },

  // Law
  { name: 'ဥပဒေဘွဲ့ (LL.B)', name_en: 'Law (LL.B)', category: 'law', description: 'ဥပဒေဘွဲ့ - ၅ နှစ်။ ရန်ကုန်ဥပဒေတက္ကသိုလ်၊ မန္တလေးဥပဒေတက္ကသိုလ်တို့တွင် ဖွင့်လှစ်သည်။' },
  { name: 'ဝိဇ္ဇာဘွဲ့ (ဥပဒေ) B.A(Law)', name_en: 'Law (B.A Law)', category: 'law', description: 'ဝိဇ္ဇာဘွဲ့ (ဥပဒေ) - ၄ နှစ်။ LL.B သို့ ၂ နှစ်ဆက်လက်တက်ရောက်နိုင်သည်။' },

  // Foreign Languages
  { name: 'တရုတ်ဘာသာ (B.A Chinese)', name_en: 'Chinese (B.A)', category: 'arts', description: 'တရုတ်ဘာသာဘွဲ့ - ၄ နှစ်။' },
  { name: 'ပြင်သစ်ဘာသာ (B.A French)', name_en: 'French (B.A)', category: 'arts', description: 'ပြင်သစ်ဘာသာဘွဲ့ - ၄ နှစ်။' },
  { name: 'ဂျာမန်ဘာသာ (B.A German)', name_en: 'German (B.A)', category: 'arts', description: 'ဂျာမန်ဘာသာဘွဲ့ - ၄ နှစ်။' },
  { name: 'ဂျပန်ဘာသာ (B.A Japanese)', name_en: 'Japanese (B.A)', category: 'arts', description: 'ဂျပန်ဘာသာဘွဲ့ - ၄ နှစ်။' },
  { name: 'ကိုရီးယားဘာသာ (B.A Korean)', name_en: 'Korean (B.A)', category: 'arts', description: 'ကိုရီးယားဘာသာဘွဲ့ - ၄ နှစ်။' },
  { name: 'ရုရှားဘာသာ (B.A Russian)', name_en: 'Russian (B.A)', category: 'arts', description: 'ရုရှားဘာသာဘွဲ့ - ၄ နှစ်။' },
  { name: 'ထိုင်းဘာသာ (B.A Thai)', name_en: 'Thai (B.A)', category: 'arts', description: 'ထိုင်းဘာသာဘွဲ့ - ၄ နှစ်။' },
];
const careerUpdates = [
  // ─── Medical Careers ──────────────────────────────────────────────────────
  {
    nameEn: 'Medicine (MB,BS)',
    duration: '၆ နှစ် (+ အလုပ်သင် ၁ နှစ်)',
    careerPaths: [
      {
        title: 'General Practitioner (Doctor)',
        description: 'ဆေးရုံ သို့မဟုတ် ဆေးခန်းများတွင် လူနာများကို စမ်းသပ်စစ်ဆေးပြီး လိုအပ်သော ဆေးကုသမှုများ ပြုလုပ်ပေးရသည်။',
        skills: ['Clinical diagnosis', 'Patient care', 'Medical ethics', 'Communication'],
        outlook: 'High Demand - ဆရာဝန်များ အမြဲတစေ လိုအပ်လျက်ရှိသည်'
      },
      {
        title: 'Medical Researcher',
        description: 'ဆေးဘက်ဆိုင်ရာ သုတေသနလုပ်ငန်းများ ဆောင်ရွက်ပြီး ရောဂါကုသနည်းအသစ်များနှင့် ဆေးဝါးအသစ်များကို ရှာဖွေဖော်ထုတ်သည်။',
        skills: ['Data analysis', 'Lab techniques', 'Scientific writing', 'Clinical trials'],
        outlook: 'Steady Growth - ဆေးဘက်သုတေသနများ ပိုမိုဖွံ့ဖြိုးလာသည်'
      },
      {
        title: 'Healthcare Administrator',
        description: 'ဆေးရုံ၊ ဆေးခန်း သို့မဟုတ် ကျန်းမာရေးဌာနများတွင် စီမံခန့်ခွဲမှု၊ ဘတ်ဂျက်ရေးဆွဲမှုနှင့် ဝန်ထမ်းအင်အားကို ကြီးကြပ်သည်။',
        skills: ['Leadership', 'Healthcare management', 'Budgeting', 'Policy compliance'],
        outlook: 'Growing Demand - ကျန်းမာရေးကဏ္ဍ စီမံခန့်ခွဲမှု ပိုမိုလိုအပ်လာသည်'
      }
    ]
  },
  {
    nameEn: 'Pharmacy (B.Pharm)',
    duration: '၅ နှစ်',
    careerPaths: [
      {
        title: 'Pharmacist',
        description: 'ဆေးဆိုင်နှင့် ဆေးရုံများတွင် ဆေးဝါးများ ထုတ်ပေးခြင်း၊ လူနာများကို ဆေးအညွှန်း ရှင်းပြခြင်းနှင့် ဆေးဝါးဘေးကင်းမှု ကြီးကြပ်ခြင်း။',
        skills: ['Pharmacology', 'Patient counseling', 'Drug safety', 'Inventory management'],
        outlook: 'Steady Demand - ဆေးဝါးကဏ္ဍ ဖွံ့ဖြိုးမှုနှင့်အတူ လိုအပ်ချက် တည်ငြိမ်သည်'
      },
      {
        title: 'Pharmaceutical Scientist',
        description: 'ဆေးဝါးထုတ်လုပ်ရေး လုပ်ငန်းများတွင် ဆေးဝါးအသစ်များ သုတေသနပြုလုပ်ခြင်းနှင့် ထုတ်လုပ်ခြင်း။',
        skills: ['Organic chemistry', 'Analytical chemistry', 'Formulation', 'R&D'],
        outlook: 'Growing Demand - ပြည်တွင်း/ပြည်ပ ဆေးဝါးထုတ်လုပ်မှု ပိုမိုများပြားလာသည်'
      }
    ]
  },
  {
    nameEn: 'Nursing Science (B.N.Sc)',
    duration: '၄ နှစ်',
    careerPaths: [
      {
        title: 'Registered Nurse',
        description: 'ဆေးရုံများတွင် လူနာများကို ပြုစုစောင့်ရှောက်ခြင်း၊ ဆရာဝန်၏ ညွှန်ကြားချက်အရ ဆေးကုသမှုများ ကူညီပေးခြင်း။',
        skills: ['Patient care', 'CPR & First Aid', 'Clinical procedures', 'Empathy'],
        outlook: 'Very High Demand - သူနာပြု လိုအပ်ချက် အလွန်မြင့်မားသည်'
      },
      {
        title: 'Nurse Manager',
        description: 'သူနာပြုအဖွဲ့ကို ဦးဆောင်ခြင်း၊ အလှည့်ကျ တာဝန်ဇယားဆွဲခြင်းနှင့် လူနာပြုစုစောင့်ရှောက်မှု အရည်အသွေးကို ကြီးကြပ်ခြင်း။',
        skills: ['Leadership', 'Shift scheduling', 'Patient safety', 'Conflict resolution'],
        outlook: 'High Demand - ဝါရင့်သူနာပြု စီမံခန့်ခွဲသူများ လိုအပ်သည်'
      }
    ]
  },
  {
    nameEn: 'Traditional Medicine (B.M.T.M)',
    duration: '၅ နှစ်',
    careerPaths: [
      {
        title: 'Traditional Practitioner',
        description: 'တိုင်းရင်းဆေးပညာ၊ အပ်စိုက်ကုသခြင်းနှင့် သဘာဝဆေးဖက်ဝင် အပင်များ အသုံးပြု၍ လူနာများကို ကုသပေးသည်။',
        skills: ['Herbal medicine', 'Acupuncture', 'Traditional diagnosis', 'Holistic care'],
        outlook: 'Steady Demand - တိုင်းရင်းဆေးကုသမှုကို အားကိုးသူများအတွက် လိုအပ်ချက်ရှိသည်'
      }
    ]
  },
  {
    nameEn: 'Dental Surgery (B.D.S)',
    duration: '၆ နှစ်',
    careerPaths: [
      {
        title: 'Dentist',
        description: 'သွားနှင့် ခံတွင်းဆိုင်ရာ ရောဂါများကို ရှာဖွေကုသခြင်း၊ သွားနှုတ်ခြင်း၊ သွားဖာခြင်းနှင့် ခံတွင်းကျန်းမာရေး အသိပညာပေးခြင်း။',
        skills: ['Dental surgery', 'Oral diagnosis', 'Patient communication', 'Dental radiography'],
        outlook: 'High Demand - သွားဘက်ဆိုင်ရာ ကုသရေးခန်းများ တိုးပွားလာသည်'
      }
    ]
  },

  // ─── Engineering Careers ──────────────────────────────────────────────────
  {
    nameEn: 'Civil Engineering (B.E)',
    duration: '၅ နှစ်',
    careerPaths: [
      {
        title: 'Site Engineer',
        description: 'ဆောက်လုပ်ရေးလုပ်ငန်းခွင်တွင် နေ့စဉ်လုပ်ငန်းများကို ကြီးကြပ်ခြင်း၊ ဘေးကင်းလုံခြုံရေးနှင့် စံချိန်စံညွှန်းများ ကိုက်ညီမှု ရှိစေရန် ဆောင်ရွက်ခြင်း။',
        skills: ['Project supervision', 'Site safety', 'Blueprint reading', 'Construction management'],
        outlook: 'High Demand - အခြေခံအဆောက်အအုံနှင့် အဆောက်အအုံဆောက်လုပ်ရေးကဏ္ဍတွင် အမြဲလိုအပ်သည်'
      },
      {
        title: 'Structural Engineer',
        description: 'အဆောက်အအုံ၊ တံတားများနှင့် တာပတ်လမ်းများ ဘေးကင်းလုံခြုံပြီး ခိုင်ခံ့စေရန် ဒီဇိုင်းဆွဲတွက်ချက်ခြင်း။',
        skills: ['AutoCAD', 'Structural analysis', 'Mathematics', 'Physics', 'SAP2000'],
        outlook: 'Strong Growth - ခေတ်မီအဆောက်အအုံ ဒီဇိုင်းဆွဲသူများအတွက် အလုပ်အကိုင်ကောင်းများ ရှိသည်'
      },
      {
        title: 'Project Manager',
        description: 'ဆောက်လုပ်ရေး စီမံကိန်းတခုလုံး၏ ဘတ်ဂျက်၊ အချိန်ဇယားနှင့် ပစ္စည်းကိရိယာများကို စနစ်တကျ စီမံခန့်ခွဲသည်။',
        skills: ['Project scheduling', 'Budgeting', 'Risk management', 'Leadership'],
        outlook: 'High Demand - စီမံခန့်ခွဲမှု ကျွမ်းကျင်သော အင်ဂျင်နီယာများ လိုအပ်ချက်မြင့်မားသည်'
      }
    ]
  },
  {
    nameEn: 'Electrical Power Engineering (B.E)',
    duration: '၅ နှစ်',
    careerPaths: [
      {
        title: 'Electrical Engineer',
        description: 'လျှပ်စစ်စနစ်များ၊ စက်ပစ္စည်းများနှင့် လျှပ်စစ်သွယ်တန်းမှု ကွန်ရက်များကို ဒီဇိုင်းဆွဲ၊ စမ်းသပ်၊ တပ်ဆင်သည်။',
        skills: ['Circuit design', 'Power systems', 'MATLAB', 'Electrical safety'],
        outlook: 'Steady Demand - စက်ရုံနှင့် အဆောက်အအုံများတွင် လျှပ်စစ်ကျွမ်းကျင်သူ လိုအပ်ချက် တည်ငြိမ်သည်'
      },
      {
        title: 'Power Systems Engineer',
        description: 'လျှပ်စစ်ဓာတ်အားပေးစက်ရုံများ၊ ဓာတ်အားခွဲရုံများနှင့် ဓာတ်အားဖြန့်ဖြူးရေး ကွန်ရက်များကို စီမံခန့်ခွဲသည်။',
        skills: ['High-voltage systems', 'Grid integration', 'Power flow analysis'],
        outlook: 'Growing Demand - ဓာတ်အားထုတ်လုပ်မှုနှင့် ဖြန့်ဖြူးရေးကဏ္ဍ တိုးချဲ့မှုနှင့်အတူ လိုအပ်ချက်ရှိသည်'
      }
    ]
  },
  {
    nameEn: 'Mechanical Engineering (B.E)',
    duration: '၅ နှစ်',
    careerPaths: [
      {
        title: 'Mechanical Engineer',
        description: 'စက်ကိရိယာများ၊ အင်ဂျင်များနှင့် ထုတ်လုပ်မှုစက်ရုံသုံး စက်များကို ဒီဇိုင်းဆွဲခြင်းနှင့် ပြုပြင်ထိန်းသိမ်းခြင်း။',
        skills: ['SolidWorks', 'Thermodynamics', 'CAD/CAM', 'Material science'],
        outlook: 'Steady Demand - စက်မှုထုတ်လုပ်ရေးနှင့် စက်ရုံကဏ္ဍများတွင် လိုအပ်ချက်ရှိသည်'
      },
      {
        title: 'HVAC Engineer',
        description: 'အဆောက်အအုံများအတွက် လေအေးပေးစနစ်၊ လေဝင်လေထွက်စနစ်နှင့် အပူပေးစနစ်များကို ဒီဇိုင်းဆွဲ တပ်ဆင်သည်။',
        skills: ['HVAC design', 'Energy efficiency', 'Building codes', 'Duct sizing'],
        outlook: 'Strong Growth - ခေတ်မီအဆောက်အအုံများ ဆောက်လုပ်မှု များပြားလာသည်နှင့်အမျှ လိုအပ်ချက်ရှိသည်'
      }
    ]
  },
  {
    nameEn: 'Chemical Engineering (B.E)',
    duration: '၅ နှစ်',
    careerPaths: [
      {
        title: 'Chemical Engineer',
        description: 'ဓာတုပစ္စည်းများ၊ စားသောက်ကုန်၊ ဆေးဝါးနှင့် စွမ်းအင် ထုတ်လုပ်မှု လုပ်ငန်းစဉ်များကို ဒီဇိုင်းဆွဲ စီမံခန့်ခွဲသည်။',
        skills: ['Process simulation', 'Chemical kinetics', 'Safety protocols', 'Lab analysis'],
        outlook: 'Steady Growth - ကုန်ထုတ်လုပ်ငန်းများတွင် လိုအပ်သည်'
      }
    ]
  },
  {
    nameEn: 'Computer Engineering (B.E)',
    duration: '၅ နှစ်',
    careerPaths: [
      {
        title: 'Hardware Engineer',
        description: 'ကွန်ပျူတာနှင့် အီလက်ထရောနစ် စက်ပစ္စည်းများ၏ ဟာ့ဒ်ဝဲစနစ်များကို ဒီဇိုင်းဆွဲ၊ စမ်းသပ်ကာ ပြုပြင်ထိန်းသိမ်းသည်။',
        skills: ['Circuit design', 'Embedded systems', 'FPGA', 'Hardware testing'],
        outlook: 'Steady Demand - ကွန်ပျူတာနှင့် အီလက်ထရောနစ် ထုတ်ကုန်များတွင် လိုအပ်သည်'
      }
    ]
  },
  {
    nameEn: 'Electronic Engineering (B.E)',
    duration: '၅ နှစ်',
    careerPaths: [
      {
        title: 'Electronics Engineer',
        description: 'ဖုန်း၊ ကွန်ပျူတာနှင့် အီလက်ထရောနစ် စမတ်ပစ္စည်းများအတွက် ပတ်လမ်းဘုတ်ပြား (PCB) နှင့် microchips များကို ဒီဇိုင်းဆွဲသည်။',
        skills: ['PCB design', 'Embedded systems', 'C/C++', 'Circuit analysis'],
        outlook: 'High Demand - နည်းပညာနှင့် IoT ပစ္စည်းများ ထုတ်လုပ်မှုတွင် အရေးပါသည်'
      },
      {
        title: 'Telecommunication Engineer',
        description: 'ဆက်သွယ်ရေးစနစ်များ၊ မိုဘိုင်းကွန်ရက်များနှင့် ဂြိုဟ်တုဆက်သွယ်ရေး စနစ်များကို ဒီဇိုင်းဆွဲ တပ်ဆင်သည်။',
        skills: ['Signal processing', 'Network protocols', 'RF engineering', 'Telecom systems'],
        outlook: 'Strong Growth - 5G နှင့် ဆက်သွယ်ရေးနည်းပညာများ ဖွံ့ဖြိုးလာသည်နှင့်အမျှ လိုအပ်ချက်ရှိသည်'
      }
    ]
  },

  // ─── Computer Science Careers ─────────────────────────────────────────────
  {
    nameEn: 'Computer Science (B.C.Sc)',
    duration: '၄ နှစ်',
    careerPaths: [
      {
        title: 'Software Engineer',
        description: 'အဖွဲ့အစည်းများနှင့် သုံးစွဲသူများအတွက် Software Application များနှင့် စနစ်များကို ဒီဇိုင်းဆွဲ၊ ရေးသား၊ စမ်းသပ်ကာ ဖြန့်ချိသည်။',
        skills: ['JavaScript/TypeScript', 'Python', 'Data Structures', 'Web Development', 'Git'],
        outlook: 'Very High Demand - နည်းပညာကဏ္ဍတွင် အလုပ်အကိုင် အများဆုံးနှင့် လစာအမြင့်ဆုံး ရရှိနိုင်သော လုပ်ငန်းဖြစ်သည်'
      },
      {
        title: 'Project Manager',
        description: 'ဆော့ဖ်ဝဲလ်စီမံကိန်းများကို ဦးဆောင်စီမံခန့်ခွဲခြင်း၊ အဖွဲ့ဝင်များကို ညွှန်ကြားခြင်းနှင့် စီမံကိန်းအောင်မြင်စေရန် ဆောင်ရွက်ခြင်း။',
        skills: ['Agile/Scrum', 'Leadership', 'Project planning', 'Risk management'],
        outlook: 'High Demand - နည်းပညာကုမ္ပဏီများတွင် စီမံခန့်ခွဲမှုကျွမ်းကျင်သူများ လိုအပ်ချက်ရှိသည်'
      },
      {
        title: 'System Analyst',
        description: 'လုပ်ငန်းလိုအပ်ချက်များကို လေ့လာသုံးသပ်ပြီး သင့်လျော်သော နည်းပညာဖြေရှင်းချက်များကို ဒီဇိုင်းဆွဲခြင်း။',
        skills: ['Systems analysis', 'UML', 'Requirements gathering', 'Technical documentation'],
        outlook: 'Steady Growth - စနစ်များ ပိုမိုရှုပ်ထွေးလာသည်နှင့်အမျှ လိုအပ်ချက်ရှိသည်'
      },
      {
        title: 'Software Developer/Programmer',
        description: 'ကုမ္ပဏီများအတွက် ဆော့ဖ်ဝဲလ်အပလီကေးရှင်းများ၊ မိုဘိုင်းအက်ပ်များနှင့် ဝဘ်ဆိုဒ်များ ရေးသားဖန်တီးခြင်း။',
        skills: ['Programming', 'Debugging', 'API integration', 'Database management'],
        outlook: 'Very High Demand - ဒစ်ဂျစ်တယ်အသွင်ကူးပြောင်းမှုနှင့်အတူ လိုအပ်ချက် ပိုမိုများပြားလာသည်'
      }
    ]
  },
  {
    nameEn: 'Computer Technology (B.C.Tech)',
    duration: '၄ နှစ်',
    careerPaths: [
      {
        title: 'IT Manager',
        description: 'ကုမ္ပဏီ၏ အိုင်တီဌာနကို ဦးဆောင်စီမံခန့်ခွဲခြင်း၊ နည်းပညာမဟာဗျူဟာများ ချမှတ်ခြင်းနှင့် အိုင်တီအခြေခံအဆောက်အအုံကို ကြီးကြပ်ခြင်း။',
        skills: ['IT strategy', 'Leadership', 'Budgeting', 'Vendor management'],
        outlook: 'High Demand - ကုမ္ပဏီအရွယ်အစားကြီးလာသည်နှင့်အမျှ အိုင်တီမန်နေဂျာများ လိုအပ်ချက်ရှိသည်'
      },
      {
        title: 'Network Engineer',
        description: 'ကုမ္ပဏီများ၏ ကွန်ပျူတာကွန်ရက် (Network) စနစ်များ ကောင်းမွန်စွာ အလုပ်လုပ်စေရန် ဒီဇိုင်းဆွဲ၊ တပ်ဆင်၊ စီမံခန့်ခွဲသည်။',
        skills: ['Cisco routing', 'Network security', 'TCP/IP', 'Firewall management'],
        outlook: 'High Demand - အဖွဲ့အစည်းတိုင်း၏ ကွန်ရက်ချိတ်ဆက်မှု မပြတ်တောက်စေရန် အလွန်အရေးကြီးသည်'
      },
      {
        title: 'System Administrator',
        description: 'ဆာဗာများ (Servers)၊ operating systems နှင့် အိုင်တီအခြေခံအဆောက်အအုံများကို စောင့်ကြည့် ပြုပြင်ထိန်းသိမ်းသည်။',
        skills: ['Linux administration', 'Active Directory', 'Server maintenance', 'Cloud platforms'],
        outlook: 'Steady Demand - အိုင်တီစနစ်များ လည်ပတ်ရန် မဖြစ်မနေ လိုအပ်သော ရာထူးဖြစ်သည်'
      },
      {
        title: 'IT Engineer',
        description: 'ဟာ့ဒ်ဝဲနှင့် ဆော့ဖ်ဝဲလ်ပြဿနာများကို ဖြေရှင်းခြင်း၊ အိုင်တီအခြေခံအဆောက်အအုံများ တည်ဆောက်ထိန်းသိမ်းခြင်း။',
        skills: ['Hardware troubleshooting', 'Software installation', 'Network configuration', 'IT support'],
        outlook: 'Steady Demand - ကုမ္ပဏီများတွင် အိုင်တီအထောက်အကူပြုသူများ အမြဲလိုအပ်သည်'
      },
      {
        title: 'IoT Specialist',
        description: 'စမတ်အိမ်များ၊ စက်ရုံများနှင့် ပတ်ဝန်းကျင်ထိန်းချုပ်ရေး စနစ်များအတွက် အာရုံခံကိရိယာ (Sensors) များနှင့် software ချိတ်ဆက်မှုများကို ဖန်တီးသည်။',
        skills: ['Microcontrollers', 'C++', 'Wireless protocols', 'Cloud integration'],
        outlook: 'Strong Growth - စမတ်နည်းပညာများ ခေတ်စားလာသည်နှင့်အမျှ လိုအပ်ချက် တိုးပွားနေသည်'
      }
    ]
  },

  // ─── Business & Economics Careers ────────────────────────────────────────
  {
    nameEn: 'Economics (B.Econ)',
    duration: '၄ နှစ်',
    careerPaths: [
      {
        title: 'Economist',
        description: 'ဈေးကွက်လားရာများ၊ အစိုးရမူဝါဒများ၏ သက်ရောက်မှုနှင့် ဘဏ္ဍာရေး အချက်အလက်များကို လေ့လာဆန်းစစ်သည်။',
        skills: ['Microeconomics', 'Data analysis', 'Econometrics', 'Report writing'],
        outlook: 'Steady Growth - ဘဏ်များနှင့် အစိုးရ သုတေသနဌာနများတွင် လိုအပ်သည်'
      },
      {
        title: 'Financial Analyst',
        description: 'ကုမ္ပဏီများ၏ ရင်းနှီးမြှုပ်နှံမှု အခွင့်အလမ်းများနှင့် ဘဏ္ဍာရေး စွမ်းဆောင်ရည်များကို လေ့လာတွက်ချက်ပြီး အကြံပြုသည်။',
        skills: ['Financial modeling', 'Excel', 'Accounting principles', 'Market analysis'],
        outlook: 'High Demand - ဘဏ်လုပ်ငန်း၊ ရင်းနှီးမြှုပ်နှံမှုနှင့် ကော်ပိုရိတ်ကဏ္ဍတွင် အခွင့်အလမ်းများပြားသည်'
      },
      {
        title: 'Business Analyst',
        description: 'လုပ်ငန်းလိုအပ်ချက်များကို ခွဲခြမ်းစိတ်ဖြာပြီး စီးပွားရေးဆိုင်ရာ ဖြေရှင်းချက်များ အကြံပြုခြင်း။',
        skills: ['Business process analysis', 'Data visualization', 'Requirements gathering', 'Communication'],
        outlook: 'Strong Growth - ကုမ္ပဏီများ ထိရောက်မှုရှိစေရန် လိုအပ်ချက်ရှိသည်'
      }
    ]
  },
  {
    nameEn: 'Commerce (B.Com)',
    duration: '၄ နှစ်',
    careerPaths: [
      {
        title: 'Sales Manager',
        description: 'အရောင်းအဖွဲ့များကို ဦးဆောင်ပြီး အရောင်းပစ်မှတ်များ ပြည့်မီစေရန် မဟာဗျူဟာများ ချမှတ် အကောင်အထည်ဖော်သည်။',
        skills: ['Sales strategy', 'Leadership', 'Negotiation', 'CRM tools'],
        outlook: 'Steady Demand - ထုတ်ကုန်နှင့် ဝန်ဆောင်မှု ရောင်းချသော ကုမ္ပဏီများတွင် အမြဲလိုအပ်သည်'
      },
      {
        title: 'Business Development Officer',
        description: 'မိတ်ဖက်အဖွဲ့အစည်းအသစ်များနှင့် ဈေးကွက်သစ်များကို ရှာဖွေပြီး ကုမ္ပဏီ၏ တိုးတက်မှုကို ဖန်တီးပေးသည်။',
        skills: ['Market research', 'Pitching', 'Relationship building', 'Strategic planning'],
        outlook: 'High Demand - ကုမ္ပဏီများ ဈေးကွက်ချဲ့ထွင်ရန်အတွက် အဓိက လိုအပ်ချက်ဖြစ်သည်'
      },
      {
        title: 'Marketing Specialist',
        description: 'ဈေးကွက်သုတေသနပြုခြင်း၊ ကြော်ငြာကမ်ပိန်းများ စီစဉ်ခြင်းနှင့် ထုတ်ကုန်မြှင့်တင်ရေး လုပ်ငန်းများ ဆောင်ရွက်ခြင်း။',
        skills: ['Digital marketing', 'Content creation', 'SEO/SEM', 'Market analysis'],
        outlook: 'High Demand - ဒီဂျစ်တယ်ခေတ်တွင် လုပ်ငန်းတိုင်း မားကတ်တင်း ကျွမ်းကျင်သူကို အပြိုင်အဆိုင် ခေါ်ယူကြသည်'
      }
    ]
  },
  {
    nameEn: 'Accounting (B.Act)',
    duration: '၄ နှစ်',
    careerPaths: [
      {
        title: 'Accountant',
        description: 'ကုမ္ပဏီများ၏ နေ့စဉ် ငွေစာရင်းများ မှတ်တမ်းတင်ခြင်း၊ ဘဏ္ဍာရေးရှင်းတမ်းများ ပြုစုခြင်းနှင့် အခွန်ကိစ္စရပ်များ ဆောင်ရွက်ခြင်း။',
        skills: ['QuickBooks/ERP', 'Excel', 'Tax laws', 'Ledger entry'],
        outlook: 'High Demand - စီးပွားရေးလုပ်ငန်းတိုင်းအတွက် လုံးဝမရှိမဖြစ် လိုအပ်သော ရာထူးဖြစ်သည်'
      },
      {
        title: 'Auditor',
        description: 'ကုမ္ပဏီများ၏ ငွေစာရင်းများနှင့် လုပ်ထုံးလုပ်နည်းများ မှန်ကန်တိကျပြီး ဥပဒေနှင့် ညီညွတ်မှု ရှိမရှိ စစ်ဆေးပေးသည်။',
        skills: ['Internal auditing', 'Fraud detection', 'Risk assessment', 'Report writing'],
        outlook: 'Strong Growth - စာရင်းကိုင် လုပ်ငန်းစုကြီးများနှင့် ကော်ပိုရေးရှင်းကြီးများတွင် အလုပ်အကိုင်ကောင်းများ ရှိသည်'
      },
      {
        title: 'Financial Controller',
        description: 'ကုမ္ပဏီ၏ ဘဏ္ဍာရေးစီမံခန့်ခွဲမှု၊ ဘတ်ဂျက်ရေးဆွဲမှုနှင့် ဘဏ္ဍာရေးအစီရင်ခံမှုများကို ကြီးကြပ်သည်။',
        skills: ['Financial management', 'Budgeting', 'Internal controls', 'Team leadership'],
        outlook: 'Steady Demand - ကြီးမားသောကုမ္ပဏီများတွင် ဘဏ္ဍာရေးဆိုင်ရာ ခေါင်းဆောင်များ လိုအပ်သည်'
      }
    ]
  },
  {
    nameEn: 'Business Administration (BBA)',
    duration: '၄ နှစ်',
    careerPaths: [
      {
        title: 'Business Consultant',
        description: 'ကုမ္ပဏီများ ပိုမိုအောင်မြင်ပြီး ထိရောက်မှုရှိလာစေရန် လုပ်ငန်းလည်ပတ်ပုံနှင့် စီမံခန့်ခွဲမှုများကို လေ့လာအကြံပေးသည်။',
        skills: ['Problem solving', 'Corporate finance', 'Presentation skills', 'Data analysis'],
        outlook: 'High Demand - ကုမ္ပဏီများကို ကူညီလမ်းညွှန်ရန် ကွန်ဆာတန့်များ လိုအပ်ချက်များပြားသည်'
      },
      {
        title: 'Marketing Manager',
        description: 'ထုတ်ကုန်များကို လူသိများစေရန် ကြော်ငြာ ကမ်ပိန်းများနှင့် ဒီဂျစ်တယ် မားကတ်တင်း လုပ်ငန်းများကို စီစဉ်ကြီးကြပ်သည်။',
        skills: ['SEO', 'Social media', 'Budgeting', 'Content creation', 'Market analysis'],
        outlook: 'High Demand - ဒီဂျစ်တယ်ခေတ်တွင် လုပ်ငန်းတိုင်း မားကတ်တင်း ကျွမ်းကျင်သူကို အပြိုင်အဆိုင် ခေါ်ယူကြသည်'
      },
      {
        title: 'Human Resources Manager',
        description: 'ဝန်ထမ်းစီမံခန့်ခွဲမှု၊ လစာနှုန်းထားများ၊ လေ့ကျင့်ရေးအစီအစဉ်များနှင့် လုပ်ငန်းခွင် ယဉ်ကျေးမှုကို ကြီးကြပ်သည်။',
        skills: ['Recruitment', 'Employee relations', 'Performance management', 'Labor laws'],
        outlook: 'Steady Demand - ကုမ္ပဏီတိုင်းတွင် လူ့စွမ်းအားအရင်းအမြစ် စီမံခန့်ခွဲသူများ လိုအပ်သည်'
      },
      {
        title: 'Operations Manager',
        description: 'ကုမ္ပဏီ၏ နေ့စဉ်လုပ်ငန်းဆောင်တာများ၊ ထောက်ပံ့ရေးကွင်းဆက်နှင့် ထုတ်လုပ်မှုလုပ်ငန်းစဉ်များကို စီမံခန့်ခွဲသည်။',
        skills: ['Operations management', 'Supply chain', 'Process optimization', 'Leadership'],
        outlook: 'Steady Demand - ထုတ်လုပ်မှုနှင့် ဝန်ဆောင်မှုလုပ်ငန်းများတွင် လိုအပ်ချက်ရှိသည်'
      }
    ]
  },

  // ─── Arts & Humanities Careers ────────────────────────────────────────────
  {
    nameEn: 'English (B.A)',
    duration: '၄ နှစ်',
    careerPaths: [
      {
        title: 'Translator',
        description: 'စာအုပ်များ၊ တရားဝင်စာရွက်စာတမ်းများနှင့် ဝဘ်ဆိုဒ်များရှိ စာသားများကို ဘာသာစကားတစ်ခုမှ အခြားတစ်ခုသို့ အဓိပ္ပာယ်မပြောင်းဘဲ ပြန်ဆိုသည်။',
        skills: ['Bilingual writing', 'Cultural awareness', 'Grammar proficiency', 'Proofreading'],
        outlook: 'Steady Growth - နိုင်ငံတကာ ဆက်သွယ်ရေးနှင့် စီးပွားရေးလုပ်ငန်းများတွင် လိုအပ်သည်'
      },
      {
        title: 'Interpreter',
        description: 'အစည်းအဝေးများ၊ ညီလာခံများနှင့် ခရီးစဉ်များတွင် ပြောဆိုသော စကားများကို ချက်ချင်း တိုက်ရိုက် ဘာသာပြန်ပေးသည်။',
        skills: ['Active listening', 'Simultaneous translation', 'Public speaking', 'Quick thinking'],
        outlook: 'High Demand - သံရုံးများ၊ နိုင်ငံတကာအဖွဲ့အစည်းများနှင့် ခရီးသွားလုပ်ငန်းတွင် လိုအပ်ချက်ရှိသည်'
      },
      {
        title: 'English Teacher',
        description: 'ကျောင်းများ၊ ဘာသာစကားသင်တန်းကျောင်းများတွင် အင်္ဂလိပ်စာဘာသာရပ်ကို သင်ကြားပြသပေးသည်။',
        skills: ['Teaching', 'Lesson planning', 'Classroom management', 'TEFL/TESOL'],
        outlook: 'High Demand - အင်္ဂလိပ်စာသင်ကြားရေး ဝယ်လိုအား အမြဲမြင့်မားနေသည်'
      },
      {
        title: 'Content Writer',
        description: 'ဝဘ်ဆိုဒ်များ၊ ဆိုရှယ်မီဒီယာနှင့် စာပေများအတွက် အကြောင်းအရာများကို အင်္ဂလိပ်လို ရေးသားဖန်တီးခြင်း။',
        skills: ['Creative writing', 'SEO content', 'Copywriting', 'Research skills'],
        outlook: 'Growing Demand - ဒီဂျစ်တယ်မားကတ်တင်းနှင့် မီဒီယာကဏ္ဍများတွင် လိုအပ်ချက်ရှိသည်'
      }
    ]
  },
  {
    nameEn: 'Myanmar (B.A)',
    duration: '၄ နှစ်',
    careerPaths: [
      {
        title: 'Myanmar Language Teacher',
        description: 'အခြေခံပညာကျောင်းများ၊ တက္ကသိုလ်များနှင့် ဘာသာစကားသင်တန်းကျောင်းများတွင် မြန်မာစာဘာသာရပ်ကို သင်ကြားပြသပေးသည်။',
        skills: ['Teaching', 'Curriculum development', 'Myanmar literature', 'Pedagogy'],
        outlook: 'Steady Demand - မြန်မာစာဆရာ/ဆရာမ လိုအပ်ချက်ရှိသည်'
      },
      {
        title: 'Writer/Journalist',
        description: 'မြန်မာဘာသာဖြင့် သတင်းဆောင်းပါးများ၊ စာအုပ်များနှင့် အကြောင်းအရာများကို ရေးသားဖော်ပြခြင်း။',
        skills: ['Journalism', 'Creative writing', 'Editing', 'Research'],
        outlook: 'Steady Demand - မီဒီယာနှင့် စာပေလောကတွင် လိုအပ်ချက်ရှိသည်'
      },
      {
        title: 'Civil Service Officer',
        description: 'အစိုးရဌာနများတွင် မြန်မာစာကျွမ်းကျင်မှု လိုအပ်သော အုပ်ချုပ်ရေးနှင့် စာပေးစာယူတာဝန်များ ဆောင်ရွက်ခြင်း။',
        skills: ['Administration', 'Official correspondence', 'Documentation', 'Public service'],
        outlook: 'Steady Demand - အစိုးရဌာနများတွင် မြန်မာစာကျွမ်းကျင်သူများ လိုအပ်သည်'
      }
    ]
  },
  {
    nameEn: 'History (B.A)',
    duration: '၄ နှစ်',
    careerPaths: [
      {
        title: 'Historian',
        description: 'သမိုင်းဝင်ဖြစ်ရပ်များ၊ စာရွက်စာတမ်းများနှင့် ရှေးဟောင်းပစ္စည်းများကို သုတေသနပြုလေ့လာခြင်း။',
        skills: ['Research', 'Archival analysis', 'Historical writing', 'Critical thinking'],
        outlook: 'Steady Demand - ပြတိုက်များ၊ တက္ကသိုလ်များနှင့် သုတေသနဌာနများတွင် လိုအပ်သည်'
      },
      {
        title: 'Museum Curator',
        description: 'ပြတိုက်များတွင် ရှေးဟောင်းပစ္စည်းများကို ထိန်းသိမ်းခြင်း၊ ပြသခြင်းနှင့် ပညာရေးဆိုင်ရာ အစီအစဉ်များ စီစဉ်ခြင်း။',
        skills: ['Museum management', 'Artifact preservation', 'Exhibition planning', 'Public education'],
        outlook: 'Steady Demand - ပြတိုက်နှင့် အမွေအနှစ်နေရာများတွင် လိုအပ်သည်'
      }
    ]
  },

  // ─── Education Careers ────────────────────────────────────────────────────
  {
    nameEn: 'Education (B.Ed)',
    duration: '၅ နှစ်',
    careerPaths: [
      {
        title: 'High School Teacher',
        description: 'အစိုးရ သို့မဟုတ် ပုဂ္ဂလိက အထက်တန်းကျောင်းများတွင် ကျောင်းသားများကို ဘာသာရပ်များ သင်ကြားပြသပေးသည်။',
        skills: ['Lesson planning', 'Classroom management', 'Subject matter expertise', 'Patience'],
        outlook: 'Steady Demand - ပညာရေးကဏ္ဍတွင် ဆရာ/ဆရာမများ အမြဲမပြတ် လိုအပ်လျက်ရှိသည်'
      },
      {
        title: 'Educational Consultant',
        description: 'သင်ရိုးညွှန်းတမ်း ဒီဇိုင်းဆွဲခြင်းနှင့် ကျောင်းများ၏ သင်ကြားမှု အရည်အသွေး တိုးတက်စေရန် လမ်းညွှန် အကြံပေးသည်။',
        skills: ['Pedagogy', 'Curriculum design', 'Program assessment'],
        outlook: 'Growing Demand - ပုဂ္ဂလိကကျောင်းများနှင့် နိုင်ငံတကာကျောင်းများ တိုးပွားလာသည်နှင့်အမျှ လိုအပ်ချက်ရှိသည်'
      },
      {
        title: 'School Administrator',
        description: 'ကျောင်းတစ်ကျောင်း၏ နေ့စဉ်လုပ်ငန်းဆောင်တာများ၊ ဘတ်ဂျက်နှင့် ဝန်ထမ်းများကို စီမံခန့်ခွဲသည်။',
        skills: ['School management', 'Budgeting', 'Staff supervision', 'Policy implementation'],
        outlook: 'Steady Demand - ကျောင်းများတွင် အုပ်ချုပ်ရေးမှူးများ လိုအပ်သည်'
      }
    ]
  },

  // ─── Law Careers ──────────────────────────────────────────────────────────
  {
    nameEn: 'Law (LL.B)',
    duration: '၅ နှစ်',
    careerPaths: [
      {
        title: 'Lawyer / Advocate',
        description: 'တရားရုံးများတွင် အမှုသည်များဘက်မှ ရှေ့နေအဖြစ် လိုက်ပါဆောင်ရွက်ပေးပြီး ဥပဒေဆိုင်ရာ အကြံဉာဏ်များ ပေးသည်။',
        skills: ['Litigation', 'Legal research', 'Oral advocacy', 'Negotiation'],
        outlook: 'High Demand - ဥပဒေကြောင်းအရ အကူအညီ လိုအပ်သူများအတွက် အမြဲလိုအပ်သည်'
      },
      {
        title: 'Legal Advisor',
        description: 'ကော်ပိုရိတ်ကုမ္ပဏီကြီးများတွင် စာချုပ်စာတမ်းများ စစ်ဆေးခြင်းနှင့် ကုမ္ပဏီ ဥပဒေနှင့် ညီညွတ်စေရန် အကြံပေးခြင်း။',
        skills: ['Contract drafting', 'Corporate law', 'Risk management'],
        outlook: 'Strong Growth - ကုမ္ပဏီများ များပြားလာသည်နှင့်အမျှ ကော်ပိုရိတ် စာချုပ်စာတမ်း ကျွမ်းကျင်သူများ လိုအပ်ချက် တိုးလာသည်'
      },
      {
        title: 'Judge / Magistrate',
        description: 'တရားရုံးများတွင် တရားစီရင်ရေးဆိုင်ရာ အမှုများကို ဆုံးဖြတ်ခြင်းနှင့် ဥပဒေနှင့်အညီ တရားစီရင်ခြင်း။',
        skills: ['Judicial decision-making', 'Legal interpretation', 'Courtroom management', 'Impartiality'],
        outlook: 'Steady Demand - တရားစီရင်ရေးစနစ်တွင် တရားသူကြီးများ လိုအပ်သည်'
      }
    ]
  },
  {
    nameEn: 'Law (B.A Law)',
    duration: '၄ နှစ်',
    careerPaths: [
      {
        title: 'Legal Assistant',
        description: 'ရှေ့နေများကို ဥပဒေဆိုင်ရာ သုတေသန၊ စာရွက်စာတမ်းများ ပြင်ဆင်ခြင်းနှင့် အမှုကိစ္စများ ကူညီဆောင်ရွက်ခြင်း။',
        skills: ['Legal research', 'Document preparation', 'Case management', 'Administrative support'],
        outlook: 'Steady Demand - ဥပဒေရုံးများနှင့် ကုမ္ပဏီများတွင် လိုအပ်သည်'
      },
      {
        title: 'Corporate Secretary',
        description: 'ကုမ္ပဏီများ၏ ဥပဒေဆိုင်ရာ စာရွက်စာတမ်းများ၊ အစည်းအဝေးမှတ်တမ်းများနှင့် ကော်ပိုရိတ်ကိစ္စရပ်များ ဆောင်ရွက်ခြင်း။',
        skills: ['Corporate governance', 'Documentation', 'Meeting coordination', 'Compliance'],
        outlook: 'Steady Demand - ကုမ္ပဏီများတွင် ကော်ပိုရိတ်အတွင်းရေးမှူးများ လိုအပ်သည်'
      }
    ]
  }
];

const majorMap = {}; // name_en -> id
for (const m of majors) {
  const matchingUpdate = careerUpdates.find(u => u.nameEn === m.name_en);
  const duration = matchingUpdate ? matchingUpdate.duration : null;
  const careerPaths = matchingUpdate ? JSON.stringify(matchingUpdate.careerPaths) : null;

  const rows = await query(
    'INSERT INTO majors (name, name_en, category, description, duration, career_paths) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [m.name, m.name_en, m.category, m.description, duration, careerPaths]
  );
  majorMap[m.name_en] = rows[0].id;
}
console.log(`   ✅ Inserted ${majors.length} majors from PDF data`);

// ─── Seed Universities from PDF Data ────────────────────────────────────────
console.log('🏫 Seeding universities from PDF data...');

// From PDF Page 8-12: All universities listed
const universities = [
  // ── Medical Universities (Page 27-38) ──
  {
    name: 'ဆေးတက္ကသိုလ် (၁) ရန်ကုန်',
    name_en: 'University of Medicine 1, Yangon',
    abbreviation: 'UM1',
    type: 'medical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 450,
    description: '၂၀၂၅ ခုနှစ် တက္ကသိုလ်ဝင်စာမေးပွဲတွင် STEAMS-1 (ဓာတုဗေဒ၊ ရူပဗေဒ၊ ဇီဝဗေဒ) ဘာသာတွဲဖြင့် အောင်မြင်ပြီး (၆)ဘာသာ စုစုပေါင်းရမှတ် (၄၅၀) နှင့်အထက် ရရှိသူများ လျှောက်ထားနိုင်သည်။ လူတွေ့/နှုတ်မေးစာမေးပွဲ ဖြေဆိုရမည်။',
    website: null,
    majors: ['Medicine (MB,BS)', 'Dental Surgery (B.D.S)']
  },
  {
    name: 'ဆေးတက္ကသိုလ် (၂) ရန်ကုန်',
    name_en: 'University of Medicine 2, Yangon',
    abbreviation: 'UM2',
    type: 'medical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 450,
    description: '၂၀၂၅ ခုနှစ် တက္ကသိုလ်ဝင်စာမေးပွဲတွင် STEAMS-1 ဘာသာတွဲဖြင့် အောင်မြင်ပြီး စုစုပေါင်းရမှတ် ၄၅၀ နှင့်အထက် ရရှိသူများ လျှောက်ထားနိုင်သည်။',
    website: null,
    majors: ['Medicine (MB,BS)']
  },
  {
    name: 'ဆေးတက္ကသိုလ် မန္တလေး',
    name_en: 'University of Medicine, Mandalay',
    abbreviation: 'UMM',
    type: 'medical',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 450,
    description: '၂၀၂၅ ခုနှစ် တက္ကသိုလ်ဝင်စာမေးပွဲတွင် STEAMS-1 ဘာသာတွဲဖြင့် အောင်မြင်ပြီး စုစုပေါင်းရမှတ် ၄၅၀ နှင့်အထက် ရရှိသူများ လျှောက်ထားနိုင်သည်။',
    website: null,
    majors: ['Medicine (MB,BS)']
  },
  {
    name: 'ဆေးတက္ကသိုလ် မကွေး',
    name_en: 'University of Medicine, Magway',
    abbreviation: 'UMMag',
    type: 'medical',
    state: 'မကွေးတိုင်း',
    city: 'မကွေး',
    min_score: 450,
    description: '၂၀၂၅ ခုနှစ် တက္ကသိုလ်ဝင်စာမေးပွဲတွင် STEAMS-1 ဘာသာတွဲဖြင့် အောင်မြင်ပြီး စုစုပေါင်းရမှတ် ၄၅၀ နှင့်အထက် ရရှိသူများ လျှောက်ထားနိုင်သည်။',
    website: null,
    majors: ['Medicine (MB,BS)']
  },
  {
    name: 'ဆေးတက္ကသိုလ် တောင်ကြီး',
    name_en: 'University of Medicine, Taunggyi',
    abbreviation: 'UMTgyi',
    type: 'medical',
    state: 'ရှမ်းပြည်နယ်',
    city: 'တောင်ကြီး',
    min_score: 450,
    description: '၂၀၂၅ ခုနှစ် တက္ကသိုလ်ဝင်စာမေးပွဲတွင် STEAMS-1 ဘာသာတွဲဖြင့် အောင်မြင်ပြီး စုစုပေါင်းရမှတ် ၄၅၀ နှင့်အထက် ရရှိသူများ လျှောက်ထားနိုင်သည်။',
    website: null,
    majors: ['Medicine (MB,BS)']
  },
  {
    name: 'သွားဘက်ဆိုင်ရာဆေးတက္ကသိုလ် ရန်ကုန်',
    name_en: 'University of Dental Medicine, Yangon',
    abbreviation: 'UDMY',
    type: 'medical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 450,
    description: 'သွားဘက်ဆိုင်ရာဆေးပညာဘွဲ့ (B.D.S) ရရှိနိုင်သည်။ STEAMS-1 ဘာသာတွဲဖြင့် အောင်မြင်ပြီး စုစုပေါင်းရမှတ် ၄၅၀ နှင့်အထက် ရရှိရမည်။ အမျိုးသား ၆၀%၊ အမျိုးသမီး ၄၀% လက်ခံသည်။',
    website: null,
    majors: ['Dental Surgery (B.D.S)']
  },
  {
    name: 'သွားဘက်ဆိုင်ရာဆေးတက္ကသိုလ် မန္တလေး',
    name_en: 'University of Dental Medicine, Mandalay',
    abbreviation: 'UDMM',
    type: 'medical',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 450,
    description: 'သွားဘက်ဆိုင်ရာဆေးပညာဘွဲ့ (B.D.S) ရရှိနိုင်သည်။ STEAMS-1 ဘာသာတွဲဖြင့် အောင်မြင်ပြီး စုစုပေါင်းရမှတ် ၄၅၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Dental Surgery (B.D.S)']
  },
  {
    name: 'ဆေးဝါးတက္ကသိုလ် ရန်ကုန်',
    name_en: 'University of Pharmacy, Yangon',
    abbreviation: 'UPY',
    type: 'medical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 400,
    description: 'ဆေးဝါးပညာဘွဲ့ (B.Pharm) ရရှိနိုင်သည်။ STEAMS-1 ဘာသာတွဲဖြင့် အောင်မြင်သူများ လျှောက်ထားနိုင်သည်။ ၄ နှစ် သင်တန်းဖြစ်သည်။',
    website: null,
    majors: ['Pharmacy (B.Pharm)']
  },
  {
    name: 'ဆေးဝါးတက္ကသိုလ် မန္တလေး',
    name_en: 'University of Pharmacy, Mandalay',
    abbreviation: 'UPM',
    type: 'medical',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 400,
    description: 'ဆေးဝါးပညာဘွဲ့ (B.Pharm) ရရှိနိုင်သည်။ STEAMS-1 ဘာသာတွဲဖြင့် အောင်မြင်သူများ လျှောက်ထားနိုင်သည်။',
    website: null,
    majors: ['Pharmacy (B.Pharm)']
  },
  {
    name: 'ဆေးဘက်ဆိုင်ရာနည်းပညာတက္ကသိုလ် ရန်ကုန်',
    name_en: 'University of Medical Technology, Yangon',
    abbreviation: 'UMTY',
    type: 'medical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 380,
    description: 'ဆေးဘက်ဆိုင်ရာနည်းပညာဘွဲ့ (B.Med.Tech) ရရှိနိုင်သည်။ ဓာတ်ခွဲနည်းပညာ၊ ဓာတ်မှန်နှင့်ပုံရိပ်ဖော်နည်းပညာ၊ ခန္ဓာသန်စွမ်းမှုနည်းပညာ၊ ကျန်းမာရေးသတင်းအချက်အလက်နည်းပညာ၊ ဓာတ်ရောင်ခြည်ကုသမှုနည်းပညာ ဟူ၍ အထူးပြုဘာသာရပ် (၅)မျိုးဖြင့် ဖွင့်လှစ်သည်။',
    website: null,
    majors: ['Medical Technology (B.Med.Tech)']
  },
  {
    name: 'ဆေးဘက်ဆိုင်ရာနည်းပညာတက္ကသိုလ် မန္တလေး',
    name_en: 'University of Medical Technology, Mandalay',
    abbreviation: 'UMTM',
    type: 'medical',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 380,
    description: 'ဆေးဘက်ဆိုင်ရာနည်းပညာဘွဲ့ (B.Med.Tech) ရရှိနိုင်သည်။',
    website: null,
    majors: ['Medical Technology (B.Med.Tech)']
  },
  {
    name: 'သူနာပြုတက္ကသိုလ် ရန်ကုန်',
    name_en: 'University of Nursing, Yangon',
    abbreviation: 'UNY',
    type: 'medical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 370,
    description: 'သူနာပြုသိပ္ပံဘွဲ့ (B.N.Sc) ရရှိနိုင်သည်။ STEAMS-1 ဘာသာတွဲဖြင့် အောင်မြင်သူများ လျှောက်ထားနိုင်သည်။ အမျိုးသမီး ၉၀%၊ အမျိုးသား ၁၀% လက်ခံသည်။',
    website: null,
    majors: ['Nursing Science (B.N.Sc)']
  },
  {
    name: 'သူနာပြုတက္ကသိုလ် မန္တလေး',
    name_en: 'University of Nursing, Mandalay',
    abbreviation: 'UNM',
    type: 'medical',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 370,
    description: 'သူနာပြုသိပ္ပံဘွဲ့ (B.N.Sc) ရရှိနိုင်သည်။',
    website: null,
    majors: ['Nursing Science (B.N.Sc)']
  },
  {
    name: 'အခြေခံကျန်းမာရေးတက္ကသိုလ် မကွေး',
    name_en: 'University of Community Health, Magway',
    abbreviation: 'UCHM',
    type: 'medical',
    state: 'မကွေးတိုင်း',
    city: 'မကွေး',
    min_score: 350,
    description: 'ကျန်းမာရေးသိပ္ပံဘွဲ့ (အခြေခံကျန်းမာရေး) (B.Comm.H) ရရှိနိုင်သည်။ အမျိုးသား ၈၀%၊ အမျိုးသမီး ၂၀% လက်ခံသည်။',
    website: null,
    majors: ['Community Health (B.Comm.H)']
  },
  {
    name: 'တိုင်းရင်းဆေးတက္ကသိုလ် မန္တလေး',
    name_en: 'University of Traditional Medicine, Mandalay',
    abbreviation: 'UTMM',
    type: 'medical',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 350,
    description: 'မြန်မာ့တိုင်းရင်းဆေးပညာဘွဲ့ (B.M.T.M) ရရှိနိုင်သည်။ STEAMS-1 ဘာသာတွဲဖြင့် အောင်မြင်သူများ လျှောက်ထားနိုင်သည်။',
    website: null,
    majors: ['Traditional Medicine (B.M.T.M)']
  },

  // ── Technical Universities (Page 39-55) ──
  {
    name: 'Naypyitaw State Polytechnic University',
    name_en: 'Naypyitaw State Polytechnic University',
    abbreviation: 'NSPU',
    type: 'technical',
    state: 'နေပြည်တော်',
    city: 'နေပြည်တော်',
    min_score: 300,
    description: 'အင်ဂျင်နီယာနှင့် ဗိသုကာသင်တန်းများအတွက် ရူပဗေဒ၊ ဓာတုဗေဒ၊ သင်္ချာ၊ အင်္ဂလိပ်စာ (၄)ဘာသာပေါင်းရမှတ် ၃၀၀ နှင့်အထက် ရရှိရမည်။ ကွန်ပျူတာသိပ္ပံနှင့် ကွန်ပျူတာနည်းပညာသင်တန်းများအတွက် စုစုပေါင်းရမှတ် ၄၅၀ နှင့်အထက် သို့မဟုတ် အင်္ဂလိပ်စာနှင့် သင်္ချာ (၂)ဘာသာပေါင်းရမှတ် ၁၄၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)', 'Computer Engineering (B.E)', 'Agricultural Engineering (B.E)', 'Architecture (B.Arch)', 'Computer Science (B.C.Sc)', 'Computer Technology (B.C.Tech)']
  },
  {
    name: 'ရန်ကုန်နည်းပညာတက္ကသိုလ်',
    name_en: 'Yangon Technological University',
    abbreviation: 'YTU',
    type: 'technical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 300,
    description: 'ရူပဗေဒ၊ ဓာတုဗေဒ၊ သင်္ချာ၊ အင်္ဂလိပ်စာ (၄)ဘာသာပေါင်းရမှတ် ၃၀၀ နှင့်အထက် ရရှိရမည်။ အမျိုးသား ၅၅%၊ အမျိုးသမီး ၄၅% လက်ခံသည်။ သင်တန်းကာလ ၅ နှစ်။',
    website: 'https://ytu.edu.mm',
    majors: ['Civil Engineering (B.E)', 'Mechanical Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Electronic Engineering (B.E)', 'Computer Engineering (B.E)', 'Chemical Engineering (B.E)', 'Mining Engineering (B.E)', 'Petroleum Engineering (B.E)', 'Architecture (B.Arch)']
  },
  {
    name: 'မန္တလေးနည်းပညာတက္ကသိုလ်',
    name_en: 'Mandalay Technological University',
    abbreviation: 'MTU',
    type: 'technical',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 300,
    description: 'အင်ဂျင်နီယာနှင့် ဗိသုကာသင်တန်းများအတွက် ရူပဗေဒ၊ ဓာတုဗေဒ၊ သင်္ချာ၊ အင်္ဂလိပ်စာ (၄)ဘာသာပေါင်းရမှတ် ၃၀၀ နှင့်အထက် ရရှိရမည်။ ဇီဝနည်းပညာသင်တန်းအတွက် ရူပဗေဒ၊ ဓာတုဗေဒ၊ ဇီဝဗေဒ၊ သင်္ချာ (၄)ဘာသာပေါင်းရမှတ် ၂၆၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Mechanical Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Computer Engineering (B.E)', 'Chemical Engineering (B.E)', 'Mining Engineering (B.E)', 'Agricultural Engineering (B.E)', 'Architecture (B.Arch)', 'Biotechnology (B.S)']
  },
  {
    name: 'နည်းပညာတက္ကသိုလ် (ရတနာပုံဆိုက်ဘာစီးတီး)',
    name_en: 'Technological University (Ratanapon Cyber City)',
    abbreviation: 'TU-RCC',
    type: 'technical',
    state: 'မန္တလေးတိုင်း',
    city: 'ရတနာပုံ',
    min_score: 300,
    description: 'ရူပဗေဒ၊ ဓာတုဗေဒ၊ သင်္ချာ၊ အင်္ဂလိပ်စာ (၄)ဘာသာပေါင်းရမှတ် ၃၀၀ နှင့်အထက် ရရှိရမည်။ သင်တန်းကာလ ၅ နှစ်။',
    website: null,
    majors: ['Computer Engineering (B.E)', 'Electronic Engineering (B.E)']
  },
  {
    name: 'မြန်မာနိုင်ငံလေကြောင်းနှင့်အာကာသပညာတက္ကသိုလ်',
    name_en: 'Myanmar Aerospace and Space Engineering University',
    abbreviation: 'MASEU',
    type: 'technical',
    state: 'မန္တလေးတိုင်း',
    city: 'မိတ္ထီလာ',
    min_score: 280,
    description: 'အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒနှင့် ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၈၀ နှင့်အထက် ရရှိရမည်။ အမျိုးသား ၇၀%၊ အမျိုးသမီး ၃၀% လက်ခံသည်။ ကျန်းမာရေးစစ်ဆေးမှု အောင်မြင်ရမည်။',
    website: null,
    majors: ['Aerospace Engineering (B.E)']
  },

  // ── Government Technical Universities (Page 53-55) ──
  {
    name: 'နည်းပညာတက္ကသိုလ် (မန္တလေး)',
    name_en: 'Technological University (Mandalay)',
    abbreviation: 'TU-Mdy',
    type: 'technical',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 240,
    description: 'အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။ အမျိုးသား ၆၀%၊ အမျိုးသမီး ၄၀% လက်ခံသည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'နည်းပညာတက္ကသိုလ် (မုံရွာ)',
    name_en: 'Technological University (Monywa)',
    abbreviation: 'TU-Myw',
    type: 'technical',
    state: 'စစ်ကိုင်းတိုင်း',
    city: 'မုံရွာ',
    min_score: 240,
    description: 'အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'နည်းပညာတက္ကသိုလ် (ကလေး)',
    name_en: 'Technological University (Kalay)',
    abbreviation: 'TU-Kalay',
    type: 'technical',
    state: 'စစ်ကိုင်းတိုင်း',
    city: 'ကလေး',
    min_score: 240,
    description: 'အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'နည်းပညာတက္ကသိုလ် (စစ်ကိုင်း)',
    name_en: 'Technological University (Sagaing)',
    abbreviation: 'TU-Sag',
    type: 'technical',
    state: 'စစ်ကိုင်းတိုင်း',
    city: 'စစ်ကိုင်း',
    min_score: 240,
    description: 'အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'နည်းပညာတက္ကသိုလ် (ကျောက်ဆည်)',
    name_en: 'Technological University (Kyaukse)',
    abbreviation: 'TU-KS',
    type: 'technical',
    state: 'မန္တလေးတိုင်း',
    city: 'ကျောက်ဆည်',
    min_score: 240,
    description: 'အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'နည်းပညာတက္ကသိုလ် (မိတ္ထီလာ)',
    name_en: 'Technological University (Meiktila)',
    abbreviation: 'TU-Mkt',
    type: 'technical',
    state: 'မန္တလေးတိုင်း',
    city: 'မိတ္ထီလာ',
    min_score: 240,
    description: 'အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'နည်းပညာတက္ကသိုလ် (ရမည်းသင်း)',
    name_en: 'Technological University (Yamethin)',
    abbreviation: 'TU-Yam',
    type: 'technical',
    state: 'မန္တလေးတိုင်း',
    city: 'ရမည်းသင်း',
    min_score: 240,
    description: 'အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'နည်းပညာတက္ကသိုလ် (မကွေး)',
    name_en: 'Technological University (Magway)',
    abbreviation: 'TU-Mag',
    type: 'technical',
    state: 'မကွေးတိုင်း',
    city: 'မကွေး',
    min_score: 240,
    description: 'အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'နည်းပညာတက္ကသိုလ် (ပခုက္ကူ)',
    name_en: 'Technological University (Pakokku)',
    abbreviation: 'TU-Pkk',
    type: 'technical',
    state: 'မကွေးတိုင်း',
    city: 'ပခုက္ကူ',
    min_score: 240,
    description: 'အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'နည်းပညာတက္ကသိုလ် (တောင်ကြီး)',
    name_en: 'Technological University (Taunggyi)',
    abbreviation: 'TU-Tgy',
    type: 'technical',
    state: 'ရှမ်းပြည်နယ်',
    city: 'တောင်ကြီး',
    min_score: 240,
    description: 'အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'နည်းပညာတက္ကသိုလ် (လွိုင်ကော်)',
    name_en: 'Technological University (Loikaw)',
    abbreviation: 'TU-Lkw',
    type: 'technical',
    state: 'ကယားပြည်နယ်',
    city: 'လွိုင်ကော်',
    min_score: 240,
    description: 'အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'နည်းပညာတက္ကသိုလ် (တောင်ငူ)',
    name_en: 'Technological University (Taungoo)',
    abbreviation: 'TU-Tgo',
    type: 'technical',
    state: 'ပဲခူးတိုင်း',
    city: 'တောင်ငူ',
    min_score: 240,
    description: 'အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'နည်းပညာတက္ကသိုလ် (စစ်တွေ)',
    name_en: 'Technological University (Sittwe)',
    abbreviation: 'TU-Stw',
    type: 'technical',
    state: 'ရခိုင်ပြည်နယ်',
    city: 'စစ်တွေ',
    min_score: 240,
    description: 'အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'ပြည်နည်းပညာတက္ကသိုလ်',
    name_en: 'Pyay Technological University',
    abbreviation: 'PTU',
    type: 'technical',
    state: 'ပဲခူးတိုင်း',
    city: 'ပြည်',
    min_score: 240,
    description: 'အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'ရန်ကုန်အနောက်ပိုင်းနည်းပညာတက္ကသိုလ်',
    name_en: 'Yangon Western Technological University',
    abbreviation: 'YWTU',
    type: 'technical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 240,
    description: 'အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'နည်းပညာတက္ကသိုလ် (မှော်ဘီ)',
    name_en: 'Technological University (Hmawbi)',
    abbreviation: 'TU-Hmawbi',
    type: 'technical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'မှော်ဘီ',
    min_score: 240,
    description: 'အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'နည်းပညာတက္ကသိုလ် (သန်လျင်)',
    name_en: 'Technological University (Thanlyin)',
    abbreviation: 'TU-Thanlyin',
    type: 'technical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'သန်လျင်',
    min_score: 240,
    description: 'အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'နည်းပညာတက္ကသိုလ် (ပုသိမ်)',
    name_en: 'Technological University (Pathein)',
    abbreviation: 'TU-Pathein',
    type: 'technical',
    state: 'ဧရာဝတီတိုင်း',
    city: 'ပုသိမ်',
    min_score: 240,
    description: 'အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'နည်းပညာတက္ကသိုလ် (ဟင်္သာတ)',
    name_en: 'Technological University (Hinthada)',
    abbreviation: 'TU-Hinthada',
    type: 'technical',
    state: 'ဧရာဝတီတိုင်း',
    city: 'ဟင်္သာတ',
    min_score: 240,
    description: 'အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'နည်းပညာတက္ကသိုလ် (ဘားအံ)',
    name_en: 'Technological University (Hpa-an)',
    abbreviation: 'TU-Hpaan',
    type: 'technical',
    state: 'ကရင်ပြည်နယ်',
    city: 'ဘားအံ',
    min_score: 240,
    description: 'အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'နည်းပညာတက္ကသိုလ် (မော်လမြိုင်)',
    name_en: 'Technological University (Mawlamyine)',
    abbreviation: 'TU-Maw',
    type: 'technical',
    state: 'မွန်ပြည်နယ်',
    city: 'မော်လမြိုင်',
    min_score: 240,
    description: 'အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },

  // ── Government Technology Colleges (Page 55-57) ──
  {
    name: 'အစိုးရနည်းပညာကောလိပ် (ရွှေဘိုး)',
    name_en: 'Government Technical College (Shwebo)',
    abbreviation: 'GTC-Shwebo',
    type: 'technical',
    state: 'စစ်ကိုင်းတိုင်း',
    city: 'ရွှေဘိုး',
    min_score: 240,
    description: 'B.Tech ဘွဲ့ ၄ နှစ် သင်တန်း။ အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'အစိုးရနည်းပညာကောလိပ် (မန္တလေး)',
    name_en: 'Government Technical College (Mandalay)',
    abbreviation: 'GTC-Mdy',
    type: 'technical',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 240,
    description: 'B.Tech ဘွဲ့ ၄ နှစ် သင်တန်း။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'အစိုးရနည်းပညာကောလိပ် (ကျောက်ဖြူ)',
    name_en: 'Government Technical College (Kyaukphyu)',
    abbreviation: 'GTC-Kyaukphyu',
    type: 'technical',
    state: 'ရခိုင်ပြည်နယ်',
    city: 'ကျောက်ဖြူ',
    min_score: 240,
    description: 'B.Tech ဘွဲ့ ၄ နှစ် သင်တန်း။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'အစိုးရနည်းပညာကောလိပ် (တောင်ဒဂုံ)',
    name_en: 'Government Technical College (South Dagon)',
    abbreviation: 'GTC-SDagon',
    type: 'technical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'တောင်ဒဂုံ',
    min_score: 240,
    description: 'B.Tech ဘွဲ့ ၄ နှစ် သင်တန်း။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },

  // ── Computer Universities (Page 57-61) ──
  {
    name: 'ရန်ကုန်ကွန်ပျူတာတက္ကသိုလ်',
    name_en: 'University of Computer Studies, Yangon',
    abbreviation: 'UCSY',
    type: 'technical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 450,
    description: 'စုစုပေါင်းရမှတ် ၄၅၀ နှင့်အထက် သို့မဟုတ် အင်္ဂလိပ်စာနှင့် သင်္ချာ (၂)ဘာသာပေါင်းရမှတ် ၁၄၀ နှင့်အထက် ရရှိရမည်။ သင်တန်းကာလ ၄ နှစ်။ Software Engineering, Knowledge Engineering, Business Information Systems, Computer Security and Forensics, High Performance Computing စသည့် အထူးပြုဘာသာရပ်များဖြင့် ဖွင့်လှစ်သည်။',
    website: 'https://ucsy.edu.mm',
    majors: ['Computer Science (B.C.Sc)', 'Computer Technology (B.C.Tech)']
  },
  {
    name: 'သတင်းအချက်အလက်နည်းပညာတက္ကသိုလ်',
    name_en: 'University of Information Technology',
    abbreviation: 'UIT',
    type: 'technical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 450,
    description: 'စုစုပေါင်းရမှတ် ၄၅၀ နှင့်အထက် ရရှိရမည်။ သင်တန်းကာလ ၄ နှစ်။',
    website: null,
    majors: ['Computer Science (B.C.Sc)', 'Computer Technology (B.C.Tech)']
  },
  {
    name: 'မန္တလေးကွန်ပျူတာတက္ကသိုလ်',
    name_en: 'University of Computer Studies, Mandalay',
    abbreviation: 'UCSM',
    type: 'technical',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 430,
    description: 'စုစုပေါင်းရမှတ် ၄၃၀ နှင့်အထက် သို့မဟုတ် အင်္ဂလိပ်စာနှင့် သင်္ချာ (၂)ဘာသာပေါင်းရမှတ် ၁၄၀ နှင့်အထက် ရရှိရမည်။ သင်တန်းကာလ ၄ နှစ်။',
    website: null,
    majors: ['Computer Science (B.C.Sc)', 'Computer Technology (B.C.Tech)']
  },
  {
    name: 'ကွန်ပျူတာတက္ကသိုလ် (မုံရွာ)',
    name_en: 'University of Computer Studies (Monywa)',
    abbreviation: 'UCS-Monywa',
    type: 'technical',
    state: 'စစ်ကိုင်းတိုင်း',
    city: 'မုံရွာ',
    min_score: 320,
    description: 'စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Computer Science (B.C.Sc)']
  },
  {
    name: 'ကွန်ပျူတာတက္ကသိုလ် (ကလေး)',
    name_en: 'University of Computer Studies (Kalay)',
    abbreviation: 'UCS-Kalay',
    type: 'technical',
    state: 'စစ်ကိုင်းတိုင်း',
    city: 'ကလေး',
    min_score: 320,
    description: 'စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Computer Science (B.C.Sc)']
  },
  {
    name: 'ကွန်ပျူတာတက္ကသိုလ် (မန္တလေး)',
    name_en: 'University of Computer Studies (Mandalay)',
    abbreviation: 'UCS-Mdy',
    type: 'technical',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 320,
    description: 'စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Computer Science (B.C.Sc)']
  },
  {
    name: 'ကွန်ပျူတာတက္ကသိုလ် (မိတ္ထီလာ)',
    name_en: 'University of Computer Studies (Meiktila)',
    abbreviation: 'UCS-Mkt',
    type: 'technical',
    state: 'မန္တလေးတိုင်း',
    city: 'မိတ္ထီလာ',
    min_score: 320,
    description: 'စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Computer Science (B.C.Sc)']
  },
  {
    name: 'ကွန်ပျူတာတက္ကသိုလ် (မကွေး)',
    name_en: 'University of Computer Studies (Magway)',
    abbreviation: 'UCS-Mag',
    type: 'technical',
    state: 'မကွေးတိုင်း',
    city: 'မကွေး',
    min_score: 320,
    description: 'စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Computer Science (B.C.Sc)']
  },
  {
    name: 'ကွန်ပျူတာတက္ကသိုလ် (ပခုက္ကူ)',
    name_en: 'University of Computer Studies (Pakokku)',
    abbreviation: 'UCS-Pkk',
    type: 'technical',
    state: 'မကွေးတိုင်း',
    city: 'ပခုက္ကူ',
    min_score: 320,
    description: 'စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Computer Science (B.C.Sc)']
  },
  {
    name: 'ကွန်ပျူတာတက္ကသိုလ် (တောင်ကြီး)',
    name_en: 'University of Computer Studies (Taunggyi)',
    abbreviation: 'UCS-Tgy',
    type: 'technical',
    state: 'ရှမ်းပြည်နယ်',
    city: 'တောင်ကြီး',
    min_score: 320,
    description: 'စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Computer Science (B.C.Sc)']
  },
  {
    name: 'ကွန်ပျူတာတက္ကသိုလ် (လွိုင်ကော်)',
    name_en: 'University of Computer Studies (Loikaw)',
    abbreviation: 'UCS-Lkw',
    type: 'technical',
    state: 'ကယားပြည်နယ်',
    city: 'လွိုင်ကော်',
    min_score: 320,
    description: 'စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Computer Science (B.C.Sc)']
  },
  {
    name: 'ကွန်ပျူတာတက္ကသိုလ် (တောင်ငူ)',
    name_en: 'University of Computer Studies (Taungoo)',
    abbreviation: 'UCS-Tgo',
    type: 'technical',
    state: 'ပဲခူးတိုင်း',
    city: 'တောင်ငူ',
    min_score: 320,
    description: 'စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Computer Science (B.C.Sc)']
  },
  {
    name: 'ကွန်ပျူတာတက္ကသိုလ် (စစ်တွေ)',
    name_en: 'University of Computer Studies (Sittwe)',
    abbreviation: 'UCS-Stw',
    type: 'technical',
    state: 'ရခိုင်ပြည်နယ်',
    city: 'စစ်တွေ',
    min_score: 320,
    description: 'စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Computer Science (B.C.Sc)']
  },
  {
    name: 'ကွန်ပျူတာတက္ကသိုလ် (ပြည်)',
    name_en: 'University of Computer Studies (Pyay)',
    abbreviation: 'UCS-Pyay',
    type: 'technical',
    state: 'ပဲခူးတိုင်း',
    city: 'ပြည်',
    min_score: 320,
    description: 'စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Computer Science (B.C.Sc)']
  },
  {
    name: 'ကွန်ပျူတာတက္ကသိုလ် (ပုသိမ်)',
    name_en: 'University of Computer Studies (Pathein)',
    abbreviation: 'UCS-Pathein',
    type: 'technical',
    state: 'ဧရာဝတီတိုင်း',
    city: 'ပုသိမ်',
    min_score: 320,
    description: 'စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Computer Science (B.C.Sc)']
  },
  {
    name: 'ကွန်ပျူတာတက္ကသိုလ် (ဟင်္သာတ)',
    name_en: 'University of Computer Studies (Hinthada)',
    abbreviation: 'UCS-Hinthada',
    type: 'technical',
    state: 'ဧရာဝတီတိုင်း',
    city: 'ဟင်္သာတ',
    min_score: 320,
    description: 'စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Computer Science (B.C.Sc)']
  },
  {
    name: 'ကွန်ပျူတာတက္ကသိုလ် (ဘားအံ)',
    name_en: 'University of Computer Studies (Hpa-an)',
    abbreviation: 'UCS-Hpaan',
    type: 'technical',
    state: 'ကရင်ပြည်နယ်',
    city: 'ဘားအံ',
    min_score: 320,
    description: 'စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Computer Science (B.C.Sc)']
  },
  {
    name: 'ကွန်ပျူတာတက္ကသိုလ် (သထုံ)',
    name_en: 'University of Computer Studies (Thaton)',
    abbreviation: 'UCS-Thaton',
    type: 'technical',
    state: 'မွန်ပြည်နယ်',
    city: 'သထုံ',
    min_score: 320,
    description: 'စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Computer Science (B.C.Sc)']
  },

  // ── Polytechnic Universities (Page 62-66) ──
  {
    name: 'Polytechnic University (မြစ်ကြီးနား)',
    name_en: 'Polytechnic University (Myitkyina)',
    abbreviation: 'PU-Myitkyina',
    type: 'technical',
    state: 'ကချင်ပြည်နယ်',
    city: 'မြစ်ကြီးနား',
    min_score: 240,
    description: 'အင်ဂျင်နီယာသင်တန်းများအတွက် ရူပဗေဒ၊ ဓာတုဗေဒ၊ သင်္ချာ၊ အင်္ဂလိပ်စာ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။ ကွန်ပျူတာသင်တန်းများအတွက် စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)', 'Computer Science (B.C.Sc)', 'Computer Technology (B.C.Tech)']
  },
  {
    name: 'Polytechnic University (ဗန်းမော်)',
    name_en: 'Polytechnic University (Bhamo)',
    abbreviation: 'PU-Bhamo',
    type: 'technical',
    state: 'ကချင်ပြည်နယ်',
    city: 'ဗန်းမော်',
    min_score: 240,
    description: 'အင်ဂျင်နီယာသင်တန်းများအတွက် ရူပဗေဒ၊ ဓာတုဗေဒ၊ သင်္ချာ၊ အင်္ဂလိပ်စာ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။ ကွန်ပျူတာသင်တန်းများအတွက် စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)', 'Computer Science (B.C.Sc)', 'Computer Technology (B.C.Tech)']
  },
  {
    name: 'Polytechnic University (လားရှိုး)',
    name_en: 'Polytechnic University (Lashio)',
    abbreviation: 'PU-Lashio',
    type: 'technical',
    state: 'ရှမ်းပြည်နယ်',
    city: 'လားရှိုး',
    min_score: 240,
    description: 'အင်ဂျင်နီယာသင်တန်းများအတွက် ရူပဗေဒ၊ ဓာတုဗေဒ၊ သင်္ချာ၊ အင်္ဂလိပ်စာ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။ ကွန်ပျူတာသင်တန်းများအတွက် စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)', 'Computer Science (B.C.Sc)', 'Computer Technology (B.C.Tech)']
  },
  {
    name: 'Polytechnic University (ကျိုင်းတုံ)',
    name_en: 'Polytechnic University (Kengtung)',
    abbreviation: 'PU-Kengtung',
    type: 'technical',
    state: 'ရှမ်းပြည်နယ်',
    city: 'ကျိုင်းတုံ',
    min_score: 240,
    description: 'အင်ဂျင်နီယာသင်တန်းများအတွက် ရူပဗေဒ၊ ဓာတုဗေဒ၊ သင်္ချာ၊ အင်္ဂလိပ်စာ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။ ကွန်ပျူတာသင်တန်းများအတွက် စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)', 'Computer Science (B.C.Sc)', 'Computer Technology (B.C.Tech)']
  },
  {
    name: 'Polytechnic University (ပင်လုံ)',
    name_en: 'Polytechnic University (Panglong)',
    abbreviation: 'PU-Panglong',
    type: 'technical',
    state: 'ရှမ်းပြည်နယ်',
    city: 'ပင်လုံ',
    min_score: 240,
    description: 'အင်ဂျင်နီယာသင်တန်းများအတွက် ရူပဗေဒ၊ ဓာတုဗေဒ၊ သင်္ချာ၊ အင်္ဂလိပ်စာ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။ ကွန်ပျူတာသင်တန်းများအတွက် စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)', 'Computer Science (B.C.Sc)', 'Computer Technology (B.C.Tech)']
  },
  {
    name: 'Polytechnic University (မအူပင်)',
    name_en: 'Polytechnic University (Maubin)',
    abbreviation: 'PU-Maubin',
    type: 'technical',
    state: 'ဧရာဝတီတိုင်း',
    city: 'မအူပင်',
    min_score: 240,
    description: 'အင်ဂျင်နီယာသင်တန်းများအတွက် ရူပဗေဒ၊ ဓာတုဗေဒ၊ သင်္ချာ၊ အင်္ဂလိပ်စာ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။ ကွန်ပျူတာသင်တန်းများအတွက် စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)', 'Computer Science (B.C.Sc)', 'Computer Technology (B.C.Tech)']
  },
  {
    name: 'Polytechnic University (ထားဝယ်)',
    name_en: 'Polytechnic University (Dawei)',
    abbreviation: 'PU-Dawei',
    type: 'technical',
    state: 'တနင်္သာရီတိုင်း',
    city: 'ထားဝယ်',
    min_score: 240,
    description: 'အင်ဂျင်နီယာသင်တန်းများအတွက် ရူပဗေဒ၊ ဓာတုဗေဒ၊ သင်္ချာ၊ အင်္ဂလိပ်စာ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။ ကွန်ပျူတာသင်တန်းများအတွက် စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)', 'Computer Science (B.C.Sc)', 'Computer Technology (B.C.Tech)']
  },
  {
    name: 'Polytechnic University (မြိတ်)',
    name_en: 'Polytechnic University (Myeik)',
    abbreviation: 'PU-Myeik',
    type: 'technical',
    state: 'တနင်္သာရီတိုင်း',
    city: 'မြိတ်',
    min_score: 240,
    description: 'အင်ဂျင်နီယာသင်တန်းများအတွက် ရူပဗေဒ၊ ဓာတုဗေဒ၊ သင်္ချာ၊ အင်္ဂလိပ်စာ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။ ကွန်ပျူတာသင်တန်းများအတွက် စုစုပေါင်းရမှတ် ၃၂၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electronic Engineering (B.E)', 'Electrical Power Engineering (B.E)', 'Mechanical Engineering (B.E)', 'Computer Science (B.C.Sc)', 'Computer Technology (B.C.Tech)']
  },

  // ── Arts & Science Universities (Page 66-71) ──
  {
    name: 'Naypyitaw State Academy',
    name_en: 'Naypyitaw State Academy',
    abbreviation: 'NSA',
    type: 'government',
    state: 'နေပြည်တော်',
    city: 'နေပြည်တော်',
    min_score: 350,
    description: 'ဝိဇ္ဇာဘာသာရပ်၊ သိပ္ပံဘာသာရပ်၊ စီးပွားရေးပညာဘာသာရပ်များဖြင့် ဖွင့်လှစ်ထားသည်။ နေပြည်တော်တွင် တာဝန်ထမ်းဆောင်နေသော နိုင်ငံ့ဝန်ထမ်းမိသားစု၏ သားသမီးများနှင့် နေပြည်တော် (၈)မြို့နယ်မှ ကျောင်းသား/ကျောင်းသူများအား ဝင်ခွင့်ပြုသည်။',
    website: null,
    majors: ['Myanmar (B.A)', 'English (B.A)', 'Geography (B.A)', 'History (B.A)', 'Philosophy (B.A)', 'Oriental Studies (B.A)', 'Library Science (B.A)', 'Economics (B.Econ)', 'Commerce (B.Com)', 'Accounting (B.Act)', 'Business Administration (BBA)', 'Tourism and Hospitality Management (BTHM)']
  },
  {
    name: 'ရန်ကုန်တက္ကသိုလ်',
    name_en: 'University of Yangon',
    abbreviation: 'UY',
    type: 'government',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 350,
    description: 'မြန်မာနိုင်ငံ၏ အဟောင်းဆုံးနှင့် အမှတ်အသားရှိဆုံး တက္ကသိုလ်။ ဝိဇ္ဇာဘာသာရပ် (B.A) နှင့် သိပ္ပံဘာသာရပ် (B.Sc) များဖြင့် ဖွင့်လှစ်ထားသည်။',
    website: 'https://uy.edu.mm',
    majors: ['Myanmar (B.A)', 'Myanmar Studies (B.A)', 'English (B.A)', 'Geography (B.A)', 'History (B.A)', 'Philosophy (B.A)', 'Psychology (B.A)', 'Oriental Studies (B.A)', 'Archaeology (B.A)', 'Library Science (B.A)', 'Physics (B.Sc)', 'Chemistry (B.Sc)', 'Biology (B.Sc)', 'Mathematics (B.Sc)', 'Geology (B.Sc)', 'Microbiology (B.Sc)', 'Environmental Science (B.Sc)']
  },
  {
    name: 'မန္တလေးတက္ကသိုလ်',
    name_en: 'University of Mandalay',
    abbreviation: 'UMdy',
    type: 'government',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 350,
    description: 'အထက်မြန်မာနိုင်ငံ၏ အကောင်းဆုံး တက္ကသိုလ်။ ဝိဇ္ဇာဘာသာရပ် (B.A) နှင့် သိပ္ပံဘာသာရပ် (B.Sc) များဖြင့် ဖွင့်လှစ်ထားသည်။',
    website: null,
    majors: ['Myanmar (B.A)', 'Myanmar Studies (B.A)', 'English (B.A)', 'Geography (B.A)', 'History (B.A)', 'Philosophy (B.A)', 'Psychology (B.A)', 'Oriental Studies (B.A)', 'Archaeology (B.A)', 'Physics (B.Sc)', 'Chemistry (B.Sc)', 'Biology (B.Sc)', 'Mathematics (B.Sc)', 'Geology (B.Sc)', 'Microbiology (B.Sc)']
  },

  // ── Business Universities (Page 71-75) ──
  {
    name: 'ရန်ကုန်စီးပွားရေးတက္ကသိုလ် (လှိုင်နယ်မြေ)',
    name_en: 'Yangon University of Economics (Hlaing Campus)',
    abbreviation: 'YUE-Hlaing',
    type: 'business',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 380,
    description: 'စီးပွားရေးပညာဘာသာရပ်များဖြင့် ဖွင့်လှစ်ထားသည်။ B.Econ (Economics), B.Econ (Statistics), B.Com, B.Act, BBA, B.A.S စသည့် ဘွဲ့များ ရရှိနိုင်သည်။',
    website: null,
    majors: ['Economics (B.Econ)', 'Economics (B.Econ Statistics)', 'Commerce (B.Com)', 'Accounting (B.Act)', 'Business Administration (BBA)', 'Actuarial Science (B.A.S)']
  },
  {
    name: 'ရန်ကုန်စီးပွားရေးတက္ကသိုလ် (ရှာသာကြီးနယ်မြေ)',
    name_en: 'Yangon University of Economics (Shartha Campus)',
    abbreviation: 'YUE-Shartha',
    type: 'business',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 380,
    description: 'စီးပွားရေးပညာဘာသာရပ်များဖြင့် ဖွင့်လှစ်ထားသည်။',
    website: null,
    majors: ['Economics (B.Econ)', 'Economics (B.Econ Statistics)', 'Commerce (B.Com)', 'Accounting (B.Act)', 'Business Administration (BBA)']
  },
  {
    name: 'မုံရွာစီးပွားရေးတက္ကသိုလ်',
    name_en: 'Monywa University of Economics',
    abbreviation: 'MUE',
    type: 'business',
    state: 'စစ်ကိုင်းတိုင်း',
    city: 'မုံရွာ',
    min_score: 370,
    description: 'မုံရွာမြို့ရှိ စီးပွားရေးတက္ကသိုလ်။',
    website: null,
    majors: ['Economics (B.Econ)', 'Commerce (B.Com)', 'Accounting (B.Act)']
  },
  {
    name: 'မိတ္ထီလာစီးပွားရေးတက္ကသိုလ်',
    name_en: 'Meiktila University of Economics',
    abbreviation: 'MktUE',
    type: 'business',
    state: 'မန္တလေးတိုင်း',
    city: 'မိတ္ထီလာ',
    min_score: 370,
    description: 'မိတ္ထီလာမြို့ရှိ စီးပွားရေးတက္ကသိုလ်။',
    website: null,
    majors: ['Economics (B.Econ)', 'Commerce (B.Com)', 'Accounting (B.Act)']
  },

  // ── Education Universities (Page 75-77) ──
  {
    name: 'ရန်ကုန်ပညာရေးတက္ကသိုလ်',
    name_en: 'Yangon University of Education',
    abbreviation: 'UEdY',
    type: 'education',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 350,
    description: 'ပညာရေးဘွဲ့ (B.Ed) ၅ နှစ် သင်တန်း။ ဆရာ/ဆရာမ ဖြစ်ရန် လေ့ကျင့်သင်ကြားပေးသည်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'စစ်ကိုင်းပညာရေးတက္ကသိုလ်',
    name_en: 'Sagaing University of Education',
    abbreviation: 'UEdS',
    type: 'education',
    state: 'စစ်ကိုင်းတိုင်း',
    city: 'စစ်ကိုင်း',
    min_score: 350,
    description: 'ပညာရေးဘွဲ့ (B.Ed) ၅ နှစ် သင်တန်း။',
    website: null,
    majors: ['Education (B.Ed)']
  },

  // ── Law Universities (Page 77) ──
  {
    name: 'ရန်ကုန်ဥပဒေတက္ကသိုလ်',
    name_en: 'Yangon University of Law',
    abbreviation: 'ULY',
    type: 'law',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 370,
    description: 'ဥပဒေဘွဲ့ (LL.B) ၅ နှစ် သင်တန်း။ Bar Exam ဖြေဆိုပြီး Advocate License ရရှိနိုင်သည်။',
    website: null,
    majors: ['Law (LL.B)', 'Law (B.A Law)']
  },
  {
    name: 'မန္တလေးဥပဒေတက္ကသိုလ်',
    name_en: 'Mandalay University of Law',
    abbreviation: 'ULM',
    type: 'law',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 365,
    description: 'ဥပဒေဘွဲ့ (LL.B) ၅ နှစ် သင်တန်း။',
    website: null,
    majors: ['Law (LL.B)', 'Law (B.A Law)']
  },

  // ── Foreign Languages Universities (Page 77-79) ──
  {
    name: 'ရန်ကုန်နိုင်ငံခြားဘာသာတက္ကသိုလ်',
    name_en: 'Yangon University of Foreign Languages',
    abbreviation: 'YUFL',
    type: 'government',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 340,
    description: 'နိုင်ငံခြားဘာသာဘာသာရပ်များဖြင့် ဖွင့်လှစ်ထားသည်။ အင်္ဂလိပ်စာဘာသာရပ်အတွက် အင်္ဂလိပ်စာ ရမှတ် ၆၀ နှင့်အထက် ရရှိရမည်။',
    website: null,
    majors: ['Chinese (B.A)', 'English (B.A)', 'French (B.A)', 'German (B.A)', 'Japanese (B.A)', 'Korean (B.A)', 'Russian (B.A)', 'Thai (B.A)']
  },
  {
    name: 'မန္တလေးနိုင်ငံခြားဘာသာတက္ကသိုလ်',
    name_en: 'Mandalay University of Foreign Languages',
    abbreviation: 'MUFL',
    type: 'government',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 335,
    description: 'မန္တလေးမြို့ရှိ နိုင်ငံခြားဘာသာတက္ကသိုလ်။',
    website: null,
    majors: ['Chinese (B.A)', 'English (B.A)', 'French (B.A)', 'German (B.A)', 'Japanese (B.A)', 'Korean (B.A)']
  },

  // ── Education Colleges (Page 79-80) ──
  {
    name: 'မြစ်ကြီးနားပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Myitkyina Education Degree College',
    abbreviation: 'EDC-Myitkyina',
    type: 'education',
    state: 'ကချင်ပြည်နယ်',
    city: 'မြစ်ကြီးနား',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ် - B.Sc (Education)/B.A (Education) ဘွဲ့ ၄ နှစ် သင်တန်း။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'လွိုင်ကော်ပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Loikaw Education Degree College',
    abbreviation: 'EDC-Loikaw',
    type: 'education',
    state: 'ကယားပြည်နယ်',
    city: 'လွိုင်ကော်',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'ဘားအံပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Hpa-an Education Degree College',
    abbreviation: 'EDC-Hpaan',
    type: 'education',
    state: 'ကရင်ပြည်နယ်',
    city: 'ဘားအံ',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'ဟားခါးပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Hakha Education Degree College',
    abbreviation: 'EDC-Hakha',
    type: 'education',
    state: 'ချင်းပြည်နယ်',
    city: 'ဟားခါး',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'စစ်ကိုင်းပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Sagaing Education Degree College',
    abbreviation: 'EDC-Sagaing',
    type: 'education',
    state: 'စစ်ကိုင်းတိုင်း',
    city: 'စစ်ကိုင်း',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'မုံရွာပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Monywa Education Degree College',
    abbreviation: 'EDC-Monywa',
    type: 'education',
    state: 'စစ်ကိုင်းတိုင်း',
    city: 'မုံရွာ',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'ကသာပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Katha Education Degree College',
    abbreviation: 'EDC-Katha',
    type: 'education',
    state: 'စစ်ကိုင်းတိုင်း',
    city: 'ကသာ',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'ထားဝယ်ပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Dawei Education Degree College',
    abbreviation: 'EDC-Dawei',
    type: 'education',
    state: 'တနင်္သာရီတိုင်း',
    city: 'ထားဝယ်',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'တောင်ငူပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Taungoo Education Degree College',
    abbreviation: 'EDC-Taungoo',
    type: 'education',
    state: 'ပဲခူးတိုင်း',
    city: 'တောင်ငူ',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'ပြည်မြို့ပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Pyay Education Degree College',
    abbreviation: 'EDC-Pyay',
    type: 'education',
    state: 'ပဲခူးတိုင်း',
    city: 'ပြည်',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'မကွေးပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Magway Education Degree College',
    abbreviation: 'EDC-Magway',
    type: 'education',
    state: 'မကွေးတိုင်း',
    city: 'မကွေး',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'ပခုက္ကူပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Pakokku Education Degree College',
    abbreviation: 'EDC-Pakokku',
    type: 'education',
    state: 'မကွေးတိုင်း',
    city: 'ပခုက္ကူ',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'မန္တလေးပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Mandalay Education Degree College',
    abbreviation: 'EDC-Mandalay',
    type: 'education',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'မိတ္ထီလာပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Meiktila Education Degree College',
    abbreviation: 'EDC-Meiktila',
    type: 'education',
    state: 'မန္တလေးတိုင်း',
    city: 'မိတ္ထီလာ',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'မော်လမြိုင်ပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Mawlamyine Education Degree College',
    abbreviation: 'EDC-Mawlamyine',
    type: 'education',
    state: 'မွန်ပြည်နယ်',
    city: 'မော်လမြိုင်',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'ကျောက်ဖြူပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Kyaukphyu Education Degree College',
    abbreviation: 'EDC-Kyaukphyu',
    type: 'education',
    state: 'ရခိုင်ပြည်နယ်',
    city: 'ကျောက်ဖြူ',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'ရန်ကင်းပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Yankin Education Degree College',
    abbreviation: 'EDC-Yankin',
    type: 'education',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကင်း',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'လှည်းကူးပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Hlegu Education Degree College',
    abbreviation: 'EDC-Hlegu',
    type: 'education',
    state: 'ရန်ကုန်တိုင်း',
    city: 'လှည်းကူး',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'သက်န်းကျွန်းပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Thetkyun Education Degree College',
    abbreviation: 'EDC-Thetkyun',
    type: 'education',
    state: 'ရန်ကုန်တိုင်း',
    city: 'သက်န်းကျွန်း',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'တောင်ကြီးပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Taunggyi Education Degree College',
    abbreviation: 'EDC-Taunggyi',
    type: 'education',
    state: 'ရှမ်းပြည်နယ်',
    city: 'တောင်ကြီး',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'လားရှိုးပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Lashio Education Degree College',
    abbreviation: 'EDC-Lashio',
    type: 'education',
    state: 'ရှမ်းပြည်နယ်',
    city: 'လားရှိုး',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'ကျိုင်းတုံပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Kengtung Education Degree College',
    abbreviation: 'EDC-Kengtung',
    type: 'education',
    state: 'ရှမ်းပြည်နယ်',
    city: 'ကျိုင်းတုံ',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'ပုသိမ်ပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Pathein Education Degree College',
    abbreviation: 'EDC-Pathein',
    type: 'education',
    state: 'ဧရာဝတီတိုင်း',
    city: 'ပုသိမ်',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'မြောင်းမြပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Myangmya Education Degree College',
    abbreviation: 'EDC-Myangmya',
    type: 'education',
    state: 'ဧရာဝတီတိုင်း',
    city: 'မြောင်းမြ',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'ဘိုကလေးပညာရေးဒီဂရီကောလိပ်',
    name_en: 'Bogale Education Degree College',
    abbreviation: 'EDC-Bogale',
    type: 'education',
    state: 'ဧရာဝတီတိုင်း',
    city: 'ဘိုကလေး',
    min_score: 330,
    description: 'ပညာရေးဒီဂရီကောလိပ်။',
    website: null,
    majors: ['Education (B.Ed)']
  },

  // ── Distance Education Universities (Page 155-163) ──
  {
    name: 'ရန်ကုန်အဝေးသင်တက္ကသိုလ်',
    name_en: 'Yangon University of Distance Education',
    abbreviation: 'YUDE',
    type: 'distance',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 300,
    description: 'အဝေးသင်သင်တန်းများဖြင့် ဖွင့်လှစ်ထားသည်။ ဝိဇ္ဇာဘာသာရပ်၊ သိပ္ပံဘာသာရပ်၊ ဥပဒေပညာ၊ စီးပွားရေးပညာ၊ စီးပွားစီမံပညာဘာသာရပ်များဖြင့် ဖွင့်လှစ်သည်။',
    website: 'https://www.yude.edu.mm',
    majors: ['Myanmar (B.A)', 'English (B.A)', 'Geography (B.A)', 'History (B.A)', 'Philosophy (B.A)', 'Psychology (B.A)', 'Oriental Studies (B.A)', 'Law (B.A Law)', 'Economics (B.Econ)', 'Business Administration (BBA)', 'Physics (B.Sc)', 'Chemistry (B.Sc)', 'Mathematics (B.Sc)', 'Zoology (B.Sc)', 'Botany (B.Sc)']
  },
  {
    name: 'မန္တလေးအဝေးသင်တက္ကသိုလ်',
    name_en: 'Mandalay University of Distance Education',
    abbreviation: 'MUDE',
    type: 'distance',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 300,
    description: 'အဝေးသင်သင်တန်းများဖြင့် ဖွင့်လှစ်ထားသည်။',
    website: null,
    majors: ['Myanmar (B.A)', 'English (B.A)', 'Geography (B.A)', 'History (B.A)', 'Philosophy (B.A)', 'Psychology (B.A)', 'Oriental Studies (B.A)', 'Law (B.A Law)', 'Economics (B.Econ)', 'Business Administration (BBA)', 'Physics (B.Sc)', 'Chemistry (B.Sc)', 'Mathematics (B.Sc)']
  },
];

for (const u of universities) {
  const rows = await query(
    `INSERT INTO universities (name, name_en, abbreviation, type, state, city, min_score, description, website)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [u.name, u.name_en, u.abbreviation, u.type, u.state, u.city, u.min_score, u.description, u.website]
  );
  const uniId = rows[0].id;

  for (const majorNameEn of u.majors) {
    const majorId = majorMap[majorNameEn];
    if (majorId) {
      await query(
        'INSERT INTO university_majors (university_id, major_id) VALUES ($1, $2)',
        [uniId, majorId]
      );
    } else {
      console.warn(`   ⚠️  Major not found: ${majorNameEn}`);
    }
  }
}
console.log(`   ✅ Inserted ${universities.length} universities with major links`);

// ─── Seed Users ──────────────────────────────────────────────────────────────
console.log('👥 Seeding users...');
const adminPassword = 'admin123';
const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
// Create admin user
const adminRows = await query(
  `INSERT INTO users (name, email, password_hash, role, status)
   VALUES ($1, $2, $3, $4, $5)
   ON CONFLICT (email) DO UPDATE SET
     name = EXCLUDED.name,
     password_hash = EXCLUDED.password_hash,
     role = EXCLUDED.role,
     status = EXCLUDED.status,
     ban_reason = null,
     updated_at = now()
   RETURNING id`,
  ['Admin', 'admin@gmail.com', adminPasswordHash, 'admin', 'active']
);
const adminId = adminRows[0].id;

const studentPassword = 'student123';
const studentPasswordHash = await bcrypt.hash(studentPassword, 10);
// Sample users
const sampleUsers = [
  {
    name: 'အောင်မင်းခန့်',
    email: 'aungminkhant@student.mm',
    grade: 'G-12',
    status: 'active',
    avatar_url: 'https://api.dicebear.com/9.x/initials/svg?seed=Aung%20Min%20Khant',
  },
  {
    name: 'မေသဇဉ်ဦး',
    email: 'maythazinoo@student.mm',
    grade: 'G-12',
    status: 'active',
    avatar_url: 'https://api.dicebear.com/9.x/initials/svg?seed=May%20Thazin%20Oo',
  },
  {
    name: 'ထက်ထက်အောင်',
    email: 'htethtetaung@student.mm',
    grade: 'G-11',
    status: 'active',
    avatar_url: 'https://api.dicebear.com/9.x/initials/svg?seed=Htet%20Htet%20Aung',
  },
  {
    name: 'ဇော်လင်းထွန်း',
    email: 'zawlintun@student.mm',
    grade: 'G-12',
    status: 'banned',
    ban_reason: 'Repeated inappropriate chat messages',
    avatar_url: 'https://api.dicebear.com/9.x/initials/svg?seed=Zaw%20Lin%20Tun',
  },
  {
    name: 'နန္ဒာဝင်း',
    email: 'nandarwin@student.mm',
    grade: 'G-10',
    status: 'active',
    avatar_url: 'https://api.dicebear.com/9.x/initials/svg?seed=Nandar%20Win',
  },
];

const userMap = {};
for (const u of sampleUsers) {
  const rows = await query(
    `INSERT INTO users (name, email, password_hash, role, status, ban_reason, avatar_url)
     VALUES ($1, $2, $3, 'student', $4, $5, $6)
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       status = EXCLUDED.status,
       ban_reason = EXCLUDED.ban_reason,
       avatar_url = EXCLUDED.avatar_url,
       updated_at = now()
     RETURNING id`,
    [
      u.name,
      u.email,
      studentPasswordHash,
      u.status,
      u.ban_reason || null,
      u.avatar_url,
    ]
  );
  const userId = rows[0].id;
  userMap[u.email] = userId;
}
console.log(`   ✅ Upserted ${sampleUsers.length} sample users`);

// ─── Seed News ───────────────────────────────────────────────────────────────
console.log('📰 Seeding news...');

const news = [
  {
    title: '၂၀၂၅-၂၀၂၆ ပညာသင်နှစ် တက္ကသိုလ်ဝင်ခွင့် ကြေငြာချက်',
    content: 'ပညာရေးဝန်ကြီးဌာနမှ ၂၀၂၅-၂၀၂၆ ပညာသင်နှစ်အတွက် တက္ကသိုလ်ဝင်ခွင့် လျှောက်လွှာများကို လက်ခံရရှိရန် ကြေငြာအပ်ပါသည်။ ၂၀၂၅ ခုနှစ် တက္ကသိုလ်ဝင်စာမေးပွဲ အောင်မြင်သူများ ဝင်ခွင့်လျှောက်လွှာ တင်နိုင်ပါပြီ။ ဝင်ခွင့်လျှောက်လွှာကို ရန်ကုန်/မန္တလေး ဒေသကြီးရှိ ပညာရေးရုံးများတွင် တင်သွင်းနိုင်ပါသည်။',
    category: 'admission',
    author_id: adminId,
    published: true,
  },
  {
    title: 'ဆေးတက္ကသိုလ် ဝင်ခွင့်ရမှတ် သတ်မှတ်ချက် ထုတ်ပြန်',
    content: '၂၀၂၅ ခုနှစ် ဆေးတက္ကသိုလ်များ၏ ဝင်ခွင့်ရမှတ်သတ်မှတ်ချက်ကို ထုတ်ပြန်ကြေငြာလိုက်ပါသည်။ ဆေးတက္ကသိုလ်ရန်ကုန်(၁) အတွက် ၄၅၀ မှတ်အထက်၊ ဆေးတက္ကသိုလ်ရန်ကုန်(၂) အတွက် ၄၅၀ မှတ်အထက် ရရှိရန် လိုအပ်ပါသည်။ STEAMS-1 (ဓာတုဗေဒ၊ ရူပဗေဒ၊ ဇီဝဗေဒ) ဘာသာတွဲ ဖြေဆိုသူများသာ လျှောက်ထားခွင့်ရှိပါသည်။',
    category: 'admission',
    author_id: adminId,
    published: true,
  },
  {
    title: 'ပညာရေးဝန်ကြီးဌာန ဝင်ခွင့်အချိန်ဇယား ထုတ်ပြန်',
    content: '၂၀၂၅ ခုနှစ်အတွက် တက္ကသိုလ်ဝင်ခွင့်လျှောက်လွှာများ လက်ခံမည့်ရက်နှင့် သတ်မှတ်ရက်များကို ပညာရေးဝန်ကြီးဌာနမှ ထုတ်ပြန်ကြေငြာလိုက်ပါသည်။ ဇူလိုင်လမှ စတင်လက်ခံမည်ဖြစ်ပြီး သတ်မှတ်ရက်အတွင်းသာ တင်သွင်းရမည်။ ရက်လွန်လျှောက်ထားပါက ဝင်ခွင့်မရရှိနိုင်ပါ။',
    category: 'admission',
    author_id: adminId,
    published: true,
  },
  {
    title: 'နည်းပညာတက္ကသိုလ်များ ဝင်ခွင့်သတ်မှတ်ချက်',
    content: '၂၀၂၅ ခုနှစ် နည်းပညာတက္ကသိုလ်များ၏ ဝင်ခွင့်သတ်မှတ်ချက်ကို ထုတ်ပြန်လိုက်ပါသည်။ အင်္ဂလိပ်စာ၊ သင်္ချာ၊ ရူပဗေဒ၊ ဓာတုဗေဒ (၄)ဘာသာပေါင်းရမှတ် ၂၄၀ နှင့်အထက် ရရှိရမည်။ အမျိုးသား ၆၀%၊ အမျိုးသမီး ၄၀% လက်ခံသည်။ သင်တန်းကာလ ၅ နှစ်။',
    category: 'admission',
    author_id: adminId,
    published: true,
  },
  {
    title: 'UCSY ကွန်ပျူတာတက္ကသိုလ် AI သင်တန်းသစ် စတင်',
    content: 'ရန်ကုန်ကွန်ပျူတာတက္ကသိုလ် (UCSY) တွင် Artificial Intelligence နှင့် Machine Learning သင်တန်းသစ်ကို ၂၀၂၅ ပညာသင်နှစ်မှ စတင်ဖွင့်လှစ်မည်ဖြစ်ကြောင်း ကြေငြာထားပါသည်။ B.C.Sc/B.C.Tech ဘွဲ့ရ ကျောင်းသားများ တက်ရောက်နိုင်ပါမည်။',
    category: 'general',
    author_id: adminId,
    published: true,
  },
  {
    title: 'YTU ရန်ကုန်နည်းပညာတက္ကသိုလ် ပညာသင်ဆု ကြေငြာ',
    content: 'ရန်ကုန်နည်းပညာတက္ကသိုလ် (YTU) မှ ၂၀၂၅ ပညာသင်နှစ်အတွက် ပညာသင်ဆု (Scholarship) ကို ကြေငြာလိုက်ပါသည်။ G-12 စာမေးပွဲတွင် ရူပဗေဒ၊ ဓာတုဗေဒ၊ သင်္ချာ၊ အင်္ဂလိပ်စာ (၄)ဘာသာပေါင်းရမှတ် ၃၀၀ နှင့်အထက် ရရှိသူများ လျှောက်ထားနိုင်ပါသည်။',
    category: 'scholarship',
    author_id: adminId,
    published: true,
  },
  {
    title: 'အဝေးသင်တက္ကသိုလ် စာရင်းသွင်းခြင်း စတင်',
    content: 'အဝေးသင်တက္ကသိုလ်ရန်ကုန် (YUDE) တွင် ၂၀၂၅ ပညာသင်နှစ်အတွက် စာရင်းသွင်းခြင်းကို စတင်လက်ခံနေပြီဖြစ်ပါသည်။ G-12 စာမေးပွဲတွင် ၃၀၀ မှတ်အထက် ရရှိသူများ ဘာသာရပ်မသတ်မှတ်ဘဲ တက်ရောက်နိုင်ပါသည်။',
    category: 'general',
    author_id: adminId,
    published: true,
  },
];

for (const n of news) {
  await query(
    `INSERT INTO news (title, content, category, author_id, published) VALUES ($1, $2, $3, $4, $5)`,
    [n.title, n.content, n.category, n.author_id, n.published]
  );
}
console.log(`   ✅ Inserted ${news.length} news articles`);

// ─── Seed Chats ──────────────────────────────────────────────────────────────
console.log('💬 Seeding sample chats...');

// Chat rooms with participants and messages
const chatRooms = [
  
  // ─── Peer Chat (Question & Answer) messages ──────────────────────────────
  // These are for the /chat/questions endpoint (no room_id)
  {
    messages: [
      { 
        sender: 'aung.min.khant@student.mm', 
        title: 'ဆေးတက္ကသိုလ်ဝင်ခွင့်အတွက် ဘယ်ဘာသာတွဲ ဖြေဆိုရမလဲ?',
        content: 'ဆေးတက္ကသိုလ်ဝင်ခွင့်အတွက် STEAMS-1 (ဓာတုဗေဒ၊ ရူပဗေဒ၊ ဇီဝဗေဒ) ဘာသာတွဲပဲ ဖြေဆိုရမှာလား? အခြားဘာသာတွဲတွေနဲ့လည်း လျှောက်လို့ရလား?',
        is_filtered: false,
        is_question: true,
        parent_id: null
      },
      { 
        sender: 'may.thazin.oo@student.mm', 
        content: 'ဆေးတက္ကသိုလ်တွေအတွက် STEAMS-1 ဘာသာတွဲပဲ ဖြေဆိုရပါတယ်။ စုစုပေါင်းရမှတ် ၄၅၀ နဲ့အထက်ရမှ လျှောက်ထားလို့ရပါတယ်။',
        is_filtered: false,
        is_question: false,
        parent_id: null // This will be linked to the question above
      },
    ],
  },
  {
    messages: [
      { 
        sender: 'htet.htet.aung@student.mm', 
        title: 'ကွန်ပျူတာတက္ကသိုလ်အတွက် ဘယ်ဘာသာရပ်တွေ သင်ရမလဲ?',
        content: 'UCSY မှာ ကွန်ပျူတာသိပ္ပံ (B.C.Sc) နဲ့ ကွန်ပျူတာနည်းပညာ (B.C.Tech) ဆိုပြီး ဘယ်ဘာသာရပ်တွေ သင်ရပါသလဲ?',
        is_filtered: false,
        is_question: true,
        parent_id: null
      },
      { 
        sender: 'nandar.win@student.mm', 
        content: 'UCSY မှာ B.C.Sc အတွက် Software Engineering, Knowledge Engineering, Business Information Systems စတဲ့ ဘာသာရပ်တွေ ရှိပါတယ်။ B.C.Tech အတွက်က Embedded Systems, Computer Communication and Networks စတဲ့ ဘာသာရပ်တွေ ရှိပါတယ်။',
        is_filtered: false,
        is_question: false,
        parent_id: null
      },
    ],
  },
  {
    messages: [
      { 
        sender: 'zaw.lin.tun@student.mm', 
        title: 'နည်းပညာတက္ကသိုလ်ဝင်ခွင့် ရမှတ် ဘယ်လောက်လိုလဲ?',
        content: 'YTU နဲ့ MTU ဝင်ခွင့်အတွက် ဘယ်လောက်ရမှတ်လိုအပ်ပါသလဲ?',
        is_filtered: false,
        is_question: true,
        parent_id: null
      },
    ],
  },
];

let chatMessageCount = 0;

// ─── Create chat rooms with participants ───────────────────────────────────
for (const room of chatRooms) {
  // Check if this is a peer chat room (has participants)
  if (room.participants && room.participants.length > 0) {
    // Create room
    const roomRows = await query('INSERT INTO chat_rooms DEFAULT VALUES RETURNING id');
    const roomId = roomRows[0].id;

    // Add participants
    for (const email of room.participants) {
      if (userMap[email]) {
        await query(
          'INSERT INTO chat_room_participants (room_id, user_id) VALUES ($1, $2)',
          [roomId, userMap[email]]
        );
      }
    }

    // Add messages to room
    for (const msg of room.messages) {
      if (userMap[msg.sender]) {
        await query(
          'INSERT INTO chat_messages (room_id, sender_id, content, is_filtered) VALUES ($1, $2, $3, $4)',
          [roomId, userMap[msg.sender], msg.content, msg.is_filtered]
        );
        chatMessageCount += 1;
      }
    }
  }
  
  // ─── Create peer chat messages (questions & answers) ─────────────────────
  // These are for the /chat/questions endpoint (no room_id)
  if (room.messages && room.messages.some(m => m.is_question)) {
    let questionId = null;
    
    for (let i = 0; i < room.messages.length; i++) {
      const msg = room.messages[i];
      
      if (!userMap[msg.sender]) continue;
      
      if (msg.is_question) {
        // Insert as question (parent_id = null, room_id = null)
        const [question] = await query(
          `INSERT INTO chat_messages (sender_id, title, content, is_filtered, parent_id, room_id) 
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [userMap[msg.sender], msg.title, msg.content, msg.is_filtered, null, null]
        );
        questionId = question.id;
        chatMessageCount += 1;
      } else if (questionId) {
        // Insert as answer to the question (parent_id = questionId, room_id = null)
        await query(
          `INSERT INTO chat_messages (sender_id, content, is_filtered, parent_id, room_id) 
           VALUES ($1, $2, $3, $4, $5)`,
          [userMap[msg.sender], msg.content, msg.is_filtered, questionId, null]
        );
        chatMessageCount += 1;
        // Reset questionId after first answer to link only the first answer
        // Actually, we want to link all answers to the same question
        // So we keep questionId for all subsequent messages in this group
      }
    }
  }
}

// Count total chat rooms created
const chatRoomCount = await query('SELECT COUNT(*) as c FROM chat_rooms');

console.log(`   ✅ Inserted ${chatRoomCount[0].c} chat rooms and ${chatMessageCount} messages`);

// ─── Seed Audit Logs ─────────────────────────────────────────────────────────
console.log('🧾 Seeding audit logs...');

const auditLogs = [
  {
    action: 'seed_database',
    target_type: 'system',
    target_id: null,
    details: 'Initial Supabase seed data loaded for demo and testing.',
  },
  {
    action: 'publish_news',
    target_type: 'news',
    target_id: null,
    details: 'Published sample admission and scholarship news.',
  },
  {
    action: 'ban_user',
    target_type: 'user',
    target_id: userMap['zaw.lin.tun@student.mm'],
    details: 'Repeated inappropriate chat messages',
  },
];

for (const log of auditLogs) {
  await query(
    'INSERT INTO audit_logs (admin_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)',
    [adminId, log.action, log.target_type, log.target_id, log.details]
  );
}
console.log(`   ✅ Inserted ${auditLogs.length} audit logs`);

// ─── Summary ──────────────────────────────────────────────────────────────────
const majorCount = await query('SELECT COUNT(*) as c FROM majors');
const uniCount = await query('SELECT COUNT(*) as c FROM universities');
const linkCount = await query('SELECT COUNT(*) as c FROM university_majors');
const newsCount = await query('SELECT COUNT(*) as c FROM news');
const userCount = await query('SELECT COUNT(*) as c FROM users');
const chatRoomCountFinal = await query('SELECT COUNT(*) as c FROM chat_rooms');
const chatCount = await query('SELECT COUNT(*) as c FROM chat_messages');
const auditCount = await query('SELECT COUNT(*) as c FROM audit_logs');

console.log('\n📊 Database Summary:');
console.log(`   Users:               ${userCount[0].c}`);
console.log(`   Majors:              ${majorCount[0].c}`);
console.log(`   Universities:        ${uniCount[0].c}`);
console.log(`   University-Major Links: ${linkCount[0].c}`);
console.log(`   News Articles:       ${newsCount[0].c}`);
console.log(`   Chat Rooms:          ${chatRoomCountFinal[0].c}`);
console.log(`   Chat Messages:       ${chatCount[0].c}`);
console.log(`   Audit Logs:          ${auditCount[0].c}`);
console.log('\n✅ Seed completed successfully!');

await client.end();