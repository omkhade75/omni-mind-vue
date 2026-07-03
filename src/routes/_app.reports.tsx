import { createFileRoute } from "@tanstack/react-router";
import { ScaffoldPage } from "@/components/scaffold-page";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({
    meta: [
      { title: "Reports — OmniMind AI" },
      { name: "description", content: "Generated reports and exports." },
    ],
  }),
  component: () => (
    <ScaffoldPage
      title="Reports"
      subtitle="Scheduled and on-demand reports across the business."
      sections={[
        {
          title: "Executive Weekly",
          desc: "Every Monday 07:00",
          rows: [
            { label: "Last run", v: "3 May 2026" },
            { label: "Recipients", v: "6" },
          ],
        },
        {
          title: "Finance Monthly",
          desc: "1st of month",
          rows: [
            { label: "Last run", v: "1 May 2026" },
            { label: "Format", v: "PDF + XLSX" },
          ],
        },
        {
          title: "Inventory Snapshot",
          desc: "Daily 23:30",
          rows: [
            { label: "Last run", v: "5 May 2026" },
            { label: "SKUs", v: "8,412" },
          ],
        },
      ]}
    />
  ),
});
