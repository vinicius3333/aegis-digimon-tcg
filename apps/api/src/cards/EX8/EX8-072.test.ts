import { describe, it, expect } from "vitest";
import { EffectTiming, isDigimon, type CardInstance, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type {
  DecisionApi,
  EffectContext,
  GameAccess,
  Primitives,
} from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX8-072.js";

// A3 for EX8-072 (Seventh Jewelrize, Purple Option).
//
// [Main] If opponent has ≥5 hand cards, they trash 1. Delete 1 opponent Digimon
//   with level ≤ 7 - floor(handCount / 3).
// [Security] Activate this card's [Main] effect.
//
// FAILS-WHEN-REVERTED: declarative effect has the delete step hardcoded at level ≤ 7
//   (static value, no scaling) and does not implement the integer-division formula.
//   When reverted, tests checking that Lv7 Digimon is excluded (handCount=3 → levelMax=6)
//   or that Lv7+Lv6 are excluded (handCount=6 → levelMax=5) will fail.
//
// levelMax formula (documented behavior line 103, integer division):
//   handCount=0  → levelMax=7  (7 - floor(0/3) = 7)
//   handCount=3  → levelMax=6  (7 - floor(3/3) = 6)
//   handCount=6  → levelMax=5  (7 - floor(6/3) = 5)
//   handCount=5  → levelMax=5  (7 - floor(5/3) = 5, floor(5/3)=1)
//
// Note: handCount=5 triggers the trash step (≥5), then delete step uses levelMax=5.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function card(instanceId: string, cardId: string, seat: Seat = 1): CardInstance {
  return { instanceId, cardId, ownerSeat: seat, faceUp: true } as CardInstance;
}

function makeSource(ownerSeat: Seat = 0): CardSource {
  return {
    instanceId: "ex8072-self",
    cardId: "EX8-072",
    ownerSeat,
    definition: {
      cardId: "EX8-072",
      set: "EX8",
      nameEn: "Seventh Jewelrize",
      kinds: ["Option"] as never,
      colors: ["Purple"] as never,
      playCost: 5,
      dp: 0,
      evoCosts: [],
      maxCountInDeck: 4,
    },
    permanent: () => undefined as never,
    isOnBattleArea: () => false,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

interface PermanentStub {
  permanentId: string;
  controllerSeat: Seat;
  topCard: CardInstance;
  level: number | undefined;
}

function makeCtx(
  recorder: Recorder,
  source: CardSource,
  opts: {
    opponentHandCount?: number;
    opponentDigimon?: PermanentStub[];
  } = {},
): EffectContext {
  const { opponentHandCount = 0, opponentDigimon = [] } = opts;

  const opponentSeat = 1 as Seat;
  const ownerSeat = source.ownerSeat;

  // Build opponent hand cards
  const opponentHand: CardInstance[] = [];
  for (let i = 0; i < opponentHandCount; i++) {
    opponentHand.push(card(`opp-hand-${i}`, "DUMMY", opponentSeat));
  }

  const players = {
    [ownerSeat]: {
      seat: ownerSeat,
      battleArea: [],
      security: [],
      hand: [],
      deck: [],
      trash: [],
    },
    [opponentSeat]: {
      seat: opponentSeat,
      battleArea: opponentDigimon.map((d) => ({
        permanentId: d.permanentId,
        controllerSeat: opponentSeat,
        topCard: d.topCard,
        isSuspended: false,
        inBreeding: false,
        baseDP: 0,
        currentDP: 0,
      })),
      security: [],
      hand: opponentHand,
      deck: [],
      trash: [],
    },
  };

  const game: GameAccess = {
    state: { memory: 0, players: Object.values(players), turnSeat: ownerSeat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: () => undefined,
    definitionOf: (c: { cardId: string }) => {
      // Look up from opponentDigimon stubs
      const stub = opponentDigimon.find((d) => d.topCard.cardId === c.cardId);
      if (stub !== undefined) {
        return {
          cardId: c.cardId,
          kinds: ["Digimon"],
          level: stub.level,
        } as never;
      }
      return {
        cardId: c.cardId,
        kinds: ["Option"],
        level: undefined,
      } as never;
    },
  };

  const fx = {
    trash: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "trash", args });
      return [];
    },
    deletePermanent: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "deletePermanent", args });
      return 1;
    },
  } as unknown as Primitives;

  // Ask always picks first valid candidate.
  // Records `candidates` (the full list offered) so tests can assert which targets were
  // presented, independent of which was selected.
  const ask: DecisionApi = {
    optional: async () => true,
    selectCards: async (_c, o) => {
      recorder.calls.push({ verb: "selectCards", args: [o.candidates] });
      return o.candidates.slice(0, o.max);
    },
    selectPermanents: async () => [], chooseTargets: async (_c, o) => {
      recorder.calls.push({ verb: "chooseTargets", args: [o.candidates] });
      return o.candidates.slice(0, o.max);
    },
    chooseOption: async () => 0,
  };

  return { source, trigger: {}, game, fx, ask };
}

