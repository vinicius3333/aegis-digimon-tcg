import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST19-04.js";

describe("ST19-04 PawnChessmon", () => {
  it("trashes one Puppet from hand and draws two on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "ST19-04", as: "pawn" },
            { card: "ST19-02", as: "cost" },
          ],
          deck: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-011", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pawn").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
    ]);
  });

  it("catalogues the inherited Reboot keyword", () => {
    expect(getCardDefinition("ST19-04")).toMatchObject({ inheritedEffectText: "＜Reboot＞." });
  });

  it("does not draw when the Puppet trash cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST19-04", as: "pawn" }],
          deck: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-011", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pawn").instanceId })).toEqual({ ok: true });
    await s.ready();
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
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
