import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-003 Viximon", () => {
  it("returns exactly one Plug-In Option from trash at end of turn and only once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-030", as: "host", under: ["BT19-003"] }],
          trash: ["BT1-102", "P-095", "P-095"],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).runTurn(0);
    await settle(() => (s.state.players[0] as PlayerState).hand.length === 1);

    expect((s.state.players[0] as PlayerState).hand.map((card) => card.cardId)).toEqual(["P-095"]);
    expect((s.state.players[0] as PlayerState).trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-102", "P-095"]),
    );

    // A second same-turn end-of-turn window has no public origin; use the production
    // timing seam only to prove the Once Per Turn guard after the natural turn-end.
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("host"));
    await settle(() => false, 20);

    expect((s.state.players[0] as PlayerState).hand.map((card) => card.cardId)).toEqual(["P-095"]);
  });
});
