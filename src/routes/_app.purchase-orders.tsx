import { createFileRoute } from "@tanstack/react-router";
import { ScaffoldPage } from "@/components/scaffold-page";

export const Route = createFileRoute("/_app/purchase-orders" as never)({
  head: () => ({
    meta: [
      { title: "Purchase Orders — OmniMind AI" },
      { name: "description", content: "Open purchase orders, delivery status, and supplier commitments." },
    ],
  }),
  component: () => (
    <ScaffoldPage
      title="Purchase Orders"
      subtitle="Open POs and expected deliveries across all suppliers."
      sections={[
        { title: "Open POs", desc: "Awaiting delivery", rows: [
          { label: "PO-2604-A · Amul Foods", v: "₹2.40L · in-transit" },
          { label: "PO-2604-B · Samsung India", v: "₹8.62L · dispatched" },
          { label: "PO-2604-C · Nike India", v: "₹1.28L · confirmed" },
        ]},
        { title: "Delayed", desc: "Past ETA", rows: [
          { label: "PO-2603-J · Sony India", v: "5 days late" },
          { label: "PO-2603-M · Levi Strauss", v: "3 days late" },
        ]},
        { title: "Auto-suggested", desc: "AI reorder", rows: [
          { label: "Amul Taaza Milk 1L", v: "240 units" },
          { label: "Nescafé Gold 200g", v: "60 units" },
          { label: "Lakmé Foundation", v: "40 units" },
        ]},
      ]}
    />
  ),
});
