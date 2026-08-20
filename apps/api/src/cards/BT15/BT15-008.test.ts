import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-008.js";

describe("BT15-008", () => {
  it("draws once per turn when a red Digimon attacks", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenAttacking", sourceFilter: { controller: "mine", kind: ["Digimon"], colors: ["Red"] }, actions: [{ kind: "Draw", amount: 1 }] }] }));
});
