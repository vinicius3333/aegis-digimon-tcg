import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, SubTriggerInstall } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import module from "./BT26-048.js";
import "../index.js";

const CARD_ID = "BT26-048";

function primitives(s: ReturnType<typeof setupEngine>): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

function source(): CardSource {
  return {
    instanceId: "bloom",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: {} as CardDefinition,
    permanent: () => ({ permanentId: "bloom-permanent" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-048 BloomLordmon", () => {
  it("uses the off-color Lv.5 DM evolution, pays 3, trashes the face-down bottom card, and freely plays Ver.4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-060", as: "blackDm" }],
          hand: [
            { card: CARD_ID, as: "bloom" },
            { card: "EX9-035", as: "ver4" },
            { card: "BT26-043", as: "secondVer4" },
            { card: "AD1-001", as: "material" },
          ],
          deck: ["BT5-022"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await primitives(s).placeUnder(s.perm("blackDm").permanentId, [s.inst("material").instanceId], {
      faceUp: false,
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blackDm").permanentId,
        instanceId: s.inst("bloom").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX9-035"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("blackDm").topCard.cardId).toBe(CARD_ID);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("material").instanceId);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX9-035")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondVer4").instanceId);
  });

  it("exposes both printed keywords through the continuous engine", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "bloom" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("bloom"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("bloom"), "Vortex")).toBe(true);
  });

  it("Q7051: may suspend the Ver.4 Digimon just played by its When Attacking effect for Alliance", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "bloom" }],
          hand: [
            { card: "EX9-035", as: "ver4" },
            { card: "AD1-001", as: "material" },
          ],
        },
        1: { security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await primitives(s).placeUnder(s.perm("bloom").permanentId, [s.inst("material").instanceId], {
      faceUp: false,
    });
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bloom").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => combat.hasOpenAllianceDecision);

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "EX9-035")!;
    expect(played).toBeDefined();
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: played.permanentId } as never)).toEqual({
      ok: true,
    });
    await settle(() => played.isSuspended);
    expect(played.isSuspended).toBe(true);
  });

  it("shares the same effect identity across evolution and attack and requires an eligible hand card plus face-down bottom", () => {
    const cardSource = source();
    const hand = [
      { instanceId: "valid", cardId: "VALID" },
      { instanceId: "too-large", cardId: "LARGE" },
      { instanceId: "near-trait", cardId: "NEAR" },
      { instanceId: "option", cardId: "OPTION" },
    ];
    const battleArea = [
      { permanentId: "valid-host", topCard: { cardId: "DIGIMON" }, stack: [{ instanceId: "fd", faceUp: false }] },
      { permanentId: "face-up-host", topCard: { cardId: "DIGIMON" }, stack: [{ instanceId: "fu", faceUp: true }] },
    ];
    const definitions: Record<string, CardDefinition> = {
      VALID: { kinds: [CardKind.Digimon], types: ["Ver.4"], dp: 6000 } as CardDefinition,
      LARGE: { kinds: [CardKind.Digimon], types: ["Ver.4"], dp: 6001 } as CardDefinition,
      NEAR: { kinds: [CardKind.Digimon], types: ["Ver.40"], dp: 1000 } as CardDefinition,
      OPTION: { kinds: [CardKind.Option], types: ["Ver.4"], dp: 0 } as CardDefinition,
      DIGIMON: { kinds: [CardKind.Digimon] } as CardDefinition,
    };
    const ctx = {
      game: {
        player: () => ({ hand, battleArea }),
        definitionOf: (card: { cardId: string }) => definitions[card.cardId],
      } as unknown as GameAccess,
    } as EffectContext;
    const effects = [EffectTiming.WhenDigivolving, EffectTiming.OnAllyAttack].map(
      (timing) => module.effectsForTiming(timing, cardSource)[0]!,
    );

    expect(new Set(effects.map(({ effectKey }) => effectKey))).toEqual(
      new Set([`${CARD_ID}/divi-attack-trash-bottom-to-play-ver4`]),
    );
    expect(effects.every((effect) => effect.canActivate?.(ctx) === true)).toBe(true);
    hand.splice(0, 1);
    expect(effects.every((effect) => effect.canActivate?.(ctx) === false)).toBe(true);
  });

  it("does not play the selected card when the face-down trash cost is prevented", async () => {
    const cardSource = source();
    const host = {
      permanentId: "host",
      controllerSeat: 0 as Seat,
      topCard: { cardId: "DIGIMON" },
      stack: [{ instanceId: "bottom", faceUp: false }],
    };
    const playInstances = vi.fn();
    const ctx = {
      game: {
        player: () => ({
          hand: [{ instanceId: "valid", cardId: "VALID" }],
          battleArea: [host],
        }),
        definitionOf: (card: { cardId: string }) =>
          card.cardId === "VALID"
            ? ({ kinds: [CardKind.Digimon], types: ["Ver.4"], dp: 6000 } as CardDefinition)
            : ({ kinds: [CardKind.Digimon] } as CardDefinition),
        permanentById: () => host,
      } as unknown as GameAccess,
      ask: {
        selectCards: vi.fn(async () => ["valid"]),
      },
      fx: {
        trashDigivolutionCards: vi.fn(async () => []),
        playInstances,
      },
    } as unknown as EffectContext;

    await module.effectsForTiming(EffectTiming.WhenDigivolving, cardSource)[0]!.resolve(ctx);
    expect(playInstances).not.toHaveBeenCalled();
  });

  it("Q7050: one face-down batch creates one debuff window and ignores face-up, opponent, and unattributed batches", async () => {
    const cardSource = source();
    const installed: SubTriggerInstall[] = [];
    const own = { permanentId: "own", controllerSeat: 0 as Seat };
    const opposing = { permanentId: "opposing", controllerSeat: 1 as Seat };
    const target = { permanentId: "target", controllerSeat: 1 as Seat, topCard: { cardId: "DIGIMON" } };
    const modifyDP = vi.fn();
    const ctx = {
      source: cardSource,
      game: {
        permanentById: (id: string) => (id === "own" ? own : id === "opposing" ? opposing : target),
        opponentOf: () => 1 as Seat,
        player: () => ({ battleArea: [target] }),
        definitionOf: () => ({ kinds: [CardKind.Digimon] }),
      } as unknown as GameAccess,
      fx: {
        subscribeSubTrigger: vi.fn((sub) => installed.push(sub)),
        modifyDP,
      } as unknown as Primitives,
    } as unknown as EffectContext;
    const effect = module
      .effectsForTiming(EffectTiming.None, cardSource)
      .find(({ effectKey }) => effectKey.endsWith("all-turns-divi-trashed-debuff"))!;
    await effect.resolve(ctx);
    const watcher = installed[0]!;
    const payload = {
      subjectPermanentId: "own",
      byEffectSeat: 0 as Seat,
      trashedDigivolutionInstanceIds: ["a", "b"],
      trashedFaceDownDigivolutionInstanceIds: ["a", "b"],
    };

    expect(watcher.matches!({ ...ctx, trigger: payload } as EffectContext)).toBe(true);
    expect(
      watcher.matches!({
        ...ctx,
        trigger: { ...payload, trashedFaceDownDigivolutionInstanceIds: [] },
      } as EffectContext),
    ).toBe(false);
    expect(watcher.matches!({ ...ctx, trigger: { ...payload, subjectPermanentId: "opposing" } } as EffectContext)).toBe(
      false,
    );
    expect(watcher.matches!({ ...ctx, trigger: { ...payload, byEffectSeat: undefined } } as EffectContext)).toBe(false);

    await watcher.run({ ...ctx, trigger: payload } as EffectContext);
    expect(modifyDP).toHaveBeenCalledTimes(1);
    expect(modifyDP).toHaveBeenCalledWith("target", -6000, expect.anything());
  });
});
