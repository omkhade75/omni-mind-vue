import { createFileRoute } from "@tanstack/react-router";
import { ScaffoldPage } from "@/components/scaffold-page";

export const Route = createFileRoute("/_app/settings" as never)({
  head: () => ({ meta: [{ title: "Settings — OmniMind AI" }, { name: "description", content: "Workspace, roles, and integration settings." }] }),
  component: () => (
    <ScaffoldPage
      title="Settings"
      subtitle="Workspace, roles, notifications, and integrations."
      sections={[
        { title: "Workspace", desc: "General", rows: [
          { label: "Mall", v: "GrandSquare Mall" },
          { label: "Location", v: "Pune, Maharashtra" },
          { label: "Currency", v: "INR (₹)" },
          { label: "Timezone", v: "Asia/Kolkata" },
        ]},
        { title: "Roles", desc: "Access levels", rows: [
          { label: "Owner", v: "Full access" },
          { label: "Admin", v: "Operational" },
          { label: "Manager", v: "Department" },
        ]},
        { title: "Notifications", desc: "Delivery channels", rows: [
          { label: "Email", v: "Enabled" },
          { label: "WhatsApp", v: "Enabled" },
          { label: "Slack", v: "Enabled" },
        ]},
      ]}
    />
  ),
});
