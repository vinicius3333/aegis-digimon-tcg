import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-049.js";

describe("BT6-049 Arbormon", () => {
  it("digivolves onto a green Tamer for 2 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-088", as: "tamer" }],
        hand: [{ card: "BT6-049", as: "arbormon" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("arbormon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT6-049" && s.state.memory === 1);
    expect(s.state.memory).toBe(1);
    expect(s.perm("tamer").topCard?.cardId).toBe("BT6-049");
  });

  it("rejects a non-green Tamer as its alternate digivolution base", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-085", as: "redTamer" }],
        hand: [{ card: "BT6-049", as: "arbormon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redTamer").permanentId,
        instanceId: s.inst("arbormon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("redTamer").topCard?.cardId).toBe("BT1-085");
  });
});
