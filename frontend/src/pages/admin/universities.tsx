import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import {
  useListUniversities,
  useListMajors,
  useDeleteUniversity,
  useCreateUniversity,
  useUpdateUniversity,
} from "@workspace/api-client-react";
import type { University } from "@workspace/api-client-react";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  getCitiesForState,
  isMyanmarState,
  MYANMAR_REGIONS,
  MYANMAR_STATE_DIVISIONS,
  MYANMAR_UNION_TERRITORIES,
} from "@/lib/myanmar-locations";
import Universities from "../universities";

type UniversityForm = {
  name: string;
  nameEn: string;
  abbreviation: string;
  type: string;
  state: string;
  city: string;
  minScore: string;
  description: string;
  website: string;
  imageUrl: string;
  majorIds: number[];
};

const emptyForm: UniversityForm = {
  name: "",
  nameEn: "",
  abbreviation: "",
  type: "government",
  state: "",
  city: "",
  minScore: "",
  description: "",
  website: "",
  imageUrl: "",
  majorIds: [],
};

const UNIVERSITY_TYPES = [
  "government",
  "private",
  "technical",
  "medical",
  "education",
];
const pageSize = 10;

function Pagination({ page, total, pageSize, onChange }: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = pages.filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);

  return (
    <div className="flex items-center justify-center gap-1.5 pt-4">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="h-9 w-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:border-primary/50 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {visible.map((p, i, arr) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && arr[i - 1] !== p - 1 && <span className="text-gray-400 text-sm px-1">…</span>}
          <button
            onClick={() => onChange(p)}
            className={`h-9 min-w-9 px-2.5 rounded-xl text-sm font-semibold transition-colors ${p === page
              ? "bg-primary text-white shadow-sm"
              : "border border-gray-200 bg-white text-gray-600 hover:border-primary/50 hover:text-primary"
              }`}
          >
            {p}
          </button>
        </span>
      ))}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="h-9 w-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:border-primary/50 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function AdminUniversities() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState<University | null>(
    null,
  );
  const [form, setForm] = useState<UniversityForm>(emptyForm);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const queryClient = useQueryClient();

  const { data: response, isLoading } = useListUniversities({
    search: search || undefined,
    limit: 100,
  });
  const { data: majors } = useListMajors();

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/universities"] });

  const createMutation = useCreateUniversity({
    mutation: {
      onSuccess: () => {
        toast.success("University created successfully");
        setModalOpen(false);
        refresh();
      },
      onError: (err) =>
        toast.error(err.message || "Failed to create university"),
    },
  });

  const updateMutation = useUpdateUniversity({
    mutation: {
      onSuccess: () => {
        toast.success("University updated successfully");
        setModalOpen(false);
        refresh();
      },
      onError: (err) =>
        toast.error(err.message || "Failed to update university"),
    },
  });

  const deleteMutation = useDeleteUniversity({
    mutation: {
      onSuccess: () => {
        toast.success("University deleted successfully");
        setDeleteTarget(null);
        refresh();
      },
      onError: (err) =>
        toast.error(err.message || "Failed to delete university"),
    },
  });

  const openCreate = () => {
    setEditingUniversity(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (uni: University) => {
    setEditingUniversity(uni);
    setForm({
      name: uni.name || "",
      nameEn: uni.nameEn || "",
      abbreviation: uni.abbreviation || "",
      type: uni.type || "government",
      state: uni.state || "",
      city: uni.city || "",
      minScore: String(uni.minScore ?? ""),
      description: uni.description || "",
      website: uni.website || "",
      imageUrl: uni.imageUrl || "",
      majorIds: uni.majors?.map((m) => m.id) ?? [],
    });
    setModalOpen(true);
  };

  const toggleMajor = (majorId: number) => {
    setForm((prev) => ({
      ...prev,
      majorIds: prev.majorIds.includes(majorId)
        ? prev.majorIds.filter((id) => id !== majorId)
        : [...prev.majorIds, majorId],
    }));
  };
  const availableCities = useMemo(() => {
    const cities = getCitiesForState(form.state);
    // Keep existing city visible when editing old records
    if (form.city && !cities.includes(form.city)) {
      return [form.city, ...cities];
    }
    return cities;
  }, [form.state, form.city]);

  const handleSubmit = () => {
    if (
      !form.name.trim() ||
      !form.nameEn.trim() ||
      !form.type ||
      !form.state ||
      !form.city ||
      !form.minScore
    ) {
      toast.error(
        "Name, English name, type, state, city, and min score are required",
      );
      return;
    }

    if (!isMyanmarState(form.state)) {
      toast.error("Please select a valid state/region");
      return;
    }

    const minScore = parseFloat(form.minScore);
    if (isNaN(minScore)) {
      toast.error("Min score must be a valid number");
      return;
    }

    const data = {
      name: form.name.trim(),
      nameEn: form.nameEn.trim(),
      abbreviation: form.abbreviation.trim() || undefined,
      type: form.type,
      state: form.state.trim(),
      city: form.city.trim() || undefined,
      minScore,
      description: form.description.trim() || undefined,
      website: form.website.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      majorIds: form.majorIds,
    };

    if (editingUniversity) {
      updateMutation.mutate({ id: editingUniversity.id, data });
    } else {
      createMutation.mutate({ data });
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget.id });
  };
  const paginated = useMemo(
    () => response?.universities.slice((page - 1) * pageSize, page * pageSize) ?? [],
    [response, page],
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Universities</h1>
            <p className="text-muted-foreground">
              Manage the directory of universities.
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9 bg-card"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={openCreate} className="cursor-pointer">
              <Plus className="h-4 w-4 mr-2" /> Add New
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Min Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : response?.universities.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No universities found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((uni) => (
                    <TableRow key={uni.id}>
                      <TableCell>
                        <div className="font-medium">{uni.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {uni.nameEn}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{uni.type}</Badge>
                      </TableCell>
                      <TableCell>
                        {uni.city ? `${uni.city}, ` : ""}
                        {uni.state}
                      </TableCell>
                      <TableCell>{uni.minScore}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openEdit(uni)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() =>
                            setDeleteTarget({
                              id: uni.id,
                              name: uni.nameEn || uni.name,
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
        <Pagination page={page} total={response?.universities.length ?? 0} pageSize={pageSize} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden p-0">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle>
                {editingUniversity ? "Edit University" : "Add University"}
              </DialogTitle>
            </DialogHeader>
            <div className="scrollbar-hide grid flex-1 gap-4 overflow-y-auto overflow-x-hidden px-6 py-2">
              <div className="grid gap-2">
                <Label htmlFor="uni-name">Name (Myanmar)</Label>
                <Input
                  id="uni-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="uni-name-en">English Name</Label>
                <Input
                  id="uni-name-en"
                  value={form.nameEn}
                  onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="uni-abbreviation">Abbreviation</Label>
                <Input
                  id="uni-abbreviation"
                  value={form.abbreviation}
                  onChange={(e) =>
                    setForm({ ...form, abbreviation: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(type) => setForm({ ...form, type })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIVERSITY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>State/Region</Label>
                  <Select
                    value={form.state}
                    onValueChange={(state) =>
                      setForm({ ...form, state, city: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state/region" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      <SelectGroup>
                        {/* <SelectLabel>တိုင်းဒေသကြီး</SelectLabel> */}
                        {MYANMAR_REGIONS.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        {/* <SelectLabel>ပြည်နယ်</SelectLabel> */}
                        {MYANMAR_STATE_DIVISIONS.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        {/* <SelectLabel>ပြည်ထောင်စုနယ်မြေ</SelectLabel> */}
                        {MYANMAR_UNION_TERRITORIES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>City</Label>
                  <Select
                    value={form.city}
                    onValueChange={(city) => setForm({ ...form, city })}
                    disabled={!form.state}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          form.state ? "Select city" : "Select state first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="uni-min-score">Min Score</Label>
                <Input
                  id="uni-min-score"
                  type="number"
                  value={form.minScore}
                  onChange={(e) =>
                    setForm({ ...form, minScore: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="uni-description">Description</Label>
                <Textarea
                  id="uni-description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="uni-website">Website</Label>
                <Input
                  id="uni-website"
                  value={form.website}
                  onChange={(e) =>
                    setForm({ ...form, website: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="uni-image-url">Image URL</Label>
                <Input
                  id="uni-image-url"
                  value={form.imageUrl}
                  onChange={(e) =>
                    setForm({ ...form, imageUrl: e.target.value })
                  }
                />
              </div>
              {majors && majors.length > 0 && (
                <div className="grid gap-2">
                  <Label>Majors</Label>
                  <div className="grid gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                    {majors.map((major) => (
                      <label
                        key={major.id}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={form.majorIds.includes(major.id)}
                          onCheckedChange={() => toggleMajor(major.id)}
                        />
                        <span>{major.nameEn}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="px-6 pb-6">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingUniversity ? "Save Changes" : "Create University"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DeleteConfirmDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Delete University"
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
