import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-038.js";

describe("BT7-038 JetSilphymon", () => {
  it("reduces its evolution cost by 2 when the base has a Tamer source", async () => {
    const s = setupEngine({
      0: {
        // Legal frontier stack: Zoe Orimoto -> L4 Hybrid Kazemon -> L5 JetSilphymon.
        battleArea: [{ card: "BT7-035", under: ["BT7-088"], as: "base" }],
        hand: [{ card: "BT7-038", as: "evolving" }],
        deck: ["BT1-048", "BT1-049"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.cardId).toBe("BT7-038");
  });

  it("recovers one card when it has a Hybrid source", async () => {
    const s = setupEngine({
      0: {
        // Legal ordinary evolution base with a Hybrid source: L4 Kazemon -> L5 JetSilphymon.
        battleArea: [{ card: "BT7-035", as: "base" }],
        hand: [{ card: "BT7-038", as: "evolving" }],
        deck: ["BT1-048", "BT1-049"],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
