import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-081.js";

describe("BT2-081 MetalGarurumon", () => {
  it("plays a purple level 3 from trash without activating its On Play effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-081", as: "metal" }, { card: "BT2-068", as: "recipient" }],
          trash: [{ card: "BT13-079", as: "revived" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("metal").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("revived").instanceId));

    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Retaliation")).toBe(false);
  });
});
