import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-045.js";

describe("EX4-045 MetalGreymon", () => {
  it("may digivolve another own Digimon into a level six or lower Garurumon from hand", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      optional: true,
      target: { filter: { controller: "mine", excludeSelf: true } },
      into: { levelComparison: { op: "lte", value: 6 }, nameOrTrait: [{ match: "name", tokens: ["Garurumon"] }] },
      costDelta: -2,
    });
  });

  it("can suspend itself to redirect an opponent attack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              abortOnDecline: true,
              cost: { kind: "suspend", optional: true, target: { filter: { isSelfRef: true } } },
            },
          ],
        },
      ],
    });
  });
});
