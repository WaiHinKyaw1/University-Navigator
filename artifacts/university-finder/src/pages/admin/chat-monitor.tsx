import { AdminLayout } from "@/components/admin-layout";
import { useListChatRooms } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Users } from "lucide-react";

export default function AdminChatMonitor() {
  const { data: rooms, isLoading } = useListChatRooms();

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
          ) : !rooms?.length ? (
            <div className="p-8 text-center text-muted-foreground border rounded-xl bg-card flex flex-col items-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p>No active chat rooms found.</p>
            </div>
          ) : (
            rooms.map((room) => (
              <Card key={room.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm flex gap-2">
                        {room.participants.map(p => p.name).join(" • ")}
                      </div>
                      <div className="text-sm text-muted-foreground truncate max-w-md">
                        {room.lastMessage || "No messages"}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    {room.lastMessageAt ? new Date(room.lastMessageAt).toLocaleString() : ''}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}