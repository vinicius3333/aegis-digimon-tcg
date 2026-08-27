import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT25_005 } from "./BT25-005.js";
import "../index.js";

describe("BT25-005 Pagumon", () => {
  it("digivolves this Digimon when a Three Musketeers card is added underneath", () => {
    const effect = BT25_005.effects?.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" });
    const watcher = effect?.actions?.[0] as {
      event?: string;
      sourceFilter?: unknown;
      triggerFilter?: unknown;
      addedDigivolutionCardFilter?: unknown;
    };
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { controllerDefault: "mine" },
      triggerFilter: { isSelfRef: true },
      addedDigivolutionCardFilter: {
        nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }],
      },
    });
    expect((watcher as { actions?: unknown[] }).actions?.[0]).toMatchObject({
      kind: "Digivolve",
      reduceCost: 2,
      payCost: true,
      from: ["hand"],
      optional: true,
      preserveOncePerTurnOnDecline: true,
    });
  });

  it("actually digivolves this stack into a matching hand Digimon for 2 less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-083", as: "host", under: ["BT25-005"] }],
          hand: [
            { card: "BT25-085", as: "target" },
            { card: "BT25-085", as: "added" },
            { card: "BT25-081", as: "nonmatch" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const host = s.perm("host");
    await advance(s.engine).verb.placeUnder(host.permanentId, [s.inst("added").instanceId]);
    await settle(() => host.topCard?.cardId === "BT25-085");

    expect(host.topCard?.cardId).toBe("BT25-085");
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT25-081"]);
  });
});
