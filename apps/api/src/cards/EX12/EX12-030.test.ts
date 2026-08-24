import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

const cardId = "EX12-030";

describe("EX12-030 Thetismon", () => {
  it("uses the actual number of hand cards trashed to scale -2000 DP on play and digivolving", () => {
    const card = getCardDefinition(cardId);
    const compiled = registeredCompiledCards.get(cardId)!;
    expect(card).toMatchObject({
      nameEn: "Thetismon",
      colors: ["Blue", "Yellow"],
      playCost: 7,
      dp: 7000,
      level: 5,
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Aquabeast", "DS"],
      evoCosts: [
        { color: "Blue", level: 4, memoryCost: 4 },
        { color: "Yellow", level: 4, memoryCost: 4 },
      ],
    });
    expect(card?.effectText).toContain("for each card this effect trashed");
    expect(card?.inheritedEffectText).toContain("by returning 3 cards");
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -2000,
        optional: true,
        cost: {
          kind: "trash",
          target: { filter: { zone: "hand", controller: "mine" }, count: 3, upTo: true },
        },
        scaling: { per: 1, usePaidCount: true, unit: "cards" },
      });
      expect(effect.actions[1]).toMatchObject({ kind: "Return", to: "deckBottom", target: { count: 1 } });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          actions: [
            {
              kind: "Unsuspend",
              optional: true,
              abortOnDecline: true,
              cost: { kind: "return", target: { count: 3, filter: { zone: "trash", controller: "mine" } } },
            },
          ],
        },
      ],
    });
  });

  it("trashes two hand cards, gives -4000 DP, and returns the 3000-DP result to deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "BT1-001", as: "firstTrash" },
            { card: "BT1-002", as: "secondTrash" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-002"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(3);
  });

  it("returns a target even when the optional hand trash is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "BT1-001", as: "preserved" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent", dp: 5000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("preserved").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-011"]);
  });

  it("returns a Digimon reduced to 0 DP before the later rule check can delete it (Q6765)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "BT1-001", as: "firstTrash" },
            { card: "BT1-002", as: "secondTrash" },
            { card: "BT1-003", as: "thirdTrash" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent", dp: 6000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("applies the same scaled reduction and return when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-010", as: "base" }],
          hand: [
            { card: cardId, as: "source" },
            { card: "BT1-001", as: "trash" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("base").topCard?.cardId).toBe(cardId);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-001"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-011"]);
  });

  it("returns three Jellymon/DS cards to the deck to unsuspend its inherited host once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-011", as: "host", suspended: true, under: [{ card: cardId, as: "source" }] }],
          trash: ["EX12-027", "EX12-023", "EX12-028", "EX12-027", "EX12-023", "EX12-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      suspendedPermanentId: s.perm("host").permanentId,
    });
    await settle(() => !s.perm("host").isSuspended);

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(3);

    s.perm("host").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      suspendedPermanentId: s.perm("host").permanentId,
    });
    await settle();

    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(3);
  });

  it("cannot pay the inherited cost with only two matching trash cards (Q6764)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-011", as: "host", suspended: true, under: [cardId] }],
          trash: ["EX12-027", "EX12-023"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      suspendedPermanentId: s.perm("host").permanentId,
    });
    await settle();

    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("uses a full-text Jellymon match and routes a returned Digi-Egg to the egg deck (Q6763/Q6766)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-011", as: "host", suspended: true, under: [cardId] }],
          trash: [
            { card: "BT13-028", as: "textOnly" },
            { card: "EX12-023", as: "dsCard" },
            { card: "EX8-002", as: "egg" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      suspendedPermanentId: s.perm("host").permanentId,
    });
    await settle(() => !s.perm("host").isSuspended);

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT13-028", "EX12-023"]),
    );
    expect(s.state.players[0]!.eggDeck.map((card) => card.cardId)).toEqual(["EX8-002"]);
  });

  it("uses both normal colors and both cost-3 evolution alternatives", async () => {
    expect(digivolutionRequirementsFor(cardId)).toEqual([
      { level: 4, texts: ["Jellymon"], cost: 3, isAlternate: true },
      { traits: ["DS"], cost: 3, isAlternate: true, level: 4 },
    ]);

    for (const [baseCardId, useAlternateCost, startingMemory] of [
      ["AD1-010", false, 4],
      ["BT1-051", false, 4],
      ["EX12-027", true, 3],
      ["EX8-058", true, 3],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: cardId, as: "thetismon" }],
        },
      });
      s.state.memory = startingMemory;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("thetismon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === cardId);
      expect(s.state.memory).toBe(0);
    }
  });

  it("rejects an off-color level-4 Digimon without Jellymon text or DS", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-074", as: "base" }],
        hand: [{ card: cardId, as: "thetismon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("thetismon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("survives a losing security battle with Jamming and does not grant it while buried", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "attacker" },
          { card: "BT1-010", as: "plainHost", under: [cardId] },
        ],
      },
      1: { security: ["BT1-081"] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plainHost"), "Jamming")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("attacker").permanentId),
    ).toBe(true);
  });
});
