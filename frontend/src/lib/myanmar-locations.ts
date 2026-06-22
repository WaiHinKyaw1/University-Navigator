export const MYANMAR_REGIONS = [
  "စစ်ကိုင်း",
  "တနင်္သာရီ",
  "ပဲခူး",
  "မကွေး",
  "မန္တလေး",
  "ရန်ကုန်",
  "ဧရာဝတီ",
] as const;

export const MYANMAR_STATE_DIVISIONS = [
  "ကချင်",
  "ကယား",
  "ကရင်",
  "ချင်း",
  "မွန်",
  "ရခိုင်",
  "ရှမ်း",
] as const;

export const MYANMAR_UNION_TERRITORIES = ["နေပြည်တော်"] as const;

export const MYANMAR_STATES = [
  ...MYANMAR_REGIONS,
  ...MYANMAR_STATE_DIVISIONS,
  ...MYANMAR_UNION_TERRITORIES,
] as const;

export type MyanmarState = (typeof MYANMAR_STATES)[number];

export const MYANMAR_CITIES: Record<MyanmarState, string[]> = {
  ကချင်: ["မြစ်ကြီးနား", "ဗန်းမော်", "ပုလော", "မိုးညှင်း", "ဟိုးပင်", "ရွှေကူ"],
  ကယား: ["လွိုင်ကော်", "ဒီးမော့ဆို", "ဖရူးဆို", "ဘော့လခဲ"],
  ကရင်: ["ဖားအံ", "မြဝတီ", "ကော့ကရိတ်", "လှိုင်းဘွဲ့"],
  ချင်း: ["ဟားခါး", "ဖလမ်း", "တီးတိန်", "မတူပီ", "မင်းတပ်"],
  စစ်ကိုင်း: ["စစ်ကိုင်း", "မုံရွာ", "ရွှေဘို", "ကလေး", "ကသာ", "တမူ"],
  တနင်္သာရီ: ["ထားဝယ်", "မြိတ်", "ကော့သောင်", "ရေး"],
  ပဲခူး: ["ပဲခူး", "တောင်ငူ", "ပြည်", "သဲတွင့်", "ညောင်လေးပင်"],
  မကွေး: ["မကွေး", "ပခုက္ကူ", "မင်းဘူး", "ရေနံချောင်", "ချောက်", "ဂန့်ဂေါ"],
  မန္တလေး: ["မန္တလေး", "ပြင်ဦးလွင်", "မိတ္ထီလာ", "ကျောက်ဆည်", "မိုးကုတ်", "အမရပူရ"],
  မွန်: ["မော်လမြိုင်", "သထုံ", "ကျိုက်ထ"],
  ရခိုင်: ["စစ်တွေ", "သံတွဲ", "မြောက်ဦး", "ကျောက်ဖြူ", "မောင်တော"],
  ရန်ကုန်: ["ရန်ကုန်", "သန်လျင်", "လှည်းကူး", "မှော်ဘီ", "တိုက်ကြီး", "တွံတေး"],
  ရှမ်း: ["တောင်ကြီး", "လားရှိုး", "ကျိုင်းတုံ", "မုဆိုး", "သီပေါ", "ညောင်ရွှေ"],
  ဧရာဝတီ: ["ပုသိမ်", "မောင်းလီး", "ဘုတ်ပြင်", "မြောင်းမြ", "ဟင်္သာတ", "လပွတ်"],
  နေပြည်တော်: ["နေပြည်တော်", "လယ်ဝေး", "တပ်ကုန်း", "ပျဉ်းမနား"],
};

export function getCitiesForState(state: string): string[] {
  return MYANMAR_CITIES[state as MyanmarState] ?? [];
}

export function isMyanmarState(state: string): state is MyanmarState {
  return MYANMAR_STATES.includes(state as MyanmarState);
}
