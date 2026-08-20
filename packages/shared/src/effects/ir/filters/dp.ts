// DP thresholds used by filters and costs.

/** A DP threshold ("with 6000 DP or less", "as much or less DP as this"). */
export interface DpComparison {
  op: "lte" | "gte" | "eq";
  value?: number;
  /** Compare to the effect source's DP. */
  relativeToSource?: boolean;
  /** Permanent-id binding written by a prior action's `bindResultAs`. */
  valueFrom?: string;
  /** Hint for `valueFrom`; only `dp` is interpreted. */
  valueField?: "dp" | string;
}
