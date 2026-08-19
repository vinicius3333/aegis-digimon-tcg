import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-060.js";

describe("BT23-060 Machinedramon", () => {
  it("has Security Attack +1 and Reboot", () => {
    const keywords = compiled.effects
      .filter((entry) => entry.trigger === "Static")
      .flatMap((entry) => entry.actions.map((action: any) => action.keyword?.keyword));
    expect(keywords).toEqual(["SecurityAttack", "Reboot"]);
  });

  it("de-digivolves one opposing Digimon and then deletes one at 8000 DP or less on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions;
      expect(actions[0]).toMatchObject({
        kind: "DeDigivolve",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        amount: 1,
      });
      expect(actions[1]).toMatchObject({
        kind: "Delete",
        target: { filter: { controllerDefault: "opponent", dp: { op: "lte", value: 8000 } }, count: 1 },
      });
    }
  });

  it("once per turn activates an On Play effect on a face-up Zaxon security Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenAttacking") as any;
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ActivateForeignEffect",
          zone: "security",
          fromTriggers: ["OnPlay"],
          count: 1,
          optional: false,
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            faceUp: true,
            nameOrTrait: [{ tokens: ["Zaxon"], match: "trait" }],
          },
        },
      ],
    });
  });
});
