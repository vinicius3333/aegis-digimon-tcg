import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-161.js";

describe("P-161 Bishop Device", () => {
  it("restricts an opponent Digimon or Tamer after being trashed from the battle area", () => {
    const compiled = runtimeCompiledCard("P-161")!;
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "whenTrashedFromBattleArea",
          actions: [
            {
              kind: "Restrict",
              restriction: "suspend",
              duration: "untilOpponentTurnEnd",
              target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
            },
          ],
        }),
      ]),
    );
  });

  it("encodes Main placement and Security level-5-or-lower deck bottoming", () => {
    const compiled = runtimeCompiledCard("P-161")!;
    expect(compiled.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        { kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "Return",
          to: "deckBottom",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
            count: 1,
          },
        },
        { kind: "AddToHandSelf" },
      ],
    });
  });

  it("returns an opposing level-5-or-lower Digimon to deck bottom and adds itself to hand from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "P-161", as: "bishop" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("bishop"));
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("bishop").instanceId)).toBe(true);
  });
});
