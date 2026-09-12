import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-013 TeslaJellymon", () => {
  it("does not gain memory when an opponent effect trashes your hand card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "RB1-014", as: "host", under: [{ card: "RB1-013" }] }],
        hand: [{ card: "RB1-011", as: "discarded" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    s.state.turnSeat = 0;
    await advance(s.engine).verb.trash([s.inst("discarded").instanceId], 1);

    expect(s.state.memory).toBe(0);
  });

  it("plays Kiyoshiro on a legal digivolution when none is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-011", as: "base" }],
          hand: [
            { card: "RB1-013", as: "tesla" },
            { card: "RB1-033", as: "kiyo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tesla").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "RB1-033"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "RB1-033")).toBe(true);
  });

  it("does not play another Kiyoshiro when one is already present", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "RB1-011", as: "base" },
          { card: "RB1-033", as: "existing" },
        ],
        hand: [
          { card: "RB1-013", as: "tesla" },
          { card: "RB1-033", as: "kiyo" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tesla").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "RB1-033")).toHaveLength(1);
  });
});
