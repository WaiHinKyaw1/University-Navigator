import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { 
  useListStudents, 
  useListChatRooms, 
  useCreateChatRoom, 
  useGetChatMessages, 
  useSendChatMessage,
  StudentSummary,
  ChatRoom
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Send, User, MessageSquare, Plus } from "lucide-react";
import { useLocation } from "wouter";

export default function Chat() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeRoom, setActiveRoom] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (user === null) {
      setLocation("/login");
    }
  }, [user, setLocation]);

  const { data: studentsData } = useListStudents({
    search: search || undefined
  }, {
    query: {
      enabled: !!user
    }
  });

  const { data: roomsData, refetch: refetchRooms } = useListChatRooms({
    query: {
      enabled: !!user,
      refetchInterval: 5000 // Poll rooms
    }
  });

  const { data: messagesData } = useGetChatMessages(activeRoom || 0, {
    query: {
      enabled: !!activeRoom,
      refetchInterval: 3000 // Poll messages
    }
  });

  const createRoomMutation = useCreateChatRoom({
    mutation: {
      onSuccess: (room) => {
        setActiveRoom(room.id);
        refetchRooms();
      }
    }
  });

  const sendMessageMutation = useSendChatMessage({
    mutation: {
      onSuccess: () => {
        setMessage("");
      }
    }
  });

  // Auto scroll to bottom of messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messagesData]);

  const handleCreateRoom = (studentId: number) => {
    // Check if room already exists
    const existingRoom = roomsData?.find(r => 
      r.participants.some(p => p.id === studentId)
    );

    if (existingRoom) {
      setActiveRoom(existingRoom.id);
    } else {
      createRoomMutation.mutate({
        data: { participantId: studentId }
      });
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !activeRoom || sendMessageMutation.isPending) return;

    sendMessageMutation.mutate({
      data: {
        roomId: activeRoom,
        content: message
      }
    });
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="container py-6 h-[calc(100vh-4rem)] max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
        
        {/* Left Sidebar - Contacts/Rooms */}
        <Card className="w-full md:w-80 flex flex-col h-[400px] md:h-full shrink-0 border-border/50">
          <div className="p-4 border-b">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Peer Chat
            </h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Find students..." 
                className="pl-9 bg-muted/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {search ? (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Search Results
                  </div>
                  {(studentsData as any[])?.filter(s => s.id !== user.id).map(student => (
                    <button
                      key={student.id}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                      onClick={() => handleCreateRoom(student.id)}
                    >
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={student.avatarUrl || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {student.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-medium text-sm truncate">{student.name}</p>
                        {student.grade && <p className="text-xs text-muted-foreground truncate">{student.grade}</p>}
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                  {(studentsData as any[])?.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">No students found.</div>
                  )}
                </>
              ) : (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
                    Recent Conversations
                  </div>
                  {roomsData?.map(room => {
                    const otherParticipant = room.participants.find(p => p.id !== user.id);
                    if (!otherParticipant) return null;
                    
                    return (
                      <button
                        key={room.id}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                          activeRoom === room.id ? 'bg-primary/10' : 'hover:bg-muted'
                        }`}
                        onClick={() => setActiveRoom(room.id)}
                      >
                        <Avatar className="h-10 w-10 border border-border">
                          <AvatarImage src={otherParticipant.avatarUrl || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {otherParticipant.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex justify-between items-center">
                            <p className="font-medium text-sm truncate">{otherParticipant.name}</p>
                            {room.unreadCount ? (
                              <span className="bg-primary text-primary-foreground text-[10px] h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center font-bold">
                                {room.unreadCount}
                              </span>
                            ) : null}
                          </div>
                          <p className={`text-xs truncate ${room.unreadCount ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                            {room.lastMessage || "No messages yet"}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                  {!roomsData?.length && (
                    <div className="p-8 text-center flex flex-col items-center">
                      <User className="h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">No conversations yet.</p>
                      <p className="text-xs text-muted-foreground mt-1">Search for students to start chatting.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Right Area - Active Chat */}
        <Card className="flex-1 flex flex-col h-[400px] md:h-full border-border/50 overflow-hidden">
          {activeRoom ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b bg-card flex items-center gap-3">
                {(() => {
                  const room = roomsData?.find(r => r.id === activeRoom);
                  const otherParticipant = room?.participants.find(p => p.id !== user.id);
                  return otherParticipant ? (
                    <>
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={otherParticipant.avatarUrl || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {otherParticipant.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{otherParticipant.name}</h3>
                        {otherParticipant.grade && <p className="text-xs text-muted-foreground">{otherParticipant.grade}</p>}
                      </div>
                    </>
                  ) : <div className="h-10"></div>
                })()}
              </div>

              {/* Chat Messages */}
              <ScrollArea className="flex-1 p-4 bg-muted/20" ref={scrollRef}>
                <div className="space-y-4">
                  {messagesData?.map(msg => {
                    const isMe = msg.senderId === user.id;
                    return (
                      <div key={msg.id} className={`flex flex-col max-w-[75%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                        <div className={`p-3 rounded-2xl ${
                          isMe 
                            ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                            : 'bg-card border shadow-sm text-foreground rounded-tl-sm'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 px-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                  {!messagesData?.length && (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                      <MessageSquare className="h-12 w-12 text-muted-foreground/20 mb-4" />
                      <p>Send a message to start the conversation.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <div className="p-4 bg-card border-t">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input 
                    placeholder="Type a message..." 
                    className="flex-1 bg-muted/50 border-transparent focus-visible:bg-background"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button type="submit" size="icon" disabled={!message.trim() || sendMessageMutation.isPending} className="shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
              <MessageSquare className="h-16 w-16 text-muted-foreground/20 mb-4" />
              <p className="text-lg font-medium text-foreground">Your Messages</p>
              <p className="text-sm">Select a conversation or find a student to chat with.</p>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}