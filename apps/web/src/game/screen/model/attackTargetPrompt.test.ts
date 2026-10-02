import { describe, expect, it } from "vitest";
import { CardInstance, Permanent, type DecisionRequest } from "@aegis/shared";
import { attackTargetPrompt, preselectedAttackTargets } from "./attackTargetPrompt";

function permanent(permanentId: string, cardId: string) {
  const perm = new Permanent();
  perm.permanentId = permanentId;
  const top = new CardInstance();
  top.cardId = cardId;
  perm.topCard = top;
  return perm;
}

function attackTarget(candidateInstanceIds: string[], min = 1): DecisionRequest {
  return {
    decisionId: "dec-52",
    seat: 1,
    kind: "selectCards",
    promptText: "Choose the attack target for the forced attack.",
    sourceCardId: "EX13-060",
    sourcePermanentId: "perm-16",
    options: { candidateInstanceIds, min, max: 1, selectionContext: "attackTarget" },
  };
}

const board = [permanent("perm-1", "EX13-060"), permanent("perm-16", "EX13-057"), permanent("perm-3", "BT10-055")];

describe("attack target prompt", () => {
  it("Discord 1555307552223264829: names Grademon as the attacker and security as the only target", () => {
    expect(attackTargetPrompt(attackTarget(["player"]), board)).toEqual({
      attackerCardId: "EX13-057",
      onlyTarget: { kind: "player" },
    });
    expect(preselectedAttackTargets(attackTarget(["player"]))).toEqual(["player"]);
  });

  it("names a lone Digimon target and starts it picked", () => {
    expect(attackTargetPrompt(attackTarget(["perm-3"]), board)?.onlyTarget).toEqual({
      kind: "permanent",
      cardId: "BT10-055",
    });
    expect(preselectedAttackTargets(attackTarget(["perm-3"]))).toEqual(["perm-3"]);
  });

  it("leaves a real choice unpicked", () => {
    expect(attackTargetPrompt(attackTarget(["player", "perm-3"]), board)?.onlyTarget).toBeUndefined();
    expect(preselectedAttackTargets(attackTarget(["player", "perm-3"]))).toEqual([]);
  });

  it("does not pick for an optional selection or for other decisions", () => {
    expect(preselectedAttackTargets(attackTarget(["player"], 0))).toEqual([]);
    const attackSource = {
      ...attackTarget(["perm-16"]),
      options: { candidateInstanceIds: ["perm-16"], min: 1, max: 1 },
    };
    expect(preselectedAttackTargets(attackSource)).toEqual([]);
    expect(attackTargetPrompt(attackSource, board)).toBeUndefined();
  });
});
