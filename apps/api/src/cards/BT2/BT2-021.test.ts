import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT2-021.js";

describe("BT2-021 Veemon", () => {
  it("draws 1 when its host becomes unsuspended in the main phase", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-026", as: "host", under: ["BT2-021"], suspended: true }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("Q1001 does not draw when an unsuspend effect targets an already active host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-026", as: "host", under: ["BT2-021"] }],
        deck: [{ card: "BT1-010", as: "notDrawn" }],
      },
    });
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not draw when the host really unsuspends outside the main phase", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-026", as: "host", under: ["BT2-021"], suspended: true }],
        deck: [{ card: "BT1-010", as: "notDrawn" }],
      },
    });
    s.state.phase = Phase.Active;
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("draws only once after multiple real main-phase unsuspends in the same turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-026", as: "host", under: ["BT2-021"], suspended: true }],
        deck: [
          { card: "BT1-010", as: "first" },
          { card: "BT1-011", as: "second" },
        ],
      },
    });
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.state.players[0]!.hand).toHaveLength(1);

    s.perm("host").isSuspended = true;
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("second").instanceId);
  });

  it("does not draw when the host unsuspends during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-026", as: "host", under: ["BT2-021"], suspended: true }],
        deck: [{ card: "BT1-010", as: "notDrawn" }],
      },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
