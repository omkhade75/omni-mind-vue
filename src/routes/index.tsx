import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const role = window.localStorage.getItem("omnimind_role");
      throw redirect({ to: role ? "/command-center" : "/login" });
    }
  },
  component: () => null,
});
