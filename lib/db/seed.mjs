// Seed script for University Admission database
// Based on Myanmar University Admission Guide 2025 PDF data
// Run: node --env-file=../../.env seed.mjs

import pg from 'pg';
const { Client } = pg;

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

// ─── Clear existing data (in correct order for FK constraints) ────────────────
console.log('🗑️  Clearing existing data...');
await query('DELETE FROM university_majors');
await query('DELETE FROM news');
await query('DELETE FROM chatbot_messages');
await query('DELETE FROM chat_messages');
await query('DELETE FROM chat_room_participants');
await query('DELETE FROM chat_rooms');
await query('DELETE FROM audit_logs');
await query('DELETE FROM universities');
await query('DELETE FROM majors');
// Don't delete users - keep existing accounts

// ─── Seed Majors ──────────────────────────────────────────────────────────────
console.log('🎓 Seeding majors...');

const majors = [
  // Medical
  { name: 'ဆေးပညာ (MB,BS)', name_en: 'Medicine (MB,BS)', category: 'medical', description: 'ဆေးပညာဘွဲ့ - ဆေးတက္ကသိုလ်များတွင် ၅-၇ နှစ် တက်ရောက်ရသည်' },
  { name: 'ဆေးဝါးပညာ (B.Pharm)', name_en: 'Pharmacy (B.Pharm)', category: 'medical', description: 'ဆေးဝါးပညာဘွဲ့ - ဆေးဝါးတက္ကသိုလ်တွင် ၅ နှစ် တက်ရောက်ရသည်' },
  { name: 'သူနာပြုပညာ (B.N.Sc)', name_en: 'Nursing Science (B.N.Sc)', category: 'medical', description: 'သူနာပြုပညာဘွဲ့ - ၄ နှစ် တက်ရောက်ရသည်' },
  { name: 'တိုင်းရင်းဆေးပညာ (B.T.M)', name_en: 'Traditional Medicine (B.T.M)', category: 'medical', description: 'တိုင်းရင်းဆေးပညာဘွဲ့' },
  { name: 'တိရစ္ဆာန်ဆေးပညာ (B.V.Sc)', name_en: 'Veterinary Science (B.V.Sc)', category: 'medical', description: 'တိရစ္ဆာန်ဆေးပညာဘွဲ့' },
  { name: 'ပြည်သူ့ကျန်းမာရေး (MPH)', name_en: 'Public Health (MPH)', category: 'medical', description: 'ပြည်သူ့ကျန်းမာရေးဘွဲ့' },
  { name: 'သွားဘက်ဆိုင်ရာ (B.D.S)', name_en: 'Dental Surgery (B.D.S)', category: 'medical', description: 'သွားဘက်ဆိုင်ရာ ဆေးပညာဘွဲ့' },

  // Engineering
  { name: 'အင်ဂျင်နီယာ (B.E) - ဆောက်လုပ်ရေး', name_en: 'Civil Engineering (B.E)', category: 'engineering', description: 'ဆောက်လုပ်ရေး အင်ဂျင်နီယာဘွဲ့ - တံတား၊ လမ်း၊ အဆောက်အဦ' },
  { name: 'အင်ဂျင်နီယာ (B.E) - လျှပ်စစ်', name_en: 'Electrical Engineering (B.E)', category: 'engineering', description: 'လျှပ်စစ် အင်ဂျင်နီယာဘွဲ့' },
  { name: 'အင်ဂျင်နီယာ (B.E) - စက်', name_en: 'Mechanical Engineering (B.E)', category: 'engineering', description: 'စက် အင်ဂျင်နီယာဘွဲ့' },
  { name: 'အင်ဂျင်နီယာ (B.E) - ဓာတု', name_en: 'Chemical Engineering (B.E)', category: 'engineering', description: 'ဓာတု အင်ဂျင်နီယာဘွဲ့' },
  { name: 'အင်ဂျင်နီယာ (B.E) - ရေကြောင်း', name_en: 'Marine Engineering (B.E)', category: 'engineering', description: 'ရေကြောင်း အင်ဂျင်နီယာဘွဲ့' },
  { name: 'အင်ဂျင်နီယာ (B.E) - လေကြောင်း', name_en: 'Aerospace Engineering (B.E)', category: 'engineering', description: 'လေကြောင်း အင်ဂျင်နီယာဘွဲ့' },
  { name: 'အင်ဂျင်နီယာ (B.E) - အီလက်ထရောနစ်', name_en: 'Electronic Engineering (B.E)', category: 'engineering', description: 'အီလက်ထရောနစ် အင်ဂျင်နီယာဘွဲ့' },
  { name: 'အင်ဂျင်နီယာ (B.E) - သတ္တု', name_en: 'Mining Engineering (B.E)', category: 'engineering', description: 'သတ္တု အင်ဂျင်နီယာဘွဲ့' },

  // Science
  { name: 'ကွန်ပျူတာသိပ္ပံ (B.C.Sc)', name_en: 'Computer Science (B.C.Sc)', category: 'science', description: 'ကွန်ပျူတာသိပ္ပံဘွဲ့ - Software Development, AI, Data Science' },
  { name: 'ကွန်ပျူတာနည်းပညာ (B.C.Tech)', name_en: 'Computer Technology (B.C.Tech)', category: 'science', description: 'ကွန်ပျူတာနည်းပညာဘွဲ့' },
  { name: 'ရူပဗေဒ (B.Sc Physics)', name_en: 'Physics (B.Sc)', category: 'science', description: 'ရူပဗေဒဘွဲ့' },
  { name: 'ဓာတုဗေဒ (B.Sc Chemistry)', name_en: 'Chemistry (B.Sc)', category: 'science', description: 'ဓာတုဗေဒဘွဲ့' },
  { name: 'ဇီဝဗေဒ (B.Sc Biology)', name_en: 'Biology (B.Sc)', category: 'science', description: 'ဇီဝဗေဒဘွဲ့' },
  { name: 'သင်္ချာ (B.Sc Mathematics)', name_en: 'Mathematics (B.Sc)', category: 'science', description: 'သင်္ချာဘွဲ့' },

  // Arts
  { name: 'မြန်မာစာ (B.A Myanmar)', name_en: 'Myanmar (B.A)', category: 'arts', description: 'မြန်မာစာဘွဲ့' },
  { name: 'အင်္ဂလိပ်စာ (B.A English)', name_en: 'English (B.A)', category: 'arts', description: 'အင်္ဂလိပ်စာဘွဲ့' },
  { name: 'သမိုင်း (B.A History)', name_en: 'History (B.A)', category: 'arts', description: 'သမိုင်းဘွဲ့' },
  { name: 'ဘူမိဗေဒ (B.A Geography)', name_en: 'Geography (B.A)', category: 'arts', description: 'ဘူမိဗေဒဘွဲ့' },
  { name: 'နိုင်ငံခြားဘာသာ (B.A)', name_en: 'Foreign Languages (B.A)', category: 'arts', description: 'နိုင်ငံခြားဘာသာဘွဲ့ - English, Chinese, Japanese, Korean' },

  // Business
  { name: 'စီးပွားရေးပညာ (B.Econ)', name_en: 'Economics (B.Econ)', category: 'business', description: 'စီးပွားရေးပညာဘွဲ့' },
  { name: 'ကုန်သွယ်မှုပညာ (B.Com)', name_en: 'Commerce (B.Com)', category: 'business', description: 'ကုန်သွယ်မှုပညာဘွဲ့' },
  { name: 'စာရင်းကိုင်ပညာ (B.Act)', name_en: 'Accounting (B.Act)', category: 'business', description: 'စာရင်းကိုင်ပညာဘွဲ့' },
  { name: 'စီမံခန့်ခွဲမှုပညာ (B.B.A)', name_en: 'Business Administration (B.B.A)', category: 'business', description: 'စီးပွားရေးစီမံခန့်ခွဲမှုဘွဲ့' },

  // Education
  { name: 'ပညာရေး (B.Ed)', name_en: 'Education (B.Ed)', category: 'education', description: 'ပညာရေးဘွဲ့ - ဆရာ/ဆရာမ ပညာ' },

  // Law
  { name: 'ဥပဒေပညာ (LL.B)', name_en: 'Law (LL.B)', category: 'law', description: 'ဥပဒေပညာဘွဲ့ - Bar Exam ဖြေဆိုပြီး Advocate License ရ' },
];


