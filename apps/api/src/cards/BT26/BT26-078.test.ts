import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-078.js";
import "../index.js";

describe("BT26-078 compiled behavior", () => {
  it("proves the TS evolution and delete-to-play effects with the Q7105 text/trait union", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["TS"], cost: 5, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true, target: { filter: { playCostLte: 12, nameOrTrait: [
          { tokens: ["Chronomon"], match: "text" },
          { tokens: ["Titan"], match: "trait" },
        ] }, count: 1 }, cost: { kind: "deleteOwn", target: { isSelf: true } } }],
      });
    }
  });

  it("restricts the Trash watcher to your turn, opponent memory 5+, and a played matching Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Trash")!;
    expect(effect).toMatchObject({ isFromTrash: true, actions: [{ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [
      { tokens: ["Chronomon"], match: "text" },
      { tokens: ["Titan"], match: "trait" },
    ] }, fireCondition: { kind: "allOf", conditions: [{ kind: "isYourTurn" }, { kind: "memoryAtLeast", value: 5, controller: "opponent" }] } }] });
    expect(irNode(effect.actions[0]!).actions).toEqual([
      expect.objectContaining({ kind: "Return", to: "deckBottom", target: expect.objectContaining({ isSelf: true }), optional: true }),
      expect.objectContaining({ kind: "GainKeyword", target: expect.objectContaining({ sourceRef: "triggerSubject" }), keyword: { keyword: "Rush" }, duration: "untilEachTurnEnd" }),
      expect.objectContaining({ kind: "GainKeyword", target: expect.objectContaining({ sourceRef: "triggerSubject" }), keyword: { keyword: "Execute" }, duration: "untilEachTurnEnd" }),
    ]);
  });

  it("publicly deletes itself to play a qualifying Titan from trash", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-078", as: "cherubimon" }], trash: [{ card: "BT26-021", as: "titan" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("cherubimon"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-021");
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).not.toContain("BT26-078");
  });
});
