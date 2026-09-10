import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-057.js";
import "./BT2-055.js";

describe("BT2-057 Greymon", () => {
  it("grants inherited Jamming during its turn while the host has Reboot", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-060", as: "host", under: ["BT2-055", "BT2-057"] }] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });

  it("survives battle against a stronger Security Digimon through Jamming", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-060", as: "host", under: ["BT2-055", "BT2-057"] }] },
      1: { security: ["BT2-083"] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("does not grant Jamming when the host lacks Reboot", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-060", as: "host", under: ["BT2-057"] }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);
  });

  it("does not grant Jamming during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-060", as: "host", under: ["BT2-055", "BT2-057"] }] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);
  });

  it("does not grant Jamming while Greymon is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-057", as: "greymon" }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("greymon"), "Jamming")).toBe(false);
  });

  it("proves the legal black hatch stack, turn cycle, move, and Security battle", async () => {
    const deck = ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"];
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT2-005", as: "egg" }],
        hand: [
          { card: "BT2-055", as: "toyAgumon" },
          { card: "BT2-057", as: "greymon" },
          { card: "BT2-060", as: "host" },
        ],
        deck,
      },
      1: { security: ["BT2-083"], deck },
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    s.state.memory = 10;
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;

    for (const alias of ["toyAgumon", "greymon", "host"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: breedingPermanentId,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.pendingDecision === undefined &&
          s.state.players[0]!.breeding!.topCard.instanceId === s.inst(alias).instanceId,
      );
    }
    expect(s.state.players[0]!.breeding!.stack.map(({ cardId }) => cardId)).toEqual(["BT2-005", "BT2-055", "BT2-057"]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: breedingPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.pendingDecision === undefined);
    expect(s.perm("host").topCard.cardId).toBe("BT2-060");
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
