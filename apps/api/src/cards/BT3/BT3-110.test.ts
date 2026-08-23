import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-110.js";
import "../BT2/BT2-077.js";

describe("BT3-110 Necrophobia", () => {
  it("plays a purple level 5 from trash without activating its On Play effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-076", as: "sacrifice" }],
          hand: [{ card: "BT3-110", as: "option" }],
          trash: [{ card: "BT2-077", as: "revived" }],
        },
        1: { battleArea: [{ card: "BT3-085", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("revived").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("sacrifice").permanentId),
    ).toBe(true);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("opponent").permanentId),
    ).toBe(true);
  });

  it("activates its full Main effect from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT3-110", as: "securityOption", faceUp: true }],
          trash: [{ card: "BT3-085", as: "revived" }],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("revived").instanceId),
    ).toBe(true);
  });
});
