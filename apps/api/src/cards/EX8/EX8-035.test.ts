import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./index.js";
import { compiled } from "./EX8-035.js";

describe("EX8-035", () => {
  it("has a security effect that gives two opposing Digimon Security Attack -1 and returns itself to hand", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions).toMatchObject([
      { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 }, target: { count: 2 } },
      { kind: "AddToHandSelf" },
    ]));
  it("disables opposing Digimon When Digivolving effects while you have at least 1 memory", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      condition: { kind: "memoryAtLeast", value: 1 },
      actions: [{ kind: "DisableTimingEffect", timings: ["whenDigivolving"], target: { count: "all" } }],
    }));

  it("disables an opposing Digimon's When Digivolving timing at one memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-035", as: "marine" }] },
      1: { battleArea: [{ card: "AD1-001", as: "opponent" }] },
    });
    s.state.memory = 1;
    await advance(s.engine).recompute();
    await settle(() => observe(s.engine).timingEffectDisabled(s.perm("opponent"), "whenDigivolving"));
    expect(observe(s.engine).timingEffectDisabled(s.perm("opponent"), "whenDigivolving")).toBe(true);
    s.state.memory = 0;
    await advance(s.engine).recompute();
    expect(observe(s.engine).timingEffectDisabled(s.perm("opponent"), "whenDigivolving")).toBe(false);
  });

  it("uses the source owner's memory side when the opponent is the turn player (Q3915)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-035", as: "marine" }] },
      1: { battleArea: [{ card: "AD1-001", as: "opponent" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = -1;
    await advance(s.engine).recompute();

    expect(observe(s.engine).timingEffectDisabled(s.perm("opponent"), "whenDigivolving")).toBe(true);
  });

  it("resolves its end-of-battle Security effect on two opponents and enters hand", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX8-035", as: "marine" }] },
      1: {
        battleArea: [
          { card: "AD1-001", as: "one" },
          { card: "EX8-040", as: "two" },
        ],
      },
    });
    const instanceId = s.inst("marine").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("marine"));

    expect(observe(s.engine).keywordAmount(s.perm("one"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("two"), "SecurityAttack")).toBe(-1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === instanceId)).toBe(true);
  });
});
