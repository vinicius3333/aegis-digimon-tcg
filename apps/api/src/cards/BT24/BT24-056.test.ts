import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-056.js";
import "../index.js";

describe("BT24-056 Dezipmon", () => {
  it("protects System/Life/Transmutation Digimon, revives Appmon, and deletes on linking", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Hackmon", "Protecmon", "Pipomon"], cost: 0 }]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker" }] }),
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [
            expect.objectContaining({ kind: "Restrict", restriction: "beReturned", byOpponentEffectsOnly: true }),
            expect.objectContaining({ kind: "PlayWithoutCost", from: ["trash"], payCost: false }),
          ],
        }),
        expect.objectContaining({ trigger: "WhenDigivolving" }),
        expect.objectContaining({
          trigger: "WhenLinking",
          isLinked: true,
          actions: [expect.objectContaining({ kind: "Delete", target: { filter: { playCostLte: 5 } } })],
        }),
      ]),
    );
  });

  it("restricts returning an own Life Digimon after being played", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-056", as: "source" },
          { card: "BT24-038", as: "protected" },
        ],
      },
    });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => observe(s.engine).isRestricted(s.perm("protected"), "beReturned"));

    expect(observe(s.engine).isRestricted(s.perm("protected"), "beReturned")).toBe(true);
  });
});
