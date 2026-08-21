import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-013 TeslaJellymon", () => {
  it("gains memory once when a card is trashed from hand through an inherited stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "RB1-014", as: "host", under: [{ card: "RB1-013" }] }],
        hand: [{ card: "RB1-011", as: "discarded" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("discarded").instanceId], 0);

    expect(s.state.memory).toBe(1);
  });

  it("does not play a second Kiyoshiro when one is already present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-013", as: "tesla" }, { card: "RB1-032", as: "existing" }],
          hand: [{ card: "RB1-032", as: "kiyo" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("tesla"));

    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "RB1-032")).toHaveLength(1);
  });
});
