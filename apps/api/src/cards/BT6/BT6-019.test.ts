import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-019.js";

describe("BT6-019 Gabumon", () => {
  it("lets each Gabumon copy gain memory once when the same Matt Ishida is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT6-019", as: "firstGabumon" },
            { card: "BT6-019", as: "secondGabumon" },
          ],
          hand: [{ card: "BT1-086", as: "matt" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("matt").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 9);
  });

  it("gains memory only once per turn when matching Matt Ishida Tamers are played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-019", as: "gabumon" }],
          hand: [
            { card: "BT1-086", as: "firstMatt" },
            { card: "BT1-086", as: "secondMatt" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstMatt").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 7);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondMatt").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    expect(s.state.memory).toBe(3);
  });

  it("unsuspends Gabumon - Bond of Friendship after attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT6-030", under: ["BT6-019", "BT6-023", "BT6-026", "BT6-028"], as: "bond" },
            "BT1-085",
          ],
        },
        1: { security: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bond").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { isAttacking: boolean } }).combat;
    await settle(() => s.state.phase === Phase.Main && !combat.isAttacking && !s.perm("bond").isSuspended, 5000);

    expect(s.perm("bond").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bond").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });
});
