import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./BT26-035.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT26-035 Morphomon", () => {
  it("models both suspend windows and the inherited battle-win evolution", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["NSp"], cost: 0, isAlternate: true }]);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "OnPlay", actions: [{ kind: "Suspend", optional: true, target: { filter: { controller: "any", kind: ["Digimon"] }, count: 1 } }] }),
      expect.objectContaining({ trigger: "WhenMoving" }),
      expect.objectContaining({ trigger: "YourTurn", isInherited: true, actions: [{ kind: "SubTrigger", event: "whenBattleWon", frequency: "OncePerTurn", actions: [{ kind: "Digivolve", payCost: true, costDelta: -1, from: ["hand"], optional: true }] }] }),
    ]));
  });

  it("publicly evolves an eligible NSp battle winner with the one-memory reduction", async () => {
    const preferred: string[] = [];
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-035", as: "winner", under: ["BT26-035"] }], hand: [{ card: "BT26-041", as: "candidate" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred });
    preferred.push(s.inst("candidate").instanceId);
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("winner").permanentId });

    expect(s.perm("winner").topCard.cardId).toBe("BT26-041");
    expect(s.state.memory).toBe(0);
  });

  it("suspends one Digimon through the public On Play window", async () => {
    const preferred: string[] = [];
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-035", as: "morphomon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred });
    preferred.push(s.perm("opponent").topCard.instanceId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("morphomon"));

    expect(s.perm("opponent").isSuspended).toBe(true);
  });
});
