import { describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { settle, setupEngine } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";

/**
 * ＜Barrier＞ granted by a digivolution card survives only as long as that card stays
 * in the stack.
 *
 * BT23-032 Shakkoumon over BT23-027 Angemon + BT1-051 Reppamon inherits Angemon's
 * ＜Barrier＞. Its own [All Turns] [Once Per Turn] leave replacement plays 1 level 4 or
 * lower source card, and the only legal pick on this stack is Angemon itself (Reppamon is
 * yellow level 4 too, so the selection is steered with `preferInstanceIds`).
 *
 * First exchange: Barrier is accepted, the top security card is trashed, Shakkoumon stays
 * on the battle area, and the leave replacement moves Angemon out of the stack.
 * Second exchange in the same turn: the Barrier source is gone, so no Barrier decision
 * opens and Shakkoumon is deleted with the rest of its stack. Both outcomes are correct —
 * this test pins them so the second exchange is not read back as a Barrier defect.
 */
describe("barrier granted by a digivolution card", () => {
  it("stops granting Barrier once the leave replacement plays that card out of the stack", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-032", as: "host", under: [{ card: "BT23-027", as: "angemon" }, "BT1-051"] }],
          security: ["BT1-046", "BT1-047"],
          deck: ["BT1-047", "BT1-049", "BT1-050"],
        },
        1: {
          battleArea: [
            { card: "BT1-014", as: "attacker", dp: 11_000 },
            { card: "BT1-014", as: "secondAttacker", dp: 11_000 },
          ],
          security: ["BT1-047", "BT1-049"],
          deck: ["BT1-047", "BT1-049", "BT1-050"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const angemonId = s.inst("angemon").instanceId;
    preferInstanceIds.push(angemonId);
    const combat = (s.engine as unknown as { combat: { hasOpenBarrierDecision: boolean } }).combat;
    const loop = s.engine.startTurnLoop();

    // Shakkoumon attacks on its own turn so it is suspended and legally attackable next turn.
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    // First exchange: Barrier is offered, accepted, and Shakkoumon survives.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => combat.hasOpenBarrierDecision);
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept: true })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();

    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-047"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-046"]);
    const survivor = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === hostId);
    expect(survivor?.topCard?.cardId).toBe("BT23-032");
    expect(survivor?.stack.map((card) => card.cardId)).toEqual(["BT1-051"]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === angemonId)).toBe(true);

    // Second exchange in the same turn: no Barrier source is left in the stack.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();

    expect(combat.hasOpenBarrierDecision).toBe(false);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-047"]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-046", "BT1-051", "BT23-032"]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === angemonId)).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