const careerUpdates = [
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
    nameEn: 'Traditional Medicine (B.T.M)',
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
    nameEn: 'Veterinary Science (B.V.Sc)',
    duration: '၆ နှစ်',
    careerPaths: [
      {
        title: 'Veterinarian (Vet)',
        description: 'အိမ်မွေးတိရစ္ဆာန်များနှင့် မွေးမြူရေးခြံရှိ တိရစ္ဆာန်များ၏ ရောဂါများကို စမ်းသပ်ကုသပေးပြီး ခွဲစိတ်ကုသမှုများ ပြုလုပ်သည်။',
        skills: ['Animal surgery', 'Diagnosis', 'Veterinary pharmacology', 'Animal handling'],
        outlook: 'High Demand - တိရစ္ဆาန်ဆေးကုသရေး ဝန်ဆောင်မှုများ ပိုမိုခေတ်စားလာသည်'
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
    nameEn: 'Electrical Engineering (B.E)',
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
    nameEn: 'Marine Engineering (B.E)',
    duration: '၅ နှစ်',
    careerPaths: [
      {
        title: 'Marine Engineer',
        description: 'သင်္ဘောများနှင့် ကမ်းလွန်ရေနံတူးစင်များရှိ စက်ပစ္စည်းစနစ်များကို မောင်းနှင်ခြင်း၊ ပြုပြင်ထိန်းသိမ်းခြင်း။',
        skills: ['Marine propulsion', 'Ship systems', 'Maintenance', 'Fluid mechanics'],
        outlook: 'High Demand - ရေကြောင်းကုန်သွယ်မှု လုပ်ငန်းများတွင် ဝင်ငွေကောင်းသော အလုပ်အကိုင်အခွင့်အလမ်းများ ရှိသည်'
      }
    ]
  },
  {
    nameEn: 'Aerospace Engineering (B.E)',
    duration: '၅ နှစ်',
    careerPaths: [
      {
        title: 'Aerospace Engineer',
        description: 'လေယာဉ်၊ ဒုံးပျံ၊ ဂြိုဟ်တုများနှင့် လေကြောင်းပျံသန်းမှုဆိုင်ရာ စက်ပစ္စည်းစနစ်များကို ဒီဇိုင်းဆွဲ စမ်းသပ်သည်။',
        skills: ['Aerodynamics', 'Propulsion systems', 'CAD', 'Flight dynamics'],
        outlook: 'Steady Growth - လေကြောင်းနည်းပညာ ကဏ္ဍတွင် အခွင့်အလမ်းများရှိသည်'
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
      }
    ]
  },
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
        title: 'Data Analyst',
        description: 'အချက်အလက် (Data) အစုအဝေးကြီးများကို ခွဲခြမ်းစိတ်ဖြာပြီး လုပ်ငန်းခွင် ဆုံးဖြတ်ချက်များ ပိုမိုကောင်းမွန်စေရန် အကြံပြုချက်များ ထုတ်ပြန်ပေးသည်။',
        skills: ['SQL', 'Python/R', 'Tableau/PowerBI', 'Statistics', 'Excel'],
        outlook: 'Strong Growth - ကုမ္ပဏီများမှ Data-driven ဆုံးဖြတ်ချက်များ ချမှတ်ရန် ပိုမိုအားကိုးလာကြသည်'
      },
      {
        title: 'AI Engineer',
        description: 'Machine Learning algorithms များနှင့် Artificial Intelligence စနစ်များကို တီထွင်ပြီး real-world ကိစ္စရပ်များတွင် အသုံးပြုသည်။',
        skills: ['Python', 'PyTorch/TensorFlow', 'Machine Learning', 'Mathematics', 'Deep Learning'],
        outlook: 'Very High Growth - လက်ရှိ နည်းပညာနယ်ပယ်တွင် အမြန်ဆုံး ဖွံ့ဖြိုးတိုးတက်နေသော ကဏ္ဍဖြစ်သည်'
      },
      {
        title: 'Developer',
        description: 'Websites များ သို့မဟုတ် Mobile Apps များ၏ ရှေ့ပိုင်း (Frontend) နှင့် နောက်ပိုင်း (Backend) တို့ကို အဓိက ရေးသား တည်ဆောက်သည်။',
        skills: ['HTML/CSS', 'React/Next.js', 'APIs', 'Database Management', 'UI/UX Basics'],
        outlook: 'High Demand - ကုမ္ပဏီတိုင်းအတွက် Website နှင့် Mobile App ရှိရန် မဖြစ်မနေ လိုအပ်လာသည်'
      }
    ]
  },
  {
    nameEn: 'Computer Technology (B.C.Tech)',
    duration: '၄ နှစ်',
    careerPaths: [
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
        title: 'IoT Specialist',
        description: 'စမတ်အိမ်များ၊ စက်ရုံများနှင့် ပတ်ဝန်းကျင်ထိန်းချုပ်ရေး စနစ်များအတွက် အာရုံခံကိရိယာ (Sensors) များနှင့် software ချိတ်ဆက်မှုများကို ဖန်တီးသည်။',
        skills: ['Microcontrollers', 'C++', 'Wireless protocols', 'Cloud integration'],
        outlook: 'Strong Growth - စမတ်နည်းပညာများ ခေတ်စားလာသည်နှင့်အမျှ လိုအပ်ချက် တိုးပွားနေသည်'
      }
    ]
  },
  {
    nameEn: 'Foreign Languages (B.A)',
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
        title: 'Diplomatic Officer',
        description: 'သံတမန်ရေးရာ ကိစ္စရပ်များနှင့် နိုင်ငံခြားရေးဝန်ကြီးဌာနများတွင် နိုင်ငံ၏ ကိုယ်စားလှယ်အဖြစ် ဆောင်ရွက်သည်။',
        skills: ['Foreign affairs', 'Negotiations', 'Communication', 'Protocol compliance'],
        outlook: 'Steady Demand - နိုင်ငံတကာ ဆက်ဆံရေးကဏ္ဍတွင် ဂုဏ်သိက္ခာရှိသော ရာထူးဖြစ်သည်'
      }
    ]
  },
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
      }
    ]
  },
  {
    nameEn: 'Business Administration (B.B.A)',
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
      }
    ]
  },
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
      }
    ]
  },
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
console.log(`   ✅ Inserted ${majors.length} majors`);

