import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type {
  EffectContext,
  GameAccess,
  Primitives,
  ReplacementInstallInstead,
  SubTriggerInstall,
} from "../../engine/effects/EffectContext.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import module from "./BT26-029.js";
import "../index.js";

const CARD_ID = "BT26-029";

function primitives(s: ReturnType<typeof setupEngine>): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

function source(): CardSource {
  return {
    instanceId: "holy",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: {} as CardDefinition,
    permanent: () => ({ permanentId: "holy-permanent" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-029 Aegiochusmon: Holy", () => {
  it("uses the exact named Aegiomon evolution for cost 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-034", as: "aegiomon" }],
        hand: [{ card: CARD_ID, as: "holy" }],
        deck: ["BT5-022"],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("aegiomon").permanentId,
        instanceId: s.inst("holy").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("aegiomon").topCard.cardId === CARD_ID);
    expect(s.state.memory).toBe(0);
  });

  it("surfaces Decode, Ascension, and the Rule-granted Angel trait", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "holy" }] } });
    await s.ready();
    expect([...s.perm("holy").keywords]).toEqual(expect.arrayContaining(["Decode", "Ascension"]));
    expect(observe(s.engine).hasEffectiveTrait(s.perm("holy"), "Angel")).toBe(true);
    expect(cardHasTrait(CARD_ID, "Angel")).toBe(true);
    expect(cardHasTrait(CARD_ID, "Fallen Angel")).toBe(false);
  });

  it("pays top security and protects one chosen Digimon from every opponent stack-removal route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-028", as: "protected", under: [{ card: "BT21-047", as: "source" }] },
            { card: CARD_ID, as: "holy" },
          ],
          security: [{ card: "AD1-001", as: "cost" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("holy"));
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(observe(s.engine).isRestricted(s.perm("protected"), "dpImmune")).toBe(true);

    const sourceId = s.inst("source").instanceId;
    expect(
      await primitives(s).trashDigivolutionCards(s.perm("protected").permanentId, [sourceId], { byEffectSeat: 1 }),
    ).toEqual([]);
    expect(primitives(s).deDigivolve(s.perm("protected").permanentId, 1, { byEffectSeat: 1 })).toEqual([]);
    primitives(s).enterEffectResolution?.(1);
    try {
      expect(await primitives(s).returnToHand([sourceId])).toEqual([]);
      expect(await primitives(s).returnToDeck([sourceId])).toEqual([]);
    } finally {
      primitives(s).leaveEffectResolution?.();
    }
    expect(s.perm("protected").stack.map((card) => card.instanceId)).toContain(sourceId);

    // "Their effects" is opponent-qualified: the protected Digimon's controller may still
    // return its own stacked card, and the movement preserves the card's physical identity.
    expect(await primitives(s).returnToHand([sourceId], { byEffectSeat: 0 })).toMatchObject([
      { instanceId: sourceId, cardId: "BT21-047", faceUp: true },
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(sourceId);
    expect(s.perm("protected").stack.map((card) => card.instanceId)).not.toContain(sourceId);
  });

  it("does not turn stack-return protection into a global restriction", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-028", as: "unprotected", under: [{ card: "BT21-047", as: "source" }] }],
      },
    });
    await s.ready();
    const sourceId = s.inst("source").instanceId;
    expect(await primitives(s).returnToHand([sourceId], { byEffectSeat: 1 })).toMatchObject([
      { instanceId: sourceId, cardId: "BT21-047", faceUp: true },
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(sourceId);
  });

  it("installs both security-removal routes with one per-copy budget for each printed clause", async () => {
    const cardSource = source();
    const installed: SubTriggerInstall[] = [];
    const ctx = {
      source: cardSource,
      fx: {
        subscribeSubTrigger: vi.fn((sub) => installed.push(sub)),
        grantNameTrait: vi.fn(),
      } as unknown as Primitives,
    } as unknown as EffectContext;
    for (const effect of module
      .effectsForTiming(EffectTiming.None, cardSource)
      .filter(({ effectKey }) => effectKey.includes("security-removed"))) {
      await effect.resolve(ctx);
    }
    expect(installed).toHaveLength(4);
    expect(new Set(installed.slice(0, 2).map(({ oncePerTurnKey }) => oncePerTurnKey))).toEqual(
      new Set([`holy/${CARD_ID}/security-removed-dp-watchers`]),
    );
    expect(new Set(installed.slice(2).map(({ oncePerTurnKey }) => oncePerTurnKey))).toEqual(
      new Set([`holy/${CARD_ID}/inherited-security-removed-dedigivolve`]),
    );
  });

  it("implements Decode as a self-only, non-battle, optional free play of an exact Aegiomon source", async () => {
    const cardSource = source();
    const self = {
      permanentId: "holy-permanent",
      stack: [
        { instanceId: "valid", cardId: "VALID" },
        { instanceId: "invalid", cardId: "INVALID" },
      ],
    };
    cardSource.permanent = () => self as never;
    let replacement: ReplacementInstallInstead | undefined;
    const playInstances = vi.fn();
    const ctx = {
      source: cardSource,
      game: {
        definitionOf: (card: { cardId: string }) => ({
          kinds: [CardKind.Digimon],
          nameEn: card.cardId === "VALID" ? "Aegiomon" : "Aegiochusmon",
        }),
      } as unknown as GameAccess,
      ask: {
        selectCards: vi.fn(async (_ctx, options: { candidates: string[] }) => {
          expect(options.candidates).toEqual(["valid"]);
          return ["valid"];
        }),
      },
      fx: {
        subscribeReplacement: (install: ReplacementInstallInstead) => {
          replacement = install;
        },
        playInstances,
      } as unknown as Primitives,
    } as unknown as EffectContext;
    const effect = module
      .effectsForTiming(EffectTiming.None, cardSource)
      .find(({ effectKey }) => effectKey.endsWith("decode-aegiomon"))!;
    await effect.resolve(ctx);
    expect(replacement!.causeAllows!("byEffect", 1, false)).toBe(true);
    expect(replacement!.causeAllows!("byBattle", undefined, false)).toBe(false);
    expect(replacement!.appliesTo!(ctx, "holy-permanent")).toBe(true);
    expect(replacement!.appliesTo!(ctx, "other")).toBe(false);
    await replacement!.apply(ctx);
    expect(playInstances).toHaveBeenCalledWith(["valid"], { payCost: false });
  });

  it("Ascension places the battle-deleted card at top security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "holy", suspended: true }],
          security: ["AD1-001"],
        },
        1: { battleArea: [{ card: "BT10-055", as: "attacker", dp: 20000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("holy").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === CARD_ID));
    await settle(() => false, 50);
    expect(s.state.players[0]!.security.find((card) => card.cardId === CARD_ID)).toMatchObject({ faceUp: false });
  });
});
