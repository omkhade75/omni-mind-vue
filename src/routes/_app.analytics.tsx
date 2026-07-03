import { createFileRoute } from "@tanstack/react-router";
import { ScaffoldPage } from "@/components/scaffold-page";

export const Route = createFileRoute("/_app/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — OmniMind AI" },
      {
        name: "description",
        content: "Cross-domain analytics across revenue, customers, and operations.",
      },
    ],
  }),
  component: () => (
    <ScaffoldPage
      title="Analytics"
      subtitle="Cross-domain analytics across sales, customers, inventory, and operations."
      aiNote="Fashion and Electronics drove 62% of this week's revenue. Grocery basket size fell 4.2%. Opportunity: cross-promote high-margin Beauty items to Grocery baskets during weekend hours."
      sections={[
        {
          title: "Revenue Cohorts",
          desc: "Retention by first-purchase month",
          rows: [
            { label: "Jan cohort", v: "68% retained" },
            { label: "Feb cohort", v: "72% retained" },
            { label: "Mar cohort", v: "64% retained" },
            { label: "Apr cohort", v: "58% retained" },
          ],
        },
        {
          title: "Basket Analysis",
          desc: "Top co-purchased pairs",
          rows: [
            { label: "Milk + Bread", v: "412 baskets" },
            { label: "Jeans + T-shirt", v: "218 baskets" },
            { label: "Shampoo + Conditioner", v: "184 baskets" },
          ],
        },
        {
          title: "Channel Split",
          desc: "Where customers discover us",
          rows: [
            { label: "Walk-in", v: "62%" },
            { label: "App / Loyalty", v: "24%" },
            { label: "Meta Ads", v: "9%" },
            { label: "Referrals", v: "5%" },
          ],
        },
      ]}
    />
  ),
});
