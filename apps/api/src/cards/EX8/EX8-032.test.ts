import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-032.js";

describe("EX8-032", () => {
  it("inherits a once-per-turn -2000 DP effect against an opposing Digimon when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          target: { count: 1, filter: { controller: "opponent" } },
        },
      ],
    }));

  it("applies the inherited effect to the exact opposing target and only once per turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-057", dp: 5000, as: "attacker", under: ["EX8-032"] }] },
        1: {
          battleArea: [
            { card: "AD1-001", as: "target" },
            { card: "AD1-001", as: "other" },
          ],
          security: 2,
          deck: ["BT1-045"],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    const attacker = s.perm("attacker");
    const target = s.perm("target");
    const other = s.perm("other");
    preferInstanceIds.push(target.permanentId);
    const targetInstanceId = target.topCard!.instanceId;
    const before = target.currentDP;
    const otherBefore = other.currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => target.currentDP === before - 2000);

    expect(target.topCard!.instanceId).toBe(targetInstanceId);
    expect(target.currentDP).toBe(before - 2000);
    expect(other.currentDP).toBe(otherBefore);

    await settle(() => !observe(s.engine).isAttacking());
    await advance(s.engine).verb.unsuspend([attacker.permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(target.currentDP).toBe(before - 2000);

    s.state.memory = 0;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(target.currentDP).toBe(before);
  });
});
