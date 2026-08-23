import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-030.js";
import "../index.js";

describe("BT26-030 Pumpkinmon", () => {
  it("models the TS evolution, Security play, and hand-trash keyword cost", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["TS"], cost: 3, isAlternate: true }]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Security",
          isSecurity: true,
          actions: [
            expect.objectContaining({
              kind: "PlayWithoutCost",
              from: ["hand", "trash"],
              payCost: false,
              playCostCeiling: { base: 4 },
              optional: true,
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [
            expect.objectContaining({
              kind: "GainKeyword",
              keyword: { keyword: "Execute" },
              cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
            }),
            expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Ascension" } }),
          ],
        }),
        expect.objectContaining({ trigger: "WhenDigivolving" }),
      ]),
    );
  });

  it("publicly pays the hand-trash cost and grants Execute plus Ascension to an Iliad Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-030", as: "pumpkinmon" }],
          hand: [{ card: "BT1-001", as: "cost" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("pumpkinmon"));
    await settle(() => s.state.players[0]!.hand.length === 0);

    expect(Array.from(s.perm("pumpkinmon").keywords)).toEqual(expect.arrayContaining(["Execute", "Ascension"]));
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-001");
  });
});
