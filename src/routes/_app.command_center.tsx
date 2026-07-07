import { createFileRoute } from "@tanstack/react-router";
import { CommandCenter } from "./_app.command-center";

export const Route = createFileRoute("/_app/command_center")({
  head: () => ({
    meta: [
      { title: "Command Center — OmniMind AI" },
      {
        name: "description",
        content: "Complete high-level overview of mall performance, sales, and analytics.",
      },
    ],
  }),
  component: CommandCenter,
});
