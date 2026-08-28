import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST8-04.js";
import "./ST8-08.js";
import "./ST8-10.js";

describe("ST8 UlforceVeedramon hand-threshold deck gauntlet", () => {
  it("crosses from seven to eight cards mid-attack, gains a check, and unsuspends once", async () => {
    const s = setupEngine({
      0: {
        hand: Array(7).fill("ST8-02"),
        deck: [{ card: "ST8-03", as: "eighthCard" }],
        battleArea: [
          {
            card: "ST8-10",
            as: "ulforce",
            under: ["ST8-04", "ST8-08"],
          },
        ],
      },
      1: {
        security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
      },
    });
    await s.ready();
    const ulforce = s.perm("ulforce");

    expect(s.state.players[0]!.hand).toHaveLength(7);
    expect(observe(s.engine).keywordAmount(ulforce, "SecurityAttack")).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: ulforce.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    // KB Q702/Q704: Veemon's [When Attacking] draw reaches eight before the other
    // effects resolve, so AeroVeedramon applies to this attack and Ulforce unsuspends.
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.hand.length === 8 &&
        s.state.players[1]!.security.length === 3 &&
        !ulforce.isSuspended,
      3000,
    );

    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("eighthCard").instanceId }),
    );
    expect(observe(s.engine).keywordAmount(ulforce, "SecurityAttack")).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: ulforce.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1, 3000);

    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(ulforce.isSuspended).toBe(true);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(4);
  });
});
