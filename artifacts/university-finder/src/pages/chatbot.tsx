import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSendChatbotMessage, useGetChatbotHistory, ChatbotMessage } from "@workspace/api-client-react";
import { Send, Bot, User as UserIcon, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function Chatbot() {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: history } = useGetChatbotHistory({
    query: {
      enabled: !!user
    }
  });

  const [messages, setMessages] = useState<ChatbotMessage[]>([]);

  useEffect(() => {
    if (history?.length) {
      setMessages(history);
      if (history[0]?.sessionId) {
        setSessionId(history[0].sessionId);
      }
    } else if (messages.length === 0) {
      setMessages([
        {
          id: Date.now(),
          role: "assistant",
          content: "မင်္ဂလာပါ! ကျွန်တော်က G-12 ကျောင်းသားများကို တက္ကသိုလ်ရွေးချယ်ရာတွင် ကူညီသော AI လမ်းညွှန်ဆရာဖြစ်ပါသည်။\n\nသင်ဘာဝါသနာပါသလဲ? ဒါမှမဟုတ် G-12 ရမှတ် ဘယ်လောက်ရသလဲ ပြောပြပါ — ဆေးတက္ကသိုလ်၊ နည်းပညာ၊ ကွန်ပျူတာ၊ စီးပွားရေး၊ ဥပဒေ စသည်ဖြင့် သင့်ကိုက်ညီဆုံး တက္ကသိုလ်နှင့် မေဂျာများ ညွှန်ပြပေးပါမည်။",
          createdAt: new Date().toISOString()
        }
      ]);
    }
  }, [history]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMutation = useSendChatbotMessage({
    mutation: {
      onSuccess: (data) => {
        setSessionId(data.sessionId);
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: "assistant",
          content: data.reply,
          sessionId: data.sessionId,
          createdAt: new Date().toISOString()
        }]);
      }
    }
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sendMutation.isPending) return;

    const userMessage: ChatbotMessage = {
      id: Date.now(),
      role: "user",
      content: input,
      sessionId: sessionId || undefined,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    sendMutation.mutate({
      data: {
        message: input,
        sessionId: sessionId || undefined
      }
    });
    setInput("");
  };

  return (
    <Layout>
      <div className="container py-8 px-4 md:px-6 max-w-4xl mx-auto h-[calc(100vh-16rem)] min-h-[500px] flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            AI Interest Guide <Sparkles className="h-6 w-6 text-secondary" />
          </h1>
          <p className="text-muted-foreground mt-1">Discover your path through a conversation.</p>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden border-border/50 shadow-sm">
          <ScrollArea className="flex-1 p-4 sm:p-6" ref={scrollRef}>
            <div className="space-y-6 max-w-3xl mx-auto pb-4">
              {messages.map((msg, idx) => (
                <div 
                  key={msg.id || idx} 
                  className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary/20 text-secondary-foreground'
                  }`}>
                    {msg.role === 'user' ? <UserIcon className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                  </div>
                  <div className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-4 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                        : 'bg-muted text-foreground rounded-tl-sm'
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {sendMutation.isPending && (
                <div className="flex items-start gap-4">
                  <div className="shrink-0 h-8 w-8 rounded-full bg-secondary/20 text-secondary-foreground flex items-center justify-center">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="bg-muted p-4 rounded-2xl rounded-tl-sm w-16 h-12 flex items-center justify-center gap-1">
                    <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 bg-background border-t">
            {!user ? (
              <div className="text-center p-4 bg-muted/50 rounded-xl border border-dashed">
                <p className="text-muted-foreground mb-3">Sign in to save your conversation history and get personalized recommendations.</p>
                <Button variant="outline" asChild>
                  <Link href="/login">Sign in to Chat</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSend} className="flex gap-2 max-w-3xl mx-auto relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="I like drawing and building things..."
                  className="flex-1 bg-card border-border pr-12 h-12 rounded-full"
                  disabled={sendMutation.isPending}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!input.trim() || sendMutation.isPending}
                  className="absolute right-1 top-1 h-10 w-10 rounded-full"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            )}
          </div>
        </Card>
        
        {/* Render suggestions if any from the last response */}
        {sendMutation.data?.suggestedUniversities && sendMutation.data.suggestedUniversities.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold text-lg mb-4">Suggested Universities for You:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sendMutation.data.suggestedUniversities.map(uni => (
                <Card key={uni.id} className="p-4 hover:border-primary/50 transition-colors">
                  <h4 className="font-bold text-base truncate">{uni.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{uni.nameEn}</p>
                  <Button variant="link" className="px-0 mt-2 h-auto text-primary" asChild>
                    <Link href={`/universities/${uni.id}`}>View details</Link>
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}