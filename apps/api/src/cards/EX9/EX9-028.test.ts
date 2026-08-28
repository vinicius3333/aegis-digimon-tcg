import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-028.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-028", () => {
  it("once per turn can digivolve at end of turn by placing three Ver.4 Digimon from trash face down underneath", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand", "trash"],
          cost: {
            kind: "place",
            target: { count: 3 },
            faceDown: true,
            destination: "digivolutionStack",
            position: "bottom",
          },
        },
      ],
    });
  });
  it("inherits -3000 DP for opposing Security Digimon during your turn", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "ModifySecurityDP", controller: "opponent", amount: -3000, duration: "permanent" }],
    });
  });
  it("applies the inherited Security-Digimon reduction through the live ledger", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "host", under: ["EX9-028"] }] },
      1: { security: ["BT1-009", "BT1-090"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(1)).toBe(-3000);
    expect(observe(s.engine).securityDp(0)).toBe(0);
  });
});
