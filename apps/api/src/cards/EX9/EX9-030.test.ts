import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-030.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-030", () => {
  it("reduces its play cost by 2 by trashing a Cyborg or Ver.3 card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          actions: [
            { kind: "Replacement", event: "wouldBePlayed", mode: "reduceCost", amount: 2, cost: { kind: "trash" } },
          ],
        },
      ],
    });
  });
  it("on play or digivolution gives an opposing Digimon -3000 DP and loses 2000 DP per digivolution card", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "ModifyDP",
            amount: -3000,
            cost: { kind: "place", faceDown: true, destination: "digivolutionStack" },
          },
          {
            kind: "ModifyDP",
            amount: -2000,
            duration: "untilOpponentTurnEnd",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, sameTarget: true },
            scaling: { unit: "digivolutionCards", per: 1, filter: { faceDown: true } },
          },
        ],
      });
    }
  });
  it("inherits Blocker", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    }));

  it("places a trash Digimon face down and applies the printed DP changes on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-030", as: "source", dp: 7000 }], trash: ["BT1-009"] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("target").currentDP !== 10000);
    const source = s.state.players[0]!.battleArea[0]!;
    expect(source.stack).toHaveLength(1);
    expect(source.stack[0]!.faceUp).toBe(false);
    expect(s.perm("target").currentDP).toBe(5000);
    await s.ready();
    expect(source.currentDP).toBe(7000);
  });

  it("trashes an eligible hand card and reduces the play cost by exactly 2", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX9-023", as: "payment" },
            { card: "EX9-030", as: "source" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const before = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId }).ok).toBe(true);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-030"));

    expect(before - s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-023")).toBe(false);
    expect(s.state.players[0]!.battleArea[0]?.stack.some((card) => card.cardId === "EX9-023" && !card.faceUp)).toBe(
      true,
    );
  });

  it.each(["BT1-009", "BT1-001", "BT1-091"])(
    "counts face-down %s without referencing its card kind and only reduces the selected opponent",
    async (faceDownCard) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "EX9-030",
                as: "source",
                dp: 7000,
                under: [
                  { card: faceDownCard, faceUp: false },
                  { card: "BT1-051", faceUp: true },
                ],
              },
            ],
            trash: ["BT1-021"],
          },
          1: {
            battleArea: [
              { card: "BT1-010", as: "target", dp: 10000 },
              { card: "BT1-021", as: "untargeted", dp: 10000 },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
      await settle(() => s.perm("target").currentDP !== 10000);

      expect(s.perm("target").currentDP).toBe(3000);
      expect(s.perm("untargeted").currentDP).toBe(10000);
      expect(s.perm("source").currentDP).toBe(7000);
      expect(s.perm("source").stack.filter((card) => card.faceUp !== true)).toHaveLength(2);
    },
  );
});
