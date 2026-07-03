import { createFileRoute } from "@tanstack/react-router";
import { ScaffoldPage } from "@/components/scaffold-page";

export const Route = createFileRoute("/_app/income" as never)({
  head: () => ({
    meta: [
      { title: "Income — OmniMind AI" },
      { name: "description", content: "Income summary across sales, rent, and other revenue streams." },
    ],
  }),
  component: () => (
    <ScaffoldPage
      title="Income"
      subtitle="Consolidated income across mall revenue streams."
      sections={[
        { title: "Sales Revenue", desc: "This month", rows: [
          { label: "Gross sales", v: "₹48.72L" },
          { label: "Discounts", v: "-₹2.24L" },
          { label: "Net sales", v: "₹46.48L" },
          { label: "Returns", v: "-₹1.12L" },
        ]},
        { title: "Rental Income", desc: "Sub-lease + tenant", rows: [
          { label: "Anchor tenants", v: "₹14.6L" },
          { label: "Kiosks", v: "₹2.8L" },
          { label: "Events", v: "₹1.4L" },
        ]},
        { title: "Other Income", desc: "Ancillary", rows: [
          { label: "Parking", v: "₹4.2L" },
          { label: "Advertising", v: "₹1.8L" },
          { label: "Amenities", v: "₹62K" },
        ]},
      ]}
    />
  ),
});
