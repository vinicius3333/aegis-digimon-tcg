import { EffectTiming, getCardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import module from "./EX11-003.js";

function primitivesOf(s: EngineSetup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("EX11-003 Puroromon", () => {
  it("subscribes to own face-up Royal Base security placement, not a generic turn draw", async () => {
    const subscriptions: Array<{ matches: (ctx: any) => boolean }> = [];
    const source = {
      cardId: "EX11-003",
      definition: getCardDefinition("EX11-003"),
      ownerSeat: 0,
      permanent: () => ({ permanentId: "host", linked: [], stack: [] }),
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as any;
    const effect = module.effectsForTiming(EffectTiming.None, source)[0]!;
    await effect.resolve({
      source,
      fx: { subscribeSubTrigger: (subscription: any) => subscriptions.push(subscription) },
    } as any);

    const makeTrigger = (faceUp: boolean, types: string[], seat = 0) => ({
      source,
      trigger: { addedToSecuritySeat: seat, addedToSecurityInstanceIds: ["card"] },
      game: {
        player: () => ({ security: [{ instanceId: "card", faceUp }] }),
        definitionOf: () => ({ types }),
      },
    });
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]!.matches(makeTrigger(true, ["Royal Base"]))).toBe(true);
    expect(subscriptions[0]!.matches(makeTrigger(false, ["Royal Base"]))).toBe(false);
    expect(subscriptions[0]!.matches(makeTrigger(true, ["LIBERATOR"]))).toBe(false);
    expect(subscriptions[0]!.matches(makeTrigger(true, ["Royal Base"], 1))).toBe(false);
  });

  it("draws once when face-up Royal Base cards are placed in its controller's security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-025", as: "host", under: ["EX11-003"] }],
        hand: [
          { card: "EX11-030", as: "firstRoyalBase" },
          { card: "EX11-031", as: "secondRoyalBase" },
        ],
        deck: [
          { card: "BT1-001", as: "firstDraw" },
          { card: "BT1-002", as: "secondDraw" },
        ],
      },
    });
    await s.ready();

    await primitivesOf(s).addSecurity(0 as Seat, [s.inst("firstRoyalBase").instanceId], { faceUp: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("firstDraw").instanceId));
    expect(s.state.players[0]!.security).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("firstRoyalBase").instanceId, faceUp: true }),
    );

    await primitivesOf(s).addSecurity(0 as Seat, [s.inst("secondRoyalBase").instanceId], { faceUp: true });
    await settle();
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("secondDraw").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("secondDraw").instanceId);
    assertNoLoudGap(s);
  });

  it("does not draw for a face-down Royal Base placement", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-025", as: "host", under: ["EX11-003"] }],
        hand: [{ card: "EX11-030", as: "royalBase" }],
        deck: [{ card: "BT1-001", as: "deckTop" }],
      },
    });
    await s.ready();

    await primitivesOf(s).addSecurity(0 as Seat, [s.inst("royalBase").instanceId], { faceUp: false });
    await settle();

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("deckTop").instanceId);
    expect(s.state.players[0]!.security).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("royalBase").instanceId, faceUp: false }),
    );
    assertNoLoudGap(s);
  });

  it("does not draw for a face-up non-Royal-Base card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-025", as: "host", under: ["EX11-003"] }],
        hand: [{ card: "BT1-001", as: "plain" }],
        deck: [{ card: "BT1-002", as: "deckTop" }],
      },
    });
    await s.ready();

    await primitivesOf(s).addSecurity(0 as Seat, [s.inst("plain").instanceId], { faceUp: true });
    await settle();

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("deckTop").instanceId);
    assertNoLoudGap(s);
  });

  it("does not draw when Royal Base is placed in the opponent's security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-025", as: "host", under: ["EX11-003"] }],
        deck: [{ card: "BT1-001", as: "deckTop" }],
      },
      1: { hand: [{ card: "EX11-030", as: "royalBase" }] },
    });
    await s.ready();

    await primitivesOf(s).addSecurity(1 as Seat, [s.inst("royalBase").instanceId], { faceUp: true });
    await settle();

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("deckTop").instanceId);
    assertNoLoudGap(s);
  });

  it("does not draw outside its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-025", as: "host", under: ["EX11-003"] }],
        hand: [{ card: "EX11-030", as: "royalBase" }],
        deck: [{ card: "BT1-001", as: "deckTop" }],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await primitivesOf(s).addSecurity(0 as Seat, [s.inst("royalBase").instanceId], { faceUp: true });
    await settle();

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("deckTop").instanceId);
    assertNoLoudGap(s);
  });

  it("does not treat flipping an existing face-down Royal Base card as placement (Q5788)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-025", as: "host", under: ["EX11-003"] }],
        security: [{ card: "EX11-030", as: "royalBase", faceUp: false }],
        deck: [{ card: "BT1-001", as: "deckTop" }],
      },
    });
    await s.ready();

    s.inst("royalBase").faceUp = true;
    await s.engine.recomputeContinuousEffects();
    await settle();

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("deckTop").instanceId);
    assertNoLoudGap(s);
  });
});