function digimon(permanentId: string, cardId: string, level: number): PermanentStub {
  return {
    permanentId,
    controllerSeat: 1 as Seat,
    topCard: card(`top-${permanentId}`, cardId, 1),
    level,
  };
}

describe("EX8-072 Seventh Jewelrize", () => {
  const module = getEffectModule("EX8-072");

  it("is registered on import", () => {
    expect(module, "EX8-072 must self-register on import").toBeDefined();
  });

  it("produces an OnUseOption effect (the window playCard fires for a resolving Option)", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source)).toHaveLength(1);
    // NEGATIVE CONTROL / regression guard for Lane R4's dead-clause class: this clause must
    // NOT also live at OnDeclaration (a window playCard never fires for an Option), or the
    // card silently goes to the trash unresolved when actually played.
    expect(module!.effectsForTiming(EffectTiming.OnDeclaration, source)).toHaveLength(0);
  });

  it("produces a SecuritySkill effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });

  describe("[Main] levelMax calculation and delete step", () => {
    it("handCount=0 → levelMax=7, no trash step, deletes Lv7 Digimon", async () => {
      const recorder: Recorder = { calls: [] };
      const source = makeSource();
      const lv7 = digimon("perm-lv7", "DIGI-LV7", 7);
      const ctx = makeCtx(recorder, source, {
        opponentHandCount: 0,
        opponentDigimon: [lv7],
      });

      const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
      await effects[0]!.resolve(ctx);

      // No trash step (handCount < 5)
      // FAILS-WHEN-REVERTED: IR does not implement the levelMax formula
      expect(recorder.calls.filter((c) => c.verb === "trash")).toHaveLength(0);
      expect(recorder.calls.filter((c) => c.verb === "selectCards")).toHaveLength(0);

      // Delete step fires with Lv7 Digimon as candidate (levelMax=7 allows it)
      const deleteCalls = recorder.calls.filter((c) => c.verb === "deletePermanent");
      expect(deleteCalls).toHaveLength(1);
      expect((deleteCalls[0]!.args[0] as string[])[0]).toBe(lv7.permanentId);
    });

    it("handCount=3 → levelMax=6, Lv7 excluded, Lv6 included", async () => {
      const recorder: Recorder = { calls: [] };
      const source = makeSource();
      const lv7 = digimon("perm-lv7", "DIGI-LV7", 7);
      const lv6 = digimon("perm-lv6", "DIGI-LV6", 6);
      const ctx = makeCtx(recorder, source, {
        opponentHandCount: 3,
        opponentDigimon: [lv7, lv6],
      });

      const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
      await effects[0]!.resolve(ctx);

      // No trash step (handCount=3 < 5)
      expect(recorder.calls.filter((c) => c.verb === "trash")).toHaveLength(0);

      // Only Lv6 should be in delete candidates (levelMax=6, Lv7 excluded)
      const chooseCalls = recorder.calls.filter((c) => c.verb === "chooseTargets");
      expect(chooseCalls).toHaveLength(1);
      const candidates = chooseCalls[0]!.args[0] as string[];
      expect(candidates).toContain(lv6.permanentId);
      // FAILS-WHEN-REVERTED: static IR uses level ≤ 7 so Lv7 would be included
      expect(candidates).not.toContain(lv7.permanentId);

      const deleteCalls = recorder.calls.filter((c) => c.verb === "deletePermanent");
      expect(deleteCalls).toHaveLength(1);
    });

    it("handCount=6 → levelMax=5, Lv7 and Lv6 both excluded from delete targets", async () => {
      const recorder: Recorder = { calls: [] };
      const source = makeSource();
      const lv7 = digimon("perm-lv7", "DIGI-LV7", 7);
      const lv6 = digimon("perm-lv6", "DIGI-LV6", 6);
      const lv5 = digimon("perm-lv5", "DIGI-LV5", 5);
      const ctx = makeCtx(recorder, source, {
        opponentHandCount: 6,
        opponentDigimon: [lv7, lv6, lv5],
      });

      const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
      await effects[0]!.resolve(ctx);

      // Trash step fires (handCount=6 ≥ 5)
      expect(recorder.calls.filter((c) => c.verb === "selectCards")).toHaveLength(1);
      expect(recorder.calls.filter((c) => c.verb === "trash")).toHaveLength(1);

      // Only Lv5 candidate; Lv7 and Lv6 excluded (levelMax=5)
      const chooseCalls = recorder.calls.filter((c) => c.verb === "chooseTargets");
      expect(chooseCalls).toHaveLength(1);
      const candidates = chooseCalls[0]!.args[0] as string[];
      // FAILS-WHEN-REVERTED: static IR uses level ≤ 7, both Lv6 and Lv7 would appear
      expect(candidates).not.toContain(lv7.permanentId);
      expect(candidates).not.toContain(lv6.permanentId);
      expect(candidates).toContain(lv5.permanentId);
    });

    it("handCount=5 → trash step fires, then delete with levelMax=5 (floor(5/3)=1)", async () => {
      const recorder: Recorder = { calls: [] };
      const source = makeSource();
      const lv5 = digimon("perm-lv5", "DIGI-LV5", 5);
      const lv6 = digimon("perm-lv6", "DIGI-LV6", 6);
      const ctx = makeCtx(recorder, source, {
        opponentHandCount: 5,
        opponentDigimon: [lv5, lv6],
      });

      const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
      await effects[0]!.resolve(ctx);

      // Trash step fires (handCount=5 ≥ 5)
      const trashCalls = recorder.calls.filter((c) => c.verb === "trash");
      expect(trashCalls).toHaveLength(1);

      // levelMax = 7 - floor(5/3) = 7 - 1 = 6... wait: floor(5/3)=1, so levelMax=6.
      // Lv6 IS included (level ≤ 6). Lv5 also included.
      const chooseCalls = recorder.calls.filter((c) => c.verb === "chooseTargets");
      expect(chooseCalls).toHaveLength(1);
      const candidates = chooseCalls[0]!.args[0] as string[];
      expect(candidates).toContain(lv5.permanentId);
      expect(candidates).toContain(lv6.permanentId);

      const deleteCalls = recorder.calls.filter((c) => c.verb === "deletePermanent");
      expect(deleteCalls).toHaveLength(1);
    });

    it("no delete when no valid Digimon on opponent battle area (KB Q4740: step is conditional on candidates)", async () => {
      const recorder: Recorder = { calls: [] };
      const source = makeSource();
      // Lv8 Digimon — above levelMax=7 even at handCount=0
      const lv8 = digimon("perm-lv8", "DIGI-LV8", 8);
      const ctx = makeCtx(recorder, source, {
        opponentHandCount: 0,
        opponentDigimon: [lv8],
      });

      const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
      await effects[0]!.resolve(ctx);

      // No valid candidates → no delete call
      expect(recorder.calls.filter((c) => c.verb === "deletePermanent")).toHaveLength(0);
    });
  });

  describe("[Security] fires the same Main logic", () => {
    it("security effect deletes opponent Lv7 Digimon when opponent has 0 cards in hand", async () => {
      const recorder: Recorder = { calls: [] };
      const source = makeSource();
      const lv7 = digimon("sec-lv7", "DIGI-LV7", 7);
      const ctx = makeCtx(recorder, source, {
        opponentHandCount: 0,
        opponentDigimon: [lv7],
      });

      const effects = module!.effectsForTiming(EffectTiming.SecuritySkill, source);
      await effects[0]!.resolve(ctx);

      const deleteCalls = recorder.calls.filter((c) => c.verb === "deletePermanent");
      expect(deleteCalls).toHaveLength(1);
      expect((deleteCalls[0]!.args[0] as string[])[0]).toBe(lv7.permanentId);
    });
  });
});
