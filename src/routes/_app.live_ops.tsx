import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/live_ops")({
  beforeLoad: () => {
    throw redirect({
      to: "/live-ops",
    });
  },
});
