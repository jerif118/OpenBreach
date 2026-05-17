import { createFileRoute } from "@tanstack/react-router";
import { OpenBreachDashboard } from "../../features/openbreach/dashboard";

export const Route = createFileRoute("/guardian/")({
  component: OpenBreachDashboard,
});
