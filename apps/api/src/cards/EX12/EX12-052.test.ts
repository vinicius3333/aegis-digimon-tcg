import { describe, expect, it, vi } from "vitest";
import { CardKind, EffectDuration, EffectTiming, type CardDefinition, type Permanent, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { getEffectModule } from "../../engine/effects/registry.js";

describe("EX12-052 Diarbbitmon", () => {
  it("shares one once-per-turn budget across digivolving, attacking, and Counter", () => {
    const source = { cardId: "EX12-052", ownerSeat: 0 } as never;
    const module = getEffectModule("EX12-052");
    const effects = [EffectTiming.WhenDigivolving, EffectTiming.OnUseAttack, EffectTiming.OnCounterTiming]
      .flatMap((timing) => module?.effectsForTiming(timing, source) ?? [])
      .filter((effect) => effect.description.includes("gets +3000 DP"));

    expect(effects).toHaveLength(3);
    expect(new Set(effects.map((effect) => effect.effectKey))).toEqual(new Set(["EX12-052/once-per-turn-dp-battle"]));
    expect(effects.every((effect) => effect.maxPerTurn === 1)).toBe(true);
    expect(module?.effectsForTiming(EffectTiming.OnAllyAttack, source)).toHaveLength(0);
  });

  it("keeps the opponent Digimon-effect immunity as a separate unlimited clause", () => {
    const source = { cardId: "EX12-052", ownerSeat: 0 } as never;
    const module = getEffectModule("EX12-052");
    const immunity = module
      ?.effectsForTiming(EffectTiming.WhenDigivolving, source)
      .find((effect) => effect.description.includes("don't affect"));

    expect(immunity?.maxPerTurn).toBe(-1);
  });
});

describe("EX12-052 forced battle clause", () => {
  const cardModule = getEffectModule("EX12-052")!;

  function permanent(id: string, seat: Seat, cardId: string, suspended = false): Permanent {
    return {
      permanentId: id,
      controllerSeat: seat,
      topCard: { instanceId: `${id}-instance`, cardId, ownerSeat: seat, faceUp: true },
      stack: [],
      linked: [],
      baseDP: 10000,
      currentDP: 10000,
      isSuspended: suspended,
      inBreeding: false,
    } as unknown as Permanent;
  }

  function source(): CardSource {
    return {
      instanceId: "source-instance",
      cardId: "EX12-052",
      ownerSeat: 0,
      definition: {} as CardDefinition,
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as CardSource;
  }

  it("allows declining the buff, but forces the battle after choosing it", async () => {
    const own = permanent("own", 0, "BT1-009");
    const opponent = permanent("opponent", 1, "BT1-010");
    const choices: { min: number; max: number }[] = [];
    const modifyDP = vi.fn<(permanentId: string, delta: number, duration: EffectDuration) => void>();
    const forceBattle = vi.fn<(attackerPermanentId: string, defenderPermanentId: string) => Promise<void>>(
      async () => undefined,
    );
    const ctx = {
      source: source(),
      trigger: {},
      game: {
        player: (seat: Seat) => ({ battleArea: seat === 0 ? [own] : [opponent] }),
        opponentOf: () => 1 as Seat,
        permanentById: (id: string) =>
          id === own.permanentId ? own : id === opponent.permanentId ? opponent : undefined,
        definitionOf: () => ({ kinds: [CardKind.Digimon] }),
      },
      ask: {
        chooseTargets: async (_ctx: EffectContext, options: { candidates: string[]; min: number; max: number }) => {
          choices.push({ min: options.min, max: options.max });
          return [options.candidates[0]!];
        },
        optional: async () => {
          throw new Error("battle must not be an optional follow-up");
        },
      },
      fx: {
        modifyDP,
        forceBattle,
      },
    } as unknown as EffectContext;

    const effect = cardModule.effectsForTiming(EffectTiming.WhenDigivolving, source())[1]!;
    await effect.resolve(ctx);

    expect(choices).toEqual([
      { min: 0, max: 1 },
      { min: 1, max: 1 },
    ]);
    expect(modifyDP).toHaveBeenCalledWith(own.permanentId, 3000, EffectDuration.UntilOpponentTurnEnd);
    expect(forceBattle).toHaveBeenCalledWith(own.permanentId, opponent.permanentId);
  });

  it("does not force a battle when no opponent Digimon exists", async () => {
    const own = permanent("own-no-opponent", 0, "BT1-009");
    const modifyDP = vi.fn<(permanentId: string, delta: number, duration: EffectDuration) => void>();
    const forceBattle = vi.fn<(attackerPermanentId: string, defenderPermanentId: string) => Promise<void>>(
      async () => undefined,
    );
    const ctx = {
      source: source(),
      trigger: {},
      game: {
        player: (seat: Seat) => ({ battleArea: seat === 0 ? [own] : [] }),
        opponentOf: () => 1 as Seat,
        permanentById: (id: string) => (id === own.permanentId ? own : undefined),
        definitionOf: () => ({ kinds: [CardKind.Digimon] }),
      },
      ask: {
        chooseTargets: async (_ctx: EffectContext, options: { candidates: string[] }) => [options.candidates[0]!],
        optional: async () => {
          throw new Error("battle must not be an optional follow-up");
        },
      },
      fx: {
        modifyDP,
        forceBattle,
      },
    } as unknown as EffectContext;

    const effect = cardModule.effectsForTiming(EffectTiming.WhenDigivolving, source())[1]!;
    await effect.resolve(ctx);

    expect(modifyDP).toHaveBeenCalledWith(own.permanentId, 3000, EffectDuration.UntilOpponentTurnEnd);
    expect(forceBattle).not.toHaveBeenCalled();
  });
});

describe("EX12-052 Option side [Main]", () => {
  it("unsuspends one own Digimon, suspends an opponent Digimon, and locks unsuspend", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-004", dp: 12000, suspended: true, as: "own" },
            { card: "BT1-064", dp: 3000 },
          ],
          hand: [{ card: "EX12-052", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionCard = s.inst("option");
    type PlayCardIntentWithUseAs = Parameters<typeof s.engine.applyIntent>[1] & { useAs?: "digimon" | "option" };
    s.state.turnSeat = 0;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: optionCard.instanceId,
        useAs: "option",
      } as PlayCardIntentWithUseAs),
    ).toEqual({ ok: true });
    const own = s.perm("own");
    const victim = s.perm("victim");
    await settle(() => !own.isSuspended && victim.isSuspended, 600);
    await settle(() => false, 60);
    expect(own.isSuspended).toBe(false);
    expect(victim.isSuspended).toBe(true);
    const continuous = (s.engine as unknown as { continuous: { hasRestriction(id: string, kind: string): boolean } })
      .continuous;
    expect(continuous.hasRestriction(victim.permanentId, "unsuspend")).toBe(true);
  });
});

describe("EX12-052 Counter window", () => {
  it("offers the Counter effect to the defending player", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", dp: 3000, as: "attacker" }] },
        1: { battleArea: [{ card: "EX12-052", dp: 12000, as: "counterCard" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const attacker = s.perm("attacker");
    const counterCard = s.perm("counterCard");
    s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attacker.permanentId, target: { kind: "player" } });
    await settle(() => s.events.some((e) => e.kind === "counterWindowOpened"));
    const opened = s.events.find((e) => e.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counterWindowOpened not found");
    const eligible = opened.eligibleCounters.find((c) => c.instanceId === counterCard.topCard!.instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
  });
});
