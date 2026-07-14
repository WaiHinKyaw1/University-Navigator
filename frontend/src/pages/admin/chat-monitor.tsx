import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getGetChatMessagesQueryKey,
  getListChatRoomsQueryKey,
  getListPeerQuestionsQueryKey,
  useGetChatMessages,
  useListChatRooms,
  useListPeerQuestions,
  type ChatRoom,
  type PeerChatMessage,
} from "@workspace/api-client-react";
import { Eye, MessageCircleQuestion, MessageSquare, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

type SelectedChat =
  | { type: "peer"; question: PeerChatMessage }
  | { type: "room"; room: ChatRoom }
  | null;

function countReplies(message: PeerChatMessage): number {
  return message.replies.reduce((total, reply) => total + 1 + countReplies(reply), 0);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

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

function PeerReplyDetail({
  replies,
  onDelete,
  isDeleting,
  depth = 0,
}: {
  replies: PeerChatMessage[];
  onDelete: (messageId: number) => void;
  isDeleting: boolean;
  depth?: number;
}) {
  if (replies.length === 0) return null;

  return (
    <div className="space-y-3">
      {replies.map((reply) => (
        <div key={reply.id} className="border-l pl-4" style={{ marginLeft: Math.min(depth, 3) * 12 }}>
          <div className="rounded-md bg-muted/40 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{reply.senderName}</span>
                <span>{formatDate(reply.createdAt)}</span>
                {reply.isFiltered && <Badge variant="outline">Filtered</Badge>}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-destructive"
                disabled={isDeleting}
                onClick={() => onDelete(reply.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{reply.content}</p>
          </div>
          <PeerReplyDetail replies={reply.replies} onDelete={onDelete} isDeleting={isDeleting} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

export default function AdminChatMonitor() {
  const [selectedChat, setSelectedChat] = useState<SelectedChat>(null);
  const [deleteMessageId, setDeleteMessageId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { data: rooms, isLoading: isRoomsLoading } = useListChatRooms();
  const { data: peerQuestions, isLoading: isPeerQuestionsLoading } = useListPeerQuestions();
  const selectedRoomId = selectedChat?.type === "room" ? selectedChat.room.id : 0;
  const { data: roomMessages, isLoading: isRoomMessagesLoading } = useGetChatMessages(selectedRoomId, {
    query: {
      enabled: selectedChat?.type === "room",
      queryKey: getGetChatMessagesQueryKey(selectedRoomId),
    },
  });
  const isLoading = isRoomsLoading || isPeerQuestionsLoading;

  const deleteMessage = useMutation({
    mutationFn: (messageId: number) =>
      apiRequest<{ message: string }>(`/api/chat/messages/${messageId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Message deleted");
      setSelectedChat(null);
      setDeleteMessageId(null);
      queryClient.invalidateQueries({ queryKey: getListPeerQuestionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListChatRoomsQueryKey() });
      if (selectedRoomId) {
        queryClient.invalidateQueries({ queryKey: getGetChatMessagesQueryKey(selectedRoomId) });
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete message");
    },
  });

  const handleDelete = (messageId: number) => {
    setDeleteMessageId(messageId);
  };

  const confirmDelete = () => {
    if (deleteMessageId === null) return;
    deleteMessage.mutate(deleteMessageId);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chat Monitor</h1>
          <p className="text-muted-foreground">Monitor platform conversations.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground border rounded-xl bg-card">Loading...</div>
          ) : !rooms?.length && !peerQuestions?.length ? (
            <div className="p-8 text-center text-muted-foreground border rounded-xl bg-card flex flex-col items-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p>No chat activity found.</p>
            </div>
          ) : (
            <>
              {peerQuestions?.map((question) => (
                <Card key={`peer-${question.id}`} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageCircleQuestion className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm flex flex-wrap items-center gap-2">
                          <span className="truncate">{question.title || "Untitled question"}</span>
                          <Badge variant="secondary">Peer Q&A</Badge>
                          {question.isFiltered && <Badge variant="outline">Filtered</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground truncate max-w-md">
                          {question.senderName}: {question.content}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-xs text-muted-foreground text-right">
                        <div>{countReplies(question)} replies</div>
                        <div>{formatDate(question.createdAt)}</div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setSelectedChat({ type: "peer", question })}>
                        <Eye className="h-4 w-4" />
                        Detail
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {rooms?.map((room) => (
                <Card key={`room-${room.id}`} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm flex gap-2">
                          {room.participants.map((participant) => participant.name).join(" / ")}
                        </div>
                        <div className="text-sm text-muted-foreground truncate max-w-md">
                          {room.lastMessage || "No messages"}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-xs text-muted-foreground text-right">
                        {room.lastMessageAt ? formatDate(room.lastMessageAt) : ""}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setSelectedChat({ type: "room", room })}>
                        <Eye className="h-4 w-4" />
                        Detail
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </div>

      <Dialog open={selectedChat !== null} onOpenChange={(open) => !open && setSelectedChat(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedChat?.type === "peer"
                ? selectedChat.question.title || "Peer Q&A detail"
                : selectedChat?.room.participants.map((participant) => participant.name).join(" / ") || "Chat detail"}
            </DialogTitle>
            <DialogDescription>
              {selectedChat?.type === "peer" ? "Full question and replies" : "Direct chat room messages"}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] pr-4">
            {selectedChat?.type === "peer" && (
              <div className="space-y-5">
                <div className="rounded-md border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{selectedChat.question.senderName}</span>
                      <span>{formatDate(selectedChat.question.createdAt)}</span>
                      <Badge variant="secondary">{countReplies(selectedChat.question)} replies</Badge>
                      {selectedChat.question.isFiltered && <Badge variant="outline">Filtered</Badge>}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      disabled={deleteMessage.isPending}
                      onClick={() => handleDelete(selectedChat.question.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{selectedChat.question.content}</p>
                </div>

                {selectedChat.question.replies.length > 0 ? (
                  <PeerReplyDetail
                    replies={selectedChat.question.replies}
                    onDelete={handleDelete}
                    isDeleting={deleteMessage.isPending}
                  />
                ) : (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No replies yet.
                  </div>
                )}
              </div>
            )}

            {selectedChat?.type === "room" && (
              <div className="space-y-3">
                {isRoomMessagesLoading ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Loading messages...</div>
                ) : roomMessages?.length ? (
                  roomMessages.map((message) => (
                    <div key={message.id} className="rounded-md border bg-card p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{message.senderName || "Unknown"}</span>
                          <span>{formatDate(message.createdAt)}</span>
                          {message.isFiltered && <Badge variant="outline">Filtered</Badge>}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-destructive"
                          disabled={deleteMessage.isPending}
                          onClick={() => handleDelete(message.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No messages in this room.
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteMessageId !== null} onOpenChange={(open) => !open && setDeleteMessageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be permanently removed. Replies are also removed when deleting a peer question or reply.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMessage.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground border-destructive-border"
              disabled={deleteMessage.isPending}
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
