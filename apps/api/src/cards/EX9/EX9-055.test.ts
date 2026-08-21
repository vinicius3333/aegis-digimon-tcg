import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-055.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("EX9-055", () => {
  it("plays Abbadomon Core from hand or trash in the breeding area when four Negamon-text cards are available", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({ actions: [{ kind: "PlayWithoutCost", from: ["hand", "trash"], breeding: true, requiresEmpty: "breedingArea", condition: { kind: "youHave", count: 4 } }] }));
  it("at end of all turns places a level 6-or-lower Negamon-text Digimon from trash and deletes a matching opposing level", () => expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAllTurns")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Delete", target: { filter: { levelComparison: { op: "eq", value: 0, scaling: { unit: "namedCount" } } }, }, cost: { kind: "place", position: "top", target: { filter: { levelComparison: { op: "lte", value: 6 } } } } }] }));
  it("requires four total Negamon-text cards across trash and digivolution cards for either play trigger", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ optional: true, from: ["hand", "trash"], breeding: true, requiresEmpty: "breedingArea", condition: { kind: "youHave", count: 4, filter: { zone: ["trash", "digivolutionCards"], nameOrTrait: [{ tokens: ["Negamon"], match: "text" }] } } });
  });
  it("excludes Digi-Eggs from the deletion cost and stores the placed level for matching deletion", () => expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAllTurns")?.actions[0]).toMatchObject({
    optional: true,
    abortOnDecline: true,
    cost: {
      target: { from: ["trash"], filter: { kind: ["Digimon"], levelComparison: { op: "lte", value: 6 }, nameOrTrait: [{ tokens: ["Negamon"], match: "text" }] }, count: 1 },
      destination: "digivolutionStack",
      position: "top",
      host: "self",
      storeAs: "ex9055PlacedLevel",
    },
  }));
  it("places a Negamon-text Digimon on top and deletes an opposing Digimon of the same level", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-055", as: "source" }], trash: ["EX9-047"] },
      1: { battleArea: [{ card: "EX9-050", as: "target" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));

    expect(s.perm("source").stack[0]?.cardId).toBe("EX9-047");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
