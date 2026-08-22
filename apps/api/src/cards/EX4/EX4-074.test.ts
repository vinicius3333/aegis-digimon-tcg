import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-074.js";

describe("EX4-074 ShineGreymon: Ruin Mode", () => {
  it("gives opposing Digimon -5000 DP from When Digivolving and On Deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "GrantStatic", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" }, tokens: ["get -5000DP"] });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({ kind: "GrantStatic", duration: "untilOpponentNextTurnEnd" });
  });
  it("at end of attack deletes itself and an opposing Digimon, adds security, and hatches with a Tamer", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")?.actions;
    expect(actions).toMatchObject([{ kind: "Delete", target: { isSelf: true } }, { kind: "Delete", target: { filter: { controller: "opponent" }, upTo: true } }, { kind: "SecurityManipulation", op: "placeFromDeck" }, { kind: "Hatch", condition: { kind: "youHave" } }]);
  });

  it("resolves the End of Attack deletion, security, and hatch sequence", async () => {
    const s = setupEngine({
      0: { deck: ["BT1-001"], security: ["BT1-001"], battleArea: [{ card: "EX4-074", as: "source" }, { card: "BT1-085", as: "tamer" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    }, { autoSelectCards: true });
    await s.engine.recomputeContinuousEffects();

    const sourceInstanceId = s.perm("source").topCard.instanceId;
    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("source"));
    await settle(() => s.state.players[0]!.battleArea.every((perm) => perm.topCard?.cardId !== "EX4-074"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === sourceInstanceId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.breedingArea).toHaveLength(1);
  });
});
