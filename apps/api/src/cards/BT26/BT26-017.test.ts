import { assemblyRequirementFor, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-017.js";
import "../index.js";

describe("BT26-017 Zanbamon", () => {
  it("compiles Blocker/Retaliation and both trigger paths", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((e) => e.trigger)).toEqual(["Static", "OnPlay", "WhenDigivolving", "OnDeletion"]);
  });
  it("exposes its Shambala evolution and Assembly requirements", () => {
    expect(digivolutionRequirementsFor("BT26-017")).toContainEqual({ level: 5, traits: ["Shambala", "TS"], cost: 3, isAlternate: true });
    expect(assemblyRequirementFor("BT26-017")).toEqual([{ reduceCost: 4, materials: [{ traits: ["Shambala"], levelMax: 5, count: 2, differentLevels: true }] }]);
  });
  it("grants Security Attack and Progress to a Shambala ally on play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-012", as: "ally" }], hand: [{ card: "BT26-017", as: "self" }] } }, { autoSelectCards: true });
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("self").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Progress"));
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Progress")).toBe(true);
  });
});
