import { getCompiledCard, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-043.js";
import "./BT2-046.js";

describe("BT2-046 MetalTyrannomon", () => {
  it("publishes full IR for the inherited battle-delete unsuspend effect", () => {
    expect(getCompiledCard("BT2-046")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "YourTurn",
          isInherited: true,
          actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle" }],
        },
      ],
    });
  });

  it("unsuspends its host after deleting an opposing level 6 Digimon in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-050", as: "attacker", dp: 20000, under: ["BT2-046"] }] },
      1: { battleArea: [{ card: "BT2-031", as: "defender", suspended: true, dp: 1000 }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !s.perm("attacker").isSuspended);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("attacker").isSuspended).toBe(false);
  });

  it("does not unsuspend its host when a different Digimon deletes a level 6 Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-050", as: "host", suspended: true, under: ["BT2-046"] },
          { card: "BT3-019", as: "otherWinner", dp: 20_000 },
        ],
      },
      1: { battleArea: [{ card: "BT2-031", as: "level6", suspended: true, dp: 1_000 }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("otherWinner").permanentId,
        target: { kind: "permanent", permanentId: s.perm("level6").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("does not unsuspend after its host deletes a level 5 Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-050", as: "host", dp: 20_000, under: ["BT2-046"] }] },
      1: { battleArea: [{ card: "BT2-047", as: "level5", suspended: true, dp: 1_000 }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("level5").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("does not unsuspend after defeating a level 6 Security Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-050", as: "host", dp: 20000, under: ["BT2-046"] }] },
      1: { security: ["BT2-031"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("does not apply the inherited effect while MetalTyrannomon is the top card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-046", as: "attacker", dp: 20000 }] },
      1: { battleArea: [{ card: "BT2-031", as: "defender", suspended: true, dp: 1000 }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("attacker").isSuspended).toBe(true);
  });

  it("proves the legal green hatch-to-MetalTyrannomon stack, turn cycle, move, and battle-delete unsuspend", async () => {
    const deck = ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015"];
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT2-004", as: "greenEgg" }],
        hand: [
          { card: "BT2-043", as: "level3" },
          { card: "BT2-044", as: "level4" },
          { card: "BT2-046", as: "metaltyrannomon" },
          { card: "BT2-050", as: "host" },
        ],
        security: ["BT1-010"],
        deck,
      },
      1: {
        battleArea: [
          { card: "BT1-043", as: "level6", suspended: true },
          { card: "BT1-044", as: "stackedLevel6", suspended: true, under: ["BT1-030"] },
        ],
        deck,
      },
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    s.state.memory = 10;
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;

    for (const alias of ["level3", "level4", "metaltyrannomon", "host"] as const) {
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
    expect(s.state.players[0]!.breeding!.stack.map(({ cardId }) => cardId)).toEqual([
      "BT2-004",
      "BT2-043",
      "BT2-044",
      "BT2-046",
    ]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("level6").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("level6").isSuspended && s.state.pendingDecision === undefined);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.phase === Phase.Main && s.state.turnSeat === 0);
    expect(s.perm("host").currentDP).toBe(12_000);
    const level6PermanentId = s.perm("level6").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: breedingPermanentId,
        target: { kind: "permanent", permanentId: level6PermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every(({ permanentId }) => permanentId !== level6PermanentId));
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("stackedLevel6").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
