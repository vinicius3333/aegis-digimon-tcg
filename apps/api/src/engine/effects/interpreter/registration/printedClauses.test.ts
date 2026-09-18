import { describe, expect, it } from "vitest";
import { compiled as ulforce } from "../../../../cards/EX13/EX13-023.js";
import { compiled as rina } from "../../../../cards/BT11/BT11-112.js";
import { withPrintedClauses } from "./printedClauses.js";

describe("withPrintedClauses", () => {
  it("gives each of UlforceVeedramon's [When Digivolving] effects its own printed clause", () => {
    const filled = withPrintedClauses("EX13-023", ulforce);
    const descriptions = filled.effects
      .filter((effect) => effect.trigger === "WhenDigivolving")
      .map((effect) => effect.description);
    expect(descriptions).toEqual([
      "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] 1 of your Digimon may change orientation.",
      "[On Play] [When Digivolving] You may return all of your opponent's Digimon with the fewest digivolution cards to the bottom of the deck.",
    ]);
  });

  it("gives Rina's watchers the printed clause they implement", () => {
    const filled = withPrintedClauses("BT11-112", rina);
    const watcherClauses = filled.effects.flatMap((effect) =>
      (effect.actions ?? []).flatMap((action) => (action.kind === "SubTrigger" ? [action.printedClause] : [])),
    );
    expect(watcherClauses).toEqual([
      "[All Turns] When one of your Digimon with [Veedramon] in its name becomes suspended, by suspending this Tamer, activate 1 of that Digimon's [When Digivolving] effects.",
      "[Your Turn][Once Per Turn] When one of your blue Digimon becomes unsuspended, gain 1 memory.",
    ]);
  });

  it("keeps an authored description", () => {
    const authored = { ...rina, effects: [{ ...rina.effects[0]!, description: "authored" }] };
    expect(withPrintedClauses("BT11-112", authored).effects[0]!.description).toBe("authored");
  });
});

describe("withPrintedClauses on a card with a synthesized second [Main]", () => {
  it("leaves BT17-096's ＜Delay＞ body without the printed [Main] clause", async () => {
    const { compiled } = await import("../../../../cards/BT17/BT17-096.js");
    const mains = withPrintedClauses("BT17-096", compiled).effects.filter((effect) => effect.trigger === "Main");
    const delayBody = mains.find((effect) => (effect.keywords ?? []).some((keyword) => keyword.keyword === "Delay"));
    expect(delayBody?.description).toBeUndefined();
  });
});
