import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST2-01.js";
import "./ST2-03.js";
import "./ST2-06.js";
import "./ST2-08.js";
import "./ST2-11.js";

describe("ST2 source-strip MetalGarurumon deck gauntlet", () => {
  it("evolves the blue line and strips a level-6 opponent across two attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST2-03", as: "host", under: ["ST2-01"] }],
          hand: [
            { card: "ST2-06", as: "garurumon" },
            { card: "ST2-08", as: "weregarurumon" },
            { card: "ST2-11", as: "metalgarurumon" },
          ],
          deck: ["ST2-02", "ST2-04", "ST2-05", "ST2-10"],
        },
        1: {
          battleArea: [{ card: "ST1-10", as: "opponent", under: ["ST1-01", "ST1-03"] }],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const host = s.perm("host");
    for (const [alias, memory] of [
      ["garurumon", 8],
      ["weregarurumon", 5],
      ["metalgarurumon", 1],
    ] as const) {
      const next = s.inst(alias);
      expect(
        s.engine.applyIntent(0, { type: "digivolve", permanentId: host.permanentId, instanceId: next.instanceId }),
      ).toEqual({ ok: true });
      await settle(() => host.topCard.instanceId === next.instanceId);
      expect(s.state.memory).toBe(memory);
    }
    expect(host.stack.map(({ cardId }) => cardId)).toEqual(["ST2-01", "ST2-03", "ST2-06", "ST2-08"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["ST2-02", "ST2-04", "ST2-05"]);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 4);
    expect(host.isSuspended).toBe(false);
    // Gabumon's level-5 ceiling excludes this opponent; only Garurumon strips a source.
    expect(s.perm("opponent").stack.map(({ cardId }) => cardId)).toEqual(["ST1-03"]);
    expect(observe(s.engine).keywordAmount(host, "SecurityAttack")).toBe(0);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 2);
    expect(s.perm("opponent").stack).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(host.isSuspended).toBe(true);
  });

  it("turns on WereGarurumon mid-attack, checks twice, unsuspends once, and attacks again", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "ST2-11",
              as: "metalGarurumon",
              under: ["ST2-08", "ST2-06"],
            },
          ],
        },
        1: {
          battleArea: [
            {
              card: "ST1-10",
              as: "sourcedOpponent",
              under: [{ card: "ST1-03", as: "bottomSource" }],
            },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const attacker = s.perm("metalGarurumon");
    const attackerId = attacker.permanentId;

    expect(observe(s.engine).keywordAmount(attacker, "SecurityAttack")).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    // KB Q612: ST2-06 strips the last source during [When Attacking], immediately turning
    // ST2-08 on for this same attack. ST2-11 has already unsuspended before the checks (Q618).
    await settle(
      () => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 3 && !attacker.isSuspended,
      3000,
    );

    expect(s.perm("sourcedOpponent").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("bottomSource").instanceId }),
    );
    expect(observe(s.engine).keywordAmount(attacker, "SecurityAttack")).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1, 3000);

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(attacker.isSuspended).toBe(true);
  });

  it("ignores a source-less Digimon in breeding and requires one in the battle area", async () => {
    const breedingOnly = setupEngine({
      0: {
        battleArea: [{ card: "ST2-11", as: "host", under: ["ST2-08"] }],
      },
      1: { breeding: { card: "ST1-03", as: "breedingDigimon" } },
    });
    await breedingOnly.ready();

    // KB Q613/Q614: breeding does not count, and an empty opposing battle area does not
    // satisfy the condition merely because every Digimon there vacuously has no sources.
    expect(observe(breedingOnly.engine).keywordAmount(breedingOnly.perm("host"), "SecurityAttack")).toBe(0);

    breedingOnly.putOnBoard(1, { card: "ST1-03", as: "battleDigimon" });
    await breedingOnly.ready();
    expect(observe(breedingOnly.engine).keywordAmount(breedingOnly.perm("host"), "SecurityAttack")).toBe(1);
  });
});
