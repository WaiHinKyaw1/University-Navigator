import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Eye,
  Image as ImageIcon,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  RotateCcw,
  Save,
  Settings2,
  Upload,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  type SiteSettings,
  type SiteSettingsInput,
  useGetSiteSettings,
  useUpdateSiteSettings,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { uploadImage } from "@/lib/upload-image-api";

const FALLBACK_SETTINGS: SiteSettingsInput = {
  projectName: "MM Uni Finder",
  logoUrl: null,
  tagline: "Guiding Myanmar students to their future.",
  academicYear: "2024-2025",
  contactEmail: null,
  contactPhone: null,
  welcomeMessage: null,
  maintenanceMode: false,
  maintenanceMessage: "We are making a few improvements. Please check back soon.",
};

function toForm(settings: SiteSettings | undefined): SiteSettingsInput {
  if (!settings) return FALLBACK_SETTINGS;
  return {
    projectName: settings.projectName,
    logoUrl: settings.logoUrl ?? null,
    tagline: settings.tagline,
    academicYear: settings.academicYear,
    contactEmail: settings.contactEmail ?? null,
    contactPhone: settings.contactPhone ?? null,
    welcomeMessage: settings.welcomeMessage ?? null,
    maintenanceMode: settings.maintenanceMode,
    maintenanceMessage: settings.maintenanceMessage ?? FALLBACK_SETTINGS.maintenanceMessage,
  };
}

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const settingsQuery = useGetSiteSettings();
  const [form, setForm] = useState<SiteSettingsInput>(FALLBACK_SETTINGS);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (settingsQuery.data) setForm(toForm(settingsQuery.data));
  }, [settingsQuery.data]);

  const savedForm = useMemo(() => toForm(settingsQuery.data), [settingsQuery.data]);
  const hasChanges = JSON.stringify(form) !== JSON.stringify(savedForm);

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
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      toast.error("Please choose an image smaller than 2 MB");
      event.target.value = "";
      return;
    }
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

  const handleReset = () => {
    setForm(savedForm);
    setIsPreviewOpen(false);
    toast.success("Unsaved changes reset");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const projectName = form.projectName.trim();
    const academicYear = form.academicYear.trim();
    const contactEmail = form.contactEmail?.trim() || null;
    const maintenanceMessage = form.maintenanceMessage?.trim() ?? "";

    if (!projectName || projectName.length > 80) {
      toast.error("Project name is required and must be 80 characters or fewer");
      return;
    }
    if (!/^\d{4}\s*-\s*\d{4}$/.test(academicYear)) {
      toast.error("Academic year must use the format YYYY-YYYY");
      return;
    }
    if (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail)) {
      toast.error("Please enter a valid contact email");
      return;
    }
    if (!maintenanceMessage || maintenanceMessage.length > 240) {
      toast.error("Maintenance message is required and must be 240 characters or fewer");
      return;
    }

    updateMutation.mutate({
      data: {
        ...form,
        projectName,
        academicYear,
        tagline: form.tagline?.trim() || "",
        contactEmail,
        contactPhone: form.contactPhone?.trim() || null,
        welcomeMessage: form.welcomeMessage?.trim() || null,
        maintenanceMessage,
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
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
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
                <CardDescription>These values appear in the public navigation and footer.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 sm:space-y-6">
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
                      <Input id="project-name" value={form.projectName} onChange={(event) => updateField("projectName", event.target.value)} placeholder="MM Uni Finder" disabled={isLoading} maxLength={80} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="tagline">Tagline</Label>
                      <Input id="tagline" value={form.tagline ?? ""} onChange={(event) => updateField("tagline", event.target.value)} placeholder="Guiding Myanmar students to their future." disabled={isLoading} maxLength={200} />
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
                <CardDescription>Keep the current school year visible and consistent across the application.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-sm space-y-2">
                  <Label htmlFor="academic-year">Current academic year</Label>
                  <Input id="academic-year" value={form.academicYear} onChange={(event) => updateField("academicYear", event.target.value)} placeholder="2025-2026" disabled={isLoading} maxLength={40} />
                  <p className="text-xs text-muted-foreground">Use the format YYYY-YYYY, for example 2025-2026.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" /> Availability</CardTitle>
                <CardDescription>Temporarily show a maintenance message to public visitors while admins keep access.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
                  <div>
                    <Label htmlFor="maintenance-mode">Maintenance mode</Label>
                    <p className="text-sm text-muted-foreground">Public pages are replaced by the maintenance screen when enabled.</p>
                  </div>
                  <Switch id="maintenance-mode" checked={form.maintenanceMode} onCheckedChange={(checked) => updateField("maintenanceMode", checked)} disabled={isLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintenance-message">Maintenance message</Label>
                  <Textarea id="maintenance-message" value={form.maintenanceMessage} onChange={(event) => updateField("maintenanceMessage", event.target.value)} placeholder="We are making a few improvements. Please check back soon." className="min-h-24" disabled={isLoading} maxLength={240} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact and welcome content</CardTitle>
                <CardDescription>Contact email and phone appear in the site footer on every page (clickable mail and call links). The welcome message is shown in the welcome area of the home page.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-email" className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> Contact email</Label>
                  <Input id="contact-email" type="email" value={form.contactEmail ?? ""} onChange={(event) => updateField("contactEmail", event.target.value)} placeholder="hello@example.com" disabled={isLoading} maxLength={160} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone" className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> Contact phone</Label>
                  <Input id="contact-phone" value={form.contactPhone ?? ""} onChange={(event) => updateField("contactPhone", event.target.value)} placeholder="09 ..." disabled={isLoading} maxLength={40} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="welcome-message" className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-muted-foreground" /> Welcome message</Label>
                  <Textarea id="welcome-message" value={form.welcomeMessage ?? ""} onChange={(event) => updateField("welcomeMessage", event.target.value)} placeholder="Welcome to University Navigator" className="min-h-28" disabled={isLoading} maxLength={1000} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-primary" /> Public preview</CardTitle>
                <CardDescription>Preview the current unsaved branding before publishing it.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button type="button" variant="outline" onClick={() => setIsPreviewOpen((open) => !open)}>
                  <Eye className="mr-2 h-4 w-4" /> {isPreviewOpen ? "Hide preview" : "Show preview"}
                </Button>
                {isPreviewOpen && (
                  <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
                    <div className="flex items-center gap-3 border-b pb-4">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-primary p-1.5">
                        {form.logoUrl ? <img src={form.logoUrl} alt="Preview logo" className="h-full w-full object-contain" /> : <BookOpen className="h-6 w-6 text-primary-foreground" />}
                      </div>
                      <div>
                        <p className="font-bold text-primary">{form.projectName || "Project name"}</p>
                        <p className="text-xs text-muted-foreground">{form.tagline || "Your project tagline"}</p>
                      </div>
                    </div>
                    {form.maintenanceMode && <p className="mt-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">{form.maintenanceMessage}</p>}
                    <p className="mt-4 text-sm text-muted-foreground">Current academic year: <span className="font-medium text-foreground">{form.academicYear || "YYYY-YYYY"}</span></p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="sticky bottom-4 z-10 flex flex-wrap justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleReset} disabled={isLoading || isSaving || isUploadingLogo || !hasChanges}>
                <RotateCcw className="mr-2 h-4 w-4" /> Reset changes
              </Button>
              <Button type="submit" size="lg" className="shadow-lg" disabled={isLoading || isSaving || isUploadingLogo || !hasChanges}>
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
