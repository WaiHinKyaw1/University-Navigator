import { useMemo, useRef, useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import {
  useListAdmissionGuides,
  useActivateAdmissionGuide,
  useDeleteAdmissionGuide,
  getListAdmissionGuidesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Upload, Download, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  formatFileSize,
  uploadAdmissionGuide,
} from "@/lib/admission-guide-api";

export default function AdminAdmissionGuide() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("Myanmar University Admission Guide");
  const [academicYear, setAcademicYear] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useListAdmissionGuides();
  const guides = data?.guides ?? [];

  const activeGuide = useMemo(
    () => guides.find((guide) => guide.isActive) ?? null,
    [guides],
  );

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: getListAdmissionGuidesQueryKey() });

  const activateMutation = useActivateAdmissionGuide({
    mutation: {
      onSuccess: () => {
        toast.success("Admission guide activated");
        refresh();
      },
      onError: (err) =>
        toast.error(err.message || "Failed to activate admission guide"),
    },
  });

  const deleteMutation = useDeleteAdmissionGuide({
    mutation: {
      onSuccess: () => {
        toast.success("Admission guide deleted");
        setDeleteTarget(null);
        refresh();
      },
      onError: (err) =>
        toast.error(err.message || "Failed to delete admission guide"),
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      event.target.value = "";
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please choose a PDF file");
      return;
    }

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsUploading(true);
    try {
      await uploadAdmissionGuide({
        file: selectedFile,
        title,
        academicYear,
      });
      toast.success("Admission guide uploaded and activated");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload admission guide",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget.id });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admission Guide PDF</h1>
          <p className="text-muted-foreground">
            Upload or replace the official Myanmar university admission guide PDF.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Current Active Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !activeGuide ? (
              <p className="text-sm text-muted-foreground">
                No admission guide uploaded yet.
              </p>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{activeGuide.title}</p>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Active
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activeGuide.fileName} · {formatFileSize(activeGuide.fileSize)}
                    {activeGuide.academicYear
                      ? ` · ${activeGuide.academicYear}`
                      : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded {new Date(activeGuide.createdAt).toLocaleString()}
                  </p>
                </div>
                <Button asChild variant="outline">
                  <a
                    href={activeGuide.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5" />
              Upload New PDF
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="guide-title">Title</Label>
                <Input
                  id="guide-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="guide-year">Academic Year (optional)</Label>
                <Input
                  id="guide-year"
                  placeholder="2025-2026"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="guide-file">PDF File</Label>
              <Input
                id="guide-file"
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>

            <Button
              onClick={handleUpload}
              disabled={isUploading || !selectedFile}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Uploading..." : "Upload & Activate"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
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
                ) : guides.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No uploads yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  guides.map((guide) => (
                    <TableRow key={guide.id}>
                      <TableCell className="font-medium">
                        <div>{guide.title}</div>
                        {guide.academicYear && (
                          <div className="text-xs text-muted-foreground">
                            {guide.academicYear}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{guide.fileName}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(guide.fileSize)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {guide.isActive ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(guide.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          asChild
                        >
                          <a
                            href={guide.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        {!guide.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() =>
                              activateMutation.mutate({ id: guide.id })
                            }
                            disabled={activateMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() =>
                            setDeleteTarget({
                              id: guide.id,
                              name: guide.title,
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

        <DeleteConfirmDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Delete Admission Guide"
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
