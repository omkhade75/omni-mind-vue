import { createFileRoute } from "@tanstack/react-router";
import { LiveOps } from "./_app.live-ops";

export const Route = createFileRoute("/_app/live_ops")({
  head: () => ({
    meta: [
      { title: "Live Operations — OmniMind AI" },
      {
        name: "description",
        content: "Real-time mall operations: footfall, checkouts, sales, and staff.",
      },
    ],
  }),
  component: LiveOps,
});
