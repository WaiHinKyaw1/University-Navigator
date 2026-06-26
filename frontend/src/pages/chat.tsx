import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MessageCircleQuestion, MessageSquareReply, Search, Send, Users } from "lucide-react";
import { useLocation } from "wouter";

type PeerMessage = {
  id: number;
  parentId: number | null;
  senderId: number;
  senderName: string;
  senderAvatar: string | null;
  title: string | null;
  content: string;
  isFiltered: boolean;
  answerCount: number;
  createdAt: string;
  replies: PeerMessage[];
};

const questionsQueryKey = ["peer-chat-questions"];

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || `Request failed with ${response.status}`);
  }

  return response.json();
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function countReplies(message: PeerMessage): number {
  return message.replies.reduce((total, reply) => total + 1 + countReplies(reply), 0);
}

function ReplyThread({
  replies,
  onReply,
  replyingTo,
  replyText,
  setReplyingTo,
  setReplyText,
  isSubmitting,
  depth = 0,
}: {
  replies: PeerMessage[];
  onReply: (messageId: number) => void;
  replyingTo: number | null;
  replyText: string;
  setReplyingTo: (id: number | null) => void;
  setReplyText: (value: string) => void;
  isSubmitting: boolean;
  depth?: number;
}) {
  return (
    <div className="space-y-3">
      {replies.map((reply) => (
        <div key={reply.id} className={cn("border-l pl-4", depth > 1 && "pl-3")}>
          <div className="flex gap-3 rounded-md bg-muted/30 p-3">
            <Avatar className="h-8 w-8 border">
              <AvatarImage src={reply.senderAvatar || ""} />
              <AvatarFallback className="bg-background text-xs text-primary">
                {initials(reply.senderName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{reply.senderName}</span>
                <span className="text-xs text-muted-foreground">{formatDate(reply.createdAt)}</span>
                {reply.isFiltered && (
                  <Badge variant="outline" className="text-[10px]">
                    Filtered
                  </Badge>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{reply.content}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 h-8 px-2 text-xs"
                onClick={() => {
                  setReplyingTo(reply.id);
                  setReplyText("");
                }}
              >
                <MessageSquareReply className="mr-1 h-3.5 w-3.5" />
                Reply
              </Button>

              {replyingTo === reply.id && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    placeholder="Write a reply..."
                    className="min-h-20 bg-background"
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setReplyingTo(null)}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" disabled={!replyText.trim() || isSubmitting} onClick={() => onReply(reply.id)}>
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Post
                    </Button>
                  </div>
                </div>
              )}

              {reply.replies.length > 0 && (
                <div className="mt-3">
                  <ReplyThread
                    replies={reply.replies}
                    onReply={onReply}
                    replyingTo={replyingTo}
                    replyText={replyText}
                    setReplyingTo={setReplyingTo}
                    setReplyText={setReplyText}
                    isSubmitting={isSubmitting}
                    depth={depth + 1}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    if (user === null) {
      setLocation("/login");
    }
  }, [user, setLocation]);

  const { data: questions = [], isLoading, error } = useQuery({
    queryKey: questionsQueryKey,
    queryFn: () => apiRequest<PeerMessage[]>("/api/chat/questions"),
    enabled: !!user,
    refetchInterval: 5000,
  });

  const createQuestion = useMutation({
    mutationFn: () =>
      apiRequest<PeerMessage>("/api/chat/questions", {
        method: "POST",
        body: JSON.stringify({ title, content }),
      }),
    onSuccess: (question) => {
      setTitle("");
      setContent("");
      setActiveQuestionId(question.id);
      queryClient.invalidateQueries({ queryKey: questionsQueryKey });
    },
  });

  const createReply = useMutation({
    mutationFn: (messageId: number) =>
      apiRequest<PeerMessage>(`/api/chat/messages/${messageId}/replies`, {
        method: "POST",
        body: JSON.stringify({ content: replyText }),
      }),
    onSuccess: () => {
      setReplyText("");
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: questionsQueryKey });
    },
  });

  const filteredQuestions = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return questions;

    return questions.filter((question) =>
      [question.title, question.content, question.senderName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(keyword)),
    );
  }, [questions, search]);

  const activeQuestion = filteredQuestions.find((question) => question.id === activeQuestionId) || filteredQuestions[0];

  useEffect(() => {
    if (!activeQuestionId && filteredQuestions.length > 0) {
      setActiveQuestionId(filteredQuestions[0].id);
    }
  }, [activeQuestionId, filteredQuestions]);

  if (!user) return null;

  return (
    <Layout>
      <div className="container mx-auto flex h-[calc(100vh-4rem)] max-w-6xl flex-col gap-6 py-6 lg:flex-row">
        <Card className="flex h-[520px] w-full shrink-0 flex-col border-border/60 lg:h-full lg:w-[360px]">
          <div className="border-b p-4">
            <h1 className="flex items-center gap-2 text-lg font-bold">
              <Users className="h-5 w-5 text-primary" />
              Peer Q&A Room
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              ကျောင်းသားအချင်းချင်း မေးခွန်းမေးပြီး အဖြေများ ပြန်လည်ဆွေးနွေးရန်
            </p>
            <div className="relative mt-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search questions..."
                className="bg-muted/40 pl-9"
              />
            </div>
          </div>

          <div className="space-y-3 border-b p-4">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Question title"
              className="bg-background"
            />
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Ask about admission, university choice, or major selection..."
              className="min-h-24 bg-background"
            />
            <Button
              className="w-full"
              disabled={!title.trim() || !content.trim() || createQuestion.isPending}
              onClick={() => createQuestion.mutate()}
            >
              <MessageCircleQuestion className="mr-2 h-4 w-4" />
              Ask Question
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-2 p-2">
              {isLoading && <div className="p-4 text-center text-sm text-muted-foreground">Loading questions...</div>}
              {error && <div className="p-4 text-sm text-destructive">{(error as Error).message}</div>}
              {filteredQuestions.map((question) => (
                <button
                  key={question.id}
                  type="button"
                  className={cn(
                    "w-full rounded-md p-3 text-left transition-colors hover:bg-muted",
                    activeQuestion?.id === question.id && "bg-primary/10",
                  )}
                  onClick={() => setActiveQuestionId(question.id)}
                >
                  <div className="line-clamp-2 text-sm font-medium">{question.title}</div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="truncate">{question.senderName}</span>
                    <span>{countReplies(question)} answers</span>
                  </div>
                </button>
              ))}
              {!isLoading && filteredQuestions.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">No questions yet.</div>
              )}
            </div>
          </ScrollArea>
        </Card>

        <Card className="flex min-h-[520px] flex-1 flex-col overflow-hidden border-border/60 lg:h-full">
          {activeQuestion ? (
            <>
              <div className="border-b p-5">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={activeQuestion.senderAvatar || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary">{initials(activeQuestion.senderName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{activeQuestion.senderName}</span>
                      <span>{formatDate(activeQuestion.createdAt)}</span>
                      {activeQuestion.isFiltered && <Badge variant="outline">Filtered</Badge>}
                    </div>
                    <h2 className="mt-2 text-xl font-semibold leading-7">{activeQuestion.title}</h2>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{activeQuestion.content}</p>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 bg-muted/10 p-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Answers</h3>
                    <Badge variant="secondary">{countReplies(activeQuestion)}</Badge>
                  </div>

                  {activeQuestion.replies.length > 0 ? (
                    <ReplyThread
                      replies={activeQuestion.replies}
                      onReply={(messageId) => createReply.mutate(messageId)}
                      replyingTo={replyingTo}
                      replyText={replyText}
                      setReplyingTo={setReplyingTo}
                      setReplyText={setReplyText}
                      isSubmitting={createReply.isPending}
                    />
                  ) : (
                    <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                      Be the first student to answer this question.
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="border-t bg-card p-4">
                <Textarea
                  value={replyingTo === activeQuestion.id || replyingTo === null ? replyText : ""}
                  onChange={(event) => {
                    setReplyingTo(activeQuestion.id);
                    setReplyText(event.target.value);
                  }}
                  placeholder="Write an answer..."
                  className="min-h-20 bg-muted/30"
                />
                <div className="mt-3 flex justify-end">
                  <Button
                    disabled={!replyText.trim() || createReply.isPending}
                    onClick={() => createReply.mutate(replyingTo || activeQuestion.id)}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Post Answer
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <MessageCircleQuestion className="mb-4 h-14 w-14 text-muted-foreground/30" />
              <p className="text-lg font-medium text-foreground">No question selected</p>
              <p className="text-sm">Ask a new question to begin the peer discussion.</p>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
