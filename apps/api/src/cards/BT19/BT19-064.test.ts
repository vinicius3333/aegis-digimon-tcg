import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-064.js";

describe("BT19-064", () => {
  it("preserves Blast Digivolve, Blocker/protection, shared unsuspend cost, and either-side Option targeting", () => {
    const card = runtimeCompiledCard("BT19-064");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Counter", isFromHand: true, keywords: [{ keyword: "BlastDigivolve" }] },
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          { kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" },
          {
            kind: "Restrict",
            restriction: "beAffected",
            duration: "untilOpponentTurnEnd",
            sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          },
        ],
      })),
      ...["WhenDigivolving", "WhenAttacking"].map((trigger) => ({
        trigger,
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "Unsuspend",
            cost: { kind: "trash", target: { filter: { zone: "battleArea", kind: ["Option"] } } },
            optional: true,
          },
        ],
      })),
    ]);
  });
});
