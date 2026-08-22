import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST14-03.js";
import "./ST14-10.js";

describe("ST14-10 Beelzemon: Blast Mode", () => {
  it("deletes with the dynamically raised level ceiling when trashed from deck", async () => {
    const s = setupEngine(
      {
        0: {
          trash: Array.from({ length: 9 }, () => "BT1-009"),
          hand: [{ card: "ST14-03", as: "miller" }],
          deck: [{ card: "ST14-10", as: "blast" }, "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-015", as: "level4" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("miller").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
  it("unsuspends and gains 3 memory with 20 cards in trash when digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST14-10", as: "blast", suspended: true }],
        trash: Array.from({ length: 20 }, () => "BT1-009"),
      },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("blast"));
    expect(s.perm("blast").isSuspended).toBe(false);
    expect(s.state.memory).toBe(3);
  });
});
