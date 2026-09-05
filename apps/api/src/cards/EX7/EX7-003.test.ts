import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-003.js";
import { Zone } from "@aegis/shared";
import { setupEngine, settle, assertNoLoudGap } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

describe("EX7-003 Kyaromon", () => {
  it("inherits -2000 DP to the opposing security Digimon battle value on your turn", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifySecurityDP", amount: -2000, controller: "opponent", duration: "permanent" }],
    }));

  it("applies -2000 only to the opposing security Digimon, not an opposing battle-area Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-004", under: ["EX7-003"], as: "host" }] },
      1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "battleTarget" }] },
    });
    const opponent = s.state.players[1];
    const battleTarget = s.perm("battleTarget");
    s.give(1, Zone.Security, { card: "BT1-009", as: "securityTarget" });
    await s.ready();

    // The inherited source is on the host stack. Its opposing security target is effectively
    // 1000 DP (3000 - 2000), while the unrelated battle-area target remains exactly 3000 DP.
    expect(battleTarget.currentDP).toBe(3000);
    const attacker = s.putOnBoard(0, { card: "AD1-001", dp: 4000 });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false);
    assertNoLoudGap(s);

    // A 4000 attacker survives the exact opposing 3000-DP security Digimon only because
    // EX7-003 reduced that security battle value by 2000; the battle-area target was untouched.
    expect(opponent!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(true);
    expect(battleTarget.currentDP).toBe(3000);
  });

  it("does not reduce security Digimon during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-004", under: ["EX7-003"], as: "host" }] },
      1: { security: ["BT1-009"] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).securityDp(1)).toBe(0);
  });
});
