import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-058.js";

describe("EX4-058 Ravemon", () => {
  it("can delete itself at end of the opponent's turn to play Ravemon from trash", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "endOfOpponentTurn", actions: [{ kind: "PlayWithoutCost", payCost: false, target: { location: "trash", controller: "mine" } }], cost: { kind: "deleteOwn", target: { filter: { isSelfRef: true, digivolutionStackNameOrTrait: [{ match: "trait", tokens: ["Bird"] }, { match: "trait", tokens: ["Avian"] }] } } } });
  });
  it("trashes an opponent hand card at eight or more cards, otherwise adds security to hand", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions;
    expect(actions?.[0]).toMatchObject({ kind: "Trash", target: { chooser: "opponent" }, condition: { kind: "zoneCount", op: "gte", value: 8 } });
    expect(actions?.[1]).toMatchObject({ kind: "SecurityManipulation", op: "toHand", condition: { kind: "zoneCount", op: "lte", value: 7 } });
  });

  it("trashes one opposing hand card when the opponent has eight cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX4-058", as: "source" }] },
      1: { hand: Array(8).fill("BT1-001"), security: ["BT1-002"] },
    }, { autoSelectCards: true });
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).fire(EffectTiming.OnDeletion, s.perm("source"));
    await settle(() => s.state.players[1]!.hand.length === 7);

    expect(s.state.players[1]!.hand).toHaveLength(7);
    expect(s.state.players[1]!.trash).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
