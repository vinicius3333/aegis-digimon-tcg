import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-066.js";

describe("BT6-066 PileVolcamon", () => {
  it("has Reboot but remains suspended after attacking on its own turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-066", as: "gigadramon" }] }, 1: { security: ["BT1-010", "BT1-011"] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("gigadramon"), "Reboot")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("gigadramon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { isAttacking: boolean } }).combat;
    await settle(() => s.state.phase === Phase.Main && !combat.isAttacking, 5000);

    expect(s.perm("gigadramon").isSuspended).toBe(true);
  });

  it("de-digivolves only once per turn when another own Digimon is deleted on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-066", as: "pilevolcamon" },
          { card: "BT1-010", as: "first" },
          { card: "BT1-011", as: "second" },
        ],
      },
      1: { battleArea: [{ card: "BT6-067", as: "target", under: ["BT6-064", "BT6-056"] }] },
    }, { autoSelectCards: true });
    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId], "byEffect");
    await settle(() => s.perm("target").stack.length === 1);
    await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId], "byEffect");

    expect(s.perm("target").stack).toHaveLength(1);
  });
});
