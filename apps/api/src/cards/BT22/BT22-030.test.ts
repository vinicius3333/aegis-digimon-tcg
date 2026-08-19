import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-030.js";

describe("BT22-030 Musimon", () => {
  it("uses the one-or-fewer-Tamers gate and includes the linked card's attack effect", () => {
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn).toMatchObject({ frequency: "OncePerTurn" });
    expect(yourTurn?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          condition: { kind: "permanentCount", op: "lte", value: 1, filter: { kind: ["Tamer"] } },
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Torajiro Asuka"], match: "name" }] },
            count: 1,
          },
        },
      ],
    });
    const linkedAttack = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(linkedAttack).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
  });
});
