import { describe, expect, it } from "vitest";
import { describeRemainingCollectionAuditContract, standardLedgerScore } from "./collection-audit-contract.js";
import "./index.js";

describeRemainingCollectionAuditContract({
  runtimeProofs: [
    { set: "RB1", cardIds: ["RB1-029"], testFile: "RB1-029.test.ts" },
    { set: "EX3", cardIds: ["EX3-012"], testFile: "EX3-012.test.ts" },
    { set: "EX3", cardIds: ["EX3-035", "BT16-014"], testFile: "EX3-035.test.ts" },
    { set: "EX4", cardIds: ["EX4-032", "EX4-033", "EX4-034"], testFile: "EX4-alliance-watchers.test.ts" },
    { set: "ST20", cardIds: ["ST20-14", "ST19-10"], testFile: "ST20-14.test.ts" },
    {
      set: "ST12",
      cardIds: ["ST12-01", "ST12-04", "ST12-06", "ST12-08", "ST12-10", "ST12-12", "ST12-15"],
      testFile: "jesmon-starter-mixed-deck.test.ts",
    },
  ],
});

describe("authoritative collection ledger scores", () => {
  const partial =
    "- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 1/2 · stack 1/2\n- Score: **8/10** provisional\n- Historical score: 10/10";
  it("accepts a reopened score whose five components sum to eight", () => {
    expect(standardLedgerScore({ body: partial })).toBe(8);
    expect(standardLedgerScore({ body: partial.replace("- Historical score: 10/10", "") })).toBe(8);
  });
  it("preserves the existing inline ten-point rubric", () => {
    expect(
      standardLedgerScore({
        body: "- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2).",
      }),
    ).toBe(10);
  });
  it("prefers an explicit current cap over a historical top-level score", () => {
    expect(
      standardLedgerScore({
        body: "- Current score: capped at 8/10, provisional.\n" + partial.replace("**8/10**", "**10/10**"),
      }),
    ).toBe(8);
  });
  it.each([
    [
      "malformed current cap",
      "- Current score: pending\n- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2).",
    ],
    ["fractional component", partial.replace("stack 1/2", "stack 1.2/2").replace("**8/10**", "**9/10**")],
    [
      "fractional total",
      "- Current score: capped at 8.10/10\n- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2).",
    ],
    ["comma total denominator", "- Score: 10/10,5 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2)."],
    ["comma component denominator", partial.replace("stack 1/2", "stack 1/2,5")],
    ["fractional denominator", partial.replace("stack 1/2", "stack 1/2.5")],
    ["decimal comma component", partial.replace("stack 1/2", "stack 1,2/2").replace("**8/10**", "**9/10**")],
    [
      "history inside malformed current line",
      "- Current score: pending; historical 10/10\n- Score: 10/10 (catalog 2/2, rules 2/2, compiled IR 2/2, behavior 2/2, gates 2/2).",
    ],
    ["inflated total", partial.replace("**8/10**", "**10/10**")],
    ["missing component", partial.replace(" · stack 1/2", "")],
    ["negative component", partial.replace("stack 1/2", "stack -1/2").replace("**8/10**", "**6/10**")],
    ["out-of-range component", partial.replace("stack 1/2", "stack 3/2").replace("**8/10**", "**10/10**")],
    ["superseded total only", partial.replace("- Score: **8/10** provisional", "")],
  ])("rejects %s despite historical ten-point text", (_label, body) => {
    expect(() => standardLedgerScore({ body })).toThrow(/Missing current ledger score|Ledger score must equal/);
  });
  it("rejects a reduced card score when the collection still claims verified", () => {
    expect(() => standardLedgerScore({ body: partial, verified: true })).toThrow("Verified collection");
  });
});
