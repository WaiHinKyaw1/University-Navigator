import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useListUsers,
  useBanUser,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Ban,
  CheckCircle,
  Shield,
  ShieldAlert,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const pageSize = 10;

function Pagination({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = pages.filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  return (
    <div className="flex items-center justify-center gap-1.5 pt-4">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="touch-target flex h-9 w-9 items-center justify-center rounded-xl border border-input bg-background text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {visible.map((p, i, arr) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && arr[i - 1] !== p - 1 && (
            <span className="px-1 text-sm text-muted-foreground">…</span>
          )}
          <button
            onClick={() => onChange(p)}
            className={`h-9 min-w-9 px-2.5 rounded-xl text-sm font-semibold transition-colors ${
              p === page
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-input bg-background text-muted-foreground hover:border-primary/50 hover:text-primary"
            }`}
          >
            {p}
          </button>
        </span>
      ))}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="touch-target flex h-9 w-9 items-center justify-center rounded-xl border border-input bg-background text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: number;
    name: string;
    isBanned: boolean;
  } | null>(null);
  const [banReason, setBanReason] = useState("");

  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useListUsers({
    search: search || undefined,
    page,
    limit: pageSize,
  });

  const banMutation = useBanUser({
    mutation: {
      onSuccess: () => {
        toast.success(
          selectedUser?.isBanned
            ? "User unbanned successfully"
            : "User banned successfully",
        );
        setBanModalOpen(false);
        setBanReason("");
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: (err) => {
        toast.error(err.message || "Failed to update user status");
      },
    },
  });

  const handleBanSubmit = () => {
    if (!selectedUser) return;
    banMutation.mutate({
      id: selectedUser.id,
      data: {
        banned: !selectedUser.isBanned,
        reason:
          banReason ||
          (selectedUser.isBanned ? "Unbanned by admin" : "Violation of terms"),
      },
    });
  };

  const openBanModal = (user: { id: number; name: string; status: string }) => {
    setSelectedUser({
      id: user.id,
      name: user.name,
      isBanned: user.status === "banned",
    });
    setBanReason("");
    setBanModalOpen(true);
  };
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedDeleteUser, setSelectedDeleteUser] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const deleteUser = async (id: number) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      toast.success("User deleted successfully");

      setDeleteModalOpen(false);

      queryClient.invalidateQueries({
        queryKey: getListUsersQueryKey(),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground">
              Manage students and admin accounts.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-9 bg-card"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
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
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : usersData?.users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  usersData?.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            user.role === "admin"
                              ? "border-primary text-primary capitalize"
                              : "capitalize"
                          }
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.status === "active"
                              ? "secondary"
                              : "destructive"
                          }
                          className={
                            user.status === "active"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 capitalize"
                              : "capitalize"
                          }
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.role !== "admin" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openBanModal(user)}
                              >
                                {user.status === "active" ? (
                                  <>
                                    <Ban className="mr-2 h-4 w-4 text-red-500" />
                                    Ban User
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                    Unban User
                                  </>
                                )}
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setSelectedDeleteUser({
                                    id: user.id,
                                    name: user.name,
                                  });
                                  setDeleteModalOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          {usersData?.total !== undefined && usersData.total > pageSize && (
            <div className="border-t px-4 py-2 text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, usersData.total)} of{" "}
              {usersData.total} users
            </div>
          )}
          <div className="px-4 pb-4">
            <Pagination
              page={page}
              total={usersData?.total ?? 0}
              onChange={(p) => setPage(Math.max(1, p))}
            />
          </div>
        </Card>

        <Dialog open={banModalOpen} onOpenChange={setBanModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedUser?.isBanned ? "Unban User" : "Ban User"}
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
                  placeholder={
                    selectedUser?.isBanned
                      ? "Reason for unbanning..."
                      : "Reason for banning..."
                  }
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBanModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={selectedUser?.isBanned ? "default" : "destructive"}
                onClick={handleBanSubmit}
                disabled={banMutation.isPending}
              >
                {banMutation.isPending
                  ? "Processing..."
                  : selectedUser?.isBanned
                    ? "Unban User"
                    : "Ban User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete{" "}
                <strong>{selectedDeleteUser?.name}</strong>?
                <br />
                <br />
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteModalOpen(false)}
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                onClick={() => {
                  if (!selectedDeleteUser) return;
                  deleteUser(selectedDeleteUser.id);
                }}
              >
                Delete User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
