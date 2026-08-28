import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT2-034.js";

describe("BT2-034 Salamon", () => {
  it("recovers 1 from deck on deletion with 3 or fewer security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-034", as: "salamon", under: ["BT2-003"] }],
        security: ["BT1-010", "BT1-011", "BT1-012"],
        deck: [{ card: "BT1-013", as: "recovery" }],
      },
    });
    await advance(s.engine).verb.deletePermanent([s.perm("salamon").permanentId]);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(4);
  });

  it("does not recover when its controller already has 4 security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-034", as: "salamon", under: ["BT2-003"] }],
        security: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        deck: [{ card: "BT1-014", as: "topDeck" }],
      },
    });

    await advance(s.engine).verb.deletePermanent([s.perm("salamon").permanentId]);

    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("topDeck").instanceId);
  });

  it("Q1009 resolves simultaneous copies sequentially and stops at 4 security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-034", as: "first", under: ["BT2-003"] },
          { card: "BT2-034", as: "second", under: ["BT2-003"] },
        ],
        security: ["BT1-010", "BT1-011", "BT1-012"],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId, s.perm("second").permanentId]);
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
