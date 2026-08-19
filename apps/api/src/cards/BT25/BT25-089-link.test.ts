import { describe, it, expect } from "vitest";
import {
  GameState,
  PlayerState,
  Permanent,
  CardInstance,
  EffectTiming,
  type Seat,
  type ServerEvent,
} from "@aegis/shared";
import type { Filter, Target } from "@aegis/shared/effects/ir/filters/filter.js";
import { MemoryGauge } from "../../engine/MemoryGauge.js";
import { ModifierLedger } from "../../engine/effects/modifiers.js";
import { createPrimitives, type PrimitivesEngine, type SelectionPort } from "../../engine/effects/primitives.js";
import { createCardSource, type CardStateLookup } from "../../engine/cards/CardSource.js";
import { createGameAccess, createEffectContext } from "../../engine/effects/context.js";
import { irCardModule, candidateLooseInstances } from "../../engine/effects/interpreter.js";
// The REAL authored IR (the hand-override exports it so the A3 asserts against the on-disk source).
import { compiled as BT25_089 } from "./BT25-089.js";
// Boot side-effect: self-register every compiled-IR card module.
import "../index.js";

/**
 * Full-engine A3 for BT25-089's [Main] ＜Link＞-capability gate (plan 08-16, the FINAL
 * rawUnparsed residual):
 *
 *   "[Main] By suspending this Tamer, you may link 1 [Appmon] trait Digimon card from your
 *    hand or your Digimon's digivolution cards to 1 of your Digimon with the cost reduced by 2."
 *
 * documented behavior authority (documented behavior CanLinkCardCondition):
 *     cardSource.IsDigimon && cardSource.EqualsTraits("Appmon") && cardSource.CanLink(payCost)
 *   `CanLink` is reachable only when `linkCondition != null` — i.e. the card carries its own
 *   ＜Link＞ requirement (the source `LinkRequirement` header, exported as
 *   `CardDefinition.linkRequirement`).
 * KB authority (node tools/kb/query.mjs card BT25-089): Q6422 (2026-05-08) — "Can I link a card
 *   that doesn't have ＜Link＞? No, you can't."
 *
 * Before 08-16 the clause approximated the gate by the [Appmon] trait alone; an [Appmon] Digimon
 * with NO link requirement was wrongly offered. The faithful gate is the new `hasLinkRequirement`
 * Filter field reading `CardDefinition.linkRequirement` (not the printed text — the requirement is
 * a structured header that never appears in `effectText`).
 *
 * Card data (node check): BT21-009 Gatchmon is [Appmon] trait AND carries "[Link] [Appmon] trait:
 * Cost 1" (CAN link); BT22-009 Effecmon is [Appmon] trait but carries NO LinkRequirement
 * (CANNOT link). The clause must accept the former and reject the latter.
 */

const CAN_LINK = "BT21-009"; // Gatchmon — [Appmon] trait, "[Link] [Appmon] trait: Cost 1"
const NO_LINK = "BT22-009"; // Effecmon — [Appmon] trait, no LinkRequirement (cannot be linked)

let seq = 0;
function card(cardId: string, seat: Seat): CardInstance {
  seq += 1;
  const c = new CardInstance();
  c.instanceId = `inst-${seq}`;
  c.cardId = cardId;
  c.ownerSeat = seat;
  c.faceUp = true;
  return c;
}

/** The exact target filter BT25-089's [Main] Link action carries (Appmon trait + link-capability). */
function bt25_089LinkTarget(): Target {
  const main = (BT25_089.effects ?? []).find((e) => e.trigger === "Main");
  const link = (main?.actions ?? []).find((a) => (a as { kind?: string }).kind === "Link") as
    | { target?: Target }
    | undefined;
  if (link?.target === undefined) throw new Error("BT25-089 [Main] Link action / target not found in the authored IR");
  return link.target;
}

interface Harness {
  ctx: ReturnType<typeof createEffectContext>;
}

