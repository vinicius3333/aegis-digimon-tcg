import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-011.js";

describe("BT4-011 Agunimon", () => {
  it("digivolves from hand onto a red Tamer for 2 memory and draws the bonus", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-085", as: "tamer" }],
        hand: [{ card: "BT4-011", as: "aguni" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;
    const handBefore = s.state.players[0]!.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("aguni").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT4-011" && s.state.memory === 1);

    expect(s.perm("tamer").topCard?.cardId).toBe("BT4-011");
    expect(s.perm("tamer").stack[0]?.cardId).toBe("BT1-085");
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
  });

  it("cannot use a non-red Tamer as its alternate digivolution base", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-086", as: "tamer" }],
        hand: [{ card: "BT4-011", as: "aguni" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("aguni").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("tamer").topCard?.cardId).toBe("BT1-086");
  });
});
