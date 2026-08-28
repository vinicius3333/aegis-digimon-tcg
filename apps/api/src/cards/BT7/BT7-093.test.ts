import { describe, it, expect } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-093.js";
describe("BT7-093 Firedrake Strike", () => {
  it("uses substring trait matching for the printed Hybrid trait clause", () => {
    const main = runtimeCompiledCard("BT7-093")?.effects.find((effect) => effect.trigger === "Main");
    expect(main).toMatchObject({
      actions: [
        {
          kind: "SelectBind",
          target: { filter: { nameOrTrait: [{ tokens: ["Hybrid"], match: "traitContains" }] } },
        },
      ],
    });
    expect(runtimeCompiledCard("BT7-093")?.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { nameOrTrait: [{ tokens: ["Takuya Kanbara"], match: "nameExact" }] } },
        },
      ],
    });
  });

  it("deletes an opposing Digimon within the chosen DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT7-011"], hand: [{ card: "BT7-093", as: "option" }] },
        1: { battleArea: [{ card: "BT7-031", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
