import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { makeInstance as instance, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-079.js";
import { advance } from "../../engine/testkit/advance.js";

describe("BT8-079 SkullSatamon", () => {
  it("mills 2, then returns a Demon Lord from trash to hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-074", as: "base" }],
          hand: [{ card: "BT8-079", as: "evolving" }],
          deck: ["BT1-009", { card: "BT2-111", as: "demonLord" }, "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    const mine = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-079"));
    expect(mine.hand.some((card) => card.instanceId === s.inst("demonLord").instanceId)).toBe(true);
    expect(mine.trash).toHaveLength(1);
  });

  it("inherits once-per-turn memory when its deck is trashed", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-074", as: "host" }] } });
    s.state.turnSeat = 0;
    const host = s.perm("host");
    host.stack.push(instance("BT8-079", 0, false));
    s.state.memory = 0;
    await advance(s.engine).fireSubTrigger("onDiscardLibrary", {
      addedToHand: {
        instanceIds: [instance("BT1-009", 0, false).instanceId],
        byEffect: { ownerSeat: 0, isDigimonEffect: false },
      },
    });
    expect(s.state.memory).toBe(1);
    await advance(s.engine).fireSubTrigger("onDiscardLibrary", {
      addedToHand: {
        instanceIds: [instance("BT1-010", 0, false).instanceId],
        byEffect: { ownerSeat: 0, isDigimonEffect: false },
      },
    });
    expect(s.state.memory).toBe(1);
  });
});
