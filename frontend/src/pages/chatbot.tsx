import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSendChatbotMessage } from "@workspace/api-client-react";
import { Send, Bot, User as UserIcon, Sparkles, RefreshCw } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

type LocalMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

const TOPIC_CHIPS = [
  { label: "🤔 တက္ကသိုလ်မသိသေးဘူး", msg: "တက္ကသိုလ်အကြောင်း သိပ်မသိသေးဘူး။ ဘယ်ကျောင်းတွေ ရှိလဲ ရှင်းပြပေးပါ" },
  { label: "🏥 ဆေးတက္ကသိုလ်", msg: "ဆေးတက္ကသိုလ် ဝင်ချင်တယ်။ ဘယ်ကျောင်းတွေ တက်လို့ရသလဲ၊ ဘယ်လောက်ရမှတ် လိုသလဲ ပြောပြပါ" },
  { label: "💻 ကွန်ပျူတာ/IT", msg: "ကွန်ပျူတာ သိပ္ပံ သို့ IT ဘာသာတက်ချင်တယ်။ ကွန်ပျူတာကျောင်းတွေ အကြောင်း ပြောပြပါ" },
  { label: "⚙️ အင်ဂျင်နီယာ", msg: "အင်ဂျင်နီယာ ဘာသာ တက်ချင်တယ်။ နည်းပညာကျောင်းများ အကြောင်း ပြောပြပါ" },
  { label: "📊 စီးပွားရေး/ငွေကြေး", msg: "စီးပွားရေး သို့ Finance ဘာသာ တက်ချင်တယ်။ ဘယ်ကျောင်းတွေ ဝင်လို့ရသလဲ ပြောပြပါ" },
  { label: "⚖️ ဥပဒေ", msg: "ဥပဒေ ဘာသာ တက်ချင်တယ်။ ဥပဒေကျောင်းများ အကြောင်း ပြောပြပါ" },
  { label: "🎓 ပညာရေး/ဆရာ", msg: "ဆရာ/ဆရာမ ဖြစ်ချင်တယ်။ ပညာရေးတက္ကသိုလ် ဝင်ခွင့်နဲ့ career path ပြောပြပါ" },
  { label: "📚 ဝိဇ္ဇာ/သိပ္ပံ", msg: "ဝိဇ္ဇာ ဒါမှမဟုတ် သိပ္ပံ ဘာသာ တက်ချင်တယ်။ ရန်ကုန်၊ မန္တလေးတက္ကသိုလ် အကြောင်း ပြောပြပါ" },
  { label: "🌍 နိုင်ငံခြားဘာသာ", msg: "နိုင်ငံခြားဘာသာ (Japanese/Chinese/Korean) ဘာသာ တက်ချင်တယ်။ ဘာသာကျောင်းများ ပြောပြပါ" },
];

const WELCOME_MESSAGE: LocalMessage = {
  id: 0,
  role: "assistant",
  content:
    "မင်္ဂလာပါ! ကျွန်တော်က G-12 ကျောင်းသားများကို မြန်မာနိုင်ငံတက္ကသိုလ်များ၊ မေဂျာ၊ career path များအကြောင်း ကူညီသော Chatbot ဖြစ်ပါသည်။\n\nတက္ကသိုလ်ဝင်ခွင့်၊ မေဂျာရွေးချယ်မှု၊ အလုပ်အကိုင်အခွင့်အလမ်းများသာ မေးမြန်းနိုင်ပါသည်။",
  createdAt: new Date().toISOString(),
};

function MsgContent({ text }: { text: string }) {
  return (
    <div className="space-y-0.5 text-sm leading-relaxed">
      {text.split("\n").map((line, i) => {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i}>
            {parts.map((p, j) => (j % 2 === 1 ? <strong key={j}>{p}</strong> : p))}
          </p>
        );
      })}
    </div>
  );
}

export default function Chatbot() {
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([WELCOME_MESSAGE]);
  const [showChips, setShowChips] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
            createdAt: new Date().toISOString(),
          },
        ]);
      },
    },
  });

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || sendMutation.isPending) return;

      const history = messages
        .filter((m) => m.id !== 0)
        .map((m) => ({ role: m.role, content: m.content }));

      setShowChips(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "user",
          content: text,
          createdAt: new Date().toISOString(),
        },
      ]);

      sendMutation.mutate({
        data: {
          message: text,
          sessionId: sessionId || undefined,
          history,
        },
      });

      setInput("");
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [sendMutation, sessionId, messages],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleNewConversation = () => {
    setMessages([WELCOME_MESSAGE]);
    setSessionId(null);
    setShowChips(true);
    setInput("");
    sendMutation.reset();
  };

  return (
    <Layout noFooter>
      <div className="flex flex-col" style={{ height: "calc(100dvh - 64px)" }}>
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-foreground">တက္ကသိုလ် လမ်းညွှန်</p>
              <p className="text-[11px] text-muted-foreground">တက္ကသိုလ် · မေဂျာ · Career Guide</p>
            </div>
          </div>
          <button
            onClick={handleNewConversation}
            className="touch-target flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            စကားဝိုင်းသစ်
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 px-4 py-4">
          {messages.map((msg, idx) => (
            <div key={msg.id || idx} className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center mb-0.5 ${msg.role === "user" ? "bg-primary" : "bg-card border border-border"
                  }`}
              >
                {msg.role === "user" ? (
                  <UserIcon className="h-3.5 w-3.5 text-primary-foreground" />
                ) : (
                  <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>

              <div
                className={`max-w-[78%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl ${msg.role === "user"
                  ? "rounded-br-sm bg-primary text-primary-foreground"
                  : "rounded-bl-sm border border-border bg-card text-card-foreground shadow-sm"
                  }`}
              >
                {msg.role === "assistant" ? (
                  <MsgContent text={msg.content} />
                ) : (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {sendMutation.isPending && (
            <div className="flex items-end gap-2">
              <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                <Bot className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3 shadow-sm">
                {[0, 160, 320].map((d) => (
                  <div
                    key={d}
                    className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          {showChips && !sendMutation.isPending && (
            <div className="flex flex-wrap gap-2 pl-9 pt-1">
              {TOPIC_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => sendMessage(chip.msg)}
                  className="touch-target rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="shrink-0 border-t border-border bg-background px-4 py-3">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="တက္ကသိုလ်၊ မေဂျာ၊ career အကြောင်း မေးပါ..."
                className="h-12 flex-1 rounded-2xl border-input bg-muted/40 focus:bg-background"
                disabled={sendMutation.isPending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
              />
              <Button
                type="submit"
                disabled={!input.trim() || sendMutation.isPending}
                className="h-12 w-12 shrink-0 rounded-2xl"
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
