// DP thresholds used by filters and costs.

import type { Filter } from "./filter.js";

/** A DP threshold ("with 6000 DP or less", "as much or less DP as this"). */
export interface DpComparison {
  op: "lte" | "gte" | "eq";
  value?: number;
  /** Compare to the effect source's DP. */
  relativeToSource?: boolean;
  /** Compare to the live DP captured from the Digimon most recently deleted in this resolution. */
  relativeTo?: "lastDeleted";
  /** Compare to the greatest live DP among permanents matching this filter. */
  relativeToFilter?: Filter;
  /** Permanent-id binding written by a prior action's `bindResultAs`. */
  valueFrom?: string;
  /** Hint for `valueFrom`; only `dp` is interpreted. */
  valueField?: "dp" | string;
}
