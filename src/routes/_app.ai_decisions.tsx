import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/ai_decisions")({
  beforeLoad: () => {
    throw redirect({
      to: "/ai-decisions",
    });
  },
});
