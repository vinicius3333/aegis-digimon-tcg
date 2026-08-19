import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-010.js";

describe("BT22-010 Meramon", () => {
  it("gates Raid, Piercing, and the optional attack behind the 2-memory Main cost", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({ frequency: "OncePerTurn" });
    expect(main?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Raid" },
      duration: "forTheTurn",
      cost: { kind: "payMemory", memory: 2 },
      abortOnDecline: true,
    });
    expect(main?.actions[1]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Piercing" },
      duration: "forTheTurn",
    });
    expect(main?.actions[2]).toMatchObject({
      kind: "Attack",
      target: { filter: { isSelfRef: true }, isSelf: true },
      optional: true,
    });

    const inherited = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(inherited).toMatchObject({
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });
});
