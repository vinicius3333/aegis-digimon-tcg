import { describe, expect, it } from "vitest";
import { compiled as BT24_065 } from "./BT24-065.js";

describe("BT24-065 Diaboromon (X Antibody)", () => {
  it("limits the replacement play to this Digimon's digivolution cards", () => {
    const replacement = BT24_065.effects?.find((entry) => entry.trigger === "AllTurns");
    const play = (replacement?.actions?.[0] as any)?.actions?.[0];
    expect(play).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "digivolutionCards"],
      target: { source: "thisDigimon" },
    });
  });
});
