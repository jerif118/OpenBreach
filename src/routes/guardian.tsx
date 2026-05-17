import { createFileRoute, Outlet } from "@tanstack/react-router";
import { OpenBreachAppFrame } from "../features/openbreach/app-frame";

export const Route = createFileRoute("/guardian")({
  component: GuardianLayout,
});

function GuardianLayout() {
  return (
    <OpenBreachAppFrame>
      <Outlet />
    </OpenBreachAppFrame>
  );
}
