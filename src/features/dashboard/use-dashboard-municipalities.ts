import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api.js";
import {
  type DashboardMunicipalityState,
  toDashboardMunicipalityState,
} from "./dashboard-data.ts";

export function useConvexDashboardMunicipalities(): DashboardMunicipalityState {
  const municipalities = useQuery(api.municipalities.list, {});

  return toDashboardMunicipalityState(municipalities, "convex");
}
