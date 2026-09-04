import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-018.js";

describe("EX8-018", () => {
  it("reveals 3 for a DS card and a Sea Beast/Plesiosaur card", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    }));
  it("inherits a once-per-turn draw when attacking with seven or fewer cards in hand", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", amount: 1, condition: { kind: "zoneCount", value: 7 } }],
    }));
  it("selects the printed DS and Sea Beast/Plesiosaur matches from the live reveal", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-018", as: "gomamon" }],
          deck: [
            { card: "EX8-020", as: "ds" },
            { card: "BT1-041", as: "seaBeast" },
            { card: "AD1-001", as: "decoy" },
            { card: "BT1-045", as: "anchor" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gomamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.cardId === "EX8-020") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "BT1-041"),
    );
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX8-020", "BT1-041"]));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-045", "AD1-001"]);
  });

  it("returns all three cards to the bottom when neither printed trait matches", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-018", as: "gomamon" }],
          deck: ["AD1-001", "BT1-045", "BT1-046", "BT1-047"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gomamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 4);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-047", "AD1-001", "BT1-045", "BT1-046"]);
  });

  it("draws exactly once across two attacks at the inclusive seven-card boundary", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-037", as: "host", under: [{ card: "EX8-018", as: "gomamon" }] }],
        hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006", "BT1-007"],
        deck: ["AD1-001", "AD1-002"],
      },
      1: { security: 2 },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 8);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    await advance(s.engine).verb.trash([s.state.players[0]!.hand[0]!.instanceId], 0);
    expect(s.state.players[0]!.hand).toHaveLength(7);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(7);
  });

  it("does not draw when the host attacks with eight cards in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-037", as: "host", under: ["EX8-018"] }],
        hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006", "BT1-007", "BT1-008"],
        deck: ["AD1-001"],
      },
      1: { security: 1 },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(8);
  });

  it("uses the exact level-2 DS alternate route and rejects a non-DS base", async () => {
    expect(digivolutionRequirementsFor("EX8-018")).toContainEqual({
      level: 2,
      traits: ["DS"],
      cost: 0,
      isAlternate: true,
    });
    const eligible = setupEngine({
      0: { breeding: { card: "EX8-002", as: "bukamon" }, hand: [{ card: "EX8-018", as: "gomamon" }] },
    });
    await eligible.ready();
    expect(
      eligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eligible.perm("bukamon").permanentId,
        instanceId: eligible.inst("gomamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => eligible.perm("bukamon").topCard.instanceId === eligible.inst("gomamon").instanceId);
    expect(eligible.state.memory).toBe(0);

    const ineligible = setupEngine({
      0: { breeding: { card: "BT2-005", as: "kapurimon" }, hand: [{ card: "EX8-018", as: "gomamon" }] },
    });
    await ineligible.ready();
    expect(
      ineligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ineligible.perm("kapurimon").permanentId,
        instanceId: ineligible.inst("gomamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
