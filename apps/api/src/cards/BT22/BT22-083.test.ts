import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-083.js";

describe("BT22-083 Yuuko Kamishiro", () => {
  it("gains memory when an opponent Digimon exists at the start of your main phase", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHas", filter: { kind: ["Digimon"] } },
    });
  });

  it("uses an executable Eater Eve name condition for the inherited attack-target-change DP", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "ModifyDP",
              amount: 3000,
              duration: "forTheTurn",
              condition: { kind: "selfHasName", names: ["Eater Eve"] },
            },
          ],
        },
      ],
    });
  });
});
