import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-038.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-038", () => {
  it("has Training and suspends an opposing Digimon with an unsuspend restriction on play and attack", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Training",
      raw: "＜Training＞",
    });
    for (const trigger of ["OnPlay", "WhenAttacking"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend", cost: { kind: "place", target: { filter: { zone: "hand" } } } },
          { kind: "Restrict", restriction: "unsuspend", target: { sameTarget: true } },
        ],
      });
  });
  it("inherits Piercing", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Piercing",
      raw: "＜Piercing＞",
    }));

  it("places a hand card face-down and restricts the suspended target on attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-038", as: "source" }], hand: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    await settle(() => s.perm("opponent").isSuspended);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("source").stack.map((card) => card.faceUp)).toEqual([false]);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspend")).toBe(true);
  });

  it("still restricts the selected Digimon when it was already suspended (Q4792)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-038", as: "source" }], hand: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", suspended: true }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "unsuspend"));
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspend")).toBe(true);
  });
});
