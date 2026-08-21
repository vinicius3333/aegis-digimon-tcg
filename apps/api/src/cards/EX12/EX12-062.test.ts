import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

const CARD_ID = "EX12-062";

describe("EX12-062 Kokeshimon", () => {
  it("maps the Puppet/Shambala evolution, both deletion windows, and inherited attack effect", () => {
    const compiled = registeredCompiledCards.get(CARD_ID)!;

    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, traits: ["Puppet", "Shambala"], cost: 2, isAlternate: true },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: {
              count: 1,
              filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
            },
            cost: { kind: "deleteOwn", target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } } },
            optional: true,
            abortOnDecline: true,
          },
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", target: { count: 1, filter: { controller: "mine", zone: "hand" } } },
      ],
    });
  });

  it("deletes a chosen own Digimon before deleting an opposing level 4 Digimon on play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "source" },
            { card: "EX12-061", as: "sacrifice" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const sacrificeInstanceId = s.perm("sacrifice").topCard!.instanceId;
    const opponentPermanentId = s.perm("opponent").permanentId;
    preferred.push(s.perm("sacrifice").permanentId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === sacrificeInstanceId));

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX12-061")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opponentPermanentId)).toBe(
      false,
    );
  });

  it("draws and trashes once from the inherited attack effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-063", as: "host", under: [CARD_ID] }],
          hand: ["BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0]!;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => player.deck.length === 0 && player.trash.length === 1);
    expect(player.hand).toHaveLength(1);
    expect(player.trash).toHaveLength(1);
    expect(player.hand.some((card) => card.cardId === "BT1-010")).toBe(true);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle();
    expect(player.hand).toHaveLength(1);
    expect(player.trash).toHaveLength(1);
  });
});
