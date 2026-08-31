import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-092.js";

describe("BT3-092 MaloMyotismon", () => {
  it("records one memory gain per matching deletion trigger", () => {
    const compiled = runtimeCompiledCard("BT3-092");
    const allTurns = compiled?.effects.find((effect) => effect.trigger === "AllTurns");
    const watcher = allTurns?.actions.find((action) => action.kind === "SubTrigger");
    const gain = watcher?.actions?.find((action) => action.kind === "GainMemory");

    expect(gain).toMatchObject({
      kind: "GainMemory",
      amount: 1,
    });
    expect(gain).not.toHaveProperty("scaling");
    expect(watcher).toMatchObject({ sourceFilter: { excludeSelf: true, kind: ["Digimon"] } });
  });

  it("has Piercing and gains 1 memory for each other Digimon deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-092", as: "maloMyotismon" },
          { card: "BT1-010", as: "mine" },
        ],
      },
      1: { battleArea: [{ card: "BT1-011", as: "theirs" }] },
    });
    s.state.memory = 0;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasPierce(s.perm("maloMyotismon"))).toBe(true);

    await advance(s.engine).verb.deletePermanent([s.perm("mine").permanentId, s.perm("theirs").permanentId]);

    expect(s.state.memory).toBe(2);
  });
});
