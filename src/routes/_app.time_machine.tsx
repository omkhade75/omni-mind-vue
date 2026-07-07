import { createFileRoute } from "@tanstack/react-router";
import { TimeMachine } from "./_app.time-machine";

export const Route = createFileRoute("/_app/time_machine")({
  head: () => ({
    meta: [
      { title: "Business Time Machine — OmniMind AI" },
      {
        name: "description",
        content: "Investigate any date across sales, customers, products, inventory, suppliers, expenses, and operations.",
      },
    ],
  }),
  component: TimeMachine,
});
