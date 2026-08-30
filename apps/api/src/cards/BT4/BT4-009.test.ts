import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-009.js";

describe("BT4-009 Flamemon", () => {
  it("adds a Hybrid Digimon and red Tamer from the revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT4-009", as: "source" }],
          deck: [{ card: "BT4-011", as: "hybrid" }, { card: "BT4-092", as: "tamer" }, "BT4-012"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const added = [s.inst("hybrid").instanceId, s.inst("tamer").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => added.every((id) => player.hand.some((card) => card.instanceId === id)));
    expect(player.deck).toHaveLength(1);
    expect(player.deck[0]!.cardId).toBe("BT4-012");
  });

  it("does not add a non-red Tamer or a non-Hybrid Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT4-009", as: "source" }],
          deck: [{ card: "BT4-011", as: "hybrid" }, { card: "BT4-093", as: "nonRedTamer" }, { card: "BT4-012", as: "nonHybrid" }],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.hand.some((card) => card.instanceId === s.inst("hybrid").instanceId));

    expect(player.hand.some((card) => card.instanceId === s.inst("nonRedTamer").instanceId)).toBe(false);
    expect(player.hand.some((card) => card.instanceId === s.inst("nonHybrid").instanceId)).toBe(false);
    expect(player.deck).toHaveLength(2);
  });

  it("digivolves from a legal red Digi-Egg without activating its On Play effect", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT4-001", as: "base" },
        hand: [{ card: "BT4-009", as: "evolving" }],
        deck: [{ card: "BT4-012", as: "drawn" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT4-009");

    expect(s.perm("base").topCard.cardId).toBe("BT4-009");
    expect(s.perm("base").stack.some((card) => card.cardId === "BT4-001")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT4-012")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.events.some(({ kind }) => kind === "effectActivated")).toBe(false);
  });
});
