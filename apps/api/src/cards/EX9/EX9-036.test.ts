import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-036.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-036", () => {
  it("reduces by 1 the cost to digivolve this battle-area Digimon into a WG Digimon during your turn", () => expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ actions: [{ kind: "Replacement", sourceFilter: { isSelfRef: true }, into: { nameOrTrait: [{ tokens: ["WG"], match: "trait" }] }, actions: [{ mode: "reduceCost", amount: 1 }] }] }));
  it("inherits +1000 DP", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] }));

  it("applies the inherited +1000 DP to the host Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", as: "host", under: ["EX9-036"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(3000);
  });
});
