import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-099.js";

describe("BT10-099 Healing Therapy", () => {
  it("gives Security Attack -1 to exactly 1 opposing Digimon without Venusmon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: ["BT10-029"], hand: [{ card: "BT10-099", as: "option" }] },
        1: { battleArea: [{ card: "BT10-043", as: "chosen" }, { card: "BT10-044", as: "other" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").permanentId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("chosen"), "SecurityAttack") === -1);

    expect(observe(s.engine).keywordAmount(s.perm("other"), "SecurityAttack")).toBe(0);
  });

  it("gives Security Attack -1 to exactly 3 opposing Digimon with Venusmon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: ["BT10-042"], hand: [{ card: "BT10-099", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT10-043", as: "target1" },
            { card: "BT10-044", as: "target2" },
            { card: "BT10-045", as: "target3" },
            { card: "BT10-046", as: "untouched" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target1").permanentId, s.perm("target2").permanentId, s.perm("target3").permanentId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => ["target1", "target2", "target3"].every((alias) =>
      observe(s.engine).keywordAmount(s.perm(alias), "SecurityAttack") === -1,
    ));

    expect(observe(s.engine).keywordAmount(s.perm("untouched"), "SecurityAttack")).toBe(0);
  });

  it("Security activates the same Venusmon three-target Main effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT10-042"], security: [{ card: "BT10-099", as: "option", faceUp: true }] },
        1: { battleArea: [{ card: "BT10-043", as: "target1" }, { card: "BT10-044", as: "target2" }, { card: "BT10-045", as: "target3" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(["target1", "target2", "target3"].every((alias) =>
      observe(s.engine).keywordAmount(s.perm(alias), "SecurityAttack") === -1,
    )).toBe(true);
  });
});
