import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/time_machine")({
  beforeLoad: () => {
    throw redirect({
      to: "/time-machine",
    });
  },
});
