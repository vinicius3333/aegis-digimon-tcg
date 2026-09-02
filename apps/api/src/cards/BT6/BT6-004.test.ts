import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT5/BT5-062.js";
import "./BT6-004.js";

describe("BT6-004 Pinamon", () => {
  it("draws when its host attacks an opposing Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-047", under: ["BT6-004"], as: "host" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
      1: { battleArea: [{ card: "BT1-011", suspended: true, as: "target" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("does not draw when a player-directed attack is redirected by Blocker (Q1400)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-047", under: ["BT6-004"], as: "host" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
      1: { battleArea: [{ card: "BT5-062", as: "blocker" }], security: ["BT1-011"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(false);
  });
});
