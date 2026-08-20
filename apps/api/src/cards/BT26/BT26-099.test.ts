import { EffectDuration } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

function continuous(s: ReturnType<typeof setupEngine>) {
  return (s.engine as unknown as { continuous: { hasColorWaiver(id: string): boolean } }).continuous;
}

function primitives(s: ReturnType<typeof setupEngine>): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("BT26-099 Training Manual", () => {
  it("uses its DM requirement, reveals 3, keeps 1 DM card, and becomes a battle-area Option", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-099", as: "manual" }],
          deck: [
            { card: "EX9-035", as: "dmMatch" },
            { card: "AD1-001", as: "nonMatchOne" },
            { card: "AD1-002", as: "nonMatchTwo" },
          ],
          battleArea: [{ card: "BT1-051", as: "runtimeDm" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    advance(s.engine).ledgers.continuous.addNameTraitGrant(
      s.perm("runtimeDm").permanentId,
      "trait",
      ["DM"],
      EffectDuration.UntilEachTurnEnd,
    );
    await advance(s.engine).recompute();
    s.state.memory = 4;
    const manualId = s.inst("manual").instanceId;

    expect(continuous(s).hasColorWaiver(manualId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: manualId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === manualId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("dmMatch").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("nonMatchOne").instanceId, s.inst("nonMatchTwo").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === manualId)).toBe(true);
  });

  it("still places itself in the battle area when the deck is empty", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-099", as: "manual" }],
        deck: [],
        battleArea: [{ card: "EX9-022", as: "dmInPlay" }],
      },
    });
    await s.ready();
    s.state.memory = 4;
    const manualId = s.inst("manual").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: manualId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === manualId));

    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("pays Delay by trashing itself and legally digivolves the affected Digimon for free", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX9-073", as: "target" },
            { card: "AD1-001", as: "faceDownMaterial" },
          ],
          battleArea: [
            { card: "BT26-099", as: "manual" },
            { card: "EX9-053", as: "subject" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const manualId = s.perm("manual").topCard!.instanceId;

    await primitives(s).placeUnder(s.perm("subject").permanentId, [s.inst("faceDownMaterial").instanceId], {
      faceUp: false,
    });
    await settle(() => s.perm("subject").topCard?.instanceId === s.inst("target").instanceId);

    expect(s.decisions.map(({ req }) => req.kind)).toContain("optional");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(manualId);
    expect(s.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("target").instanceId);
    expect(s.perm("subject").topCard!.cardId).toBe("EX9-073");
    expect(s.perm("subject").stack.some((card) => card.instanceId === s.inst("faceDownMaterial").instanceId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(0);
  });

  it("cannot activate Delay on the turn Training Manual enters play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX9-073", as: "target" },
            { card: "AD1-001", as: "faceDownMaterial" },
          ],
          battleArea: [
            { card: "BT26-099", as: "manual", enteredThisTurn: true },
            { card: "EX9-053", as: "subject" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await primitives(s).placeUnder(s.perm("subject").permanentId, [s.inst("faceDownMaterial").instanceId], {
      faceUp: false,
    });
    await settle();

    expect(s.perm("subject").topCard!.cardId).toBe("EX9-053");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("target").instanceId);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("manual").permanentId),
    ).toBe(true);
  });

  it("activates the complete Main effect from Security", async () => {
    const s = setupEngine(
      {
        0: {
          deck: [{ card: "EX9-035", as: "dmMatch" }, "AD1-001", "AD1-002"],
          security: [{ card: "BT26-099", as: "manualSecurity" }],
        },
        1: { battleArea: [{ card: "AD1-003", as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const manualId = s.inst("manualSecurity").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === manualId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("dmMatch").instanceId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === manualId)).toBe(true);
  });
});
