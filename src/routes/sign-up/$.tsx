import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-up/$")({
  component: SignUpCatchAllRoute,
});

function SignUpCatchAllRoute() {
  return null;
}
