import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-026.js";
import "./P-045.js";
import "./P-076.js";

describe("Black/red promo control deck", () => {
  it("combines Digi-Burst, multicolor deletion, and inherited Decoy", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-026", as: "blackWarGreymon", suspended: true, under: ["P-009", "P-010"] },
            { card: "BT8-067", as: "multicolor", under: ["P-076"] },
            { card: "P-016", as: "protected", under: ["P-045"] },
            { card: "P-016", as: "decoy" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 3000 },
            { card: "BT1-014", dp: 3000 },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("blackWarGreymon").topCard.instanceId,
        effectKey: "P-026/digi-burst-2-unsuspend",
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("blackWarGreymon").isSuspended);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("multicolor").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    const protectedId = s.perm("protected").permanentId;
    const decoyId = s.perm("decoy").permanentId;
    await advance(s.engine).verb.deletePermanent([s.perm("protected").permanentId], "byEffect");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === protectedId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === decoyId)).toBe(false);
  });
});
