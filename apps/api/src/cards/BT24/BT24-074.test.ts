import { describe, expect, it } from "vitest";
import { compiled as BT24_074 } from "./BT24-074.js";
import "../index.js";

describe("BT24-074 SkullSeadramon", () => {
  it("trashes digivolution cards before the effect-play deletion branch", () => {
    const onPlay = BT24_074.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions?.[0]).toMatchObject({ kind: "TrashDigivolution", amount: 3 });
    expect(onPlay?.actions?.[1]).toMatchObject({
      kind: "Delete",
      condition: { kind: "triggerEnteredByEffect" },
      target: { filter: { digivolutionCards: "none" }, count: 1 },
    });
    const inherited = BT24_074.effects?.find((entry) => entry.trigger === "WhenAttacking");
    expect(inherited?.actions?.[0]).toMatchObject({ kind: "Unsuspend", cost: { kind: "place" } });
  });
});
