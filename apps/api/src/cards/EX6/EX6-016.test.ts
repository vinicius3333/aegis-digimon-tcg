import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-016.js";

describe("EX6-016 Salamon", () => {
  it("gains memory at the start of the main phase if you have a purple Digimon or Tamer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "youHave", filter: { colors: ["Purple"], kind: ["Digimon", "Tamer"] } },
    });
  });
  it("inherits once-per-turn -2000 DP when attacking", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }],
    });
  });

  it("gains memory at main phase start only with a purple card present", async () => {
    const withPurple = setupEngine({ 0: { battleArea: [{ card: "EX6-016", as: "salamon" }, { card: "EX6-045" }] } });
    await withPurple.ready();
    withPurple.state.memory = 0;
    await advance(withPurple.engine).fire(EffectTiming.StartOfYourMainPhase, withPurple.perm("salamon"));
    expect(withPurple.state.memory).toBe(1);

    const withoutPurple = setupEngine({ 0: { battleArea: [{ card: "EX6-016", as: "salamon" }] } });
    await withoutPurple.ready();
    withoutPurple.state.memory = 0;
    await advance(withoutPurple.engine).fire(EffectTiming.StartOfYourMainPhase, withoutPurple.perm("salamon"));
    expect(withoutPurple.state.memory).toBe(0);
  });
});
