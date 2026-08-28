import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-047.js";

describe("BT11-047 Palmon", () => {
  it("maps the green rookie catalog facts and mandatory start-turn draw", () => {
    expect(getCardDefinition("BT11-047")).toMatchObject({ cardId: "BT11-047", colors: ["Green"], level: 3, playCost: 3, dp: 2000, types: ["Vegetation"] });
    expect(compiled.effects).toEqual([{ trigger: "StartOfYourTurn", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] }]);
  });

  it("draws at the start of its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-047", as: "palmon" }], deck: [{ card: "BT1-009", as: "drawn" }] },
    });

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("palmon"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
  });
});
