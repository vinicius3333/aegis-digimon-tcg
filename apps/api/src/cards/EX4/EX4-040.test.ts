import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-040.js";

describe("EX4-040 SkullKnightmon", () => {
  it("optionally plays Nene Amano from hand only when none is already in play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      condition: { kind: "youHaveNone", filter: { nameOrTrait: [{ match: "name", tokens: ["Nene Amano"] }] } },
    });
  });
  it("reveals one Blue Flare or Twilight card on deletion and has inherited unsuspend", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 1,
      rest: "trash",
      add: [{ filter: { nameOrTrait: [{ match: "trait", tokens: ["Blue Flare", "Twilight"] }] } }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "Reboot" }],
    });
  });
});
