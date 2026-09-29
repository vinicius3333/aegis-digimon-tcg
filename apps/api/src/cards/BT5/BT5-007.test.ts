import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-007.js";

describe("BT5-007 Agumon", () => {
  it("adds an eligible Greymon and an Omnimon from the revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT5-007", as: "source" }],
          deck: [{ card: "BT5-010", as: "greymon" }, { card: "BT5-086", as: "omnimon" }, "BT4-013"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const added = [s.inst("greymon").instanceId, s.inst("omnimon").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => added.every((id) => player.hand.some((card) => card.instanceId === id)));
    expect(player.deck.map((card) => card.cardId)).toEqual(["BT4-013"]);
  });

  it("adds the one eligible family card when the other family is absent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT5-007", as: "source" }],
          deck: [{ card: "BT5-010", as: "greymon" }, "BT4-013", "BT4-014"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === s.inst("greymon").instanceId));
    expect(player.hand).toHaveLength(1);
    expect(player.deck.map((card) => card.cardId)).toEqual(["BT4-013", "BT4-014"]);
  });

  it("excludes DoruGreymon, BurningGreymon, and DexDoruGreymon by name", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT5-007", as: "source" }],
          deck: ["BT7-064", "BT4-013", "BT9-078"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.deck.length === 3);

    expect(player.hand).toHaveLength(0);
    expect(player.deck.map((card) => card.cardId)).toEqual(["BT7-064", "BT4-013", "BT9-078"]);
  });
});

describe("BT5-007 Agumon — KB Q&A rulings", () => {
  it("adds a lone [Greymon] or a lone [Omnimon] even when the other family is not revealed (Q1284)", async () => {
    async function playRevealing(deck: { card: string; as?: string }[]) {
      const s = setupEngine({ 0: { hand: [{ card: "BT5-007", as: "source" }], deck } }, { autoSelectCards: true });
      const player = s.state.players[0] as PlayerState;
      s.state.memory = 3;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
        ok: true,
      });
      await drainMicrotasks();
      expect(s.state.pendingDecision).toBeUndefined();
      return { hand: player.hand.map((card) => card.cardId), deck: player.deck.map((card) => card.cardId) };
    }

    const omnimonOnly = await playRevealing([{ card: "BT5-086" }, { card: "BT4-013" }, { card: "BT4-014" }]);
    expect(omnimonOnly.hand).toEqual(["BT5-086"]);
    expect(omnimonOnly.deck).toEqual(["BT4-013", "BT4-014"]);

    const greymonOnly = await playRevealing([{ card: "BT4-013" }, { card: "BT5-010" }, { card: "BT4-014" }]);
    expect(greymonOnly.hand).toEqual(["BT5-010"]);
    expect(greymonOnly.deck).toEqual(["BT4-013", "BT4-014"]);

    const neither = await playRevealing([{ card: "BT4-013" }, { card: "BT4-014" }, { card: "BT9-078" }]);
    expect(neither.hand).toEqual([]);
    expect(neither.deck).toEqual(["BT4-013", "BT4-014", "BT9-078"]);
  });
});
