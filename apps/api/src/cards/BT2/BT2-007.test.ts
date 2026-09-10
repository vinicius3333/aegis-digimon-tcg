import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-007.js";

describe("BT2-007 Pagumon", () => {
  it("trashes exactly the top card of its owner's deck when attacking", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-067", as: "attacker", under: ["BT2-007"] }],
        deck: [
          { card: "BT1-010", as: "top" },
          { card: "BT1-011", as: "remaining" },
        ],
      },
      1: { security: ["BT1-012"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("top").instanceId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("remaining").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("resolves harmlessly when its owner's deck is empty", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-067", as: "attacker", under: ["BT2-007"] }] },
      1: { security: ["BT1-012"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // A player-directed attack resolves through the security check, not a
    // Digimon-vs-Digimon battle, so `combatResolved` never fires here.
    await settle(() => s.events.some(({ kind }) => kind === "securityChecked"));
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("survives a legal public hatch, digivolve, and move from breeding", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT2-007", as: "egg" }],
        hand: [{ card: "BT2-067", as: "host" }],
        deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"],
        battleArea: [],
      },
      1: { deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"], security: ["BT1-012"] },
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    const breedingId = s.state.players[0]!.breeding!.permanentId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: breedingId, instanceId: s.inst("host").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT2-067");
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.cardId)).toEqual(["BT2-007"]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingId })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT2-007"]);
    const deckBeforeAttack = s.state.players[0]!.deck.length;
    const trashBeforeAttack = s.state.players[0]!.trash.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "securityChecked"));
    expect(s.state.players[0]!.deck).toHaveLength(deckBeforeAttack - 1);
    expect(s.state.players[0]!.trash).toHaveLength(trashBeforeAttack + 1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
