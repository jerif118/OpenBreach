import { createFileRoute } from "@tanstack/react-router";
import { OpenBreachAppFrame } from "../features/openbreach/app-frame";
import { OpenBreachDashboard } from "../features/openbreach/dashboard";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <OpenBreachAppFrame>
      <OpenBreachDashboard />
    </OpenBreachAppFrame>
  );
}
