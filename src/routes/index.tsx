import { createFileRoute } from "@tanstack/react-router";
import { TargetIntakeScreen } from "../features/target-intake/intake-screen.tsx";

export const Route = createFileRoute("/")({
  component: TargetIntakeRoute,
});

function TargetIntakeRoute() {
  return <TargetIntakeScreen />;
}
