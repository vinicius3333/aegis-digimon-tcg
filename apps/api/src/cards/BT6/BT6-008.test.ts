import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-008.js";
import "../BT9/BT9-068.js";

describe("BT6-008 Shoutmon", () => {
  it("draws when its Blitz host attacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT9-068", under: ["BT6-008", "BT1-010"], as: "host" }],
        deck: [{ card: "BT1-011", as: "drawn" }],
      },
      1: { security: ["BT1-012"] },
    });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("host"));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});
