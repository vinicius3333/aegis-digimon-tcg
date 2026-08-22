import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-048.js";

describe("EX5-048 Etemon", () => {
  it("reduces one opposing Digimon by 3000 and grants that same Digimon a start-of-main-phase attack effect", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions;
    expect(actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -3000,
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, bindAs: "dpTarget" },
    });
    expect(actions?.[1]).toMatchObject({
      kind: "GainEffect",
      target: { fromSelectionRef: "dpTarget" },
      grant: {
        trigger: "StartOfYourMainPhase",
        actions: [{ kind: "Attack", target: { filter: { isSelfRef: true }, isSelf: true } }],
      },
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "ModifyDP", target: { bindAs: "dpTarget" } },
      { kind: "GainEffect", target: { fromSelectionRef: "dpTarget" } },
    ]);
  });
  it("inherits a once-per-turn reveal-three play of a black or yellow low-cost Digimon when an opponent attacks", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              rest: "trash",
              add: [
                {
                  count: 1,
                  to: "play",
                  optional: true,
                  filter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Black", "Yellow"], playCostLte: 3 },
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
