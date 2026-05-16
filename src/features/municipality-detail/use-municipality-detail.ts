import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api.js";
import {
  type MunicipalityDetailState,
  toMunicipalityDetailState,
} from "./municipality-detail-data.ts";

export function useConvexMunicipalityDetail(id: string): MunicipalityDetailState {
  const detail = useQuery(api.municipalities.get, { id });

  return toMunicipalityDetailState(detail, "convex", id);
}
