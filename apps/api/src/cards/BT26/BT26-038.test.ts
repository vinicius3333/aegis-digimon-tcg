import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { compiled } from "./BT26-038.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
describe("BT26-038 Kuwagamon", () => {
  it("compiles the three suspend-and-buff windows", () => {
    expect(digivolutionRequirementsFor("BT26-038")).toContainEqual({
      level: 3,
      traits: ["TS"],
      cost: 2,
      isAlternate: true,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.slice(0, 3).map((e) => e.trigger)).toEqual(["OnPlay", "WhenDigivolving", "WhenMoving"]);
    expect(compiled.effects[0]?.actions).toMatchObject([
      { kind: "Suspend", optional: true },
      { kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" },
    ]);
  });
  it("gives an eligible Insectoid its temporary DP increase on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT26-038", as: "kuwagamon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseDP = s.perm("kuwagamon").currentDP;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("kuwagamon"));

    expect(s.perm("kuwagamon").currentDP).toBe(baseDP + 3000);
  });
});
