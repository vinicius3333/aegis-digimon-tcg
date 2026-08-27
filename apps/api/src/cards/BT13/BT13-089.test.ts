import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-089.js";

describe("BT13-089 BT13-089", () => {
  it("matches the delayed and deletion play clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "DelayedEffect",
          trigger: "nextEndOfOpponentTurn",
          optional: true,
          cost: { kind: "deleteOwn", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: {
            filter: { controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Falcomon", "Keenan Crier"] }] },
            count: 1,
          },
        },
      ],
    });
  });

  it("only plays Ravemon after deleting a Ravemon with a Bird or Avian stack card", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "DelayedEffect",
      trigger: "nextEndOfOpponentTurn",
      effect: { kind: "PlayWithoutCost", from: ["trash"], target: { filter: { controller: "mine", name: "Ravemon" } } },
      condition: {
        kind: "selfDigivolutionStackHasTrait",
        filter: {
          nameOrTrait: [
            { match: "trait", tokens: ["Bird"] },
            { match: "trait", tokens: ["Avian"] },
          ],
        },
      },
    });
  });

  it("loads the compiled implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-089", as: "card" }] } });
    await s.ready();
    expect(s.perm("card").topCard?.cardId).toBe("BT13-089");
  });
});
