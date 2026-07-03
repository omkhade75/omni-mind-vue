import { createFileRoute } from "@tanstack/react-router";
import { ScaffoldPage } from "@/components/scaffold-page";

export const Route = createFileRoute("/_app/tax")({
  head: () => ({
    meta: [
      { title: "Tax & Compliance — OmniMind AI" },
      { name: "description", content: "GST, income tax provision, and compliance deadlines." },
    ],
  }),
  component: () => (
    <div className="space-y-4">
      <ScaffoldPage
        title="Tax & Compliance"
        subtitle="Estimated tax positions across GST, direct tax, and property tax."
        aiNote="This screen shows demo analytical estimates and is not professional tax advice. Consult a chartered accountant for filings."
        sections={[
          {
            title: "GST",
            desc: "Current quarter",
            rows: [
              { label: "GST collected", v: "₹8.62L" },
              { label: "Input tax credit", v: "₹2.14L" },
              { label: "GST payable", v: "₹6.48L" },
            ],
          },
          {
            title: "Direct Tax",
            desc: "Provisional",
            rows: [
              { label: "Income tax provision", v: "₹4.20L" },
              { label: "TDS deducted", v: "₹1.12L" },
              { label: "Advance tax paid", v: "₹3.60L" },
            ],
          },
          {
            title: "Property & Other",
            desc: "Local",
            rows: [
              { label: "PCMC property tax", v: "₹1.86L" },
              { label: "Trade license", v: "₹42K" },
              { label: "Signage / rooftop", v: "₹28K" },
            ],
          },
        ]}
      />
    </div>
  ),
});
