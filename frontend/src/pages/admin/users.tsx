import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useListUsers, useBanUser } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Ban, CheckCircle, Shield, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: number, name: string, isBanned: boolean } | null>(null);
  const [banReason, setBanReason] = useState("");

  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useListUsers({
    search: search || undefined
  });

  const banMutation = useBanUser({
    mutation: {
      onSuccess: () => {
        toast.success(selectedUser?.isBanned ? "User unbanned successfully" : "User banned successfully");
        setBanModalOpen(false);
        setBanReason("");
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      },
      onError: (err) => {
        toast.error(err.message || "Failed to update user status");
      }
    }
  });

  const handleBanSubmit = () => {
    if (!selectedUser) return;
    banMutation.mutate({
      id: selectedUser.id,
      data: {
        banned: !selectedUser.isBanned,
        reason: banReason || (selectedUser.isBanned ? "Unbanned by admin" : "Violation of terms")
      }
    });
  };

  const openBanModal = (user: { id: number, name: string, status: string }) => {
    setSelectedUser({ id: user.id, name: user.name, isBanned: user.status === "banned" });
    setBanReason("");
    setBanModalOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground">Manage students and admin accounts.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-9 bg-card"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading users...</TableCell>
                  </TableRow>
                ) : usersData?.users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users found.</TableCell>
                  </TableRow>
                ) : (
                  usersData?.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={user.role === 'admin' ? 'border-primary text-primary capitalize' : 'capitalize'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'active' ? 'secondary' : 'destructive'} className={user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 capitalize' : 'capitalize'}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.role !== 'admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openBanModal(user)}
                            className={user.status === 'active' ? 'text-destructive hover:text-destructive hover:bg-destructive/10' : 'text-primary hover:text-primary hover:bg-primary/10'}
                          >
                            {user.status === 'active' ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            <span className="sr-only">{user.status === 'active' ? 'Ban' : 'Unban'}</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={banModalOpen} onOpenChange={setBanModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedUser?.isBanned ? 'Unban User' : 'Ban User'}
              </DialogTitle>
              <DialogDescription>
                {selectedUser?.isBanned
                  ? `Are you sure you want to restore access for ${selectedUser?.name}?`
                  : `Are you sure you want to ban ${selectedUser?.name}? They will lose access to the platform.`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  placeholder={selectedUser?.isBanned ? "Reason for unbanning..." : "Reason for banning..."}
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBanModalOpen(false)}>Cancel</Button>
              <Button
                variant={selectedUser?.isBanned ? "default" : "destructive"}
                onClick={handleBanSubmit}
                disabled={banMutation.isPending}
              >
                {banMutation.isPending ? "Processing..." : selectedUser?.isBanned ? "Unban User" : "Ban User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}