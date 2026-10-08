import { EffectTiming } from "@aegis/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../../cards/EX12/EX12-019.js";
import "../../cards/P/P-245.js";
import "../../cards/ST5/ST5-08.js";
import "../../cards/BT14/BT14-014.js";
import { effectsOf, type CollectedEffect } from "../effects/collect.js";
import type { Effect } from "../effects/Effect.js";
import * as primitives from "../effects/primitives.js";
import { resolveTiming, type ResolutionEnv } from "../effects/stack.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { buildEffectContext, cardSourceOf, effectEnvironment } from "./effectContext.js";
import * as rules from "./ruleProcess.js";
import * as timing from "./timing.js";

// API suites share their module graph. Re-import the engine through this suite's
// mock boundary even when an earlier room suite has already loaded it.
vi.hoisted(() => vi.resetModules());

vi.mock("../effects/primitives.js", async (importOriginal) => ({
  ...(await importOriginal<typeof primitives>()),
}));

afterEach(() => vi.restoreAllMocks());

function testEffect(key: string, resolve: Effect["resolve"]): Effect {
  return {
    effectKey: key,
    description: key,
    optional: false,
    isInherited: false,
    isSecurity: false,
    isLinked: false,
    maxPerTurn: -1,
    canTrigger: () => true,
    canActivate: () => true,
    resolve,
  };
}

/**
 * Sequencing integration: real wrapper, resolver, P-245 processing-cost gate,
 * suspend/draw primitives and CombatController. Only the enabling pool's origin
 * is injected, so this proves the wrapper contract without inventing a printed
 * card combination. The arena suite separately drives the real turn/declaration queues.
 */
