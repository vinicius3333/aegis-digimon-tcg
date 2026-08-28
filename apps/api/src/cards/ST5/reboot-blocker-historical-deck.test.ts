import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT2/BT2-065.js";
import "../BT5/BT5-068.js";
import "./ST5-03.js";
import "./ST5-14.js";

describe("ST5 Reboot/Blocker historical deck gauntlet", () => {
  it("applies the inherited Reboot DP only on its turn, then suspends to block and lets Tai restand another Digimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-065", as: "rebootBlocker", under: ["BT5-068"] },
            { card: "ST5-14", as: "tai" },
            { card: "ST5-03", as: "restTarget", suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("restTarget").permanentId, s.perm("restTarget").topCard!.instanceId);
    await s.ready();
    const blocker = s.perm("rebootBlocker");
    const printedDp = getCardDefinition("BT2-065")!.dp;

    expect(observe(s.engine).hasKeyword(blocker, "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(blocker, "Blocker")).toBe(true);
    expect(blocker.currentDP).toBe(printedDp + 2000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(blocker.currentDP).toBe(printedDp);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: blocker.permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        blocker.isSuspended &&
        s.perm("tai").isSuspended &&
        !s.perm("restTarget").isSuspended,
    );

    expect(s.state.players[0]!.battleArea).toContain(blocker);
    expect(blocker.isSuspended).toBe(true);
  });
});
