import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

describe("bounded Recovery parameters", () => {
  it("publicly evolves BT7-038 and places the exact deck card face down on security", async () => {
    cite("comprehensive-0224", "Recovery +1 places one card from the specified deck area face down on top of security");
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-035", as: "base" }],
        hand: [{ card: "BT7-038", as: "evolving" }],
        deck: [
          { card: "BT1-050", as: "filler" },
          { card: "BT1-049", as: "next" },
          { card: "BT1-048", as: "top" },
        ],
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
    expect(s.state.players[0]!.security.find(({ cardId }) => cardId === "BT1-049")).toMatchObject({
      cardId: "BT1-049",
      instanceId: s.inst("next").instanceId,
      faceUp: false,
    });
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("publicly evolves BT9-040 with its exact Angewomon source and recovers to the five-security limit", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-037", as: "base" }],
        hand: [{ card: "BT9-040", as: "evolving" }],
        security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
        deck: [
          { card: "BT1-050", as: "filler" },
          { card: "BT1-049", as: "next" },
          { card: "BT1-048", as: "top" },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 6);
    expect(s.state.players[0]!.security.find(({ cardId }) => cardId === "BT1-049")).toMatchObject({
      cardId: "BT1-049",
      instanceId: s.inst("next").instanceId,
      faceUp: false,
    });
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw or change security when the Recovery deck area is empty", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-035", as: "base" }],
        hand: [{ card: "BT7-038", as: "evolving" }],
        security: ["BT1-001"],
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
    await settle(() => s.perm("base").topCard?.cardId === "BT7-038");
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("publicly plays BT2-039 and places exactly two named deck instances on security in deck order", async () => {
    cite("comprehensive-0224", "Recovery places the specified number of cards from the deck face down on security");
    const s = setupEngine({
      0: {
        hand: [{ card: "BT2-039", as: "source" }],
        security: [{ card: "BT1-049", as: "existing" }],
        deck: [
          { card: "BT1-050", as: "recoveryA" },
          { card: "BT1-051", as: "recoveryB" },
          { card: "BT1-052", as: "remaining" },
        ],
      },
    });
    s.state.memory = 11;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 3);
    expect(s.state.players[0]!.security.slice(0, 2).map(({ instanceId }) => instanceId)).toEqual([
      s.inst("recoveryB").instanceId,
      s.inst("recoveryA").instanceId,
    ]);
    expect(s.state.players[0]!.security.slice(0, 2).every(({ faceUp }) => faceUp === false)).toBe(true);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("remaining").instanceId]);
  });

  it("does not recover from BT9-040 when its public evolution begins above five security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-037", as: "base" }],
        hand: [{ card: "BT9-040", as: "evolving" }],
        security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"],
        deck: [
          { card: "BT1-049", as: "drawn" },
          { card: "BT1-048", as: "deckTop" },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT9-040");
    expect(s.state.players[0]!.security).toHaveLength(6);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
  });
});
