import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-025.js";

describe("EX5-025 Dianamon", () => {
  it("has Blocker and once-per-turn shared When Digivolving/When Attacking effects", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([
      { keyword: "Blocker" },
    ]);
    const digivolving = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    const attacking = compiled.effects?.find((entry) => entry.trigger === "WhenAttacking");
    expect(digivolving).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [
        { kind: "TrashDigivolution" },
        { kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" },
      ],
    });
    expect(attacking).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
    expect(digivolving?.actions?.[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 1,
      scaling: { per: 1, unit: "digivolutionCards" },
    });
    expect(digivolving?.actions?.[1]).toMatchObject({
      target: { filter: { controllerDefault: "opponent", kind: ["Digimon"], digivolutionCards: "none" }, count: "all" },
    });
  });
  it("unsuspends once per turn when an opponent's Digimon loses a digivolution card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          sourceFilter: { controller: "opponent" },
          actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true } } }],
        },
      ],
    });
  });
});
