import { CardKind, EffectTiming, type CardDefinition, type CardInstance, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import module from "./BT26-005.js";
import "../index.js";

const CARD_ID = "BT26-005";

function source(): CardSource {
  return {
    instanceId: "pinamon",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: {} as CardDefinition,
    permanent: () => undefined,
    isOnBattleArea: () => false,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-005 Pinamon", () => {
  it("Q6958 trashes the literal bottom face-down Tamer card, then may play that same card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: [{ card: CARD_ID, as: "pinamon" }] },
            {
              card: "BT26-091",
              as: "tamer",
              under: [{ card: "BT26-039", as: "costAndPlay", faceUp: false }],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("costAndPlay").instanceId);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);

    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("costAndPlay").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("pinamon").instanceId)).toBe(true);
  });

  it("requires the actual bottom card to be face-down and leaves the stack untouched otherwise", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: [CARD_ID] },
          {
            card: "BT26-091",
            as: "tamer",
            under: [
              { card: "BT1-001", as: "bottomUp", faceUp: true },
              { card: "BT26-039", as: "upperDown", faceUp: false },
            ],
          },
        ],
      },
    });

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");

    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("bottomUp").instanceId,
      s.inst("upperDown").instanceId,
    ]);
  });

  it("after payment offers only playable cost-5-or-lower exact Avian/Bird/DATA SQUAD cards", async () => {
    const cardSource = source();
    const cards = [
      { instanceId: "avian", cardId: "AVIAN" },
      { instanceId: "data", cardId: "DATA" },
      { instanceId: "option", cardId: "OPTION" },
      { instanceId: "over", cardId: "OVER" },
      { instanceId: "near", cardId: "NEAR" },
    ] as CardInstance[];
    const definitions: Record<string, CardDefinition> = {
      AVIAN: { kinds: [CardKind.Digimon], types: ["Avian"], playCost: 5 } as unknown as CardDefinition,
      DATA: { kinds: [CardKind.Tamer], types: ["DATA SQUAD"], playCost: 4 } as unknown as CardDefinition,
      OPTION: { kinds: [CardKind.Option], types: ["DATA SQUAD"], playCost: 2 } as unknown as CardDefinition,
      OVER: { kinds: [CardKind.Digimon], types: ["Bird"], playCost: 6 } as unknown as CardDefinition,
      NEAR: { kinds: [CardKind.Digimon], types: ["Avian Dragon"], playCost: 3 } as unknown as CardDefinition,
      TAMER: { kinds: [CardKind.Tamer] } as unknown as CardDefinition,
    };
    const tamer = {
      permanentId: "tamer",
      topCard: { cardId: "TAMER" },
      inBreeding: false,
      stack: [{ instanceId: "cost", faceUp: false }],
    };
    const selectCards = vi.fn(async (_ctx, request: { candidates: string[] }) => {
      expect(request.candidates).toEqual(["avian", "data"]);
      expect(request).toMatchObject({ min: 0, max: 1 });
      return [];
    });
    const ctx = {
      source: cardSource,
      game: {
        player: () => ({ battleArea: [tamer], trash: cards }),
        definitionOf: (card: { cardId: string }) => definitions[card.cardId]!,
      } as unknown as GameAccess,
      ask: { selectCards },
      fx: {
        trashDigivolutionCards: vi.fn(async () => [{ instanceId: "cost" }]),
        playInstances: vi.fn(),
      } as unknown as Primitives,
    } as unknown as EffectContext;

    await module.effectsForTiming(EffectTiming.OnDestroyedAnyone, cardSource)[0]!.resolve(ctx);

    expect(ctx.fx.trashDigivolutionCards).toHaveBeenCalledWith("tamer", ["cost"], { byEffectSeat: 0 });
    expect(ctx.fx.playInstances).not.toHaveBeenCalled();
  });

  it("does not grant the play when the selected Tamer-under-card fails to reach trash", async () => {
    const cardSource = source();
    const playInstances = vi.fn();
    const ctx = {
      source: cardSource,
      game: {
        player: () => ({
          battleArea: [
            {
              permanentId: "tamer",
              topCard: { cardId: "TAMER" },
              inBreeding: false,
              stack: [{ instanceId: "cost", faceUp: false }],
            },
          ],
          trash: [{ instanceId: "avian", cardId: "AVIAN" }],
        }),
        definitionOf: (card: { cardId: string }) =>
          card.cardId === "TAMER"
            ? ({ kinds: [CardKind.Tamer] } as unknown as CardDefinition)
            : ({ kinds: [CardKind.Digimon], types: ["Avian"], playCost: 5 } as unknown as CardDefinition),
      } as unknown as GameAccess,
      fx: { trashDigivolutionCards: vi.fn(async () => []), playInstances } as unknown as Primitives,
    } as unknown as EffectContext;

    await module.effectsForTiming(EffectTiming.OnDestroyedAnyone, cardSource)[0]!.resolve(ctx);

    expect(playInstances).not.toHaveBeenCalled();
  });
});
