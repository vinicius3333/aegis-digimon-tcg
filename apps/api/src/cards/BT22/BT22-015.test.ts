import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-015.js";

describe("BT22-015 Omnimon", () => {
  it("keeps Blocker, both Decode modes, lowest-DP deletion, stack-local scaling, and optional attack", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
    );
    expect(compiled.effects.filter((entry) => entry.trigger === "Static")).toHaveLength(3);
    const onPlay = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    const whenAttacking = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(onPlay?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", superlative: "lowestDP" }, count: 1 },
    });
    expect(whenAttacking?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", superlative: "lowestDP" }, count: 1 },
    });
    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[0]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
      scaling: { per: 2, unit: "digivolutionCards" },
    });
    expect(whenDigivolving?.actions[1]).toMatchObject({ kind: "Attack", optional: true, withoutSuspending: false });
  });
});
