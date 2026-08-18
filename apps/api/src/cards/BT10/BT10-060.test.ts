import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-087.js";
import "./BT10-060.js";

describe("BT10-060 Sparrowmon", () => {
  it("does not immediately unsuspend a Shoutmon after it attacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-008", under: ["BT10-060"], as: "attacker", dp: 20000 }],
      },
      1: { security: ["BT1-010"] },
    });
    s.state.memory = 1;
    const combat = (s.engine as unknown as { combat: { isAttacking: boolean } }).combat;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !combat.isAttacking);

    expect(s.perm("attacker").isSuspended).toBe(true);
  });

  it("gets +3000 DP only while another Xros Heart or Twilight permanent exists", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-060", as: "sparrowmon" },
          { card: "BT10-087", as: "taiki" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("sparrowmon").currentDP).toBe(5000);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("taiki").permanentId], "byEffect")).toBe(1);
    await settle(() => s.perm("sparrowmon").currentDP === 2000);

    expect(s.perm("sparrowmon").currentDP).toBe(2000);
    assertNoLoudGap(s);
  });

  it("Saves itself under a chosen Tamer when deleted", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-060", as: "sparrowmon" },
            { card: "BT10-087", as: "taiki" },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    const sparrowmonId = s.perm("sparrowmon").topCard.instanceId;
    preferred.push(s.perm("taiki").permanentId);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("sparrowmon").permanentId], "byEffect")).toBe(1);
    await settle(() => s.perm("taiki").stack.some(({ instanceId }) => instanceId === sparrowmonId));

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === sparrowmonId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("grants inherited Reboot only to Shoutmon or Mervamon on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-008", as: "shoutmon", under: ["BT10-060"] },
          { card: "BT1-015", as: "other", under: ["BT10-060"] },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("shoutmon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Reboot")).toBe(false);
    assertNoLoudGap(s);
  });
});
