import { createFileRoute } from "@tanstack/react-router";
import { ScaffoldPage } from "@/components/scaffold-page";
import { useBusinessData } from "@/lib/business-context";
import { fmtINR } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/income")({
  head: () => ({
    meta: [
      { title: "Income — OmniMind AI" },
      {
        name: "description",
        content: "Income summary across sales, rent, and other revenue streams.",
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { transactions, activeDate } = useBusinessData();

  // Extract year and month from activeDate (e.g. "2026-05")
  const activeYearMonth = activeDate.split("T")[0].slice(0, 7);
  
  // Format readable month name (e.g. "May 2026")
  const formattedMonth = new Date(activeDate).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  // Filter completed transactions to the active month
  const thisMonthTxns = transactions.filter(
    (t) => t.date.split("T")[0].startsWith(activeYearMonth)
  );

  let grossSales = 0;
  let discounts = 0;
  thisMonthTxns.forEach((t) => {
    if (t.status === "Completed") {
      grossSales += t.subtotal;
      discounts += t.discount;
    }
  });

  const netSales = grossSales - discounts;

  return (
    <ScaffoldPage
      title="Income"
      subtitle="Consolidated income across mall revenue streams."
      sections={[
        {
          title: "Sales Revenue",
          desc: `${formattedMonth} (Real-time)`,
          rows: [
            { label: "Gross sales", v: fmtINR(grossSales, { compact: true }) },
            { label: "Discounts", v: "-" + fmtINR(discounts, { compact: true }) },
            { label: "Net sales", v: fmtINR(netSales, { compact: true }) },
            { label: "Returns", v: "₹0" },
          ],
        },
        {
          title: "Rental Income",
          desc: "Sub-lease + tenant",
          rows: [
            { label: "Anchor tenants", v: "₹14.6L" },
            { label: "Kiosks", v: "₹2.8L" },
            { label: "Events", v: "₹1.4L" },
          ],
        },
        {
          title: "Other Income",
          desc: "Ancillary",
          rows: [
            { label: "Parking", v: "₹4.2L" },
            { label: "Advertising", v: "₹1.8L" },
            { label: "Amenities", v: "₹62K" },
          ],
        },
      ]}
    />
  );
}
