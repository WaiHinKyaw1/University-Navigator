import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type InterestGuideOption = {
  id: number;
  category: string;
  code: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * ============================================================
 * INTEREST GUIDE CATEGORIES
 * ============================================================
 *
 * Subject category has been removed.
 *
 * Interest Guide now uses:
 *
 * 1. Interests
 * 2. Career Goal
 * 3. Education
 * 4. English Level
 */
const categories = [
  {
    value: "interests",
    label: "ဝါသနာ / Interests",
  },
  {
    value: "careers",
    label: "Career Goal",
  },
  {
    value: "education",
    label: "လက်ရှိပညာရေး / Education",
  },
  {
    value: "english_levels",
    label: "English Level",
  },
];

const EMPTY_FORM = {
  category: "",
  code: "",
  name: "",
  description: "",
  displayOrder: 0,
  isActive: true,
};

export default function AdminInterestGuideOptions() {
  // ============================================================
  // DATA
  // ============================================================

  const [options, setOptions] = useState<InterestGuideOption[]>([]);

  // ============================================================
  // FORM
  // ============================================================

  const [category, setCategory] = useState(EMPTY_FORM.category);

  const [code, setCode] = useState(EMPTY_FORM.code);

  const [name, setName] = useState(EMPTY_FORM.name);

  const [description, setDescription] = useState(EMPTY_FORM.description);

  const [displayOrder, setDisplayOrder] = useState(EMPTY_FORM.displayOrder);

  const [isActive, setIsActive] = useState(EMPTY_FORM.isActive);

  // ============================================================
  // EDIT
  // ============================================================

  const [editingId, setEditingId] = useState<number | null>(null);

  // ============================================================
  // LOADING
  // ============================================================

  const [loading, setLoading] = useState(false);

  // ============================================================
  // CATEGORY LABEL
  // ============================================================

  const getCategoryLabel = (value: string) => {
    return categories.find((item) => item.value === value)?.label || value;
  };

  // ============================================================
  // CODE PLACEHOLDER
  // ============================================================

  const getCodePlaceholder = (value: string) => {
    switch (value) {
      case "interests":
        return "e.g. programming";

      case "careers":
        return "e.g. programmer";

      case "education":
        return "e.g. high_school";

      case "english_levels":
        return "e.g. intermediate";

      default:
        return "Select category first";
    }
  };

  // ============================================================
  // NAME PLACEHOLDER
  // ============================================================

  const getNamePlaceholder = (value: string) => {
    switch (value) {
      case "interests":
        return "e.g. Programming";

      case "careers":
        return "e.g. Programmer";

      case "education":
        return "e.g. High School";

      case "english_levels":
        return "e.g. Intermediate";

      default:
        return "Select category first";
    }
  };

  // ============================================================
  // DESCRIPTION PLACEHOLDER
  // ============================================================

  const getDescriptionPlaceholder = (value: string) => {
    switch (value) {
      case "interests":
        return "Describe this interest";

      case "careers":
        return "Describe this career goal";

      case "education":
        return "Describe this education level";

      case "english_levels":
        return "Describe this English level";

      default:
        return "Select category first";
    }
  };

  // ============================================================
  // RESET FORM
  // ============================================================

  const resetForm = () => {
    setCategory(EMPTY_FORM.category);

    setCode(EMPTY_FORM.code);

    setName(EMPTY_FORM.name);

    setDescription(EMPTY_FORM.description);

    setDisplayOrder(EMPTY_FORM.displayOrder);

    setIsActive(EMPTY_FORM.isActive);

    setEditingId(null);
  };

  // ============================================================
  // CATEGORY CHANGE
  // ============================================================

  const handleCategoryChange = (value: string) => {
    setCategory(value);

    /**
     * When creating a new option,
     * clear old values when category changes.
     *
     * Example:
     *
     * Interests
     * programming
     *
     * ->
     *
     * Career
     *
     * code/name become empty.
     */

    if (!editingId) {
      setCode("");

      setName("");

      setDescription("");
    }
  };

  // ============================================================
  // FETCH OPTIONS
  // ============================================================

  const fetchOptions = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("Please login first");
        return;
      }

      const res = await fetch("/api/admin/interest-guide/options", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load options");
      }

      /**
       * Only show categories currently used
       * by Interest Guide.
       *
       * If old "subjects" records exist in DB,
       * they won't appear here.
       */
      const filteredOptions = Array.isArray(data)
        ? data.filter(
            (item: InterestGuideOption) => item.category !== "subjects",
          )
        : [];

      setOptions(filteredOptions);
    } catch (error) {
      console.error("Failed to load Interest Guide options:", error);

      toast.error(
        error instanceof Error ? error.message : "Failed to load options",
      );
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    fetchOptions();
  }, []);

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ----------------------------------------------------------
    // CATEGORY VALIDATION
    // ----------------------------------------------------------

    if (!category) {
      toast.error("Please select a category");
      return;
    }

    // ----------------------------------------------------------
    // CODE VALIDATION
    // ----------------------------------------------------------

    if (!code.trim()) {
      toast.error("Please enter a code");
      return;
    }

    // ----------------------------------------------------------
    // NAME VALIDATION
    // ----------------------------------------------------------

    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    // ----------------------------------------------------------
    // LOADING PROTECTION
    // ----------------------------------------------------------

    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("Please login first");
        return;
      }

      // --------------------------------------------------------
      // ENDPOINT
      // --------------------------------------------------------

      const endpoint = editingId
        ? `/api/admin/interest-guide/options/${editingId}`
        : "/api/admin/interest-guide/options";

      // --------------------------------------------------------
      // METHOD
      // --------------------------------------------------------

      const method = editingId ? "PUT" : "POST";

      // --------------------------------------------------------
      // PAYLOAD
      // --------------------------------------------------------

      const payload = {
        category: category.trim(),

        code: code.trim(),

        name: name.trim(),

        description: description.trim() || null,

        displayOrder: Number(displayOrder) || 0,

        isActive,
      };

      console.log("Interest Guide payload:", payload);

      // --------------------------------------------------------
      // REQUEST
      // --------------------------------------------------------

      const res = await fetch(endpoint, {
        method,

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify(payload),
      });

      const data = await res.json();

      // --------------------------------------------------------
      // ERROR
      // --------------------------------------------------------

      if (!res.ok) {
        throw new Error(data.error || "Failed to save option");
      }

      // --------------------------------------------------------
      // SUCCESS
      // --------------------------------------------------------

      if (editingId) {
        toast.success("Interest Guide option updated successfully");
      } else {
        toast.success("Interest Guide option created successfully");
      }

      // Clear form
      resetForm();

      // Refresh list
      await fetchOptions();
    } catch (error) {
      console.error("Save Interest Guide option error:", error);

      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // EDIT
  // ============================================================

  const handleEdit = (option: InterestGuideOption) => {
    setEditingId(option.id);

    setCategory(option.category);

    setCode(option.code);

    setName(option.name);

    setDescription(option.description || "");

    setDisplayOrder(option.displayOrder);

    setIsActive(option.isActive);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this option?",
    );

    if (!confirmed) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("Please login first");
        return;
      }

      const res = await fetch(`/api/admin/interest-guide/options/${id}`, {
        method: "DELETE",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete");
      }

      toast.success("Interest Guide option deleted successfully");

      // If deleting currently edited item
      if (editingId === id) {
        resetForm();
      }

      // Refresh list
      await fetchOptions();
    } catch (error) {
      console.error("Delete Interest Guide option error:", error);

      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* ======================================================
            PAGE HEADER
        ======================================================= */}

        <div>
          <h1 className="text-3xl font-bold">Interest Guide Options</h1>

          <p className="text-muted-foreground mt-1">
            Manage Interest Guide options.
          </p>

          <p className="text-sm text-muted-foreground mt-2">
            Interest Guide now searches universities using
            <strong> Interests + Career Goal</strong>.
          </p>
        </div>

        {/* ======================================================
            FORM
        ======================================================= */}

        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? "Edit Option" : "Create New Option"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* ==================================================
                  CATEGORY
              =================================================== */}

              <div>
                <label className="text-sm font-medium">Category</label>

                <Select
                  value={category}
                  onValueChange={handleCategoryChange}
                  disabled={loading}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>

                  <SelectContent>
                    {categories.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ==================================================
                  CODE
              =================================================== */}

              <div>
                <label className="text-sm font-medium">Code</label>

                <Input
                  className="mt-1"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={getCodePlaceholder(category)}
                  disabled={loading || !category}
                  required
                />

                <p className="text-xs text-muted-foreground mt-1">
                  {category
                    ? `Example code for ${getCategoryLabel(category)}`
                    : "Select a category first"}
                </p>
              </div>

              {/* ==================================================
                  NAME
              =================================================== */}

              <div>
                <label className="text-sm font-medium">Name</label>

                <Input
                  className="mt-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={getNamePlaceholder(category)}
                  disabled={loading || !category}
                  required
                />

                <p className="text-xs text-muted-foreground mt-1">
                  Display name shown to users.
                </p>
              </div>

              {/* ==================================================
                  DESCRIPTION
              =================================================== */}

              <div>
                <label className="text-sm font-medium">Description</label>

                <Input
                  className="mt-1"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={getDescriptionPlaceholder(category)}
                  disabled={loading || !category}
                />
              </div>

              {/* ==================================================
                  DISPLAY ORDER
              =================================================== */}

              <div>
                <label className="text-sm font-medium">Display Order</label>

                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value) || 0)}
                  disabled={loading}
                />
              </div>

              {/* ==================================================
                  STATUS
              =================================================== */}

              <div>
                <label className="text-sm font-medium">Status</label>

                <Select
                  value={isActive ? "active" : "inactive"}
                  onValueChange={(value) => setIsActive(value === "active")}
                  disabled={loading}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>

                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ==================================================
                  BUTTONS
              =================================================== */}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={
                    loading || !category || !code.trim() || !name.trim()
                  }
                >
                  {loading
                    ? "Saving..."
                    : editingId
                      ? "Update Option"
                      : "Create Option"}
                </Button>

                {(editingId || category || code || name || description) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={loading}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ======================================================
            EXISTING OPTIONS
        ======================================================= */}

        <Card>
          <CardHeader>
            <CardTitle>Existing Options ({options.length})</CardTitle>
          </CardHeader>

          <CardContent>
            {options.length === 0 ? (
              <p className="text-muted-foreground">No options found.</p>
            ) : (
              <div className="space-y-3">
                {options.map((option) => (
                  <div
                    key={option.id}
                    className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    {/* ==================================================
                          OPTION INFO
                      =================================================== */}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold bg-muted px-2 py-1 rounded">
                          {getCategoryLabel(option.category)}
                        </span>

                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            option.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {option.isActive ? "Active" : "Inactive"}
                        </span>

                        <span className="text-xs px-2 py-1 rounded bg-muted">
                          Order: {option.displayOrder}
                        </span>
                      </div>

                      <p className="font-semibold mt-2">{option.name}</p>

                      <p className="text-sm text-muted-foreground">
                        Code: {option.code}
                      </p>

                      {option.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {option.description}
                        </p>
                      )}
                    </div>

                    {/* ==================================================
                          ACTION BUTTONS
                      =================================================== */}

                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(option)}
                        disabled={loading}
                      >
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(option.id)}
                        disabled={loading}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
