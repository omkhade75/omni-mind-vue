import { createFileRoute } from "@tanstack/react-router";
import { ScaffoldPage } from "@/components/scaffold-page";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getTransactionsServer } from "@/lib/server-transactions";
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
  const { user } = useAuth();
  const [grossSales, setGrossSales] = useState(0);
  const [discounts, setDiscounts] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const payload = {
          data: {
            role: user?.role || "owner",
            email: user?.email || "",
          }
        };
        const transactions = await getTransactionsServer(payload);
        let gross = 0;
        let disc = 0;
        transactions.forEach(t => {
          if (t.status === "Completed") {
            gross += t.subtotal;
            disc += t.discount;
          }
        });
        setGrossSales(gross);
        setDiscounts(disc);
      } catch (err) {
        console.error("Failed to load income data");
      }
    };
    if (user) {
      loadData();
    }
  }, [user]);

  const netSales = grossSales - discounts;

  return (
    <ScaffoldPage
      title="Income"
      subtitle="Consolidated income across mall revenue streams."
      sections={[
        {
          title: "Sales Revenue",
          desc: "This month (Real-time)",
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
