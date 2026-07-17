import { createFileRoute } from "@tanstack/react-router";
import { ScaffoldPage } from "@/components/scaffold-page";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/data-import")({
  head: () => ({
    meta: [
      { title: "Data Import — OmniMind AI" },
      { name: "description", content: "Connect data sources and upload historical records." },
    ],
  }),
  component: DataImportPage,
});

function DataImportPage() {
  const { user } = useAuth();
  const isGrandSquare = user?.workspaceId === "grandsquare-mall";

  return (
    <ScaffoldPage
      title="Data Import"
      subtitle="Connect POS, ERP, HR, and utility providers or upload historical data."
      sections={[
        {
          title: "Connected Sources",
          desc: "Live",
          rows: [
            { label: "POS · GoFrugal", v: isGrandSquare ? "Connected" : "Not Connected" },
            { label: "ERP · Tally Prime", v: isGrandSquare ? "Connected" : "Not Connected" },
            { label: "HR · Zoho People", v: isGrandSquare ? "Connected" : "Not Connected" },
            { label: "MSEDCL", v: isGrandSquare ? "Connected" : "Not Connected" },
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
            { label: "Successful syncs", v: isGrandSquare ? "24" : "0" },
            { label: "Failed", v: "0" },
            { label: "Records ingested", v: isGrandSquare ? "48,240" : "0" },
          ],
        },
      ]}
    />
  );
}