/** A battle-area BT25-089 (the linking Tamer) on seat 0 with the two test link cards in hand. */
function harness(): Harness {
  seq = 0;
  const state = new GameState();
  state.turnSeat = 0;
  state.memory = 10;
  for (const seat of [0, 1] as Seat[]) {
    const player = new PlayerState();
    player.seat = seat;
    state.players[seat] = player;
  }
  const events: ServerEvent[] = [];

  const tamer = new Permanent();
  tamer.permanentId = "p-tamer";
  tamer.controllerSeat = 0;
  const top = card("BT25-089", 0);
  tamer.topCard = top;
  state.players[0]!.battleArea.push(tamer);

  // A friendly Digimon recipient ("link ... to 1 of your Digimon").
  const recipient = new Permanent();
  recipient.permanentId = "p-recipient";
  recipient.controllerSeat = 0;
  const recTop = card("BT25-070", 0); // any Digimon
  recipient.topCard = recTop;
  recipient.baseDP = 3000;
  recipient.currentDP = 3000;
  state.players[0]!.battleArea.push(recipient);

  state.players[0]!.hand.push(card(CAN_LINK, 0));
  state.players[0]!.hand.push(card(NO_LINK, 0));

  const stateLookup: CardStateLookup = {
    permanentOf: (instanceId) => {
      for (const p of state.players) for (const perm of p.battleArea) if (perm.topCard?.instanceId === instanceId) return perm;
      return undefined;
    },
    isOnBattleArea: (instanceId) => {
      for (const p of state.players) for (const perm of p.battleArea) if (perm.topCard?.instanceId === instanceId) return true;
      return false;
    },
    isSeatsTurn: (seat) => state.turnSeat === seat,
  };

  const ask: SelectionPort = { selectInstances: async (_seat, candidates, _min, max) => candidates.slice(0, max) };
  const decisionApi = {
    selectPermanents: async () => [],
    optional: async () => true,
    chooseTargets: async (_c: unknown, opts: { candidates: string[]; max: number }) => opts.candidates.slice(0, opts.max),
    selectCards: async (_c: unknown, opts: { candidates: string[]; max: number }) => opts.candidates.slice(0, opts.max),
    chooseOption: async () => 0,
  };

  const engine: PrimitivesEngine = {
    state,
    emit: (e) => events.push(e),
    nextPermanentId: () => "p-x",
    memory: new MemoryGauge(state, (e) => events.push(e)),
    modifiers: new ModifierLedger(),
    ask,
    controllerSeat: () => state.turnSeat,
  };
  const fx = createPrimitives(engine);
  const game = createGameAccess(state);
  const src = createCardSource(tamer.topCard!, stateLookup);
  const ctx = createEffectContext({ source: src, trigger: {}, game, fx, ask: decisionApi });
  return { ctx };
}

describe("BT25-089 [Main] — only a card that CAN link (carries its own ＜Link＞) is a legal link target (KB Q6422)", () => {
  it("authors the [Main] Link target with hasLinkRequirement:true alongside the [Appmon] trait", () => {
    const target = bt25_089LinkTarget();
    expect(target.filter.hasLinkRequirement).toBe(true);
    expect(target.filter.nameOrTrait?.some((r) => r.tokens.includes("Appmon"))).toBe(true);
  });

  it("LOAD-BEARING gate: the authored filter selects the link-capable [Appmon] card and REJECTS the [Appmon] card with no ＜Link＞", () => {
    const { ctx } = harness();
    const target = bt25_089LinkTarget();

    const ids = candidateLooseInstances(ctx, target, ["hand"]).map((c) => c.cardId);

    expect(ids, "Gatchmon (Appmon + Link requirement) is a legal link target").toContain(CAN_LINK);
    expect(ids, "Effecmon (Appmon but NO Link requirement) is rejected — Q6422").not.toContain(NO_LINK);
  });

  it("FAILS-WHEN-REVERTED: drop hasLinkRequirement from the filter and the no-＜Link＞ [Appmon] card is wrongly offered (gate stops discriminating)", () => {
    const { ctx } = harness();
    const target = bt25_089LinkTarget();
    // The revert: strip the hasLinkRequirement field, leaving the pre-08-16 trait-only approximation.
    const reverted: Filter = { ...target.filter };
    delete (reverted as { hasLinkRequirement?: boolean }).hasLinkRequirement;

    const ids = candidateLooseInstances(ctx, { ...target, filter: reverted }, ["hand"]).map((c) => c.cardId);

    // With the field gone the gate no longer discriminates: BOTH [Appmon] cards are offered,
    // including the one that cannot link — exactly the unfaithful behavior 08-16 closes.
    expect(ids).toContain(CAN_LINK);
    expect(ids, "without hasLinkRequirement the no-＜Link＞ card leaks back in (RED)").toContain(NO_LINK);
  });
});
