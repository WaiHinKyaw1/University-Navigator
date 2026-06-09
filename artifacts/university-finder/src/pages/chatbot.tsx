import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSendChatbotMessage, useGetChatbotHistory, ChatbotMessage } from "@workspace/api-client-react";
import { Send, Bot, User as UserIcon, Sparkles, RefreshCw } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

// ─── Quick topic chips ────────────────────────────────────────────────────────

const TOPIC_CHIPS = [
  { label: "🏥 ဆေးတက္ကသိုလ်",        msg: "ဆေးတက္ကသိုလ် ဝင်ချင်တယ်။ ဘယ်ကျောင်းတွေ တက်လို့ရသလဲ၊ ဘယ်လောက်ရမှတ် လိုသလဲ ပြောပြပါ" },
  { label: "💻 ကွန်ပျူတာ/IT",          msg: "ကွန်ပျူတာ သိပ္ပံ သို့ IT ဘာသာတက်ချင်တယ်။ UCSY နဲ့ ကွန်ပျူတာကျောင်းတွေ အကြောင်း ပြောပြပါ" },
  { label: "⚙️ အင်ဂျင်နီယာ",           msg: "အင်ဂျင်နီယာ ဘာသာ တက်ချင်တယ်။ YTU, MTU နဲ့ နည်းပညာကျောင်းများ ဆိုင်ရာ ပြောပြပါ" },
  { label: "📊 စီးပွားရေး/ငွေကြေး",    msg: "စီးပွားရေး သို့ Finance ဘာသာ တက်ချင်တယ်။ ဘယ်ကျောင်းတွေ ဝင်လို့ရသလဲ ပြောပြပါ" },
  { label: "⚖️ ဥပဒေ",                  msg: "ဥပဒေ ဘာသာ တက်ချင်တယ်။ ULY, ULM နဲ့ ဥပဒေကျောင်းများ အကြောင်း ပြောပြပါ" },
  { label: "🎓 ပညာရေး/ဆရာ",            msg: "ဆရာ/ဆရာမ ဖြစ်ချင်တယ်။ ပညာရေးတက္ကသိုလ် ဝင်ခွင့်နဲ့ career path ပြောပြပါ" },
  { label: "📚 ဝိဇ္ဇာ/သိပ္ပံ",           msg: "ဝိဇ္ဇာ ဒါမှမဟုတ် သိပ္ပံ ဘာသာ တက်ချင်တယ်။ ရန်ကုန်၊ မန္တလေးတက္ကသိုလ် အကြောင်း ပြောပြပါ" },
  { label: "🌍 နိုင်ငံခြားဘာသာ",        msg: "နိုင်ငံခြားဘာသာ (Japanese/Chinese/Korean) ဘာသာ တက်ချင်တယ်။ YUFL နဲ့ ဘာသာကျောင်းများ ပြောပြပါ" },
];

const WELCOME_MESSAGE: ChatbotMessage = {
  id: 0,
  role: "assistant",
  content: "မင်္ဂလာပါ! ကျွန်တော်က G-12 ကျောင်းသားများကို တက္ကသိုလ်ရွေးချယ်ရာတွင် ကူညီသော AI လမ်းညွှန်ဆရာဖြစ်ပါသည်။\n\nအောက်တွင် သင်ဝါသနာပါသော ဘာသာ ရွေးချယ်ပါ၊ ဒါမှမဟုတ် ကိုယ်တိုင် ရိုက်ထည့်မေးနိုင်ပါသည်။",
  createdAt: new Date().toISOString(),
};

// ─── Simple bold renderer ─────────────────────────────────────────────────────

