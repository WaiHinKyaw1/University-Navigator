import { useEffect, useState } from "react";
import { BookOpen, Image as ImageIcon, Loader2, Mail, MessageSquare, Phone, Save, Settings2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  type SiteSettingsInput,
  useGetSiteSettings,
  useUpdateSiteSettings,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadImage } from "@/lib/upload-image-api";

const FALLBACK_SETTINGS: SiteSettingsInput = {
  projectName: "MM Uni Finder",
  logoUrl: null,
  tagline: "Guiding Myanmar students to their future.",
  academicYear: "2025-2026",
  contactEmail: null,
  contactPhone: null,
  welcomeMessage: null,
};

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const settingsQuery = useGetSiteSettings();
  const [form, setForm] = useState<SiteSettingsInput>(FALLBACK_SETTINGS);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    if (!settingsQuery.data) return;
    setForm({
      projectName: settingsQuery.data.projectName,
      logoUrl: settingsQuery.data.logoUrl ?? null,
      tagline: settingsQuery.data.tagline,
      academicYear: settingsQuery.data.academicYear,
      contactEmail: settingsQuery.data.contactEmail ?? null,
      contactPhone: settingsQuery.data.contactPhone ?? null,
      welcomeMessage: settingsQuery.data.welcomeMessage ?? null,
    });
  }, [settingsQuery.data]);

  const updateMutation = useUpdateSiteSettings({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: settingsQuery.queryKey });
        toast.success("Project settings saved");
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to save project settings");
      },
    },
  });

  const updateField = <K extends keyof SiteSettingsInput>(field: K, value: SiteSettingsInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingLogo(true);
      const url = await uploadImage(file);
      updateField("logoUrl", url);
      toast.success("Logo uploaded. Save settings to publish it.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
      event.target.value = "";
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.projectName.trim() || !form.academicYear.trim()) {
      toast.error("Project name and academic year are required");
      return;
    }
    updateMutation.mutate({
      data: {
        ...form,
        projectName: form.projectName.trim(),
        academicYear: form.academicYear.trim(),
        tagline: form.tagline?.trim() || "",
        contactEmail: form.contactEmail?.trim() || null,
        contactPhone: form.contactPhone?.trim() || null,
        welcomeMessage: form.welcomeMessage?.trim() || null,
      },
    });
  };

  const isLoading = settingsQuery.isLoading;
  const isSaving = updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
              <Settings2 className="h-4 w-4" /> Project configuration
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="mt-1 text-muted-foreground">
              Update the public identity and academic settings without changing code.
            </p>
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            Admin only
          </span>
        </div>

        {settingsQuery.isError ? (
          <Card className="border-destructive/30">
            <CardContent className="p-6 text-sm text-destructive">
              Failed to load project settings. Refresh the page and try again.
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" /> Brand identity
                </CardTitle>
                <CardDescription>
                  These values appear in the public navigation and footer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-[180px_1fr]">
                  <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
                      {form.logoUrl ? (
                        <img src={form.logoUrl} alt="Project logo preview" className="h-full w-full object-contain" />
                      ) : (
                        <BookOpen className="h-10 w-10 text-primary" />
                      )}
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted">
                      {isUploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {isUploadingLogo ? "Uploading..." : "Upload logo"}
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                    </label>
                    {form.logoUrl && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => updateField("logoUrl", null)}>
                        Remove logo
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="project-name">Project name</Label>
                      <Input id="project-name" value={form.projectName} onChange={(event) => updateField("projectName", event.target.value)} placeholder="MM Uni Finder" disabled={isLoading} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="tagline">Tagline</Label>
                      <Input id="tagline" value={form.tagline ?? ""} onChange={(event) => updateField("tagline", event.target.value)} placeholder="Guiding Myanmar students to their future." disabled={isLoading} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" /> Academic settings
                </CardTitle>
                <CardDescription>
                  Keep the current school year visible and consistent across the application.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-sm space-y-2">
                  <Label htmlFor="academic-year">Current academic year</Label>
                  <Input id="academic-year" value={form.academicYear} onChange={(event) => updateField("academicYear", event.target.value)} placeholder="2025-2026" disabled={isLoading} />
                  <p className="text-xs text-muted-foreground">Example: 2025-2026 or 2025 intake.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact and welcome content</CardTitle>
                <CardDescription>
                  Optional content for public contact areas and future onboarding surfaces.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-email" className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> Contact email</Label>
                  <Input id="contact-email" type="email" value={form.contactEmail ?? ""} onChange={(event) => updateField("contactEmail", event.target.value)} placeholder="hello@example.com" disabled={isLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone" className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> Contact phone</Label>
                  <Input id="contact-phone" value={form.contactPhone ?? ""} onChange={(event) => updateField("contactPhone", event.target.value)} placeholder="09 ..." disabled={isLoading} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="welcome-message" className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-muted-foreground" /> Welcome message</Label>
                  <Textarea id="welcome-message" value={form.welcomeMessage ?? ""} onChange={(event) => updateField("welcomeMessage", event.target.value)} placeholder="Welcome to University Navigator" className="min-h-28" disabled={isLoading} />
                </div>
              </CardContent>
            </Card>

            <div className="sticky bottom-4 z-10 flex justify-end">
              <Button type="submit" size="lg" className="shadow-lg" disabled={isLoading || isSaving || isUploadingLogo}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSaving ? "Saving settings..." : "Save settings"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
