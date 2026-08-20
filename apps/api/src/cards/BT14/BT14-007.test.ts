import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-007.js";

describe("BT14-007", () => {
  it("may free-digivolve into a Greymon with Tai Kamiya at the start of main phase", () => expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")).toMatchObject({ actions: [{ kind: "Digivolve", payCost: false, from: ["hand"], condition: { kind: "youHave" }, into: { nameOrTrait: [{ tokens: ["Greymon"], match: "name" }] } }] }));
  it("inherits +2000 DP for Greymon or Omnimon", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 2000 }, while: { kind: "selfHasNameContaining" } }] }));
});
