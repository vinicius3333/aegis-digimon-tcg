import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-072.js";

describe("BT23-072 King Drasil_7D6", () => {
  it("pays 3 and places this hand card under King Drasil or Mother Eater in breeding before drawing", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "Main") as any).actions[0];
    expect(action).toMatchObject({
      kind: "Draw",
      amount: 1,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "place",
        destination: "digivolutionStack",
        position: "bottom",
        host: {
          filter: { zone: "breeding", nameOrTrait: [{ tokens: ["King Drasil_7D6", "Mother Eater"], match: "name" }] },
        },
      },
      additionalCosts: [{ kind: "payMemory", memory: 3 }],
    });
  });

  it("grants all four keywords to the played Royal Knight/CS Digimon after suspending this card", () => {
    const watcher = (compiled.effects.find((entry) => entry.trigger === "AllTurns") as any).actions[0];
    expect(watcher).toMatchObject({ event: "whenPlayed", sourceFilter: { controller: "mine", kind: ["Digimon"] } });
    expect(watcher.actions.map((action: any) => action.keyword.keyword)).toEqual(["Rush", "Raid", "Reboot", "Blocker"]);
    expect(watcher.actions[0].target.sourceRef).toBe("triggerSubject");
    expect(watcher.actions.slice(1).every((action: any) => action.target.sameTarget === true)).toBe(true);
  });
});
