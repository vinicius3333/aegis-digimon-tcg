import { describe, expect, it } from "vitest";
import { compiled as BT25_062 } from "./BT25-062.js";
import "../index.js";

describe("BT25-062 Gaiamon", () => {
  it("offers a free Machine, Cyborg, or TS digivolution at low memory", () => {
    const effect = BT25_062.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      payCost: false,
      from: ["hand"],
      optional: true,
      condition: { kind: "memoryAtMost", value: 4, controller: "mine" },
      into: {
        controllerDefault: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Machine", "Cyborg", "TS"], match: "trait" }],
      },
    });
    const inherited = BT25_062.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "AllTurns" });
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 1000,
      duration: "permanent",
      target: { filter: { isSelfRef: true }, isSelf: true },
    });
  });
});
