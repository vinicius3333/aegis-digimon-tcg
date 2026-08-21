import { describe, expect, it } from "vitest";
import { EffectTiming, PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-048.js";

describe("EX8-048", () => {
  it("plays Close from hand when digivolving with one or fewer Tamers", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      condition: { kind: "youHave", filter: { countMax: 1 } },
    }));
  it("plays Close from hand without cost when the digivolving condition is met", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-048", as: "source" }],
          hand: [{ card: "EX8-067", as: "close" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-067"));
    expect(player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-067")).toBe(true);
    expect(player.hand.some((card) => card.instanceId === s.inst("close").instanceId)).toBe(false);
  });
});
