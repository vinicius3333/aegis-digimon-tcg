import { describe, it, expect } from "vitest";
import { EffectDuration, EffectTiming, getCardDefinition, type CardDefinition, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import module from "./BT1-108.js";

// A3 for BT1-108 (Horn Buster):
//   [Main] 1 of your Digimon gets +3000 DP for the turn.
//   [Security] Suspend 1 of your opponent's Digimon. Then add this card to its owner's hand.
//
// FAILS-WHEN-REVERTED: the declarative effect record carries "add this card its owner's hand" as
// an inert legacy parser fallback and never executes it. Without this hand-written module, returnToHand is never
// called on security resolution — the card goes to trash instead of the owner's hand.
// The `returnToHandCalls` assertion catches this regression.

type FakePermanent = {
  permanentId: string;
  controllerSeat: Seat;
  topCard: { cardId: string; instanceId: string; ownerSeat: Seat; faceUp: boolean };
  stack: never[];
  linked: never[];
  baseDP: number;
  currentDP: number;
  isSuspended: boolean;
  inBreeding: boolean;
};

function fakeDef(cardId: string, kind: "Digimon" | "Option" = "Digimon"): CardDefinition {
  return {
    cardId,
    set: cardId.split("-")[0]!,
    nameEn: cardId,
    kinds: [kind] as never,
    colors: ["Red"] as never,
    playCost: 4,
    dp: kind === "Digimon" ? 4000 : 0,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function fakePerm(permanentId: string, topCardId: string, seat: Seat = 1 as Seat): FakePermanent {
  return {
    permanentId,
    controllerSeat: seat,
    topCard: { cardId: topCardId, instanceId: `top-${permanentId}`, ownerSeat: seat, faceUp: true },
    stack: [],
    linked: [],
    baseDP: 4000,
    currentDP: 4000,
    isSuspended: false,
    inBreeding: false,
  };
}

function makeSource(instanceId = "bt1-108-inst"): CardSource {
  return {
    instanceId,
    cardId: "BT1-108",
    ownerSeat: 0 as Seat,
    definition: fakeDef("BT1-108", "Option"),
    permanent: () => undefined,
    isOnBattleArea: () => false,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

type Recorder = { verb: string; args: unknown[] }[];

function makeCtx(opts: {
  recorder: Recorder;
  ownBattleArea?: FakePermanent[];
  opponentBattleArea?: FakePermanent[];
  instanceId?: string;
}): EffectContext {
  const { recorder, ownBattleArea = [], opponentBattleArea = [], instanceId = "bt1-108-inst" } = opts;

  const players = [
    { seat: 0 as Seat, battleArea: ownBattleArea, security: [], hand: [], deck: [], trash: [] },
    { seat: 1 as Seat, battleArea: opponentBattleArea, security: [], hand: [], deck: [], trash: [] },
  ];

  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: 0 as Seat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: () => undefined,
    definitionOf: (card: { cardId: string }) => fakeDef(card.cardId),
  };

  const fx = {
    modifyDP: (...args: unknown[]) => {
      recorder.push({ verb: "modifyDP", args });
    },
    suspend: async (...args: unknown[]) => {
      recorder.push({ verb: "suspend", args });
      return args[0] as string[];
    },
    returnToHand: async (...args: unknown[]) => {
      recorder.push({ verb: "returnToHand", args });
      return [] as never;
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  const source = makeSource(instanceId);
  return { source, trigger: {}, game, fx, ask };
}

describe("BT1-108 Horn Buster", () => {
  it("matches its official Option and Security text", () => {
    expect(getCardDefinition("BT1-108")).toMatchObject({
      nameEn: "Horn Buster",
      colors: ["Green"],
      playCost: 1,
      effectText: "[Main] 1 of your Digimon gets +3000 DP for the turn.",
      securityEffectText: expect.stringContaining("Suspend 1 of your opponent's Digimon"),
    });
  });

  it("is registered on import", () => {
    expect(module.cardId).toBe("BT1-108");
  });

  it("exposes an OnUseOption effect for [Main]", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
  });

  it("exposes a SecuritySkill effect for [Security]", () => {
    const source = makeSource();
    const effects = module!.effectsForTiming(EffectTiming.SecuritySkill, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);
    expect(effects[0]!.isSecurity).toBe(true);
  });

  it("exposes no effects for WhenDigivolving", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(0);
  });

  describe("[Main] +3000 DP", () => {
    it("calls modifyDP(+3000, UntilEachTurnEnd) on the chosen own Digimon", async () => {
      const recorder: Recorder = [];
      const digimon = fakePerm("own-perm-1", "BT1-001", 0 as Seat);
      const ctx = makeCtx({ recorder, ownBattleArea: [digimon] });

      const source = makeSource();
      const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
      await effects[0]!.resolve(ctx);

      const dpCalls = recorder.filter((c) => c.verb === "modifyDP");
      expect(dpCalls).toHaveLength(1);
      expect(dpCalls[0]!.args[0]).toBe("own-perm-1");
      expect(dpCalls[0]!.args[1]).toBe(3000);
      expect(dpCalls[0]!.args[2]).toBe(EffectDuration.UntilEachTurnEnd);
    });

    it("does nothing when the controller has no battle-area Digimon", async () => {
      const recorder: Recorder = [];
      const ctx = makeCtx({ recorder, ownBattleArea: [] });

      const source = makeSource();
      const effects = module!.effectsForTiming(EffectTiming.OnUseOption, source);
      await effects[0]!.resolve(ctx);

      expect(recorder.filter((c) => c.verb === "modifyDP")).toHaveLength(0);
    });
  });

  describe("[Security] suspend + return to hand", () => {
    it("suspends the chosen opponent Digimon and returns itself to its owner's hand", async () => {
      // FAILS-WHEN-REVERTED: the declarative effect record has no returnToHand call — the card
      // would go to trash instead. This assertion catches that regression.
      const recorder: Recorder = [];
      const opponentDigimon = fakePerm("opp-perm-1", "BT1-001", 1 as Seat);
      const ctx = makeCtx({
        recorder,
        opponentBattleArea: [opponentDigimon],
        instanceId: "bt1-108-inst",
      });

      const source = makeSource("bt1-108-inst");
      const effects = module!.effectsForTiming(EffectTiming.SecuritySkill, source);
      await effects[0]!.resolve(ctx);

      const suspendCalls = recorder.filter((c) => c.verb === "suspend");
      expect(suspendCalls).toHaveLength(1);
      expect((suspendCalls[0]!.args[0] as string[])[0]).toBe("opp-perm-1");

      // FAILS-WHEN-REVERTED: with the IR, returnToHand is never called.
      const returnCalls = recorder.filter((c) => c.verb === "returnToHand");
      expect(returnCalls).toHaveLength(1);
      expect((returnCalls[0]!.args[0] as string[])[0]).toBe("bt1-108-inst");
    });

    it("still returns itself to hand even when opponent has no Digimon to suspend", async () => {
      const recorder: Recorder = [];
      const ctx = makeCtx({ recorder, opponentBattleArea: [], instanceId: "bt1-108-inst" });

      const source = makeSource("bt1-108-inst");
      const effects = module!.effectsForTiming(EffectTiming.SecuritySkill, source);
      await effects[0]!.resolve(ctx);

      expect(recorder.filter((c) => c.verb === "suspend")).toHaveLength(0);

      // returnToHand still fires — the card returns even when no target to suspend.
      const returnCalls = recorder.filter((c) => c.verb === "returnToHand");
      expect(returnCalls).toHaveLength(1);
      expect((returnCalls[0]!.args[0] as string[])[0]).toBe("bt1-108-inst");
    });

    it("includes suspended opponent Digimon as valid targets (no isSuspended filter)", async () => {
      // documented behavior uses Mode.Tap — no suspended-state gate on the candidate set.
      const recorder: Recorder = [];
      const suspendedDigimon = {
        ...fakePerm("opp-perm-suspended", "BT1-001", 1 as Seat),
        isSuspended: true,
      };
      const ctx = makeCtx({
        recorder,
        opponentBattleArea: [suspendedDigimon],
        instanceId: "bt1-108-inst",
      });

      const source = makeSource("bt1-108-inst");
      const effects = module!.effectsForTiming(EffectTiming.SecuritySkill, source);
      await effects[0]!.resolve(ctx);

      const suspendCalls = recorder.filter((c) => c.verb === "suspend");
      expect(suspendCalls).toHaveLength(1);
      expect((suspendCalls[0]!.args[0] as string[])[0]).toBe("opp-perm-suspended");
    });
  });

  it("uses Main through the production Option flow and gives the selected Digimon +3000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "recipient" }],
          hand: [{ card: "BT1-108", as: "option" }],
        },
      },
      { autoSelectCards: true },
    );
    const printedDP = s.perm("recipient").currentDP;
    s.state.memory = 1;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("recipient").currentDP === printedDP + 3000);

    expect(s.perm("recipient").currentDP).toBe(printedDP + 3000);
  });

  it("can be used with only a green Tamer and resolves without a Digimon target", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT1-089"],
        hand: [{ card: "BT1-108", as: "option" }],
      },
    });
    s.state.memory = 1;
    const option = s.inst("option");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === option.instanceId));

    expect(s.state.memory).toBe(0);
  });

  it("suspends an opposing Digimon and moves itself from security to hand in the production engine", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT1-108", as: "securityOption", faceUp: true }],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "target" }],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
  });
});
