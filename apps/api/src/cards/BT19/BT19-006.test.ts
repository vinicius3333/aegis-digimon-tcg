import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-006 Pagumon", () => {
  it("returns a level 3 purple Digimon after effect deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-067", as: "host", under: ["BT19-006"] }],
          trash: ["BT19-069", "BT1-028", "BT10-071"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnDestroyedAnyone, s.perm("host"), {
      removalCause: "byEffect",
    });

    expect((s.state.players[0] as PlayerState).hand.map((card) => card.cardId)).toContain("BT10-071");
    expect((s.state.players[0] as PlayerState).trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT19-069", "BT1-028"]),
    );
  });

  it("does not return the card after battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-067", as: "host", under: ["BT19-006"] }],
          trash: ["BT10-071"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnDestroyedAnyone, s.perm("host"), {
      removalCause: "byBattle",
    });
    await settle(() => false, 20);

    expect((s.state.players[0] as PlayerState).hand.map((card) => card.cardId)).not.toContain("BT10-071");
  });
});
