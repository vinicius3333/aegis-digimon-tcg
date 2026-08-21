import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST19-04.js";

describe("ST19-04 PawnChessmon", () => {
  it("trashes one Puppet from hand and draws two on play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST19-04", as: "pawn" }],
        hand: [{ card: "ST19-02", as: "cost" }],
        deck: [{ card: "BT1-010", as: "first" }, { card: "BT1-011", as: "second" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("pawn"));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
    ]);
  });

  it("catalogues the inherited Reboot keyword", () => {
    expect(getCardDefinition("ST19-04")).toMatchObject({ inheritedEffectText: "＜Reboot＞." });
  });

  it("exposes inherited Reboot on a real evolution stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST19-10", as: "host", under: ["ST19-04"] }] },
      1: {},
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
  });
});
