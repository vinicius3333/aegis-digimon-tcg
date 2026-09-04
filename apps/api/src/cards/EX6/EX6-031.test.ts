import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-031.js";

describe("EX6-031 Shakamon", () => {
  it("reduces Security Attack for all Digimon on play/digivolving and inverts your negative Security Attack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      target: { count: "all" },
      keyword: { keyword: "SecurityAttack", amount: -1 },
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SecurityAttackInvert",
      target: { count: "all" },
      duration: "forTheTurn",
    });
  });
  it("plays named materials from its stack after deletion/return and places a Security Attack Digimon into security once per turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions).toMatchObject([
      { kind: "SubTrigger", event: "onDeletionOf" },
      { kind: "SubTrigger", event: "wouldBeReturned" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfOpponentsTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "SecurityManipulation", op: "placeAsSecurity", toTop: true }],
    });
  });

  it("publicly gives all Digimon Security Attack -1 on play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX6-031", as: "shaka" }] }, 1: { battleArea: [{ card: "BT1-009", as: "opponent" }] } });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("shaka"));
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
  });
});
