import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition, PlayerState } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./index.js";
import { compiled } from "./EX8-039.js";

describe("EX8-039", () => {
  it("matches the committed catalog identity, evolution, and printed text", () => {
    expect(getCardDefinition("EX8-039")).toMatchObject({
      cardId: "EX8-039",
      nameEn: "Tentomon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Insectoid", "NSp"],
      effectText:
        "[Digivolve]Lv.2 w/[NSp]\u00a0trait: Cost 0 \n\n[On Play] Reveal the top 3 cards of your deck. Add 1 card with the [Insectoid]\u00a0trait and 1 card with the [NSp]\u00a0trait among them to the hand. Return the rest to the bottom of the deck.",
      inheritedEffectText: "[Your Turn] This Digimon gets +2000 DP.",
    });
    expect(getCardDefinition("EX8-039")?.securityEffectText).toBeUndefined();
    expect(digivolutionRequirementsFor("EX8-039")).toEqual([{ level: 2, traits: ["NSp"], cost: 0, isAlternate: true }]);
  });

  it("traces the exact Insectoid/NSp search filters, reveal count, bottom destination, and inherited gate", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["NSp"], cost: 0, isAlternate: true }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        {
          count: 1,
          to: "hand",
          filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Insectoid"], match: "trait" }] },
        },
        {
          count: 1,
          to: "hand",
          filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["NSp"], match: "trait" }] },
        },
      ],
      rest: "deckBottom",
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          amount: 2000,
          duration: "permanent",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        },
      ],
    });
  });
  it("inherits +2000 DP during its owner's turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent", target: { isSelf: true } }],
    }));
  it("reveals three cards, adds matching Insectoid and NSp cards, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-039", as: "tentomon" }],
          deck: [
            { card: "ST4-03", as: "insectoid" },
            { card: "EX7-015", as: "nsp" },
            { card: "AD1-001", as: "rest" },
            { card: "BT1-048", as: "anchor" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tentomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        player.hand.some((card) => card.instanceId === s.inst("insectoid").instanceId) &&
        player.hand.some((card) => card.instanceId === s.inst("nsp").instanceId),
    );
    expect(player.hand.some((card) => card.instanceId === s.inst("insectoid").instanceId)).toBe(true);
    expect(player.hand.some((card) => card.instanceId === s.inst("nsp").instanceId)).toBe(true);
    expect(player.deck.map((card) => card.cardId)).toEqual(["BT1-048", "AD1-001"]);
  });

  it("grants the inherited DP only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-071", as: "host", under: ["EX8-039"] }] } });
    await s.ready();
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(8000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(6000);
    s.state.turnSeat = 0;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(8000);
  });

  it("returns an entirely nonmatching reveal below an unrevealed card", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX8-039", as: "tentomon" }], deck: ["BT1-045", "BT1-046", "BT1-047", "BT1-048"] } },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tentomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck[0]?.cardId === "BT1-048");
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-048", "BT1-045", "BT1-046", "BT1-047"]);
  });

  it("evolves from an off-color NSp egg for zero and rejects a non-NSp egg", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "P-148", as: "egg" },
        hand: [{ card: "EX8-039", as: "tentomon" }],
        deck: ["BT1-045", "BT1-046"],
      },
    });
    await s.ready();
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("tentomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-045"));
    expect(s.perm("egg").topCard.cardId).toBe("EX8-039");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toContain("P-148");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-045"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-046"]);

    const invalid = setupEngine({
      0: { breeding: { card: "EX8-002", as: "egg" }, hand: [{ card: "EX8-039", as: "tentomon" }] },
    });
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("egg").permanentId,
        instanceId: invalid.inst("tentomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("uses the standard Green level-2 route for zero", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-007", as: "greenEgg" },
        hand: [{ card: "EX8-039", as: "tentomon" }],
        deck: ["BT1-045", "BT1-046", "BT1-047", "BT1-048"],
      },
    });
    await s.ready();
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenEgg").permanentId,
        instanceId: s.inst("tentomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greenEgg").topCard.cardId === "EX8-039");
    expect(s.perm("greenEgg").stack.map((card) => card.cardId)).toEqual(["BT1-007"]);
    expect(s.state.memory).toBe(0);
  });
});
