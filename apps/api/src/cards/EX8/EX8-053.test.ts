import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-053.js";

describe("EX8-053", () => {
  it("has Blocker, gains +5000 DP when the opponent has a 13000 DP or higher Digimon, and plays a Mineral/Rock Digimon costing 8 or less on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static" && entry.keywords)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Aura",
      effect: { kind: "modifyDP", amount: 5000 },
      while: { kind: "opponentHas" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [{ count: 1, to: "play", optional: true }],
      rest: "trash",
    });
  });
  it("gains and loses the live +5000 DP aura at the exact 13000 DP boundary", async () => {
    const high = setupEngine({
      0: { battleArea: [{ card: "EX8-053", as: "bancho" }] },
      1: { battleArea: [{ card: "AD1-004", as: "opponent", dp: 13000 }] },
    });
    await high.ready();
    await settle(() => high.perm("bancho").currentDP === 16000);
    expect(high.perm("bancho").currentDP).toBe(16000);
    expect(observe(high.engine).hasKeyword(high.perm("bancho"), "Blocker")).toBe(true);

    const low = setupEngine({
      0: { battleArea: [{ card: "EX8-053", as: "bancho" }] },
      1: { battleArea: [{ card: "AD1-004", as: "opponent", dp: 12999 }] },
    });
    await low.ready();
    await settle(() => low.perm("bancho").currentDP === 11000);
    expect(low.perm("bancho").currentDP).toBe(11000);
  });
  it.each([
    ["Mineral", "EX8-048"],
    ["Rock", "EX8-050"],
  ])("plays a revealed %s Digimon after deletion", async (_trait, eligibleCardId) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-053", as: "bancho", suspended: true }],
          deck: [eligibleCardId, "BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("bancho").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === eligibleCardId) &&
        s.state.players[0]!.deck.length === 0 &&
        s.state.players[0]!.trash.filter((card) => ["BT1-009", "BT1-010"].includes(card.cardId)).length === 2,
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === eligibleCardId)).toBe(true);
    expect(s.state.players[0]!.trash.filter((card) => ["BT1-009", "BT1-010"].includes(card.cardId))).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("accepts the exact cost-8 ceiling and rejects a matching cost-9 fixture", async () => {
    const overCeiling = getCardDefinition("BT4-073")!;
    const printedCost = overCeiling.playCost;
    overCeiling.playCost = 9;
    try {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX8-053", as: "bancho", suspended: true }],
            deck: ["BT4-072", "BT4-073", "BT1-010"],
          },
          1: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("bancho").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.deck.length === 0 && s.state.pendingDecision === undefined);

      expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT4-072")).toBe(true);
      expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
        expect.arrayContaining(["BT4-073", "BT1-010"]),
      );
    } finally {
      overCeiling.playCost = printedCost;
    }
  });

  it("may decline the deletion play and trashes all three revealed cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-053", as: "bancho", suspended: true }],
        deck: ["EX8-048", "EX8-050", "BT1-010"],
      },
      1: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("bancho").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decline = s.state.pendingDecision!;
    expect(JSON.parse(decline.payloadJson)).toMatchObject({ min: 0, max: 1 });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decline.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX8-053", "EX8-048", "EX8-050", "BT1-010"]),
    );
  });

  it("redirects a player attack through Blocker", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-053", as: "bancho" }], security: ["BT1-010"] },
      1: { battleArea: [{ card: "AD1-001", as: "attacker", dp: 5000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("bancho").permanentId })).toEqual(
      { ok: true },
    );
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("bancho").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("builds the legal black level-4 to level-5 to EX8-053 stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-049", as: "lineage" }],
        hand: [
          { card: "EX8-050", as: "gogmamon" },
          { card: "EX8-053", as: "bancho" },
        ],
      },
    });
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lineage").permanentId,
        instanceId: s.inst("gogmamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lineage").topCard.cardId === "EX8-050");
    expect(s.state.memory).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lineage").permanentId,
        instanceId: s.inst("bancho").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lineage").topCard.cardId === "EX8-053");

    expect(s.state.memory).toBe(0);
    expect(s.perm("lineage").stack.map((card) => card.cardId)).toEqual(["EX8-049", "EX8-050"]);
  });

  it("rejects standard evolution from an off-color level 5", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-079", as: "purpleLevel5" }],
        hand: [{ card: "EX8-053", as: "bancho" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("purpleLevel5").permanentId,
        instanceId: s.inst("bancho").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(3);
    expect(s.perm("purpleLevel5").topCard.cardId).toBe("BT10-079");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX8-053")).toBe(true);
  });
});
