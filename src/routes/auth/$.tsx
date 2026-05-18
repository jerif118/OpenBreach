import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/$")({
  component: AuthCatchAllRoute,
});

function AuthCatchAllRoute() {
  return null;
}