describe("effect-attack wrapper retains parent costs until every pre-Counter pool finishes", () => {
  it.each(["rule", "declaration", "never"] as const)(
    "initially unpayable Kakkinmon survives intermediate ordinary drains (enabler=%s)",
    async (enabler) => {
      const log: string[] = [];
      let insideWrapper = false;
      let injected = false;
      let ordinaryDrains = 0;
      const ordinarySnapshots: { suspended: boolean; payable: boolean }[] = [];
      const create = primitives.createPrimitives;
      vi.spyOn(primitives, "createPrimitives").mockImplementation((deps) => {
        const wrapper = deps.resolveAttackTimingWindow!;
        deps.resolveAttackTimingWindow = async (drain, options) => {
          insideWrapper = options?.retireUnactivatable === true;
          try {
            await wrapper(async (drainOptions) => {
              if (!insideWrapper) {
                await drain(drainOptions);
                return;
              }
              if (drainOptions?.retireUnactivatable) {
                log.push("final-retirement");
              } else {
                ordinaryDrains += 1;
                log.push(`ordinary-${ordinaryDrains}`);
                ordinarySnapshots.push({
                  suspended: s.perm("spare").isSuspended,
                  payable: kakkinmon.effect.canActivate(env.makeContext(kakkinmon)),
                });
              }
              await drain(drainOptions);
            }, options);
          } finally {
            insideWrapper = false;
          }
        };
        return create(deps);
      });
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX12-019", as: "nezha", under: ["P-245"] },
              { card: "ST5-08", as: "spare", suspended: true },
            ],
            hand: ["BT1-009"],
            deck: Array(12).fill("BT1-009"),
          },
          1: {
            battleArea: [{ card: "BT20-012", as: "counterBase" }],
            hand: ["BT14-014"],
            security: ["BT1-009", "BT1-009"],
          },
        },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          onEvent: (event) => {
            if (event.kind === "counterWindowOpened") log.push("counter");
          },
        },
      );
      await s.ready();
      const source = cardSourceOf(s.engine, s.perm("nezha").topCard);
      const inherited = cardSourceOf(s.engine, s.perm("nezha").stack[0]!);
      const kakkinmon: CollectedEffect = {
        source: inherited,
        effect: effectsOf(EffectTiming.EndOfAllTurns, inherited)[0]!,
      };
      expect(kakkinmon.effect).toBeDefined();
      const enable: CollectedEffect = {
        source,
        timing: EffectTiming.OnUseAttack,
        effect: testEffect("test/enable-spare", async (ctx) => {
          log.push(`${enabler}-reaction`);
          await ctx.fx.unsuspend([s.perm("spare").permanentId]);
        }),
      };
      const collectRules = rules.collectRuleProcessPending;
      vi.spyOn(rules, "collectRuleProcessPending").mockImplementation(async (engine) => {
        if (insideWrapper && !injected && enabler === "rule") {
          injected = true;
          log.push("rule-collection");
          return [enable];
        }
        return collectRules(engine);
      });
      const drainDeclarations = timing.drainPendingAttackTriggers;
      vi.spyOn(timing, "drainPendingAttackTriggers").mockImplementation(async (engine) => {
        if (insideWrapper) {
          log.push("declaration-pool");
          if (!injected && enabler === "declaration") {
            injected = true;
            await resolveTiming(EffectTiming.OnUseAttack, { ...env, collect: () => [enable] });
          }
        }
        await drainDeclarations(engine);
      });
      const attack: CollectedEffect = {
        source,
        effect: testEffect("test/order-attack", async (ctx) => {
          await ctx.fx.forceAttack(s.perm("nezha").permanentId, {
            drainTimingWindow: ctx.drainCurrentTimingWindow,
          });
          // A still-unpayable parent must stay retired even if its cost becomes
          // legal only after the completed attack (the original security bug).
          await ctx.fx.unsuspend([s.perm("spare").permanentId]);
          await ctx.drainCurrentTimingWindow!();
        }),
      };
      const env: ResolutionEnv = {
        turnSeat: 0,
        tracker: effectEnvironment(s.engine, {}).tracker,
        collect: () => [attack, kakkinmon],
        makeContext: (collected) => buildEffectContext(s.engine, collected.source, {}),
        ruleProcess: async () => {},
        isGameOver: () => s.state.gameOver,
        chooseOrder: async () => 0,
        askOptional: async () => true,
        onResolved: (_at, collected) => {
          if (collected === kakkinmon) log.push("kakkinmon-paid-and-drew");
        },
      };
      const handBefore = s.state.players[0]!.hand.length;
      const resolution = resolveTiming(EffectTiming.EndOfAllTurns, env);
      await settle(() => log.includes("counter"));
      const enabled = enabler !== "never";
      expect(ordinaryDrains).toBe(2);
      expect(ordinarySnapshots).toEqual([
        { suspended: true, payable: false },
        { suspended: true, payable: false },
      ]);
      expect(log.slice(0, 2)).toEqual(
        enabler === "rule" ? ["ordinary-1", "rule-collection"] : ["ordinary-1", "ordinary-2"],
      );
      expect(log.indexOf("ordinary-2")).toBeLessThan(log.indexOf("declaration-pool"));
      expect(log.indexOf("declaration-pool")).toBeLessThan(log.indexOf("final-retirement"));
      expect(log.indexOf("final-retirement")).toBeLessThan(log.indexOf("counter"));
      expect(log.filter((entry) => entry === "kakkinmon-paid-and-drew")).toHaveLength(enabled ? 1 : 0);
      expect(log.indexOf("kakkinmon-paid-and-drew")).toBeLessThan(log.indexOf("counter"));
      expect(s.state.players[0]!.hand).toHaveLength(handBefore + (enabled ? 1 : 0));
      expect(s.perm("spare").isSuspended).toBe(true);
      expect(s.state.players[1]!.security).toHaveLength(2);
      expect(s.events.filter((event) => event.kind === "securityRevealed")).toHaveLength(0);
      expect(s.engine.applyIntent(1, { type: "respondCounter" })).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
      expect(
        s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("counterBase").permanentId }),
      ).toEqual({ ok: true });
      await resolution;
      expect(log.filter((entry) => entry === "kakkinmon-paid-and-drew")).toHaveLength(enabled ? 1 : 0);
      expect(s.state.players[0]!.hand).toHaveLength(handBefore + (enabled ? 1 : 0));
      expect(s.state.players[1]!.security).toHaveLength(1);
      expect(s.perm("spare").isSuspended).toBe(false);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
});
