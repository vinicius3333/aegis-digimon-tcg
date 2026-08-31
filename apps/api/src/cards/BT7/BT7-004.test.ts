import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-004.js";

describe("BT7-004 Koromon", () => {
  it("reveals the top card and lets you move it to the deck bottom when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-066", under: ["BT7-004"], as: "host" }],
          deck: [
            { card: "BT1-011", as: "revealed" },
            { card: "BT1-012", as: "second" },
          ],
        },
        1: { security: ["BT1-101"] },
      },
      { autoChooseOption: true, preferOptionIndex: 1 },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.at(-1)?.instanceId === s.inst("revealed").instanceId);

    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("revealed").instanceId);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("second").instanceId);
  });

  it("does not reveal when an unrelated allied Digimon attacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-066", under: ["BT7-004"], as: "host" },
          { card: "BT1-066", as: "otherAttacker" },
        ],
        deck: [{ card: "BT1-011", as: "top" }, "BT1-012"],
      },
      1: { security: ["BT1-101"] },
    }, { autoChooseOption: true, preferOptionIndex: 1 });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("otherAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("otherAttacker").isSuspended);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("top").instanceId);
  });
});
