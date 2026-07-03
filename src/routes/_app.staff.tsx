import { createFileRoute } from "@tanstack/react-router";
import { ScaffoldPage } from "@/components/scaffold-page";

export const Route = createFileRoute("/_app/staff")({
  head: () => ({
    meta: [
      { title: "Staff & Managers — OmniMind AI" },
      { name: "description", content: "Team hierarchy, attendance, and department managers." },
    ],
  }),
  component: () => (
    <ScaffoldPage
      title="Staff & Managers"
      subtitle="Team hierarchy and performance snapshot across all departments."
      sections={[
        {
          title: "Headcount",
          desc: "By department",
          rows: [
            { label: "Fashion", v: "24" },
            { label: "Electronics", v: "18" },
            { label: "Grocery", v: "32" },
            { label: "Food Court", v: "22" },
            { label: "Others", v: "46" },
          ],
        },
        {
          title: "Attendance",
          desc: "Today",
          rows: [
            { label: "Present", v: "138 / 142" },
            { label: "On leave", v: "3" },
            { label: "Overtime", v: "6" },
          ],
        },
        {
          title: "Top Managers",
          desc: "By department revenue",
          rows: [
            { label: "Priya Nair · Fashion", v: "₹12.4L" },
            { label: "Karan Iyer · Electronics", v: "₹10.8L" },
            { label: "Sneha Deshmukh · Grocery", v: "₹8.9L" },
          ],
        },
      ]}
    />
  ),
});
