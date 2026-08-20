import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-048.js";

describe("BT14-048", () => {
  it("may digivolve into a level-six Leomon from hand for six when attacking a higher-DP Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({ kind: "Digivolve", payCost: true, from: ["hand"], costOverride: 6, ignoreRequirements: true, condition: { kind: "lastTargetDpGreaterThanSelf" }, into: { levels: [6], nameOrTrait: [{ tokens: ["Leomon"], match: "name" }] } }));
  it("inherits +2000 DP for Leomon", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ kind: "Aura", effect: { amount: 2000 }, while: { kind: "selfHasNameContaining" } }] }));
});
