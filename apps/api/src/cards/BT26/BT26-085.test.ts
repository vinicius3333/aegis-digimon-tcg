import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-085.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT26-085 compiled behavior", () => {
  it("proves Assembly's five different-level Chronomon-text-or-Shaman materials and keywords", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.assemblyRequirement).toEqual([{ reduceCost: 5, materials: [{ count: 5, differentLevels: true, nameOrTrait: [
      { tokens: ["Chronomon"], match: "text" },
      { tokens: ["Shaman"], match: "trait" },
    ] }] }]);
    expect(compiled.keywords).toEqual([
      { keyword: "Collision", raw: "＜Collision＞" },
      { keyword: "Reboot", raw: "＜Reboot＞" },
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
  });

  it("protects DP and the evolution stack, then replaces leaving with a free Destroy Mode digivolution", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions).toEqual([
      expect.objectContaining({ kind: "Restrict", restriction: "dpImmune", duration: "untilOpponentTurnEnd", byOpponentEffectsOnly: true }),
      expect.objectContaining({ kind: "StackTrashLock", duration: "untilOpponentTurnEnd" }),
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement", event: "wouldLeavePlay", mode: "prevent", sourceFilter: { isSelfRef: true },
      actions: [{ kind: "Digivolve", from: ["hand", "trash"], payCost: false, optional: true, target: { isSelf: true }, into: { nameOrTrait: [{ tokens: ["Chronomon: Destroy Mode"], match: "name" }] } }],
    });
  });

  it("installs the opponent DP immunity restriction on play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-085", as: "giantSlayer" }] } });

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("giantSlayer"));

    expect(observe(s.engine).isRestricted(s.perm("giantSlayer"), "dpImmune")).toBe(true);
  });
});
