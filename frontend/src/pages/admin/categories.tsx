import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import {
  useListCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@workspace/api-client-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type CategoryForm = {
  name: string;
  nameEn: string;
  color: string;
  description: string;
};

const emptyForm: CategoryForm = {
  name: "",
  nameEn: "",
  color: "#6366f1",
  description: "",
};

const PRESET_COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#f59e0b", // amber
  "#ef4444", // red
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#6b7280", // gray
  "#14b8a6", // teal
  "#f97316", // orange
  "#84cc16", // lime
  "#06b6d4", // cyan
];

export default function AdminCategories() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useListCategories();

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/categories"] });

  const createMutation = useCreateCategory({
    mutation: {
      onSuccess: () => {
        toast.success("Category created successfully");
        setModalOpen(false);
        refresh();
      },
      onError: (err) => toast.error(err.message || "Failed to create category"),
    },
  });

  const updateMutation = useUpdateCategory({
    mutation: {
      onSuccess: () => {
        toast.success("Category updated successfully");
        setModalOpen(false);
        refresh();
      },
      onError: (err) => toast.error(err.message || "Failed to update category"),
    },
  });

  const deleteMutation = useDeleteCategory({
    mutation: {
      onSuccess: () => {
        toast.success("Category deleted successfully");
        setDeleteTarget(null);
        refresh();
      },
      onError: (err) =>
        toast.error(err.message || "Failed to delete category"),
    },
  });

  const openCreate = () => {
    setEditingCategory(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (cat: any) => {
    setEditingCategory(cat);
    setForm({
      name: cat.name || "",
      nameEn: cat.nameEn || "",
      color: cat.color || "#6366f1",
      description: cat.description || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.nameEn.trim()) {
      toast.error("Display name and slug (nameEn) are required");
      return;
    }
    // Normalize slug: lowercase, no spaces
    const slug = form.nameEn.trim().toLowerCase().replace(/\s+/g, "-");
    const data = {
      name: form.name.trim(),
      nameEn: slug,
      color: form.color || null,
      description: form.description.trim() || null,
    };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Tag className="h-7 w-7 text-primary" />
              Categories
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage academic categories used to classify majors. These appear
              as the dropdown options when creating or editing a major.
            </p>
          </div>
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Slug (nameEn)</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-muted-foreground"
                    >
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : !categories?.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-muted-foreground"
                    >
                      No categories yet. Click "Add Category" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color ?? "#6b7280" }}
                          />
                          {cat.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {cat.nameEn}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-5 w-5 rounded border border-border"
                            style={{ backgroundColor: cat.color ?? "#6b7280" }}
                          />
                          <span className="text-xs text-muted-foreground font-mono">
                            {cat.color ?? "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {cat.description ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openEdit(cat)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() =>
                            setDeleteTarget({ id: cat.id, name: cat.name })
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

        {/* Add / Edit Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit Category" : "Add Category"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="cat-name">
                  Display Name{" "}
                  <span className="text-muted-foreground text-xs">
                    (shown to users)
                  </span>
                </Label>
                <Input
                  id="cat-name"
                  placeholder="e.g. Engineering"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cat-name-en">
                  Slug{" "}
                  <span className="text-muted-foreground text-xs">
                    (unique lowercase identifier, e.g. engineering)
                  </span>
                </Label>
                <Input
                  id="cat-name-en"
                  placeholder="e.g. engineering"
                  value={form.nameEn}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      nameEn: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Badge Color</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className={`h-7 w-7 rounded-full border-2 transition-all ${
                        form.color === c
                          ? "border-foreground scale-110 shadow-md"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="h-7 w-7 rounded-full border border-border shrink-0"
                    style={{ backgroundColor: form.color }}
                  />
                  <Input
                    placeholder="#6366f1"
                    value={form.color}
                    onChange={(e) =>
                      setForm({ ...form, color: e.target.value })
                    }
                    className="font-mono text-sm h-8"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cat-desc">
                  Description{" "}
                  <span className="text-muted-foreground text-xs">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="cat-desc"
                  placeholder="Briefly describe this category…"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                />
              </div>

              {/* Live preview */}
              <div className="rounded-xl border bg-muted/30 p-3 space-y-1">
                <p className="text-xs text-muted-foreground font-medium">
                  Preview
                </p>
                <div className="flex items-center gap-2">
                  <Badge
                    style={{
                      backgroundColor: form.color + "22",
                      color: form.color,
                      borderColor: form.color + "55",
                    }}
                    variant="outline"
                    className="font-medium"
                  >
                    <span
                      className="mr-1.5 h-2 w-2 rounded-full inline-block"
                      style={{ backgroundColor: form.color }}
                    />
                    {form.name || "Category Name"}
                  </Badge>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  createMutation.isPending || updateMutation.isPending
                }
              >
                {editingCategory ? "Save Changes" : "Create Category"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <DeleteConfirmDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Delete Category"
          description={
            deleteTarget
              ? `Are you sure you want to delete "${deleteTarget.name}"? Existing majors using this category will still reference the old slug, but the category won't appear in new dropdowns.`
              : ""
          }
          onConfirm={confirmDelete}
          isPending={deleteMutation.isPending}
        />
      </div>
    </AdminLayout>
  );
}
