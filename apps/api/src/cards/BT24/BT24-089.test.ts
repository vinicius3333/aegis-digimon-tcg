import { describe, expect, it } from "vitest";
import { compiled as BT24_089 } from "./BT24-089.js";
import "../index.js";

describe("BT24-089 Unique Emblem: Blazing Conductor", () => {
  it("arms Delay on Owen suspension and keeps the digivolve in a separate Delay Main effect", () => {
    const yourTurn = BT24_089.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Owen Dreadnought"], match: "name" }] },
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Delay" }, duration: "permanent" }],
    });

    const delay = BT24_089.effects?.find(
      (entry) => entry.trigger === "Main" && entry.keywords?.some((k) => k.keyword === "Delay"),
    );
    expect(delay).toBeDefined();
    expect(delay?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      reduceCost: 3,
      optional: true,
      into: {
        nameOrTrait: [
          { tokens: ["Reptile", "Dragonkin"], match: "trait" },
          { tokens: ["LIBERATOR"], match: "trait" },
        ],
      },
    });
  });
});