// ─── Seed Universities ────────────────────────────────────────────────────────
console.log('🏫 Seeding universities...');

const universities = [
  // ── Medical Universities ──
  {
    name: 'ဆေးတက္ကသိုလ် ရန်ကုန် (၁)',
    name_en: 'University of Medicine 1, Yangon',
    abbreviation: 'UM1',
    type: 'medical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 470,
    description: 'မြန်မာနိုင်ငံ၏ အကောင်းဆုံး ဆေးတက္ကသိုလ်ဖြစ်ပြီး MB,BS ဘွဲ့ရရှိနိုင်သည်။ တက်ရောက်နှစ် ၅-၇ နှစ် + Internship ၁ နှစ်။ သိပ္ပံဘာသာတွဲ ဖြေဆိုသူများသာ လျှောက်ထားနိုင်သည်။',
    website: null,
    majors: ['Medicine (MB,BS)', 'Dental Surgery (B.D.S)']
  },
  {
    name: 'ဆေးတက္ကသိုလ် ရန်ကုန် (၂)',
    name_en: 'University of Medicine 2, Yangon',
    abbreviation: 'UM2',
    type: 'medical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 460,
    description: 'ဆေးပညာ MB,BS ဘွဲ့ ရရှိနိုင်သော ဆေးတက္ကသိုလ်။ သိပ္ပံဘာသာတွဲသာ ဖြေဆိုနိုင်သည်။',
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
    min_score: 458,
    description: 'မန္တလေးမြို့ရှိ ဆေးတက္ကသိုလ်။ MB,BS ဘွဲ့ ရရှိနိုင်သည်။',
    website: null,
    majors: ['Medicine (MB,BS)']
  },
  {
    name: 'ဆေးဝါးတက္ကသိုလ် ရန်ကုန်',
    name_en: 'University of Pharmacy, Yangon',
    abbreviation: 'UPY',
    type: 'medical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 430,
    description: 'ဆေးဝါးပညာ B.Pharm ဘွဲ့ ရရှိနိုင်သည်။ ၅ နှစ် တက်ရောက်ရသည်။',
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
    min_score: 425,
    description: 'ဆေးဝါးပညာ B.Pharm ဘွဲ့ ရရှိနိုင်သည်။',
    website: null,
    majors: ['Pharmacy (B.Pharm)']
  },
  {
    name: 'သူနာပြုနှင့်မီးယပ်တက္ကသိုလ် ရန်ကုန်',
    name_en: 'University of Nursing, Yangon',
    abbreviation: 'UNY',
    type: 'medical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 400,
    description: 'သူနာပြု B.N.Sc ဘွဲ့ ရရှိနိုင်သည်။ သိပ္ပံဘာသာတွဲသာ ဖြေဆိုနိုင်သည်။',
    website: null,
    majors: ['Nursing Science (B.N.Sc)']
  },
  {
    name: 'ပြည်သူ့ကျန်းမာရေးတက္ကသိုလ် ရန်ကုန်',
    name_en: 'University of Public Health, Yangon',
    abbreviation: 'UPHY',
    type: 'medical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 420,
    description: 'ပြည်သူ့ကျန်းမာရေးပညာ MPH ဘွဲ့ ရရှိနိုင်သည်။',
    website: null,
    majors: ['Public Health (MPH)']
  },
  {
    name: 'တိုင်းရင်းဆေးတက္ကသိုလ် မန္တလေး',
    name_en: 'University of Traditional Medicine, Mandalay',
    abbreviation: 'UTM',
    type: 'medical',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 370,
    description: 'တိုင်းရင်းဆေးပညာ B.T.M ဘွဲ့ ရရှိနိုင်သည်။ သိပ္ပံ/ဝိဇ္ဇာ နှစ်မျိုးလုံး လျှောက်ထားနိုင်သည်။',
    website: null,
    majors: ['Traditional Medicine (B.T.M)']
  },
  {
    name: 'တိရစ္ဆာန်ဆေးပညာတက္ကသိုလ်',
    name_en: 'University of Veterinary Science',
    abbreviation: 'UVS',
    type: 'medical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 390,
    description: 'တိရစ္ဆာန်ဆေးပညာ B.V.Sc ဘွဲ့ ရရှိနိုင်သည်။ သိပ္ပံဘာသာတွဲသာ ဖြေဆိုနိုင်သည်။',
    website: null,
    majors: ['Veterinary Science (B.V.Sc)']
  },

  // ── Technical / Engineering Universities ──
  {
    name: 'ရန်ကုန်နည်းပညာတက္ကသိုလ်',
    name_en: 'Yangon Technological University',
    abbreviation: 'YTU',
    type: 'technical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 430,
    description: 'မြန်မာနိုင်ငံ၏ ထိပ်တန်း အင်ဂျင်နီယာ တက္ကသိုလ်။ B.E ဘွဲ့ ၅ နှစ် တက်ရောက်ရသည်။ Civil, Electrical, Mechanical, Chemical, Electronic, Mining specializations ရှိသည်။',
    website: 'https://ytu.edu.mm',
    majors: ['Civil Engineering (B.E)', 'Electrical Engineering (B.E)', 'Mechanical Engineering (B.E)', 'Chemical Engineering (B.E)', 'Electronic Engineering (B.E)', 'Mining Engineering (B.E)']
  },
  {
    name: 'မန္တလေးနည်းပညာတက္ကသိုလ်',
    name_en: 'Mandalay Technological University',
    abbreviation: 'MTU',
    type: 'technical',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 420,
    description: 'မန္တလေးမြို့ရှိ နည်းပညာတက္ကသိုလ်။ B.E ဘွဲ့ ရရှိနိုင်သည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electrical Engineering (B.E)', 'Mechanical Engineering (B.E)', 'Chemical Engineering (B.E)', 'Electronic Engineering (B.E)']
  },
  {
    name: 'ရေကြောင်းနည်းပညာတက္ကသိုလ်',
    name_en: 'Myanmar Maritime University',
    abbreviation: 'MMU',
    type: 'technical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 410,
    description: 'ရေကြောင်းနည်းပညာ B.E (Marine) ဘွဲ့ ရရှိနိုင်သည်။',
    website: null,
    majors: ['Marine Engineering (B.E)']
  },
  {
    name: 'လေကြောင်းနည်းပညာတက္ကသိုလ်',
    name_en: 'Myanmar Aerospace Engineering University',
    abbreviation: 'MAEU',
    type: 'technical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'မိတ္ထီလာ',
    min_score: 415,
    description: 'လေကြောင်းနည်းပညာ B.E (Aerospace) ဘွဲ့ ရရှိနိုင်သည်။',
    website: null,
    majors: ['Aerospace Engineering (B.E)']
  },
  {
    name: 'ပြည်နည်းပညာတက္ကသိုလ်',
    name_en: 'Pyay Technological University',
    abbreviation: 'PTU',
    type: 'technical',
    state: 'ပဲခူးတိုင်း',
    city: 'ပြည်',
    min_score: 400,
    description: 'ပြည်မြို့ရှိ နည်းပညာတက္ကသိုလ်။ B.E ဘွဲ့ ရရှိနိုင်သည်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electrical Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'မော်လမြိုင်နည်းပညာတက္ကသိုလ်',
    name_en: 'Mawlamyine Technological University',
    abbreviation: 'MawTU',
    type: 'technical',
    state: 'မွန်ပြည်နယ်',
    city: 'မော်လမြိုင်',
    min_score: 395,
    description: 'မော်လမြိုင်မြို့ရှိ နည်းပညာတက္ကသိုလ်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electrical Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'ဟင်္သာတနည်းပညာတက္ကသိုလ်',
    name_en: 'Hinthada Technological University',
    abbreviation: 'HinTU',
    type: 'technical',
    state: 'ဧရာဝတီတိုင်း',
    city: 'ဟင်္သာတ',
    min_score: 385,
    description: 'ဟင်္သာတမြို့ရှိ နည်းပညာတက္ကသိုလ်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electrical Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },
  {
    name: 'မြစ်ကြီးနားနည်းပညာတက္ကသိုလ်',
    name_en: 'Myitkyina Technological University',
    abbreviation: 'MyitTU',
    type: 'technical',
    state: 'ကချင်ပြည်နယ်',
    city: 'မြစ်ကြီးနား',
    min_score: 375,
    description: 'မြစ်ကြီးနားမြို့ရှိ နည်းပညာတက္ကသိုလ်။',
    website: null,
    majors: ['Civil Engineering (B.E)', 'Electrical Engineering (B.E)', 'Mechanical Engineering (B.E)']
  },

  // ── Computer Universities ──
  {
    name: 'ကွန်ပျူတာတက္ကသိုလ် ရန်ကုန်',
    name_en: 'University of Computer Studies, Yangon',
    abbreviation: 'UCSY',
    type: 'technical',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 440,
    description: 'မြန်မာနိုင်ငံ၏ ထိပ်တန်း ကွန်ပျူတာတက္ကသိုလ်။ B.C.Sc/B.C.Tech ဘွဲ့ ၄ နှစ် တက်ရောက်ရသည်။ Software Development, AI, Data Science, Cybersecurity စသည့် နယ်ပယ်များ ရှိသည်။',
    website: 'https://ucsy.edu.mm',
    majors: ['Computer Science (B.C.Sc)', 'Computer Technology (B.C.Tech)']
  },
  {
    name: 'ကွန်ပျူတာတက္ကသိုလ် မန္တလေး',
    name_en: 'University of Computer Studies, Mandalay',
    abbreviation: 'UCSM',
    type: 'technical',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 425,
    description: 'မန္တလေးမြို့ရှိ ကွန်ပျူတာတက္ကသိုလ်။ B.C.Sc ဘွဲ့ ရရှိနိုင်သည်။',
    website: null,
    majors: ['Computer Science (B.C.Sc)', 'Computer Technology (B.C.Tech)']
  },
  {
    name: 'ကွန်ပျူတာတက္ကသိုလ် ပဲခူး',
    name_en: 'University of Computer Studies, Bago',
    abbreviation: 'UCSB',
    type: 'technical',
    state: 'ပဲခူးတိုင်း',
    city: 'ပဲခူး',
    min_score: 405,
    description: 'ပဲခူးမြို့ရှိ ကွန်ပျူတာတက္ကသိုလ်။',
    website: null,
    majors: ['Computer Science (B.C.Sc)']
  },
  {
    name: 'ကွန်ပျူတာတက္ကသိုလ် မော်လမြိုင်',
    name_en: 'University of Computer Studies, Mawlamyine',
    abbreviation: 'UCSMLM',
    type: 'technical',
    state: 'မွန်ပြည်နယ်',
    city: 'မော်လမြိုင်',
    min_score: 400,
    description: 'မော်လမြိုင်မြို့ရှိ ကွန်ပျူတာတက္ကသိုလ်။',
    website: null,
    majors: ['Computer Science (B.C.Sc)']
  },
  {
    name: 'ကွန်ပျူတာတက္ကသိုလ် တောင်ကြီး',
    name_en: 'University of Computer Studies, Taunggyi',
    abbreviation: 'UCST',
    type: 'technical',
    state: 'ရှမ်းပြည်နယ်',
    city: 'တောင်ကြီး',
    min_score: 395,
    description: 'တောင်ကြီးမြို့ရှိ ကွန်ပျူတာတက္ကသိုလ်။',
    website: null,
    majors: ['Computer Science (B.C.Sc)']
  },
  {
    name: 'ကွန်ပျူတာတက္ကသိုလ် စစ်တွေ',
    name_en: 'University of Computer Studies, Sittwe',
    abbreviation: 'UCSS',
    type: 'technical',
    state: 'ရခိုင်ပြည်နယ်',
    city: 'စစ်တွေ',
    min_score: 390,
    description: 'စစ်တွေမြို့ရှိ ကွန်ပျူတာတက္ကသိုလ်။',
    website: null,
    majors: ['Computer Science (B.C.Sc)']
  },

  // ── Arts & Science Universities ──
  {
    name: 'ရန်ကုန်တက္ကသိုလ်',
    name_en: 'University of Yangon',
    abbreviation: 'UY',
    type: 'government',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 390,
    description: 'မြန်မာနိုင်ငံ၏ အဟောင်းဆုံးနှင့် အမှတ်အသားရှိဆုံး တက္ကသိုလ်။ B.A/B.Sc ဘွဲ့ ရရှိနိုင်သည်။ ဝိဇ္ဇာ/သိပ္ပံ နှစ်မျိုးလုံး လျှောက်ထားနိုင်သည်။',
    website: 'https://uy.edu.mm',
    majors: ['Physics (B.Sc)', 'Chemistry (B.Sc)', 'Biology (B.Sc)', 'Mathematics (B.Sc)', 'Myanmar (B.A)', 'English (B.A)', 'History (B.A)', 'Geography (B.A)']
  },
  {
    name: 'မန္တလေးတက္ကသိုလ်',
    name_en: 'University of Mandalay',
    abbreviation: 'UMdy',
    type: 'government',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 380,
    description: 'အထက်မြန်မာနိုင်ငံ၏ အကောင်းဆုံး တက္ကသိုလ်။ B.A/B.Sc ဘွဲ့ ရရှိနိုင်သည်။',
    website: null,
    majors: ['Physics (B.Sc)', 'Chemistry (B.Sc)', 'Biology (B.Sc)', 'Mathematics (B.Sc)', 'Myanmar (B.A)', 'English (B.A)', 'History (B.A)', 'Geography (B.A)']
  },
  {
    name: 'ဒဂုံတက္ကသိုလ်',
    name_en: 'Dagon University',
    abbreviation: 'DU',
    type: 'government',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 360,
    description: 'ရန်ကုန်မြို့ရှိ တက္ကသိုလ်။ B.A/B.Sc ဘွဲ့ ရရှိနိုင်သည်။',
    website: null,
    majors: ['Physics (B.Sc)', 'Chemistry (B.Sc)', 'Biology (B.Sc)', 'Mathematics (B.Sc)', 'Myanmar (B.A)', 'English (B.A)', 'History (B.A)', 'Geography (B.A)']
  },
  {
    name: 'မော်လမြိုင်တက္ကသိုလ်',
    name_en: 'Mawlamyine University',
    abbreviation: 'MawU',
    type: 'government',
    state: 'မွန်ပြည်နယ်',
    city: 'မော်လမြိုင်',
    min_score: 355,
    description: 'မော်လမြိုင်မြို့ရှိ တက္ကသိုလ်။',
    website: null,
    majors: ['Physics (B.Sc)', 'Chemistry (B.Sc)', 'Biology (B.Sc)', 'Mathematics (B.Sc)', 'Myanmar (B.A)', 'English (B.A)', 'History (B.A)']
  },
  {
    name: 'စစ်တွေတက္ကသိုလ်',
    name_en: 'Sittwe University',
    abbreviation: 'StwU',
    type: 'government',
    state: 'ရခိုင်ပြည်နယ်',
    city: 'စစ်တွေ',
    min_score: 350,
    description: 'စစ်တွေမြို့ရှိ တက္ကသိုလ်။',
    website: null,
    majors: ['Physics (B.Sc)', 'Chemistry (B.Sc)', 'Myanmar (B.A)', 'English (B.A)', 'History (B.A)']
  },
  {
    name: 'တောင်ကြီးတက္ကသိုလ်',
    name_en: 'Taunggyi University',
    abbreviation: 'TGU',
    type: 'government',
    state: 'ရှမ်းပြည်နယ်',
    city: 'တောင်ကြီး',
    min_score: 350,
    description: 'တောင်ကြီးမြို့ရှိ တက္ကသိုလ်။',
    website: null,
    majors: ['Physics (B.Sc)', 'Chemistry (B.Sc)', 'Myanmar (B.A)', 'English (B.A)', 'History (B.A)']
  },
  {
    name: 'ပဲခူးတက္ကသိုလ်',
    name_en: 'Bago University',
    abbreviation: 'BU',
    type: 'government',
    state: 'ပဲခူးတိုင်း',
    city: 'ပဲခူး',
    min_score: 345,
    description: 'ပဲခူးမြို့ရှိ တက္ကသိုလ်။',
    website: null,
    majors: ['Physics (B.Sc)', 'Chemistry (B.Sc)', 'Biology (B.Sc)', 'Myanmar (B.A)', 'English (B.A)']
  },
  {
    name: 'ပြည်တက္ကသိုလ်',
    name_en: 'Pyay University',
    abbreviation: 'PyU',
    type: 'government',
    state: 'ပဲခူးတိုင်း',
    city: 'ပြည်',
    min_score: 340,
    description: 'ပြည်မြို့ရှိ တက္ကသိုလ်။',
    website: null,
    majors: ['Physics (B.Sc)', 'Chemistry (B.Sc)', 'Myanmar (B.A)', 'English (B.A)']
  },
  {
    name: 'မြစ်ကြီးနားတက္ကသိုလ်',
    name_en: 'Myitkyina University',
    abbreviation: 'MyitU',
    type: 'government',
    state: 'ကချင်ပြည်နယ်',
    city: 'မြစ်ကြီးနား',
    min_score: 335,
    description: 'မြစ်ကြီးနားမြို့ရှိ တက္ကသိုလ်။',
    website: null,
    majors: ['Physics (B.Sc)', 'Chemistry (B.Sc)', 'Myanmar (B.A)', 'English (B.A)']
  },
  {
    name: 'မကွေးတက္ကသိုလ်',
    name_en: 'Magway University',
    abbreviation: 'MgU',
    type: 'government',
    state: 'မကွေးတိုင်း',
    city: 'မကွေး',
    min_score: 340,
    description: 'မကွေးမြို့ရှိ တက္ကသိုလ်။',
    website: null,
    majors: ['Physics (B.Sc)', 'Chemistry (B.Sc)', 'Myanmar (B.A)', 'English (B.A)']
  },
  {
    name: 'လားရှိုးတက္ကသိုလ်',
    name_en: 'Lashio University',
    abbreviation: 'LU',
    type: 'government',
    state: 'ရှမ်းပြည်နယ်',
    city: 'လားရှိုး',
    min_score: 330,
    description: 'လားရှိုးမြို့ရှိ တက္ကသိုလ်။',
    website: null,
    majors: ['Physics (B.Sc)', 'Chemistry (B.Sc)', 'Myanmar (B.A)', 'English (B.A)']
  },
  {
    name: 'ဟားခါးတက္ကသိုလ်',
    name_en: 'Hakha University',
    abbreviation: 'HU',
    type: 'government',
    state: 'ချင်းပြည်နယ်',
    city: 'ဟားခါး',
    min_score: 320,
    description: 'ဟားခါးမြို့ရှိ တက္ကသိုလ်။',
    website: null,
    majors: ['Myanmar (B.A)', 'English (B.A)', 'History (B.A)']
  },
  {
    name: 'လွိုင်ကော်တက္ကသိုလ်',
    name_en: 'Loikaw University',
    abbreviation: 'LkU',
    type: 'government',
    state: 'ကယားပြည်နယ်',
    city: 'လွိုင်ကော်',
    min_score: 320,
    description: 'လွိုင်ကော်မြို့ရှိ တက္ကသိုလ်။',
    website: null,
    majors: ['Myanmar (B.A)', 'English (B.A)', 'History (B.A)']
  },
  {
    name: 'အဝေးသင်တက္ကသိုလ် ရန်ကုန်',
    name_en: 'Yangon University of Distance Education',
    abbreviation: 'YUDE',
    type: 'government',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 300,
    description: 'အဝေးသင်တက္ကသိုလ် - ဘာသာရပ်မသတ်မှတ်ဘဲ ၃၀၀ မှတ်အထက် ရသူများ တက်ရောက်နိုင်သည်။',
    website: null,
    majors: ['Myanmar (B.A)', 'English (B.A)', 'History (B.A)', 'Geography (B.A)', 'Physics (B.Sc)', 'Chemistry (B.Sc)', 'Mathematics (B.Sc)']
  },

  // ── Economics / Business Universities ──
  {
    name: 'ရန်ကုန်စီးပွားရေးတက္ကသိုလ်',
    name_en: 'Yangon University of Economics',
    abbreviation: 'UEY',
    type: 'government',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 400,
    description: 'မြန်မာနိုင်ငံ၏ ထိပ်တန်း စီးပွားရေးတက္ကသိုလ်။ B.Econ/B.Com/B.Act ဘွဲ့ ရရှိနိုင်သည်။ CPA, ACCA, CFA စသည့် Professional Certifications ဆက်လက် ဖြေဆိုနိုင်သည်။',
    website: null,
    majors: ['Economics (B.Econ)', 'Commerce (B.Com)', 'Accounting (B.Act)', 'Business Administration (B.B.A)']
  },
  {
    name: 'မန္တလေးစီးပွားရေးတက္ကသိုလ်',
    name_en: 'Mandalay University of Economics',
    abbreviation: 'UEM',
    type: 'government',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 390,
    description: 'မန္တလေးမြို့ရှိ စီးပွားရေးတက္ကသိုလ်။ B.Econ/B.Com ဘွဲ့ ရရှိနိုင်သည်။',
    website: null,
    majors: ['Economics (B.Econ)', 'Commerce (B.Com)', 'Accounting (B.Act)']
  },

  // ── Law Universities ──
  {
    name: 'ရန်ကုန်ဥပဒေတက္ကသိုလ်',
    name_en: 'Yangon University of Law',
    abbreviation: 'ULY',
    type: 'government',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 395,
    description: 'မြန်မာနိုင်ငံ၏ ဥပဒေတက္ကသိုလ်။ LL.B ဘွဲ့ ၄ နှစ် တက်ရောက်ရသည်။ Bar Exam ဖြေဆိုပြီး Advocate License ရရှိနိုင်သည်။',
    website: null,
    majors: ['Law (LL.B)']
  },
  {
    name: 'မန္တလေးဥပဒေတက္ကသိုလ်',
    name_en: 'Mandalay University of Law',
    abbreviation: 'ULM',
    type: 'government',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 385,
    description: 'မန္တလေးမြို့ရှိ ဥပဒေတက္ကသိုလ်။ LL.B ဘွဲ့ ရရှိနိုင်သည်။',
    website: null,
    majors: ['Law (LL.B)']
  },

  // ── Education Universities ──
  {
    name: 'ရန်ကုန်ပညာရေးတက္ကသိုလ်',
    name_en: 'Yangon University of Education',
    abbreviation: 'UEdY',
    type: 'education',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 375,
    description: 'ပညာရေးတက္ကသိုလ်။ B.Ed ဘွဲ့ ၄ နှစ် တက်ရောက်ရသည်။ ကျောင်းဆရာ/ဆရာမ ဖြစ်ရန် လေ့ကျင့်သင်ကြားပေးသည်။',
    website: null,
    majors: ['Education (B.Ed)']
  },
  {
    name: 'မန္တလေးပညာရေးတက္ကသိုလ်',
    name_en: 'Mandalay University of Education',
    abbreviation: 'UEdM',
    type: 'education',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 365,
    description: 'မန္တလေးမြို့ရှိ ပညာရေးတက္ကသိုလ်။ B.Ed ဘွဲ့ ရရှိနိုင်သည်။',
    website: null,
    majors: ['Education (B.Ed)']
  },

  // ── Foreign Languages University ──
  {
    name: 'ရန်ကုန်နိုင်ငံခြားဘာသာတက္ကသိုလ်',
    name_en: 'Yangon University of Foreign Languages',
    abbreviation: 'YUFL',
    type: 'government',
    state: 'ရန်ကုန်တိုင်း',
    city: 'ရန်ကုန်',
    min_score: 360,
    description: 'နိုင်ငံခြားဘာသာတက္ကသိုလ်။ English, Chinese (Mandarin), Japanese, Korean စသည့် ဘာသာစကားများ သင်ယူနိုင်သည်။ Interpreter, Translator, Diplomat, Tour Guide, Airline Cabin Crew စသည့် အလုပ်များ လုပ်ကိုင်နိုင်သည်။',
    website: null,
    majors: ['Foreign Languages (B.A)']
  },
  {
    name: 'မန္တလေးနိုင်ငံခြားဘာသာတက္ကသိုလ်',
    name_en: 'Mandalay University of Foreign Languages',
    abbreviation: 'MUFL',
    type: 'government',
    state: 'မန္တလေးတိုင်း',
    city: 'မန္တလေး',
    min_score: 355,
    description: 'မန္တလေးမြို့ရှိ နိုင်ငံခြားဘာသာတက္ကသိုလ်။',
    website: null,
    majors: ['Foreign Languages (B.A)']
  },
];

