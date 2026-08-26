import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-049.js";

describe("BT11-049 Vegiemon", () => {
  it("maps its green champion catalog facts and mandatory start-turn memory", () => {
    expect(getCardDefinition("BT11-049")).toMatchObject({ cardId: "BT11-049", colors: ["Green"], level: 4, playCost: 4, dp: 3000, types: ["Carnivorous Plant"] });
    expect(compiled.effects).toEqual([{ trigger: "StartOfYourTurn", actions: [{ kind: "GainMemory", amount: 1 }] }]);
  });

  it("gains 1 memory at the start of its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-049", as: "vegiemon" }] } });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("vegiemon"));

    expect(s.state.memory).toBe(1);
  });
});
