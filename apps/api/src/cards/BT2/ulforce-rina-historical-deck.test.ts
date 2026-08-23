import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-028.js";
import "./BT2-032.js";
import "./BT2-086.js";

describe("BT2 UlforceVeedramon/Rina historical deck gauntlet", () => {
  it("turns Rina's attack boost into an Ulforce restand, memory, inherited Jamming, and a second attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-032", as: "ulforce", under: ["BT2-028"] },
            { card: "BT2-086", as: "rina" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002", "BT1-003"] },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.memory = 2;
    const ulforce = s.perm("ulforce");
    const baseDp = ulforce.currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: ulforce.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        !ulforce.isSuspended &&
        s.perm("rina").isSuspended &&
        s.state.memory === 3 &&
        s.state.phase === Phase.Main &&
        s.state.players[1]!.security.length === 2 &&
        observe(s.engine).hasKeyword(ulforce, "Jamming"),
      5000,
    );

    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(ulforce.currentDP).toBe(baseDp + 1000);
    expect(s.state.players[1]!.security).toHaveLength(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: ulforce.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && ulforce.isSuspended);

    expect(s.state.memory).toBe(3);
    expect(ulforce.currentDP).toBe(baseDp + 1000);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
