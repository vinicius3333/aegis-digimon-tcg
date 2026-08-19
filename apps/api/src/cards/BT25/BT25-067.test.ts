import { describe, expect, it } from "vitest";
import { compiled as BT25_067 } from "./BT25-067.js";
import "../index.js";

describe("BT25-067 Commandramon", () => {
  it("reacts to your D-Brigade or ACCEL play with a reduced hand digivolution", () => {
    const effect = BT25_067.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["D-Brigade", "ACCEL"], match: "trait" }],
      },
    });
    expect((effect?.actions?.[0] as { actions?: unknown[] }).actions?.[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      reduceCost: 2,
      optional: true,
      into: {
        controllerDefault: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["D-Brigade", "ACCEL"], match: "trait" }],
      },
    });
    expect(BT25_067.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 1000,
      duration: "permanent",
    });
  });
});