function MsgContent({ text }: { text: string }) {
  return (
    <div className="space-y-0.5 text-sm leading-relaxed">
      {text.split("\n").map((line, i) => {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i}>
            {parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
          </p>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Chatbot() {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatbotMessage[]>([WELCOME_MESSAGE]);
  const [showChips, setShowChips] = useState(true);

  // Ref to the invisible anchor at the bottom of the messages list
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: history } = useGetChatbotHistory({ query: { enabled: !!user } });

  useEffect(() => {
    if (history?.length) {
      setMessages(history);
      setShowChips(false);
      if (history[0]?.sessionId) setSessionId(history[0].sessionId);
    }
  }, [history]);

  // Auto-scroll to bottom on every message change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useSendChatbotMessage({
    mutation: {
      onSuccess: (data) => {
        setSessionId(data.sessionId);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "assistant",
            content: data.reply,
            sessionId: data.sessionId,
            createdAt: new Date().toISOString(),
          },
        ]);
      },
    },
  });

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || sendMutation.isPending) return;
    setShowChips(false);
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", content: text, sessionId: sessionId || undefined, createdAt: new Date().toISOString() },
    ]);
    sendMutation.mutate({ data: { message: text, sessionId: sessionId || undefined } });
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [sendMutation, sessionId]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };

  const handleNewConversation = () => {
    setMessages([WELCOME_MESSAGE]);
    setSessionId(null);
    setShowChips(true);
    setInput("");
    sendMutation.reset();
  };

  return (
    <Layout noFooter>
      {/* Full-height flex column — fills viewport minus navbar */}
      <div className="flex flex-col" style={{ height: "calc(100dvh - 64px)" }}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">AI တက္ကသိုလ် လမ်းညွှန်</p>
              <p className="text-[11px] text-gray-400">တက္ကသိုလ်ဝင်ခွင့် · မေဂျာ · Career Guide</p>
            </div>
          </div>
          <button
            onClick={handleNewConversation}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-primary bg-gray-100 hover:bg-primary/10 px-3 py-2 rounded-xl transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            စကားဝိုင်းသစ်
          </button>
        </div>

        {/* ── Messages scroll area ────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 px-4 py-4 space-y-3">

          {messages.map((msg, idx) => (
            <div key={msg.id || idx} className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {/* Avatar */}
              <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center mb-0.5 ${
                msg.role === "user" ? "bg-primary" : "bg-white border border-gray-200"
              }`}>
                {msg.role === "user"
                  ? <UserIcon className="h-3.5 w-3.5 text-white" />
                  : <Bot className="h-3.5 w-3.5 text-gray-500" />
                }
              </div>

              {/* Bubble */}
              <div className={`max-w-[78%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl ${
                msg.role === "user"
                  ? "bg-primary text-white rounded-br-sm"
                  : "bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100"
              }`}>
                {msg.role === "assistant"
                  ? <MsgContent text={msg.content} />
                  : <p className="text-sm leading-relaxed">{msg.content}</p>
                }
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {sendMutation.isPending && (
            <div className="flex items-end gap-2">
              <div className="shrink-0 h-7 w-7 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-0.5">
                <Bot className="h-3.5 w-3.5 text-gray-500" />
              </div>
              <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                {[0, 160, 320].map((d) => (
                  <div key={d} className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}

          {/* Quick topic chips — shown at start or after reset */}
          {showChips && !sendMutation.isPending && (
            <div className="flex flex-wrap gap-2 pl-9 pt-1">
              {TOPIC_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => sendMessage(chip.msg)}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-colors text-gray-700 font-medium shadow-sm"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Suggested universities strip */}
          {sendMutation.data?.suggestedUniversities && sendMutation.data.suggestedUniversities.length > 0 && !sendMutation.isPending && (
            <div className="pl-9">
              <p className="text-[11px] text-gray-400 mb-1.5">သင်နှင့် ကိုက်ညီသော တက္ကသိုလ်များ</p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {sendMutation.data.suggestedUniversities.slice(0, 5).map((uni) => (
                  <Link key={uni.id} href={`/universities/${uni.id}`}>
                    <div className="shrink-0 bg-white border border-gray-100 rounded-xl px-3 py-2 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer min-w-[150px]">
                      <p className="font-semibold text-gray-900 text-xs line-clamp-1">{uni.name}</p>
                      {uni.abbreviation && <p className="text-[11px] text-primary mt-0.5">{uni.abbreviation}</p>}
                      <p className="text-[11px] text-gray-400 mt-0.5">{(uni as any).minScore} မှတ်+</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Invisible anchor — scroll target */}
          <div ref={bottomRef} />
        </div>

        {/* ── Input area ──────────────────────────────────────── */}
        <div className="shrink-0 bg-white border-t border-gray-100 px-4 py-3">
          {!user ? (
            <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
              <p className="text-gray-500 text-sm">စကားဝိုင်း မှတ်တမ်းသိမ်းရန် Sign in ပြုလုပ်ပါ</p>
              <Button variant="outline" asChild size="sm" className="shrink-0">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2 max-w-2xl mx-auto">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="တက္ကသိုလ် သို့ ဝါသနာ မေးပါ..."
                className="flex-1 h-12 rounded-2xl bg-gray-50 border-gray-200 focus:bg-white"
                disabled={sendMutation.isPending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
                }}
              />
              <Button
                type="submit"
                disabled={!input.trim() || sendMutation.isPending}
                className="h-12 w-12 rounded-2xl shrink-0"
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
