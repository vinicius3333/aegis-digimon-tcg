import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-064 Justimon: Blitz Arm", () => {
  it("preserves Blast Digivolve, temporary protection, and shared Option-cost unsuspension", () => {
    const card = runtimeCompiledCard("BT19-064");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.digivolutionRequirement).toEqual([
      { names: ["Justimon: Accel Arm", "Justimon: Critical Arm"], cost: 1, isAlternate: true },
    ]);
    expect(card?.effects).toMatchObject([
      { trigger: "Counter", isFromHand: true, actions: [], keywords: [{ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }] },
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          { kind: "GainKeyword", keyword: { keyword: "Blocker", raw: "＜Blocker＞" }, duration: "untilOpponentTurnEnd" },
          { kind: "Restrict", restriction: "beAffected", duration: "untilOpponentTurnEnd", sourceFilter: { controller: "opponent", kind: ["Digimon"] } },
        ],
      })),
      ...["WhenDigivolving", "WhenAttacking"].map((trigger) => ({
        trigger,
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [{
          kind: "Unsuspend",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          cost: { kind: "trash", target: { filter: { zone: "battleArea", controllerDefault: "either", kind: ["Option"] }, count: 1 } },
          optional: true,
          abortOnDecline: true,
        }],
      })),
    ]);
  });
});
