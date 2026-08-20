import {
  EffectTiming,
  digivolutionRequirementsFor,
  type CardDefinition,
  type CardInstance,
  type Seat,
} from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import module from "./BT26-010.js";
import "../index.js";

const CARD_ID = "BT26-010";

function definition(cardId: string, types: string[] = [], attributes: string[] = []): CardDefinition {
  return {
    cardId,
    set: "TEST",
    nameEn: cardId,
    kinds: ["Digimon"] as never,
    colors: [],
    playCost: 0,
    dp: 0,
    types,
    attributes,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function source(): CardSource {
  return {
    instanceId: "source",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: definition(CARD_ID),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-010 Roleplaymon", () => {
  it("uses the exact Appmon Lv.2 cost-0 evolution and rejects an off-color non-Appmon Lv.2", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 2,
      traits: ["Appmon"],
      cost: 0,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT21-001", as: "appmon" }],
        hand: [{ card: CARD_ID, as: "roleplay" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 0;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("appmon").permanentId,
        instanceId: legal.inst("roleplay").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("appmon").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-003", as: "plain" }], hand: [{ card: CARD_ID, as: "roleplay" }] },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("plain").permanentId,
        instanceId: illegal.inst("roleplay").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("links through the public action only to Appmon, pays 3, and grants Progress plus Piercing", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-009", as: "host" }], hand: [{ card: CARD_ID, as: "link" }] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 1);
    await settle(() => observe(s.engine).hasKeyword(s.perm("host"), "Progress"));
    expect(s.state.memory).toBe(0);
    expect(s.perm("host").linked[0]).toMatchObject({ instanceId: s.inst("link").instanceId, faceUp: true });
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Progress")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Piercing")).toBe(true);

    const wrong = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "plain" }], hand: [{ card: CARD_ID, as: "link" }] },
    });
    wrong.state.memory = 3;
    expect(
      wrong.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: wrong.inst("link").instanceId,
        targetPermanentId: wrong.perm("plain").permanentId,
      }),
    ).toEqual(expect.objectContaining({ ok: false, reason: "link-requirement-unmet" }));
    expect(wrong.state.memory).toBe(3);
  });

  it("loses both linked keywords immediately when Roleplaymon leaves the link area (Q6964)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-009", as: "host", linked: [{ card: CARD_ID, as: "link" }] }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Progress")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Piercing")).toBe(true);
    await advance(s.engine).verb.trash([s.inst("link").instanceId]);
    await advance(s.engine).recompute();
    expect(s.perm("host").linked).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Progress")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Piercing")).toBe(false);
  });

  it("when attacking trashes an eligible Game card, then draws exactly 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "roleplay" }],
          hand: [{ card: "BT21-054", as: "cost" }],
          deck: [
            { card: "BT1-009", as: "one" },
            { card: "BT1-010", as: "two" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("roleplay"));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("one").instanceId,
      s.inst("two").instanceId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("offers exact Game/Open/Seven Code trait matches, excludes a near match, and permits declining", async () => {
    const hand = ["game", "open", "seven", "near"].map(
      (instanceId) => ({ instanceId, cardId: instanceId }) as CardInstance,
    );
    const defs = {
      game: definition("game", [], ["Game"]),
      open: definition("open", ["Open"]),
      seven: definition("seven", ["Seven Code"]),
      near: definition("near", ["Seven Codes"]),
    };
    const selectCards = vi.fn(async (_ctx, options: { candidates: string[]; min: number; max: number }) => {
      expect(options).toEqual({ candidates: ["game", "open", "seven"], min: 0, max: 1 });
      return [];
    });
    const trash = vi.fn();
    const draw = vi.fn();
    const cardSource = source();
    await module.effectsForTiming(EffectTiming.OnUseAttack, cardSource)[0]!.resolve({
      source: cardSource,
      game: {
        player: () => ({ hand }),
        definitionOf: (card: CardInstance) => defs[card.cardId as keyof typeof defs],
      } as unknown as GameAccess,
      ask: { selectCards },
      fx: { trash, draw } as unknown as Primitives,
    } as unknown as EffectContext);
    expect(trash).not.toHaveBeenCalled();
    expect(draw).not.toHaveBeenCalled();
  });

  it("does not draw when the chosen trash cost fails", async () => {
    const draw = vi.fn();
    const cardSource = source();
    await module.effectsForTiming(EffectTiming.OnUseAttack, cardSource)[0]!.resolve({
      source: cardSource,
      game: {
        player: () => ({ hand: [{ instanceId: "cost", cardId: "cost" }] }),
        definitionOf: () => definition("cost", ["Seven Code"]),
      } as unknown as GameAccess,
      ask: { selectCards: vi.fn(async () => ["cost"]) },
      fx: { trash: vi.fn(async () => []), draw } as unknown as Primitives,
    } as unknown as EffectContext);
    expect(draw).not.toHaveBeenCalled();
  });

  it("Q6964: Detach saves only the tied attacker and removes linked Piercing before the opponent is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-019", as: "attacker", dp: 4000, linked: [{ card: CARD_ID, as: "piercingLink" }] }],
        },
        1: {
          battleArea: [{ card: "BT26-019", as: "defender", dp: 4000, suspended: true }],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    const defenderId = s.perm("defender").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === defenderId));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("attacker").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("piercingLink").instanceId);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("declining Detach in an equal-DP battle deletes both Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-019", as: "attacker", dp: 4000, linked: [{ card: CARD_ID }] }] },
      1: { battleArea: [{ card: "BT26-019", as: "defender", dp: 4000, suspended: true }] },
    });
    const attackerId = s.perm("attacker").permanentId;
    const defenderId = s.perm("defender").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
  });

  it("an equal-DP battle offers each eligible loser its own Detach and both can survive", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-019", as: "attacker", dp: 4000, linked: [{ card: CARD_ID }] }] },
        1: {
          battleArea: [{ card: "BT26-019", as: "defender", dp: 4000, suspended: true, linked: [{ card: CARD_ID }] }],
        },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").linked.length === 0 && s.perm("defender").linked.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(2);
  });

  it("does not offer Detach for a linked card without the noted Seven Code trait", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-019", as: "attacker", dp: 4000, linked: [{ card: "BT21-009" }] }] },
      1: { battleArea: [{ card: "BT26-019", as: "defender", dp: 4000, suspended: true }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
    expect(s.decisions.some(({ req }) => req.kind === "selectCards")).toBe(false);
  });

  it("never offers battle-only Detach for deletion by an effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-019", as: "target", linked: [{ card: CARD_ID }] }] },
    });
    expect(await advance(s.engine).verb.deletePermanent([s.perm("target").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.decisions.some(({ req }) => req.kind === "selectCards")).toBe(false);
  });
});
