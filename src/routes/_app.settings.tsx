import { createFileRoute } from "@tanstack/react-router";
import { getMallSettingsServer, updateMallSettingsServer } from "@/lib/server-settings";
import { PageHeader, SectionCard } from "@/components/page-header";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Loader2, Building, MapPin, DollarSign, Clock } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — OmniMind AI" },
      { name: "description", content: "Workspace, roles, and integration settings." },
    ],
  }),
  loader: () => getMallSettingsServer(),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const mallData = Route.useLoaderData();
  const [mall, setMall] = useState(mallData);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = user?.role === "OWNER" || user?.role === "ADMIN";

  const handleChange = (field: keyof typeof mall, value: string) => {
    setMall({ ...mall, [field]: value });
  };

  const handleSave = async () => {
    if (!canEdit) {
      toast.error("You don't have permission to edit settings.");
      return;
    }

    try {
      setIsSaving(true);
      await updateMallSettingsServer({
        id: mall.id,
        name: mall.name,
        location: mall.location,
        currency: mall.currency,
        timezone: mall.timezone,
      });
      toast.success("Settings updated successfully", {
        description: "Your workspace settings have been saved to the database.",
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your workspace details, roles, and notifications."
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Workspace Form (Dynamic) */}
        <SectionCard
          title="Workspace Settings"
          subtitle="General details about your mall"
          className="col-span-1 md:col-span-2 lg:col-span-2"
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Mall Name</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={mall.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    disabled={!canEdit || isSaving}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={mall.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    disabled={!canEdit || isSaving}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={mall.currency}
                    onChange={(e) => handleChange("currency", e.target.value)}
                    disabled={!canEdit || isSaving}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={mall.timezone}
                    onChange={(e) => handleChange("timezone", e.target.value)}
                    disabled={!canEdit || isSaving}
                  />
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="pt-4 flex justify-end">
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </SectionCard>

        <div className="space-y-6">
          {/* Roles (Static Readonly Reference) */}
          <SectionCard title="Roles" subtitle="Access levels (Read Only)">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-sm font-medium">Owner</span>
                <span className="text-xs text-muted-foreground">Full access</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-sm font-medium">Admin</span>
                <span className="text-xs text-muted-foreground">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Manager</span>
                <span className="text-xs text-muted-foreground">Department</span>
              </div>
            </div>
          </SectionCard>

          {/* Notifications (Static Readonly Reference) */}
          <SectionCard title="Notifications" subtitle="Delivery channels (Read Only)">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-sm font-medium">Email</span>
                <span className="text-xs text-success">Enabled</span>
              </div>
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-sm font-medium">WhatsApp</span>
                <span className="text-xs text-success">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Slack</span>
                <span className="text-xs text-success">Enabled</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
