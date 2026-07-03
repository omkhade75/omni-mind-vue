import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: IndexRouteComponent,
});

function IndexRouteComponent() {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = window.localStorage.getItem("omnimind_role");
      navigate({ to: role ? "/command-center" : "/login", replace: true });
    }
  }, [navigate]);

  return null;
}
