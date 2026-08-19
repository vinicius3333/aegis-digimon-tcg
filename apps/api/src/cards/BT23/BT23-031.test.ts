import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-031.js";

describe("BT23-031 Angewomon", () => {
  it("reduces its play cost when you have LadyDevimon or Mirei Mikagura", () => {
    const replacement = (compiled.effects.find((entry) => entry.trigger === "Static") as any).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Replacement",
          mode: "reduceCost",
          amount: 3,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["LadyDevimon", "Mirei Mikagura"], match: "name" }],
            },
          },
        },
      ],
    });
  });

  it("adds the top security card to hand, then recovers if three or fewer remain", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions;
      expect(actions[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "toHand",
        controller: "mine",
        amount: 1,
        toTop: true,
      });
      expect(actions[1]).toMatchObject({
        kind: "SecurityManipulation",
        op: "addTop",
        controller: "mine",
        source: "deck",
        amount: 1,
        condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
      });
    }
    expect(compiled.effects.some((entry) => entry.isInherited)).toBe(false);
  });
});
