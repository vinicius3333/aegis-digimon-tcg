// Fields shared by every action node.

import type { Condition } from "../predicates/conditions.js";
import type { Cost } from "../predicates/costs.js";
import type { Scaling } from "../predicates/scaling.js";

export interface ActionBase {
  /** Optional per-action gate (the clause-level "If ..."). */
  condition?: Condition;
  /** Optional cost paid to perform this action. */
  cost?: Cost;
  /**
   * Additional costs for the same action. Used for clauses such as
   * "By placing 1 [A] and 1 [B] ...".
   */
  additionalCost?: Cost;
  additionalCosts?: Cost[];
  /** Alternative costs where paying any one option satisfies the action. */
  costOptions?: Cost[];
  /** Scaling ("for each ...") applied to the action's amount/count. */
  scaling?: Scaling;
  /** True when the clause is prefixed "You may". */
  optional?: boolean;
  /**
   * When true and this optional action is declined, abort all subsequent
   * actions in the same sequence ("By trashing X, do Y" — declining the
   * trash prevents Y from firing).
   */
  abortOnDecline?: boolean;
  /** Diagnostic / provenance text from runtime record (ignored at runtime). */
  raw?: string;
}
