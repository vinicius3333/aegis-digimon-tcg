/**
 * Assertion view of one compiled IR node.
 *
 * IR shape tests read member-specific fields — `into`, `playCostCeiling`, `redFilter` — off the
 * `Action` and `CardEffect` unions. Re-narrowing by `kind` at every assertion would restate in
 * the test the very shape the assertion is checking, and would pass vacuously when the narrowing
 * fails. Widening the node once at the point it is extracted keeps the assertion the only claim
 * the test makes.
 *
 * Assertions only. Engine code narrows the union properly; `catalogActionKindGate.test.ts` and
 * the interpreter's exhaustive switches are what keep that honest.
 */
// oxlint-disable-next-line typescript/no-explicit-any -- the whole point of this seam
export type IrNode = any;

/** Widen one compiled IR node for assertion. See {@link IrNode}. */
export function irNode(node: unknown): IrNode {
  return node as IrNode;
}
