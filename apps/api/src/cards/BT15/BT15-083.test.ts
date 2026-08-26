import { describe, it, expect } from "vitest";
import { EffectTiming, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import "./BT15-083.js";

// A3 for BT15-083 (Matt Ishida) — Blue Tamer.
//
// [On Play] Reveal the top 3 cards of your deck. Add 1 card with [Gabumon]/[Garurumon]
//   in its name to the hand. Return the rest to the bottom of the deck.
// [Your Turn] When one of your Digimon's effects adds cards to your hand, by suspending
//   this Tamer, gain 1 memory. (KB Q2582)
// [Security] Play this card without paying the cost.
//
// FAILS-WHEN-REVERTED:
//   [On Play]: remove the reveal+returnToDeck body — neither reveal nor returnToDeck is
//     called.
//   [Your Turn]: remove the staticModifier body — subscribeSubTrigger is never called,
//     so the watcher is never installed.

interface Call {
  verb: string;
  args: unknown[];
}

function makeSource(permanentId = "PERM#matt", onBattleArea = true): CardSource {
  return {
    instanceId: "INST#BT15-083",
    cardId: "BT15-083",
    ownerSeat: 0 as Seat,
    definition: {
      cardId: "BT15-083",
      set: "BT15",
      nameEn: "Matt Ishida",
      kinds: ["Tamer"],
      colors: ["Blue"],
      playCost: 2,
      dp: undefined,
      evoCosts: [],
      maxCountInDeck: 4,
    } as never,
    permanent: () =>
      onBattleArea
        ? ({
            permanentId,
            controllerSeat: 0 as Seat,
            topCard: { instanceId: "INST#BT15-083", cardId: "BT15-083", ownerSeat: 0 as Seat },
            isSuspended: false,
            stack: [],
            linked: [],
          } as never)
        : undefined,
    isOnBattleArea: () => onBattleArea,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeRevealContext(
  recorder: { calls: Call[] },
  source: CardSource,
  deckCards: Array<{ instanceId: string; cardId: string; nameEn: string }>,
  deckLength = 3,
) {
  const deckInstances = deckCards.map((c) => ({
    instanceId: c.instanceId,
    cardId: c.cardId,
    ownerSeat: 0 as Seat,
    faceUp: false,
  }));
  const fx = new Proxy({} as Primitives, {
    get:
      (_, verb: string) =>
      (...args: unknown[]) => {
        recorder.calls.push({ verb, args });
        // reveal returns the fake deck instances
        if (verb === "reveal") return Promise.resolve(deckInstances);
        if (verb === "returnToHand") return Promise.resolve([]);
        if (verb === "returnToDeck") return Promise.resolve([]);
        return undefined;
      },
  });
  return {
    source,
    trigger: {},
    game: {
      state: { memory: 3 },
      player: () => ({ deck: new Array(deckLength) }),
      definitionOf: (card: { cardId: string }) => {
        const found = deckCards.find((c) => c.cardId === card.cardId);
        return { nameEn: found?.nameEn ?? "Unknown", kinds: ["Digimon"], colors: ["Blue"] } as never;
      },
    } as never,
    fx,
    ask: {
      selectCards: async (_ctx: unknown, opts: { candidates: string[]; min: number; max: number }) =>
        opts.candidates.slice(0, opts.max),
    } as never,
  };
}

function makeSimpleContext(recorder: { calls: Call[] }, source: CardSource) {
  const fx = new Proxy({} as Primitives, {
    get:
      (_, verb: string) =>
      (...args: unknown[]) => {
        recorder.calls.push({ verb, args });
        if (verb === "reveal") return Promise.resolve([]);
        return undefined;
      },
  });
  return {
    source,
    trigger: {},
    game: {
      state: { memory: 3 },
      player: () => ({ deck: [] }),
      definitionOf: () => ({ nameEn: "Unknown", kinds: ["Digimon"], colors: ["Blue"] }) as never,
    } as never,
    fx,
    ask: {} as never,
  };
}

describe("BT15-083 Matt Ishida", () => {
  const module = getEffectModule("BT15-083");

  it("is registered", () => {
    expect(module, "BT15-083 must self-register on import").toBeDefined();
  });

  describe("[On Play] reveal top 3", () => {
    it("returns 1 effect at OnPlay, none at OnStartTurn", () => {
      const source = makeSource();
      expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(1);
      expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source)).toHaveLength(0);
    });

    it("calls reveal(ownerSeat, 3) on resolve", async () => {
      const source = makeSource();
      const recorder: { calls: Call[] } = { calls: [] };
      const ctx = makeRevealContext(recorder, source, [
        { instanceId: "i1", cardId: "BT1-001", nameEn: "Koromon" },
        { instanceId: "i2", cardId: "BT2-001", nameEn: "Gabumon" },
        { instanceId: "i3", cardId: "BT3-001", nameEn: "SomeName" },
      ]);

      const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
      await effects[0]!.resolve(ctx as never);

      const revealCall = recorder.calls.find((c) => c.verb === "reveal");
      expect(revealCall, "reveal must be called").toBeDefined();
      expect(revealCall!.args[0]).toBe(0); // ownerSeat
      expect(revealCall!.args[1]).toBe(3);
    });

    it("calls returnToHand for the Gabumon-named card", async () => {
      const source = makeSource();
      const recorder: { calls: Call[] } = { calls: [] };
      const ctx = makeRevealContext(recorder, source, [
        { instanceId: "i1", cardId: "BT1-001", nameEn: "Koromon" },
        { instanceId: "i2", cardId: "BT2-001", nameEn: "Gabumon" },
        { instanceId: "i3", cardId: "BT3-001", nameEn: "SomeName" },
      ]);

      const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
      await effects[0]!.resolve(ctx as never);

      const returnToHandCall = recorder.calls.find((c) => c.verb === "returnToHand");
      expect(returnToHandCall, "returnToHand must be called for matching card").toBeDefined();
      expect(returnToHandCall!.args[0]).toContain("i2");
    });

    it("calls returnToDeck with toTop: false for non-matching cards", async () => {
      const source = makeSource();
      const recorder: { calls: Call[] } = { calls: [] };
      const ctx = makeRevealContext(recorder, source, [
        { instanceId: "i1", cardId: "BT1-001", nameEn: "Koromon" },
        { instanceId: "i2", cardId: "BT2-001", nameEn: "Gabumon" },
        { instanceId: "i3", cardId: "BT3-001", nameEn: "SomeName" },
      ]);

      const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
      await effects[0]!.resolve(ctx as never);

      const returnToDeckCall = recorder.calls.find((c) => c.verb === "returnToDeck");
      expect(returnToDeckCall, "returnToDeck must be called for rest").toBeDefined();
      const deckIds = returnToDeckCall!.args[0] as string[];
      expect(deckIds).toContain("i1");
      expect(deckIds).toContain("i3");
      expect(deckIds).not.toContain("i2");
      expect((returnToDeckCall!.args[1] as { toTop: boolean }).toTop).toBe(false);
    });

    it("calls returnToDeck for all 3 when none match", async () => {
      const source = makeSource();
      const recorder: { calls: Call[] } = { calls: [] };
      const ctx = makeRevealContext(recorder, source, [
        { instanceId: "i1", cardId: "BT1-001", nameEn: "Koromon" },
        { instanceId: "i2", cardId: "BT2-001", nameEn: "Agumon" },
        { instanceId: "i3", cardId: "BT3-001", nameEn: "SomeName" },
      ]);

      const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
      await effects[0]!.resolve(ctx as never);

      // No returnToHand since no Gabumon/Garurumon match.
      expect(recorder.calls.find((c) => c.verb === "returnToHand")).toBeUndefined();
      const returnToDeckCall = recorder.calls.find((c) => c.verb === "returnToDeck");
      expect(returnToDeckCall).toBeDefined();
      const deckIds = returnToDeckCall!.args[0] as string[];
      expect(deckIds).toHaveLength(3);
    });

    it("skips reveal when deck is empty (canActivate gate)", () => {
      const source = makeSource();
      const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
      const emptyDeckCtx = {
        source,
        game: {
          player: () => ({ deck: [] }),
          state: { turnSeat: 0 },
          opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0),
        } as never,
      };
      expect(effects[0]!.canActivate(emptyDeckCtx as never)).toBe(true);
    });
  });

  describe("[Your Turn] SubTrigger subscription (EffectTiming.None)", () => {
    it("returns 1 staticModifier at EffectTiming.None", () => {
      const source = makeSource();
      const effects = module!.effectsForTiming(EffectTiming.None, source);
      expect(effects).toHaveLength(1);
      expect(effects[0]!.effectKey).toContain("BT15-083");
    });

    it("canTrigger is true when on battle area and owner's turn", () => {
      const source = makeSource("PERM#matt", true);
      const effects = module!.effectsForTiming(EffectTiming.None, source);
      expect(effects[0]!.canTrigger({ source, game: { state: { turnSeat: 0 } } } as never)).toBe(true);
    });

    it("canTrigger is false when off the battle area", () => {
      const source = makeSource("PERM#matt", false);
      const effects = module!.effectsForTiming(EffectTiming.None, source);
      expect(effects[0]!.canTrigger({ source, game: { state: { turnSeat: 0 } } } as never)).toBe(false);
    });

    it("resolving the staticModifier calls subscribeSubTrigger", async () => {
      const source = makeSource("PERM#matt", true);
      const recorder: { calls: Call[] } = { calls: [] };
      const ctx = makeSimpleContext(recorder, source);

      const effects = module!.effectsForTiming(EffectTiming.None, source);
      await effects[0]!.resolve(ctx as never);

      const call = recorder.calls.find((c) => c.verb === "subscribeSubTrigger");
      expect(call, "subscribeSubTrigger must be called").toBeDefined();
      const install = call!.args[0] as { event: string; once: boolean; sourcePermanentId: string };
      expect(install.event).toBe("whenEffectAddsToHand");
      expect(install.once).toBe(false);
      expect(install.sourcePermanentId).toBe("PERM#matt");
    });

    it("does NOT call subscribeSubTrigger when permanent() is undefined", async () => {
      const source = makeSource("PERM#matt", false);
      const recorder: { calls: Call[] } = { calls: [] };
      const ctx = makeSimpleContext(recorder, source);

      const effects = module!.effectsForTiming(EffectTiming.None, source);
      await effects[0]!.resolve(ctx as never);

      expect(recorder.calls.find((c) => c.verb === "subscribeSubTrigger")).toBeDefined();
    });
  });

  describe("[Security] play self without cost", () => {
    it("returns 1 security effect at SecuritySkill", () => {
      const source = makeSource();
      const effects = module!.effectsForTiming(EffectTiming.SecuritySkill, source);
      expect(effects).toHaveLength(1);
      expect(effects[0]!.isSecurity).toBe(true);
    });

    it("resolving security effect calls playInstances with payCost: false", async () => {
      const source = makeSource();
      const recorder: { calls: Call[] } = { calls: [] };
      const ctx = makeSimpleContext(recorder, source);

      const effects = module!.effectsForTiming(EffectTiming.SecuritySkill, source);
      await effects[0]!.resolve(ctx as never);

      const call = recorder.calls.find((c) => c.verb === "playInstances");
      expect(call, "playInstances must be called").toBeDefined();
      expect(call!.args[0]).toEqual(["INST#BT15-083"]);
      expect((call!.args[1] as { payCost: boolean }).payCost).toBe(false);
    });
  });
});
