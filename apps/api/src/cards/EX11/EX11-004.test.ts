import { EffectTiming, getCardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./EX11-004.js";

function primitivesOf(s: EngineSetup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("EX11-004 Kapurimon", () => {
  it("subscribes to face-up cards added to the opponent's security", async () => {
    const subscriptions: Array<{ matches: (ctx: any) => boolean }> = [];
    const source = {
      cardId: "EX11-004",
      definition: getCardDefinition("EX11-004"),
      ownerSeat: 0,
      permanent: () => ({ permanentId: "host", linked: [], stack: [] }),
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as any;
    const effect = getEffectModule("EX11-004")!.effectsForTiming(EffectTiming.None, source)[0]!;
    await effect.resolve({
      source,
      fx: { subscribeSubTrigger: (subscription: any) => subscriptions.push(subscription) },
    } as any);

    // The watcher fires for a face-up add to the OPPONENT's security, and only on its own
    // owner's turn — the printed "[Your Turn]" window travels with the installed watcher.
    const addToSecurity = (seat: number, over: Partial<typeof source> = {}) => ({
      source: { ...source, ...over },
      trigger: { addedToSecuritySeat: seat, addedToSecurityInstanceIds: ["card"] },
      game: {
        opponentOf: (own: number) => (own === 0 ? 1 : 0),
        player: () => ({ security: [{ instanceId: "card", faceUp: true }] }),
        definitionOf: () => ({ types: [] }),
      },
    });

    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]!.matches(addToSecurity(1))).toBe(true);
    // An add to the controller's OWN security is not the watched event.
    expect(subscriptions[0]!.matches(addToSecurity(0))).toBe(false);
    expect(subscriptions[0]!.matches(addToSecurity(1, { isOwnersTurn: () => false }))).toBe(false);
  });

  it("draws when an attack flips the opponent's face-down security face up (Q5789)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-037", as: "host", under: ["EX11-004"] }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
      1: { security: [{ card: "BT1-001", as: "checked", faceUp: false }] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    assertNoLoudGap(s);
  });

  it("draws only once when face-up cards are repeatedly placed in opponent security (Q5790)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-037", as: "host", under: ["EX11-004"] }],
        deck: [
          { card: "BT1-001", as: "firstDraw" },
          { card: "BT1-002", as: "secondDraw" },
        ],
      },
      1: {
        hand: [
          { card: "BT1-009", as: "firstAdd" },
          { card: "BT1-010", as: "secondAdd" },
        ],
      },
    });
    await s.ready();

    await primitivesOf(s).addSecurity(1 as Seat, [s.inst("firstAdd").instanceId], { faceUp: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("firstDraw").instanceId));
    await primitivesOf(s).addSecurity(1 as Seat, [s.inst("secondAdd").instanceId], { faceUp: true });
    await settle();

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("secondDraw").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("secondDraw").instanceId);
    assertNoLoudGap(s);
  });

  it("does not draw when a face-down card is placed in opponent security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-037", as: "host", under: ["EX11-004"] }],
        deck: [{ card: "BT1-001", as: "deckTop" }],
      },
      1: { hand: [{ card: "BT1-009", as: "added" }] },
    });
    await s.ready();

    await primitivesOf(s).addSecurity(1 as Seat, [s.inst("added").instanceId], { faceUp: false });
    await settle();

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("deckTop").instanceId);
    assertNoLoudGap(s);
  });

  it("does not draw when a face-up card is placed in its controller's own security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-037", as: "host", under: ["EX11-004"] }],
        hand: [{ card: "BT1-009", as: "added" }],
        deck: [{ card: "BT1-001", as: "deckTop" }],
      },
    });
    await s.ready();

    await primitivesOf(s).addSecurity(0 as Seat, [s.inst("added").instanceId], { faceUp: true });
    await settle();

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("deckTop").instanceId);
    assertNoLoudGap(s);
  });

  it("does not draw outside its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-037", as: "host", under: ["EX11-004"] }],
        deck: [{ card: "BT1-001", as: "deckTop" }],
      },
      1: { hand: [{ card: "BT1-009", as: "added" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await primitivesOf(s).addSecurity(1 as Seat, [s.inst("added").instanceId], { faceUp: true });
    await settle();

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("deckTop").instanceId);
    assertNoLoudGap(s);
  });

  it("does not treat checking an already-face-up security card as a new add", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-037", as: "host", under: ["EX11-004"] }],
        deck: [{ card: "BT1-001", as: "deckTop" }],
      },
      1: { security: [{ card: "BT1-001", faceUp: true }] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.gameOver !== undefined);

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("deckTop").instanceId);
    assertNoLoudGap(s);
  });
});
