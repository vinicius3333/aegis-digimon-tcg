import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-030.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-030", () => {
  it("reduces its play cost by 2 by trashing a Cyborg or Ver.3 card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({ actions: [{ kind: "Replacement", actions: [{ kind: "Replacement", event: "wouldBePlayed", mode: "reduceCost", amount: 2, cost: { kind: "trash" } }] }] });
  });
  it("on play or digivolution gives an opposing Digimon -3000 DP and loses 2000 DP per digivolution card", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "ModifyDP", amount: -3000, cost: { kind: "place", faceDown: true, destination: "digivolutionStack" } }, { kind: "ModifyDP", amount: -2000, scaling: { unit: "digivolutionCards", per: 1 } }] });
    }
  });
  it("inherits Blocker", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" }));

  it("places a trash Digimon face down and applies the printed DP changes on play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-030", as: "source", dp: 7000 }], trash: ["BT1-009"] },
      1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("target").currentDP !== 5000);
    const source = s.state.players[0].battleArea[0]!;
    expect(source.stack).toHaveLength(1);
    expect(source.stack[0]!.faceUp).toBe(false);
    expect(s.perm("target").currentDP).toBe(2000);
    await s.ready();
    expect(source.currentDP).toBe(5000);
  });
});
