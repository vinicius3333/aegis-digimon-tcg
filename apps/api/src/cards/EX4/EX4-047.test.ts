import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-047.js";

describe("EX4-047 DarkKnightmon", () => {
  it("grants Blocker to one own Digimon and, while DigiXrosing, one opposing Digimon", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions;
    expect(actions?.[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker" },
      target: { filter: { controller: "mine" } },
    });
    expect(actions?.[1]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker" },
      target: { filter: { controller: "opponent" } },
      condition: { kind: "digiXrosCount", minimum: 1 },
    });
  });
  it("reveals two and adds one Blue Flare or Twilight card on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 2,
      rest: "trash",
      add: [{ filter: { nameOrTrait: [{ match: "trait", tokens: ["Blue Flare", "Twilight"] }] } }],
    });
  });

  it("requires the inherited condition to be exactly GreyKnightsmon", () => {
    const inherited = compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions?.[0] as
      | { actions?: unknown[] }
      | undefined;
    expect(inherited?.actions?.[0]).toMatchObject({
      condition: { filter: { nameOrTrait: [{ match: "nameExact", tokens: ["GreyKnightsmon"] }] } },
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-047");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });
  ex4CardBehaviorTests("EX4-047");
});
