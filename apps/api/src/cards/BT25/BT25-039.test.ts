import { describe, expect, it } from "vitest";
import { compiled as BT25_039 } from "./BT25-039.js";
import "../index.js";

describe("BT25-039 Sirenmon", () => {
  it("places this security card under the Ceresmon played by its security effect", () => {
    const effect = BT25_039.effects?.find((entry) => entry.trigger === "EndOfYourTurn");
    const [play, place] = effect?.actions ?? [];
    expect(effect?.isSecurity).toBe(true);
    expect(play).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: true,
      reduceCostBy: 7,
      optional: true,
      target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Ceresmon"], match: "name" }] } },
    });
    expect(place).toMatchObject({
      kind: "PlaceUnder",
      position: "bottom",
      underFilter: { lastPlayed: true, controller: "mine", kind: ["Digimon"] },
      condition: { kind: "ifThisEffectActed" },
      optional: true,
    });
  });

  it("places itself face up at the bottom of security on deletion", () => {
    const effect = BT25_039.effects?.find((entry) => entry.trigger === "OnDeletion");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      controller: "mine",
      toTop: false,
      faceUp: true,
    });
    expect((effect?.actions?.[0] as { source?: unknown }).source).toBeUndefined();
  });

  it("protects all matching other Shaman/Iliad permanents from non-own effects", () => {
    const effect = BT25_039.effects?.find((entry) => entry.trigger === "AllTurns");
    const replacement = effect?.actions?.[0] as { affectsAll?: boolean; sourceFilter?: unknown; cost?: unknown };
    expect(replacement.affectsAll).toBe(true);
    expect(replacement.sourceFilter).toMatchObject({
      controller: "mine",
      excludeSelf: true,
      kind: ["Digimon", "Tamer"],
      nameOrTrait: [{ tokens: ["Shaman", "Iliad"], match: "trait" }],
    });
    expect(replacement.cost).toMatchObject({ kind: "deleteOwn" });
  });
});
