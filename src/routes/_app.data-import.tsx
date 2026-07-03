import { createFileRoute } from "@tanstack/react-router";
import { ScaffoldPage } from "@/components/scaffold-page";

export const Route = createFileRoute("/_app/data-import")({
  head: () => ({
    meta: [
      { title: "Data Import — OmniMind AI" },
      { name: "description", content: "Connect data sources and upload historical records." },
    ],
  }),
  component: () => (
    <ScaffoldPage
      title="Data Import"
      subtitle="Connect POS, ERP, HR, and utility providers or upload historical data."
      sections={[
        {
          title: "Connected Sources",
          desc: "Live",
          rows: [
            { label: "POS · GoFrugal", v: "Connected" },
            { label: "ERP · Tally Prime", v: "Connected" },
            { label: "HR · Zoho People", v: "Connected" },
            { label: "MSEDCL", v: "Connected" },
          ],
        },
        {
          title: "Upload",
          desc: "CSV / XLSX",
          rows: [
            { label: "Sales history", v: "Upload" },
            { label: "Product master", v: "Upload" },
            { label: "Customer list", v: "Upload" },
          ],
        },
        {
          title: "Sync Status",
          desc: "Last 24h",
          rows: [
            { label: "Successful syncs", v: "24" },
            { label: "Failed", v: "0" },
            { label: "Records ingested", v: "48,240" },
          ],
        },
      ]}
    />
  ),
});
