import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-067.js";
import "./BT8-070.js";

describe("BT8 BlackWarGreymon historical deck gauntlet", () => {
  it("evolves over its dual-color line, deletes a Digimon and Tamer, then attacks an unsuspended survivor", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-065",
              as: "metalGreymonX",
              under: ["BT8-067", "BT1-021"],
              suspended: true,
            },
          ],
          hand: [{ card: "BT8-070", as: "blackWarGreymon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "deletionDigimon" },
            { card: "BT8-093", as: "deletionTamer" },
            { card: "BT1-016", as: "unsuspendedSurvivor", dp: 3000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("metalGreymonX").permanentId,
        instanceId: s.inst("blackWarGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && !s.perm("metalGreymonX").isSuspended);

    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT1-009")).toBe(true);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT8-093")).toBe(true);
    expect(s.perm("metalGreymonX").topCard?.cardId).toBe("BT8-070");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metalGreymonX").permanentId,
        target: {
          kind: "permanent",
          permanentId: s.perm("unsuspendedSurvivor").permanentId,
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT1-016")).toBe(true);
  });

  it("attacks an unsuspended Digimon, restands after battle deletion, then attacks again", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT8-070",
              as: "blackWarGreymon",
              under: ["BT8-067", "BT1-021"],
            },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-016", as: "unsuspendedTarget", dp: 3000 }],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    await s.ready();

    const attacker = s.perm("blackWarGreymon");
    const targetId = s.perm("unsuspendedTarget").permanentId;
    expect(s.perm("unsuspendedTarget").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId) &&
        !attacker.isSuspended &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT1-016")).toBe(true);
    expect(attacker.isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());

    expect(attacker.isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
