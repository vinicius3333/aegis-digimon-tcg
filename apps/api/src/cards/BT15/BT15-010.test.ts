import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-010.js";

describe("BT15-010", () => {
  it("once per turn deletes an opposing Digimon with 3000 DP or less when your Digimon attacks", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenAttacking", actions: [{ kind: "Delete", target: { filter: { dp: { op: "lte", value: 3000 } } } }] }] }));
});
