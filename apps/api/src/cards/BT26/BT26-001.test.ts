import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, SubTriggerInstall } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import module from "./BT26-001.js";
import "../index.js";

const CARD_ID = "BT26-001";

function source(instanceId = "yokomon"): CardSource {
  return {
    instanceId,
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: {} as CardDefinition,
    permanent: () => ({ permanentId: `host-${instanceId}`, inBreeding: false }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-001 Yokomon", () => {
  it("Q6951 reacts to its controller's effect adding to either deck, not an opponent's effect", async () => {
    const cardSource = source();
    let subscription: SubTriggerInstall | undefined;
    const chronomon = { instanceId: "chrono", cardId: "CHRONO" };
    const ctx = {
      source: cardSource,
      game: {
        player: () => ({ hand: [chronomon] }),
        permanentById: () => ({ permanentId: "host-yokomon", inBreeding: false }),
        definitionOf: () =>
          ({ kinds: [CardKind.Digimon], nameEn: "Chronomon", evoCosts: [{ memoryCost: 4 }] }) as CardDefinition,
      },
      fx: { subscribeSubTrigger: (sub: SubTriggerInstall) => (subscription = sub) },
    } as unknown as EffectContext;

    await module.effectsForTiming(EffectTiming.None, cardSource)[0]!.resolve(ctx);

    expect(subscription!.oncePerTurnKey).toBe(`yokomon/${CARD_ID}/inherited-reactive-alt-digivolve`);
    expect(subscription!.matches!({ ...ctx, trigger: { effectAddedToDeckSeat: 1, effectAddedToDeckBySeat: 0 } })).toBe(
      true,
    );
    expect(subscription!.matches!({ ...ctx, trigger: { effectAddedToDeckSeat: 0, effectAddedToDeckBySeat: 1 } })).toBe(
      false,
    );
  });

  it("Q6948/Q6951 publicly evolves after its effect adds an opponent's card to their deck, pays printed cost -1, and draws", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-013", as: "host", under: [{ card: CARD_ID, as: "yokomon" }] }],
          hand: [{ card: "BT26-015", as: "chronomonText" }],
          deck: [{ card: "BT1-001", as: "bonusDraw" }],
        },
        1: { trash: [{ card: "BT1-009", as: "opponentCard" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).verb.returnToDeck([s.inst("opponentCard").instanceId]);

    expect(s.perm("host").topCard.cardId).toBe("BT26-015");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("opponentCard").instanceId);
  });

  it("spends its once-per-turn budget only after a successful evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-013", as: "host", under: [CARD_ID] }],
          hand: [
            { card: "BT26-015", as: "first" },
            { card: "BT26-015", as: "second" },
          ],
          trash: [
            { card: "BT1-001", as: "move1" },
            { card: "BT1-002", as: "move2" },
          ],
          deck: ["BT1-003", "BT1-004"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).verb.returnToDeck([s.inst("move1").instanceId]);
    const evolvedTop = s.perm("host").topCard.instanceId;
    await advance(s.engine).verb.returnToDeck([s.inst("move2").instanceId], { toTop: true });

    expect(s.perm("host").topCard.instanceId).toBe(evolvedTop);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("second").instanceId)).toBe(true);
  });

  it("does not react when a revealed deck card is simply restored without a cards-moved event (Q6949)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-013", as: "host", under: [CARD_ID] }],
        hand: [{ card: "BT26-015", as: "candidate" }],
        deck: [{ card: "BT1-001", as: "revealed" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const revealed = s.state.players[0]!.deck.pop()!;
    s.state.players[0]!.deck.push(revealed);

    expect(s.perm("host").topCard.cardId).toBe("BT26-013");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.deck.at(-1)).toMatchObject({ instanceId: s.inst("revealed").instanceId, faceUp: false });
  });
});
