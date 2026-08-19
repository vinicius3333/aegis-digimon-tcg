import { describe, expect, it } from "vitest";
import { compiled as BT24_039 } from "./BT24-039.js";

describe("BT24-039 Piximon", () => {
  it("plays from security without battle only against an opposing level 6+ Digimon", () => {
    const security = BT24_039.effects?.find((entry) => entry.trigger === "Security");
    expect(security?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["security"],
      payCost: false,
      withoutBattle: true,
      condition: { kind: "opponentHas", filter: { levelComparison: { op: "gte", value: 6 } } },
    });
  });
  it("has Blocker, Barrier, and inherited Recovery +1", () => {
    expect(
      BT24_039.effects
        ?.filter((entry) => entry.keywords?.length)
        .flatMap((entry) => entry.keywords?.map((keyword: any) => keyword.keyword)),
    ).toEqual(["Blocker", "Barrier", "Recovery"]);
  });
});
