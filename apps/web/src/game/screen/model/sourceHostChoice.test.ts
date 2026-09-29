import { describe, expect, it } from "vitest";
import { CardInstance, Permanent, type DecisionRequest } from "@aegis/shared";
import { sourceHostChoiceFor } from "./sourceHostChoice";

function permanent(permanentId: string, stackInstanceIds: readonly string[]): Permanent {
  const perm = new Permanent();
  perm.permanentId = permanentId;
  const top = new CardInstance();
  top.instanceId = `${permanentId}-top`;
  perm.topCard = top;
  perm.stack.push(
    ...stackInstanceIds.map((instanceId) => {
      const card = new CardInstance();
      card.instanceId = instanceId;
      return card;
    }),
  );
  return perm;
}

const decision: DecisionRequest = {
  decisionId: "proximamon-sources",
  seat: 0,
  kind: "selectCards",
  promptText: "Play or use 1 card",
};
const yourBattleArea = [permanent("proximamon", ["a1", "a2"]), permanent("canoweissmon", ["b1"])];
const sources = ["a1", "a2", "b1"].map((instanceId) => ({ instanceId, zone: "digivolutionCards" as const }));

describe("source host choice", () => {
  it("groups one-card source picks by the Digimon holding them", () => {
    const choice = sourceHostChoiceFor({ decision, answerOnBoard: false, candidates: sources, yourBattleArea, max: 1 });
    expect(choice?.hostPermanentIds).toEqual(["proximamon", "canoweissmon"]);
    expect([...choice!.cardIdsByHost.get("proximamon")!]).toEqual(["a1", "a2"]);
    expect([...choice!.cardIdsByHost.get("canoweissmon")!]).toEqual(["b1"]);
  });

  it("skips the host step when every card sits under one Digimon", () => {
    const candidates = sources.filter((candidate) => candidate.instanceId !== "b1");
    expect(sourceHostChoiceFor({ decision, answerOnBoard: false, candidates, yourBattleArea, max: 1 })).toBeUndefined();
  });

  it("keeps multi-card picks, board picks, and mixed zones in one list", () => {
    expect(
      sourceHostChoiceFor({ decision, answerOnBoard: false, candidates: sources, yourBattleArea, max: 2 }),
    ).toBeUndefined();
    expect(
      sourceHostChoiceFor({ decision, answerOnBoard: true, candidates: sources, yourBattleArea, max: 1 }),
    ).toBeUndefined();
    expect(
      sourceHostChoiceFor({
        decision,
        answerOnBoard: false,
        candidates: [...sources, { instanceId: "h1", zone: "hand" }],
        yourBattleArea,
        max: 1,
      }),
    ).toBeUndefined();
  });
});
