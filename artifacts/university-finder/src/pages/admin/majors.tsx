import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useListMajors, useDeleteMajor, useCreateMajor, useUpdateMajor } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type MajorForm = {
  name: string;
  nameEn: string;
  category: string;
  description: string;
};

const emptyForm: MajorForm = {
  name: "",
  nameEn: "",
  category: "science",
  description: "",
};

export default function AdminMajors() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMajor, setEditingMajor] = useState<any | null>(null);
  const [form, setForm] = useState<MajorForm>(emptyForm);
  const queryClient = useQueryClient();
  const { data: majors, isLoading } = useListMajors();

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/majors"] });

  const createMutation = useCreateMajor({
    mutation: {
      onSuccess: () => {
        toast.success("Major created successfully");
        setModalOpen(false);
        refresh();
      },
      onError: (err) => toast.error(err.message || "Failed to create major"),
    },
  });

  const updateMutation = useUpdateMajor({
    mutation: {
      onSuccess: () => {
        toast.success("Major updated successfully");
        setModalOpen(false);
        refresh();
      },
      onError: (err) => toast.error(err.message || "Failed to update major"),
    },
  });

  const deleteMutation = useDeleteMajor({
    mutation: {
      onSuccess: () => {
        toast.success("Major deleted successfully");
        refresh();
      },
      onError: (err) => {
        toast.error(err.message || "Failed to delete major");
      }
    }
  });

  const openCreate = () => {
    setEditingMajor(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (major: any) => {
    setEditingMajor(major);
    setForm({
      name: major.name || "",
      nameEn: major.nameEn || "",
      category: major.category || "science",
      description: major.description || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.nameEn.trim() || !form.category.trim()) {
      toast.error("Name, English name, and category are required");
      return;
    }

    const data = {
      name: form.name.trim(),
      nameEn: form.nameEn.trim(),
      category: form.category,
      description: form.description.trim() || undefined,
    };

    if (editingMajor) {
      updateMutation.mutate({ id: editingMajor.id, data });
    } else {
      createMutation.mutate({ data });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this major?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Majors</h1>
            <p className="text-muted-foreground">Manage academic fields of study.</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Major
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>English Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : !majors?.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No majors found.</TableCell>
                  </TableRow>
                ) : (
                  majors.map((major) => (
                    <TableRow key={major.id}>
                      <TableCell className="font-medium">{major.name}</TableCell>
                      <TableCell>{major.nameEn}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{major.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(major)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(major.id)}
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingMajor ? "Edit Major" : "Add Major"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="major-name">Name</Label>
                <Input id="major-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="major-name-en">English Name</Label>
                <Input id="major-name-en" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(category) => setForm({ ...form, category })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["science", "arts", "engineering", "medical", "business", "education", "law", "other"].map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="major-description">Description</Label>
                <Textarea id="major-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingMajor ? "Save Changes" : "Create Major"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
