import { createFileRoute } from "@tanstack/react-router";
import { AIDecisions } from "./_app.ai-decisions";

export const Route = createFileRoute("/_app/ai_decisions")({
  head: () => ({
    meta: [
      { title: "AI Decision Center — OmniMind AI" },
      {
        name: "description",
        content: "Move from reports to evidence-backed actions.",
      },
    ],
  }),
  component: AIDecisions,
});
