import { describe, it, expect } from "vitest";
import { EffectTiming, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import "./BT15-099.js";

/**
 * A3 for BT15-099 (Venom Infusion) — Black/Purple Option.
 *
 * Clauses under test:
 *   [Main]     → EffectTiming.OnUseOption: trash 1 Digimon from hand, delete 1 opponent
 *                Digimon with level ≤ trashed card's level; draw 2 if Myotismon in text.
 *   [Security] → EffectTiming.SecuritySkill: same body as [Main].
 *
 * FAILS-WHEN-REVERTED: remove the `ctx.fx.deletePermanent` call from resolveMainBody —
 *   the "deletePermanent called" assertion goes RED.
 *   Remove the `ctx.fx.draw` call — the "draw 2 on Myotismon" assertion goes RED.
 */

interface Call {
  verb: string;
  args: unknown[];
}

const CARD_ID = "BT15-099";

function makeSource(): CardSource {
  return {
    instanceId: `INST#${CARD_ID}`,
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: {
      cardId: CARD_ID,
      set: "BT15",
      nameEn: "Venom Infusion",
      kinds: ["Option"],
      colors: ["Black", "Purple"],
      playCost: 5,
      dp: 0,
      evoCosts: [],
      maxCountInDeck: 4,
    } as never,
    permanent: () => undefined,
    isOnBattleArea: () => false,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

interface ScenarioOptions {
  handDigimon: Array<{ instanceId: string; cardId: string; level?: number; nameEn?: string; effectText?: string }>;
  oppDigimon: Array<{ permanentId: string; cardId: string; level?: number }>;
  /** If true, auto-accept optional; if false, decline */
  acceptOptional?: boolean;
}

function makeScenario(opts: ScenarioOptions) {
  const recorder: { calls: Call[] } = { calls: [] };
  const source = makeSource();

  const handCards = opts.handDigimon.map((d) => ({
    instanceId: d.instanceId,
    cardId: d.cardId,
    ownerSeat: 0 as Seat,
    faceUp: true,
  }));

  const oppPerms = opts.oppDigimon.map((d) => ({
    permanentId: d.permanentId,
    controllerSeat: 1 as Seat,
    topCard: { instanceId: `top-${d.permanentId}`, cardId: d.cardId, ownerSeat: 1 as Seat },
    isSuspended: false,
    inBreeding: false,
    stack: [],
  }));

  const definitionMap: Record<string, { kinds: string[]; nameEn: string; level?: number; effectText?: string }> = {};
  for (const d of opts.handDigimon) {
    definitionMap[d.cardId] = {
      kinds: ["Digimon"],
      nameEn: d.nameEn ?? d.cardId,
      level: d.level,
      effectText: d.effectText,
    };
  }
  for (const d of opts.oppDigimon) {
    definitionMap[d.cardId] = {
      kinds: ["Digimon"],
      nameEn: d.cardId,
      level: d.level,
    };
  }
  definitionMap[CARD_ID] = { kinds: ["Option"], nameEn: "Venom Infusion" };

  const fx = new Proxy({} as Primitives, {
    get: (_, verb: string) =>
      (...args: unknown[]) => {
        recorder.calls.push({ verb, args });
        if (verb === "trash") return Promise.resolve([]);
        if (verb === "deletePermanent") return Promise.resolve(0);
        if (verb === "draw") return Promise.resolve([]);
      },
  });

  const ctx = {
    source,
    trigger: {},
    game: {
      state: { memory: 3 },
      player: (seat: Seat) => ({
        hand: seat === 0 ? handCards : [],
        battleArea: seat === 0 ? [] : oppPerms,
      } as never),
      opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
      permanentById: (id: string) => oppPerms.find((p) => p.permanentId === id),
      definitionOf: (c: { cardId: string }) => (definitionMap[c.cardId] ?? { kinds: ["Digimon"], nameEn: c.cardId } as never),
      linkMax: () => 1,
      linkCostReduction: () => 0,
    } as never,
    fx,
    ask: {
      optional: async () => opts.acceptOptional ?? true,
      chooseTargets: async (_ctx: unknown, o: { candidates: string[]; max: number }) =>
        o.candidates.slice(0, o.max),
      selectCards: async (_ctx: unknown, o: { candidates: string[]; max: number }) =>
        o.candidates.slice(0, o.max),
    } as never,
  };

  return { recorder, ctx, source };
}

describe("BT15-099 Venom Infusion — [Main] trash/delete/draw + [Security]", () => {
  const module = getEffectModule(CARD_ID);

  it("is registered", () => {
    expect(module, `${CARD_ID} must self-register on import`).toBeDefined();
  });

  it("returns 1 effect at OnUseOption ([Main])", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    expect(effects).toHaveLength(1);
  });

  it("returns 1 effect at SecuritySkill ([Security])", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.SecuritySkill, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.isSecurity).toBe(true);
  });

  it("returns no effects at other timings", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(0);
    expect(module!.effectsForTiming(EffectTiming.OnEndTurn, source)).toHaveLength(0);
  });

  it("[Main] trashes the selected hand Digimon", async () => {
    const { recorder, ctx } = makeScenario({
      handDigimon: [{ instanceId: "INST#lv5-hand", cardId: "BT1-020", level: 5, nameEn: "Greymon" }],
      oppDigimon: [{ permanentId: "PERM#opp1", cardId: "BT1-010", level: 4 }],
    });

    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    await effects[0]!.resolve(ctx as never);

    const trashCall = recorder.calls.find((c) => c.verb === "trash");
    expect(trashCall, "trash must be called for the hand Digimon").toBeDefined();
    const trashedIds = trashCall!.args[0] as string[];
    expect(trashedIds).toContain("INST#lv5-hand");
  });

  it("[Main] deletes opponent Digimon with level <= trashed card's level", async () => {
    const { recorder, ctx } = makeScenario({
      handDigimon: [{ instanceId: "INST#lv5-hand2", cardId: "BT1-020", level: 5, nameEn: "Greymon" }],
      oppDigimon: [{ permanentId: "PERM#opp-lv4", cardId: "BT1-010", level: 4 }],
    });

    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    await effects[0]!.resolve(ctx as never);

    const deleteCall = recorder.calls.find((c) => c.verb === "deletePermanent");
    expect(deleteCall, "deletePermanent must be called for eligible opponent Digimon").toBeDefined();
    expect((deleteCall!.args[0] as string[])).toContain("PERM#opp-lv4");
  });

  it("[Main] does NOT delete an opponent Digimon with level > trashed card's level", async () => {
    const { recorder, ctx } = makeScenario({
      handDigimon: [{ instanceId: "INST#lv3-hand", cardId: "BT1-009", level: 3, nameEn: "Agumon" }],
      oppDigimon: [{ permanentId: "PERM#opp-lv6", cardId: "BT1-010", level: 6 }],
    });

    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    await effects[0]!.resolve(ctx as never);

    const deleteCall = recorder.calls.find((c) => c.verb === "deletePermanent");
    expect(deleteCall, "deletePermanent must NOT be called when opponent level > trashed level").toBeUndefined();
  });

  it("[Main] draws 2 when trashed card has 'Myotismon' in its name", async () => {
    const { recorder, ctx } = makeScenario({
      handDigimon: [{
        instanceId: "INST#myo-hand",
        cardId: "BT1-085",
        level: 5,
        nameEn: "Myotismon",
      }],
      oppDigimon: [{ permanentId: "PERM#opp2", cardId: "BT1-010", level: 4 }],
    });

    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    await effects[0]!.resolve(ctx as never);

    const drawCall = recorder.calls.find((c) => c.verb === "draw");
    expect(drawCall, "draw must be called when Myotismon name in trashed card").toBeDefined();
    expect(drawCall!.args[1]).toBe(2);
  });

  it("[Main] draws 2 when trashed card has 'Myotismon' in its effectText", async () => {
    const { recorder, ctx } = makeScenario({
      handDigimon: [{
        instanceId: "INST#myo-eff-hand",
        cardId: "BT1-086",
        level: 4,
        nameEn: "VenomVamdemon",
        effectText: "When this Digimon attacks, if it has [Myotismon] in its digivolution cards...",
      }],
      oppDigimon: [{ permanentId: "PERM#opp3", cardId: "BT1-010", level: 3 }],
    });

    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    await effects[0]!.resolve(ctx as never);

    const drawCall = recorder.calls.find((c) => c.verb === "draw");
    expect(drawCall, "draw must be called when Myotismon in effectText").toBeDefined();
    expect(drawCall!.args[1]).toBe(2);
  });

  it("[Main] does NOT draw when trashed card has no Myotismon text", async () => {
    const { recorder, ctx } = makeScenario({
      handDigimon: [{
        instanceId: "INST#agumon",
        cardId: "BT1-001",
        level: 3,
        nameEn: "Agumon",
      }],
      oppDigimon: [{ permanentId: "PERM#opp4", cardId: "BT1-010", level: 2 }],
    });

    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    await effects[0]!.resolve(ctx as never);

    const drawCall = recorder.calls.find((c) => c.verb === "draw");
    expect(drawCall, "draw must NOT be called for non-Myotismon card").toBeUndefined();
  });

  it("[Main] does nothing when hand has no Digimon", async () => {
    const { recorder, ctx } = makeScenario({
      handDigimon: [],
      oppDigimon: [{ permanentId: "PERM#opp5", cardId: "BT1-010", level: 4 }],
    });

    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    await effects[0]!.resolve(ctx as never);

    const trashCall = recorder.calls.find((c) => c.verb === "trash");
    expect(trashCall, "trash must NOT be called when hand has no Digimon").toBeUndefined();
  });

  it("[Main] does NOT delete when trashed card is Lv.- (no level) — KB Q2596", async () => {
    const { recorder, ctx } = makeScenario({
      // A Lv.- Tamer-type Digimon placeholder (level undefined → Lv.-)
      handDigimon: [{ instanceId: "INST#lv-minus", cardId: "BT1-100", nameEn: "NoPower" }],
      oppDigimon: [{ permanentId: "PERM#opp-lv-minus", cardId: "BT1-101" }],
    });

    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    await effects[0]!.resolve(ctx as never);

    const deleteCall = recorder.calls.find((c) => c.verb === "deletePermanent");
    expect(deleteCall, "deletePermanent must NOT be called when trashed card has no level (Lv.-)").toBeUndefined();
  });
});
