import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-027.js";

describe("BT22-027 Ryugumon", () => {
  it("requires the bottom-stack placement cost and reacts once per turn to added digivolution cards", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [{ keyword: "Decode", raw: "＜Decode (Lv.5 w/[Aqua]/[Sea Animal] in any trait)＞" }],
      }),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Restrict",
        restriction: "suspend",
        duration: "untilOpponentTurnEnd",
        optional: true,
        abortOnDecline: true,
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
        cost: { kind: "place", destination: "digivolutionStack", position: "bottom", host: "self" },
      });
    }
    const allTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ frequency: "OncePerTurn" });
    expect(allTurns?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Return",
          to: "deckBottom",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
            count: 1,
          },
        },
      ],
    });
  });
});
