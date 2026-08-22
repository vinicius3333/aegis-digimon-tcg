import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT26-095 Makoto Kuonji", () => {
  it("requires the printed BEATBREAK placement cost", async () => {
    const { getEffectModule } = await import("../../engine/effects/registry.js");
    const effect = getEffectModule("BT26-095")!.effectsForTiming(EffectTiming.OnStartMainPhase, {} as never)[0]!;
    expect(effect.optional).toBe(false);
  });

  it("places the hand cost face down at the immutable stack bottom before drawing and gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-061", as: "beatbreakCost" }],
          deck: [{ card: "AD1-002", as: "drawn" }],
          battleArea: [
            {
              card: "BT26-095",
              as: "makoto",
              under: [{ card: "AD1-001", faceUp: false, as: "existingBottom" }],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costId = s.inst("beatbreakCost").instanceId;
    const existingId = s.inst("existingBottom").instanceId;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("makoto"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("makoto").stack.map((card) => card.instanceId)).toEqual([costId, existingId]);
    expect(s.perm("makoto").stack[0]!.faceUp).toBe(false);
    expect(s.state.memory).toBe(1);
  });

  it("when either player's Digimon is deleted, suspends, draws, trashes, and places the BEATBREAK card face down", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-061", as: "beatbreakHand" }],
          deck: [{ card: "AD1-002", as: "drawn" }],
          battleArea: [{ card: "BT26-095", as: "makoto" }],
        },
        1: { battleArea: [{ card: "AD1-003", as: "victim" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const beatbreakId = s.inst("beatbreakHand").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId]);
    await settle(() => s.perm("makoto").stack.some((card) => card.instanceId === beatbreakId));

    expect(s.perm("makoto").isSuspended).toBe(true);
    expect(s.perm("makoto").stack).toHaveLength(1);
    expect(s.perm("makoto").stack[0]).toMatchObject({ instanceId: beatbreakId, faceUp: false });
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(beatbreakId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("does no post-After processing when the suspend cost cannot be paid, per Q7164", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-061", as: "beatbreakHand" }],
          deck: [{ card: "AD1-002", as: "deckCard" }],
          battleArea: [{ card: "BT26-095", suspended: true, as: "makoto" }],
        },
        1: { battleArea: [{ card: "AD1-003", as: "victim" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId]);
    await settle();

    expect(s.perm("makoto").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("beatbreakHand").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("deckCard").instanceId);
  });

  it("plays itself from Security without paying the cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT26-095", as: "makotoSecurity" }] },
      1: { battleArea: [{ card: "AD1-003", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const makotoId = s.inst("makotoSecurity").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === makotoId),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === makotoId)).toBe(true);
  });
});
