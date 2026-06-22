import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { useListNews, useDeleteNews, useCreateNews, useUpdateNews } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type NewsForm = {
  title: string;
  content: string;
  category: string;
  imageUrl: string;
  published: boolean;
};

const emptyForm: NewsForm = {
  title: "",
  content: "",
  category: "general",
  imageUrl: "",
  published: true,
};

export default function AdminNews() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any | null>(null);
  const [form, setForm] = useState<NewsForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const queryClient = useQueryClient();
  const { data: response, isLoading } = useListNews({ limit: 50 });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/news"] });

  const createMutation = useCreateNews({
    mutation: {
      onSuccess: () => {
        toast.success("News article created successfully");
        setModalOpen(false);
        refresh();
      },
      onError: (err) => toast.error(err.message || "Failed to create news"),
    },
  });

  const updateMutation = useUpdateNews({
    mutation: {
      onSuccess: () => {
        toast.success("News article updated successfully");
        setModalOpen(false);
        refresh();
      },
      onError: (err) => toast.error(err.message || "Failed to update news"),
    },
  });

  const deleteMutation = useDeleteNews({
    mutation: {
      onSuccess: () => {
        toast.success("News article deleted successfully");
        setDeleteTarget(null);
        refresh();
      },
      onError: (err) => {
        toast.error(err.message || "Failed to delete news");
      }
    }
  });

  const openCreate = () => {
    setEditingArticle(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (article: any) => {
    setEditingArticle(article);
    setForm({
      title: article.title || "",
      content: article.content || "",
      category: article.category || "general",
      imageUrl: article.imageUrl || "",
      published: article.published !== false,
    });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.content.trim() || !form.category.trim()) {
      toast.error("Title, content, and category are required");
      return;
    }

    const data = {
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category,
      imageUrl: form.imageUrl.trim() || undefined,
      published: form.published,
    };

    if (editingArticle) {
      updateMutation.mutate({ id: editingArticle.id, data });
    } else {
      createMutation.mutate({ data });
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget.id });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">News</h1>
            <p className="text-muted-foreground">Manage announcements and admission news.</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Compose Article
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : response?.articles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No news articles found.</TableCell>
                  </TableRow>
                ) : (
                  response?.articles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell className="font-medium max-w-[300px] truncate">{article.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{article.category}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(article.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {article.published ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Published</Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(article)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() =>
                            setDeleteTarget({
                              id: article.id,
                              name: article.title,
                            })
                          }
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingArticle ? "Edit Article" : "Compose Article"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="news-title">Title</Label>
                <Input id="news-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(category) => setForm({ ...form, category })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["admission", "announcement", "scholarship", "general"].map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="news-image">Image URL</Label>
                <Input id="news-image" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="news-content">Content</Label>
                <Textarea id="news-content" className="min-h-40" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              </div>
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={form.published} onCheckedChange={(published) => setForm({ ...form, published })} />
                Published
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingArticle ? "Save Changes" : "Publish Article"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DeleteConfirmDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Delete Article"
          description={
            deleteTarget
              ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`
              : ""
          }
          onConfirm={confirmDelete}
          isPending={deleteMutation.isPending}
        />
      </div>
    </AdminLayout>
  );
}
