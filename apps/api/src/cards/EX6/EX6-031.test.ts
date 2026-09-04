import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
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
    const s = setupEngine({
      0: { battleArea: [{ card: "EX6-031", as: "shaka" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("shaka"));
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
  });

  it("publicly plays exact named cards from its stack after deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-031", as: "shaka", under: ["EX6-025", "EX6-023"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("shaka").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(
      expect.arrayContaining(["EX6-025", "EX6-023"]),
    );
  });

  it("publicly places a Security Attack Digimon into security at the end of the opponent's turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-031", as: "shaka" },
            { card: "BT1-114", as: "attacker" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    await s.ready();
    preferred.push(s.inst("attacker").instanceId);
    await advance(s.engine).fire(EffectTiming.EndOfOpponentsTurn, s.perm("shaka"));
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("attacker").instanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("attacker").instanceId),
    ).toBe(false);
  });
});
