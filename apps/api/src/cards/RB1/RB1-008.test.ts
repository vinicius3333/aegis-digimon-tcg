import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-008 BetelGammamon", () => {
  it("plays Hiro Amanokawa from hand when none is in play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "RB1-008", as: "betel" }], hand: [{ card: "RB1-032", as: "hiro" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("betel"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "RB1-032"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "RB1-032")).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not play a second Hiro when one is already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "RB1-008", as: "betel" },
            { card: "RB1-032", as: "existing" },
          ],
          hand: [{ card: "RB1-032" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("betel"));

    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "RB1-032")).toHaveLength(
      1,
    );
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });
});