for (const u of universities) {
  const rows = await query(
    `INSERT INTO universities (name, name_en, abbreviation, type, state, city, min_score, description, website)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [u.name, u.name_en, u.abbreviation, u.type, u.state, u.city, u.min_score, u.description, u.website]
  );
  const uniId = rows[0].id;

  // Link majors
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

// ─── Seed sample news ─────────────────────────────────────────────────────────
console.log('📰 Seeding sample news...');

// Check if admin user exists, if not create one for news authoring
// Create or reset the default admin user (password: admin123).
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
  ['Admin', 'admin@university-guide.mm', '$2b$10$kIxmXoUMrC6NVGX0ZKC5QOp1p3dF8P8EKxT1Q.VtXO6mxF.v.Vfwi', 'admin', 'active']
);
const adminId = adminRows[0].id;

// ─── Seed sample users ────────────────────────────────────────────────────────
console.log('👥 Seeding sample users...');

const sampleUsers = [
  {
    name: 'Aung Min Khant',
    email: 'aung.min.khant@student.mm',
    grade: 'G-12',
    status: 'active',
    avatar_url: 'https://api.dicebear.com/9.x/initials/svg?seed=Aung%20Min%20Khant',
  },
  {
    name: 'May Thazin Oo',
    email: 'may.thazin.oo@student.mm',
    grade: 'G-12',
    status: 'active',
    avatar_url: 'https://api.dicebear.com/9.x/initials/svg?seed=May%20Thazin%20Oo',
  },
  {
    name: 'Htet Htet Aung',
    email: 'htet.htet.aung@student.mm',
    grade: 'G-11',
    status: 'active',
    avatar_url: 'https://api.dicebear.com/9.x/initials/svg?seed=Htet%20Htet%20Aung',
  },
  {
    name: 'Zaw Lin Tun',
    email: 'zaw.lin.tun@student.mm',
    grade: 'G-12',
    status: 'banned',
    ban_reason: 'Repeated inappropriate chat messages',
    avatar_url: 'https://api.dicebear.com/9.x/initials/svg?seed=Zaw%20Lin%20Tun',
  },
  {
    name: 'Nandar Win',
    email: 'nandar.win@student.mm',
    grade: 'G-10',
    status: 'active',
    avatar_url: 'https://api.dicebear.com/9.x/initials/svg?seed=Nandar%20Win',
  },
];

const userMap = {}; // email -> id
for (const u of sampleUsers) {
  const rows = await query(
    `INSERT INTO users (name, email, password_hash, role, grade, status, ban_reason, avatar_url)
     VALUES ($1, $2, $3, 'student', $4, $5, $6, $7)
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       grade = EXCLUDED.grade,
       status = EXCLUDED.status,
       ban_reason = EXCLUDED.ban_reason,
       avatar_url = EXCLUDED.avatar_url,
       updated_at = now()
     RETURNING id`,
    [
      u.name,
      u.email,
      '$2b$10$kIxmXoUMrC6NVGX0ZKC5QOp1p3dF8P8EKxT1Q.VtXO6mxF.v.Vfwi',
      u.grade,
      u.status,
      u.ban_reason || null,
      u.avatar_url,
    ]
  );
  userMap[u.email] = rows[0].id;
}
console.log(`   ✅ Upserted ${sampleUsers.length} sample users`);

const news = [
  {
    title: '၂၀၂၅-၂၀၂၆ ပညာသင်နှစ် တက္ကသိုလ်ဝင်ခွင့် ကြေငြာချက်',
    content: 'ပညာရေးဝန်ကြီးဌာနမှ ၂၀၂၅-၂၀၂၆ ပညာသင်နှစ်အတွက် တက္ကသိုလ်ဝင်ခွင့် လျှောက်လွှာများကို လက်ခံရရှိရန် ကြေငြာအပ်ပါသည်။ G-12 စာမေးပွဲ မြောက်ပြီးသော ကျောင်းသား/ကျောင်းသူများ ဝင်ခွင့်လျှောက်လွှာ တင်နိုင်ပါပြီ။ ဝင်ခွင့်လျှောက်လွှာကို ရန်ကုန်/မန္တလေး ဒေသကြီးရှိ ပညာရေးရုံးများတွင် တင်သွင်းနိုင်ပါသည်။',
    category: 'admission',
    author_id: adminId,
    published: true,
  },
  {
    title: 'ဆေးတက္ကသိုလ် ဝင်ခွင့်ရမှတ် သတ်မှတ်ချက် ထုတ်ပြန်',
    content: '၂၀၂၅ ခုနှစ် ဆေးတက္ကသိုလ်များ၏ ဝင်ခွင့်ရမှတ်သတ်မှတ်ချက်ကို ထုတ်ပြန်ကြေငြာလိုက်ပါသည်။ ဆေးတက္ကသိုလ်ရန်ကုန်(၁) အတွက် ၄၇၀ မှတ်အထက်၊ ဆေးတက္ကသိုလ်ရန်ကုန်(၂) အတွက် ၄၆၀ မှတ်အထက် ရရှိရန် လိုအပ်ပါသည်။ သိပ္ပံဘာသာတွဲ ဖြေဆိုသူများသာ လျှောက်ထားခွင့်ရှိပါသည်။',
    category: 'admission',
    author_id: adminId,
    published: true,
  },
  {
    title: 'ကွန်ပျူတာတက္ကသိုလ် UCSY တွင် AI သင်တန်းသစ် စတင်',
    content: 'ကွန်ပျူတာတက္ကသိုလ်ရန်ကုန် (UCSY) တွင် Artificial Intelligence နှင့် Machine Learning သင်တန်းသစ်ကို ၂၀၂၅ ပညာသင်နှစ်မှ စတင်ဖွင့်လှစ်မည်ဖြစ်ကြောင်း ကြေငြာထားပါသည်။ B.C.Sc/B.C.Tech ဘွဲ့ရ ကျောင်းသားများ တက်ရောက်နိုင်ပါမည်။',
    category: 'general',
    author_id: adminId,
    published: true,
  },
  {
    title: 'YTU ရန်ကုန်နည်းပညာတက္ကသိုလ် ပညာသင်ဆု ကြေငြာ',
    content: 'ရန်ကုန်နည်းပညာတက္ကသိုလ် (YTU) မှ ၂၀၂၅ ပညာသင်နှစ်အတွက် ပညာသင်ဆု (Scholarship) ကို ကြေငြာလိုက်ပါသည်။ G-12 စာမေးပွဲတွင် ၄၅၀ မှတ်အထက် ရရှိသူများ လျှောက်ထားနိုင်ပါသည်။ ပညာသင်ဆုတွင် ကျောင်းလခ အပြည့်အဝ ကျွမ်းခြင်းနှင့် လစဉ်ထောက်ပံ့ငွေ ပါဝင်ပါသည်။',
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

// ─── Seed sample chats ────────────────────────────────────────────────────────
console.log('💬 Seeding sample chats...');

const chatRooms = [
  {
    participants: ['aung.min.khant@student.mm', 'may.thazin.oo@student.mm'],
    messages: [
      { sender: 'aung.min.khant@student.mm', content: 'Hi May, do you know the minimum score for UCSY?', is_filtered: false },
      { sender: 'may.thazin.oo@student.mm', content: 'I saw it starts around 400 in the guide. YTU is higher.', is_filtered: false },
      { sender: 'aung.min.khant@student.mm', content: 'Thanks. I will compare computer science and engineering again.', is_filtered: false },
    ],
  },
  {
    participants: ['htet.htet.aung@student.mm', 'nandar.win@student.mm'],
    messages: [
      { sender: 'nandar.win@student.mm', content: 'Which universities accept G-10 students for planning?', is_filtered: false },
      { sender: 'htet.htet.aung@student.mm', content: 'You can browse now, but admission matching is best after G-12 marks.', is_filtered: false },
    ],
  },
  {
    participants: ['zaw.lin.tun@student.mm', 'aung.min.khant@student.mm'],
    messages: [
      { sender: 'zaw.lin.tun@student.mm', content: 'This message was filtered by moderation.', is_filtered: true },
      { sender: 'aung.min.khant@student.mm', content: 'Please keep the discussion focused on admission questions.', is_filtered: false },
    ],
  },
];

let chatMessageCount = 0;
for (const room of chatRooms) {
  const roomRows = await query('INSERT INTO chat_rooms DEFAULT VALUES RETURNING id');
  const roomId = roomRows[0].id;

  for (const email of room.participants) {
    await query(
      'INSERT INTO chat_room_participants (room_id, user_id) VALUES ($1, $2)',
      [roomId, userMap[email]]
    );
  }

  for (const msg of room.messages) {
    await query(
      'INSERT INTO chat_messages (room_id, sender_id, content, is_filtered) VALUES ($1, $2, $3, $4)',
      [roomId, userMap[msg.sender], msg.content, msg.is_filtered]
    );
    chatMessageCount += 1;
  }
}
console.log(`   ✅ Inserted ${chatRooms.length} chat rooms and ${chatMessageCount} messages`);

// ─── Seed chatbot history ─────────────────────────────────────────────────────
console.log('🤖 Seeding chatbot messages...');

const chatbotMessages = [
  {
    user_id: userMap['aung.min.khant@student.mm'],
    session_id: 'seed-session-aung-001',
    role: 'user',
    content: 'My total score is 425. Which computer universities should I consider?',
  },
  {
    user_id: userMap['aung.min.khant@student.mm'],
    session_id: 'seed-session-aung-001',
    role: 'assistant',
    content: 'With 425 marks, consider UCSY, UCSM, and nearby computer universities. Compare location, major availability, and last-year minimum scores.',
  },
  {
    user_id: userMap['may.thazin.oo@student.mm'],
    session_id: 'seed-session-may-001',
    role: 'user',
    content: 'Can I apply to medicine with 455 marks?',
  },
  {
    user_id: userMap['may.thazin.oo@student.mm'],
    session_id: 'seed-session-may-001',
    role: 'assistant',
    content: 'Medicine usually requires very high marks. You may also compare pharmacy, nursing science, and related health programs.',
  },
  {
    user_id: null,
    session_id: 'seed-session-guest-001',
    role: 'user',
    content: 'Show scholarship news.',
  },
  {
    user_id: null,
    session_id: 'seed-session-guest-001',
    role: 'assistant',
    content: 'Check the news section for scholarship announcements such as the YTU scholarship notice.',
  },
];

for (const m of chatbotMessages) {
  await query(
    'INSERT INTO chatbot_messages (user_id, session_id, role, content) VALUES ($1, $2, $3, $4)',
    [m.user_id, m.session_id, m.role, m.content]
  );
}
console.log(`   ✅ Inserted ${chatbotMessages.length} chatbot messages`);

// ─── Seed audit logs ──────────────────────────────────────────────────────────
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
const chatRoomCount = await query('SELECT COUNT(*) as c FROM chat_rooms');
const chatCount = await query('SELECT COUNT(*) as c FROM chat_messages');
const chatbotCount = await query('SELECT COUNT(*) as c FROM chatbot_messages');
const auditCount = await query('SELECT COUNT(*) as c FROM audit_logs');

console.log('\n📊 Database Summary:');
console.log(`   Users:               ${userCount[0].c}`);
console.log(`   Majors:              ${majorCount[0].c}`);
console.log(`   Universities:        ${uniCount[0].c}`);
console.log(`   University-Major Links: ${linkCount[0].c}`);
console.log(`   News Articles:       ${newsCount[0].c}`);
console.log(`   Chat Rooms:          ${chatRoomCount[0].c}`);
console.log(`   Chat Messages:       ${chatCount[0].c}`);
console.log(`   Chatbot Messages:    ${chatbotCount[0].c}`);
console.log(`   Audit Logs:          ${auditCount[0].c}`);
console.log('\n✅ Seed completed successfully!');

await client.end();
