import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST2-06.js";
import "./ST2-08.js";
import "./ST2-11.js";

describe("ST2 source-strip MetalGarurumon deck gauntlet", () => {
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
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attackerId,
      target: { kind: "player" },
    })).toEqual({ ok: true });

    // KB Q612: ST2-06 strips the last source during [When Attacking], immediately turning
    // ST2-08 on for this same attack. ST2-11 has already unsuspended before the checks (Q618).
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.security.length === 3 &&
        !attacker.isSuspended,
      3000,
    );

    expect(s.perm("sourcedOpponent").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("bottomSource").instanceId }),
    );
    expect(observe(s.engine).keywordAmount(attacker, "SecurityAttack")).toBe(1);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attackerId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(
      () => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1,
      3000,
    );

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
    expect(
      observe(breedingOnly.engine).keywordAmount(
        breedingOnly.perm("host"),
        "SecurityAttack",
      ),
    ).toBe(0);

    breedingOnly.putOnBoard(1, { card: "ST1-03", as: "battleDigimon" });
    await breedingOnly.ready();
    expect(
      observe(breedingOnly.engine).keywordAmount(
        breedingOnly.perm("host"),
        "SecurityAttack",
      ),
    ).toBe(1);
  });
});
