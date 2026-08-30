import { describe, it, expect } from "vitest";
import { EffectTiming, getCardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import "../index.js";
import "./BT15-082.js";
import { compiled } from "./BT15-082.js";

// A3 for BT15-082 (Sora Takenouchi) — Red Tamer.
//
// [Start of Your Turn] If you have 2 memory or less, set your memory to 3.
// [All Turns] When a red Digimon card returns from your trash to the hand, by returning
//   this Tamer to the hand, you may play 1 Digimon card with [Avian]/[Bird]/[Beast]/
//   [Animal]/[Sovereign] (not [Sea Animal]) from your hand without paying the cost.
//   DP cap: 13000 - 2000 × opponent security count. (KB Q2581)
// [Security] Play this card without paying the cost.
//
// FAILS-WHEN-REVERTED: remove the staticModifier body — subscribeSubTrigger is never
// called, so the watcher is never installed.

interface Call {
  verb: string;
  args: unknown[];
}

function makeSource(permanentId = "PERM#sora", onBattleArea = true): CardSource {
  return {
    instanceId: "INST#BT15-082",
    cardId: "BT15-082",
    ownerSeat: 0 as Seat,
    definition: {
      cardId: "BT15-082",
      set: "BT15",
      nameEn: "Sora Takenouchi",
      kinds: ["Tamer"],
      colors: ["Red"],
      playCost: 4,
      dp: undefined,
      evoCosts: [],
      maxCountInDeck: 4,
    } as never,
    permanent: () =>
      onBattleArea
        ? ({
            permanentId,
            controllerSeat: 0 as Seat,
            topCard: { instanceId: "INST#BT15-082", cardId: "BT15-082", ownerSeat: 0 as Seat },
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

function makeContext(recorder: { calls: Call[] }, source: CardSource, memory = 3) {
  const fakeState = { memory, turnSeat: 0 as Seat };
  const fx = new Proxy({} as Primitives, {
    get:
      (_, verb: string) =>
      (...args: unknown[]) => {
        recorder.calls.push({ verb, args });
      },
  });
  return {
    source,
    trigger: {},
    game: { state: fakeState, opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) } as never,
    fx,
    ask: {} as never,
  };
}

describe("BT15-082 Sora Takenouchi", () => {
  it("matches the catalog identity and excludes Sea Animal cards from both filters", () => {
    expect(getCardDefinition("BT15-082")).toMatchObject({
      nameEn: "Sora Takenouchi",
      colors: ["Red"],
      kinds: ["Tamer"],
      playCost: 4,
    });
    const watcher = compiled.effects?.[1]?.actions?.[0] as any;
    expect(watcher.sourceFilter.excludeNameOrTrait).toEqual([{ tokens: ["Sea Animal"], match: "trait" }]);
    expect(watcher.actions[0].target.filter.excludeNameOrTrait).toEqual([{ tokens: ["Sea Animal"], match: "trait" }]);
  });
  const module = getEffectModule("BT15-082");

  it("is registered", () => {
    expect(module, "BT15-082 must self-register on import").toBeDefined();
  });

  describe("[Start of Your Turn] memory gate", () => {
    it("returns 1 effect at OnStartTurn, none at OnPlay or SecuritySkill", () => {
      const source = makeSource();
      expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source)).toHaveLength(1);
      expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
    });

    it("sets memory to 3 when memory is 2 or less", async () => {
      const source = makeSource();
      const recorder: { calls: Call[] } = { calls: [] };
      const ctx = makeContext(recorder, source, 2);

      const effects = module!.effectsForTiming(EffectTiming.OnStartTurn, source);
      await effects[0]!.resolve(ctx as never);

      const call = recorder.calls.find((c) => c.verb === "setMemory");
      expect(call, "setMemory must be called").toBeDefined();
      expect(call!.args[0]).toBe(3);
    });

    it("does NOT set memory when memory is already 3 or more", async () => {
      const source = makeSource();
      const recorder: { calls: Call[] } = { calls: [] };
      const ctx = makeContext(recorder, source, 3);

      const effects = module!.effectsForTiming(EffectTiming.OnStartTurn, source);
      await effects[0]!.resolve(ctx as never);

      expect(recorder.calls.find((c) => c.verb === "setMemory")).toBeUndefined();
    });
  });

  describe("[All Turns] SubTrigger subscription (EffectTiming.None)", () => {
    it("returns 1 staticModifier at EffectTiming.None", () => {
      const source = makeSource();
      const effects = module!.effectsForTiming(EffectTiming.None, source);
      expect(effects).toHaveLength(1);
      expect(effects[0]!.effectKey).toContain("BT15-082");
    });

    it("canTrigger is true when tamer is on the battle area", () => {
      const source = makeSource("PERM#sora", true);
      const effects = module!.effectsForTiming(EffectTiming.None, source);
      const canTrigger = effects[0]!.canTrigger({ source } as never);
      expect(canTrigger).toBe(true);
    });

    it("canTrigger is false when tamer is off the battle area", () => {
      const source = makeSource("PERM#sora", false);
      const effects = module!.effectsForTiming(EffectTiming.None, source);
      const canTrigger = effects[0]!.canTrigger({ source } as never);
      expect(canTrigger).toBe(false);
    });

    it("resolving the staticModifier calls subscribeSubTrigger", async () => {
      const source = makeSource("PERM#sora", true);
      const recorder: { calls: Call[] } = { calls: [] };
      const ctx = makeContext(recorder, source);

      const effects = module!.effectsForTiming(EffectTiming.None, source);
      await effects[0]!.resolve(ctx as never);

      const call = recorder.calls.find((c) => c.verb === "subscribeSubTrigger");
      expect(call, "subscribeSubTrigger must be called").toBeDefined();
      const install = call!.args[0] as { event: string; once: boolean; sourcePermanentId: string };
      expect(install.event).toBe("whenCardReturnsFromTrashToHand");
      expect(install.once).toBe(false);
      expect(install.sourcePermanentId).toBe("PERM#sora");
    });

    it("keeps the continuous watcher registration safe when the Tamer is off the battle area", async () => {
      const source = makeSource("PERM#sora", false);
      const recorder: { calls: Call[] } = { calls: [] };
      const ctx = makeContext(recorder, source);

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
      const ctx = makeContext(recorder, source);

      const effects = module!.effectsForTiming(EffectTiming.SecuritySkill, source);
      await effects[0]!.resolve(ctx as never);

      const call = recorder.calls.find((c) => c.verb === "playInstances");
      expect(call, "playInstances must be called").toBeDefined();
      expect(call!.args[0]).toEqual(["INST#BT15-082"]);
      expect((call!.args[1] as { payCost: boolean }).payCost).toBe(false);
    });
  });

  it("naturally returns a red Digimon from trash and free-plays a bird under the security-scaled DP cap", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-082", as: "sora" }],
          hand: [
            { card: "BT15-088", as: "wings" },
            { card: "BT15-008", as: "bird" },
          ],
          trash: [{ card: "BT1-012", as: "returnedRed" }],
          deck: ["BT1-001", "BT1-001"],
        },
        1: { security: ["BT1-001", "BT1-001", "BT1-001"], deck: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    const birdInstanceId = s.inst("bird").instanceId;
    preferred.push(birdInstanceId);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wings").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === birdInstanceId),
    );

    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("returnedRed").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("sora").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === birdInstanceId)).toBe(
      true,
    );
  });
});
