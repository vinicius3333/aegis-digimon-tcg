import { expect } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-102.js";
import "../BT8/BT8-097.js";
import "../BT10/BT10-100.js";
import "../BT17/BT17-035.js";
import "../ST22/ST22-05.js";
import "../ST22/ST22-10.js";

/**
 * A "when you use an Option card with a cost of 2 or more" watcher under test. `host` is the
 * seat-0 permanent that carries the watcher (the card itself, or a Digimon with it in its
 * digivolution cards) and must use the alias `host`.
 */
export interface OptionWatcher {
  host: PermanentSpec;
  reward: { kind: "memory" } | { kind: "draw" } | { kind: "minusDp"; amount: number };
}

const INERT_SECURITY = ["BT1-009", "BT1-011", "BT1-012"];
const FILLER_DECK = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-010"];
const TARGET_DP = 7000;
const VANILLA_YELLOW_LEVEL_4 = "BT1-051";
const VANILLA_RED = "BT1-009";

function memoryGainsOfOne(events: ServerEvent[]): number {
  return events.filter((event) => event.kind === "memoryChanged" && event.to - event.from === 1).length;
}

/** Whether the watcher's reward landed, judged from what the reward changes on the board. */
function rewarded(s: EngineSetup, watcher: OptionWatcher, eventsSince: number): boolean {
  switch (watcher.reward.kind) {
    case "memory":
      return memoryGainsOfOne(s.events.slice(eventsSince)) > 0;
    case "draw":
      return s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("rewardDraw").instanceId);
    case "minusDp":
      return s.perm("target").currentDP === TARGET_DP - watcher.reward.amount;
  }
}

function opponentTarget() {
  return { card: VANILLA_YELLOW_LEVEL_4, as: "target", dp: TARGET_DP };
}

/**
 * Use Crimson Blaze (use cost 6, reduced to 4 by two opposing Digimon) with a 3000 DP
 * `doomed` and a 7000 DP `survivor` on the other side. Its [Main] deletes the doomed one.
 * Records whether `doomed` was still on the field at the moment the watcher's reward landed.
 */
export async function useOptionWhoseMainDeletes(watcher: OptionWatcher) {
  let doomedOnFieldAtReward: boolean | undefined;
  let rewardDrawId: string | undefined;
  let s: EngineSetup | undefined;
  const snapshot = () => {
    doomedOnFieldAtReward ??= s!.state.players[1]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === s!.inst("doomed").instanceId,
    );
  };
  s = setupEngine(
    {
      0: {
        battleArea: [watcher.host, { card: VANILLA_RED, as: "red" }],
        hand: [{ card: "BT8-097", as: "crimson" }],
        deck: [{ card: "BT1-013", as: "rewardDraw" }, ...FILLER_DECK],
        security: INERT_SECURITY,
      },
      1: {
        battleArea: [
          { card: VANILLA_RED, as: "doomed", dp: 3000 },
          { card: VANILLA_YELLOW_LEVEL_4, as: "survivor", dp: TARGET_DP },
        ],
        deck: FILLER_DECK,
        security: INERT_SECURITY,
      },
    },
    {
      autoSelectCards: true,
      autoOrderTriggers: true,
      onEvent(event) {
        if (s === undefined) return;
        if (watcher.reward.kind === "memory" && event.kind === "memoryChanged" && event.to - event.from === 1) {
          snapshot();
        }
        if (
          watcher.reward.kind === "draw" &&
          event.kind === "cardsMoved" &&
          event.instanceIds.includes(rewardDrawId!)
        ) {
          snapshot();
        }
      },
    },
  );
  rewardDrawId = s.inst("rewardDraw").instanceId;
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crimson").instanceId })).toEqual({ ok: true });
  await settle(() => s!.state.players[0]!.trash.some((card) => card.cardId === "BT8-097"));
  await settle(() => s!.state.pendingDecision === undefined);
  const survivor = s.state.players[1]!.battleArea.find(
    (permanent) => permanent.topCard.instanceId === s!.inst("survivor").instanceId,
  );
  return {
    s,
    doomedOnFieldAtReward,
    doomedTrashed: s.state.players[1]!.trash.some((card) => card.instanceId === s!.inst("doomed").instanceId),
    survivorDp: survivor?.currentDP,
  };
}

/**
 * Use Impulse Memory Boost! (use cost 3) from hand, then on the next own turn activate its
 * ＜Delay＞ from the battle area. Reports whether the watcher rewarded each of the two.
 */
