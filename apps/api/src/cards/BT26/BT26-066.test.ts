import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-066.js";
import "../index.js";

describe("BT26-066 Salamon", () => {
  it("preserves normal evolution requirements and both Titan trash-digivolve windows", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["TS"], cost: 0, isAlternate: true }]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "StartOfYourMainPhase", actions: [expect.objectContaining({ kind: "Digivolve", from: ["trash"], payCost: true, costDelta: -2, optional: true, condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 5 } })] }),
      expect.objectContaining({ trigger: "YourTurn", isInherited: true, actions: [{ kind: "SubTrigger", event: "whenHandTrashed", frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "Digivolve", from: ["trash"], payCost: true, costDelta: -1, optional: true })] }] }),
    ]));
    expect(JSON.stringify(compiled)).not.toContain("ignoreRequirements");
  });

  it("publicly digivolves a Titan into a Titan from trash when the hand has five or fewer cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-021", as: "titanHost" },
          { card: "BT26-066", as: "salamon" },
        ],
        trash: [{ card: "BT26-059", as: "trashTitan" }],
        hand: [{ card: "BT1-001", as: "handCard" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("salamon"));

    expect(s.perm("titanHost").topCard.cardId).toBe("BT26-059");
  });
});
