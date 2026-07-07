import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/command_center")({
  beforeLoad: () => {
    throw redirect({
      to: "/command-center",
    });
  },
});