export async function useThenActivateDelay(watcher: OptionWatcher) {
  const s = setupEngine(
    {
      0: {
        battleArea: [watcher.host, { card: VANILLA_YELLOW_LEVEL_4, as: "yellow" }],
        hand: [{ card: "BT10-100", as: "delayed" }],
        deck: [{ card: "BT1-013", as: "rewardDraw" }, ...FILLER_DECK],
        security: INERT_SECURITY,
      },
      1: { battleArea: [opponentTarget()], deck: FILLER_DECK, security: INERT_SECURITY },
    },
    { autoSelectCards: true, autoOrderTriggers: true },
  );
  s.state.memory = 10;
  await s.ready();
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);

  const delayedId = s.inst("delayed").instanceId;
  const beforeUse = s.events.length;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: delayedId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === delayedId));
  await settle(() => s.state.pendingDecision === undefined);
  const rewardedOnUse = rewarded(s, watcher, beforeUse);

  advance(s.engine).endMainPhaseIfOpen(0);
  await advance(s.engine).waitForMainPhase(1);
  advance(s.engine).endMainPhaseIfOpen(1);
  await advance(s.engine).waitForMainPhase(0);
  expect(s.perm("target").currentDP).toBe(TARGET_DP);

  const memoryBeforeDelay = s.state.memory;
  const beforeDelay = s.events.length;
  const activatable = observe(s.engine).activatableEffects(s.perm("delayed"));
  expect(activatable).toHaveLength(1);
  expect(
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("delayed").topCard.instanceId,
      effectKey: activatable[0]!.effectKey,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === delayedId));
  await settle(() => s.state.pendingDecision === undefined);
  const delayMemoryGain = s.state.memory - memoryBeforeDelay;
  const rewardedOnDelay =
    watcher.reward.kind === "draw"
      ? s.events
          .slice(beforeDelay)
          .some((event) => event.kind === "cardsMoved" && event.from === "deck" && event.to === "hand")
      : rewarded(s, watcher, beforeDelay);

  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
  return { rewardedOnUse, rewardedOnDelay, delayMemoryGain };
}

/**
 * Use Crimson Blaze while five opposing Digimon reduce its use cost from 6 to 1. None of the
 * opposing Digimon has 6000 DP or less, so its [Main] deletes nothing.
 */
export async function useOptionWithUseCostReducedToOne(watcher: OptionWatcher) {
  const s = setupEngine(
    {
      0: {
        battleArea: [watcher.host, { card: VANILLA_RED, as: "red" }],
        hand: [{ card: "BT8-097", as: "crimson" }],
        deck: [{ card: "BT1-013", as: "rewardDraw" }, ...FILLER_DECK],
        security: INERT_SECURITY,
      },
      1: {
        battleArea: [
          opponentTarget(),
          ...Array.from({ length: 4 }, (_, index) => ({ card: VANILLA_RED, as: `bystander${index}`, dp: 20_000 })),
        ],
        deck: FILLER_DECK,
        security: INERT_SECURITY,
      },
    },
    { autoSelectCards: true, autoOrderTriggers: true },
  );
  s.state.memory = 10;
  await s.ready();
  const before = s.events.length;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crimson").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT8-097"));
  await settle(() => s.state.pendingDecision === undefined);
  return { memoryPaid: 10 - s.state.memory, rewarded: rewarded(s, watcher, before) };
}

/**
 * Digivolve a vanilla level 4 into BT17-035 Taomon, whose [When Digivolving] uses Blade of
 * the True (use cost 2) from hand with the cost to pay reduced by 2.
 */
export async function useOptionWithPaymentReducedToZero(watcher: OptionWatcher) {
  const s = setupEngine(
    {
      0: {
        battleArea: [watcher.host, { card: VANILLA_YELLOW_LEVEL_4, as: "digivolver" }],
        hand: [
          { card: "BT17-035", as: "taomon" },
          { card: "BT1-102", as: "blade" },
        ],
        deck: [{ card: "BT1-013", as: "rewardDraw" }, ...FILLER_DECK],
        security: ["BT1-009"],
      },
      1: { battleArea: [opponentTarget()], deck: FILLER_DECK, security: INERT_SECURITY },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
  );
  s.state.memory = 10;
  await s.ready();
  const before = s.events.length;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("digivolver").permanentId,
      instanceId: s.inst("taomon").instanceId,
    }),
  ).toEqual({ ok: true });
  const bladeId = s.inst("blade").instanceId;
  await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === bladeId));
  await settle(() => s.state.pendingDecision === undefined);
  return { memoryPaid: 10 - s.state.memory, rewarded: rewarded(s, watcher, before) };
}

/**
 * Digivolve ST22-04 Taomon into ST22-05 Sakuyamon, whose [When Digivolving] uses Amethyst
 * Mandala (use cost 6) from hand without paying the cost.
 */
export async function useOptionWithoutPaying(watcher: OptionWatcher) {
  const s = setupEngine(
    {
      0: {
        battleArea: [watcher.host, { card: "ST22-04", as: "digivolver" }],
        hand: [
          { card: "ST22-05", as: "sakuyamon" },
          { card: "ST22-10", as: "mandala" },
        ],
        deck: [{ card: "BT1-013", as: "rewardDraw" }, ...FILLER_DECK],
        security: ["BT1-009"],
      },
      1: { battleArea: [opponentTarget()], deck: FILLER_DECK, security: INERT_SECURITY },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
  );
  s.state.memory = 10;
  await s.ready();
  const before = s.events.length;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("digivolver").permanentId,
      instanceId: s.inst("sakuyamon").instanceId,
    }),
  ).toEqual({ ok: true });
  const mandalaId = s.inst("mandala").instanceId;
  await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === mandalaId));
  await settle(() => s.state.pendingDecision === undefined);
  return { memoryPaid: 10 - s.state.memory, rewarded: rewarded(s, watcher, before) };
}
