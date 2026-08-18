import { describe, it, expect } from "vitest";
import {
  GameState,
  PlayerState,
  Permanent,
  CardInstance,
  EffectTiming,
  type Seat,
  type ServerEvent,
  type CompiledCard,
} from "@aegis/shared";
import { MemoryGauge } from "../../engine/MemoryGauge.js";
import { ModifierLedger } from "../../engine/effects/modifiers.js";
import { createPrimitives, type PrimitivesEngine, type SelectionPort } from "../../engine/effects/primitives.js";
import { createCardSource, type CardStateLookup } from "../../engine/cards/CardSource.js";
import { createGameAccess, createEffectContext } from "../../engine/effects/context.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
// The REAL authored IR (the override exports it so the A3 asserts against the on-disk source).
import { compiled as BT16_094 } from "./BT16-094.js";
import "../index.js";

/**
 * Full-engine A3 for BT16-094 Dragon's Breath's [Main] <Delay> OR-modal clause (plan 08-06).
 *
 *   "[Main] <Delay> Place 1 [Trial of the Four Great Dragons] from your hand in the battle area, or
 *    you may trash 1 [Four Great Dragons] trait card in your hand. If you did either, 1 of your
 *    opponent's Digimon gets -7000 DP for the turn."  (documented behavior)
 *
 * KB authority (node tools/kb/query.mjs card BT16-094): no card-specific Q&A. documented behavior: a bool selection
 * (place [Trial...] from hand OR discard a [Four Great Dragons]-trait card); if you did either,
 * `ChangeDigimonDP(-7000, UntilEachTurnEnd)` on a chosen opponent Digimon. Modeled as the existing
 * Modal action (choose 1) composing PlayWithoutCost / Trash + a per-branch ModifyDP tail.
 *
 * Vehicle: branch B (the trash branch) — a real [Four Great Dragons]-trait card (BT14-018 Goldramon)
 * in hand, an opponent Digimon (8000 DP) on the field. Resolve the modal choosing branch B; assert
 * the card was trashed AND the opponent Digimon's DP dropped by 7000 (the "if you did either" tail).
 *
 * FAILS-WHEN-REVERTED: strip the trash-then-debuff tail (the gated -7000 DP ModifyDP after the
 * modal) — the [Four Great Dragons] card is still trashed but the opponent Digimon keeps its full
 * DP, so the -7000 assertion goes RED.
 */

const FGD = "BT14-018"; // Goldramon — has the "Four Great Dragons" trait (types)
const OPPONENT = "BT1-045"; // an opponent Digimon to receive -7000 DP

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

interface RunResult {
  fgdTrashed: boolean;
  opponentCurrentDP: number;
}

/**
 * Resolve BT16-094's [Main] <Delay> modal once, CHOOSING branch B (trash). A [Four Great Dragons]
 * card sits in seat 0's hand; an opponent Digimon (4000 base DP) sits on seat 1's field.
 * `branchIndex` selects the modal branch (1 = the trash branch).
 */
async function runDelayModal(compiled: CompiledCard, branchIndex: number): Promise<RunResult> {
  seq = 0;
  const state = new GameState();
  state.turnSeat = 0;
  state.memory = 5;
  for (const seat of [0, 1] as Seat[]) {
    const player = new PlayerState();
    player.seat = seat;
    state.players[seat] = player;
  }
  const events: ServerEvent[] = [];

  // BT16-094 (the using Option) is the effect source. Its [Main] effect placed it as a battle-area
  // OPTION PERMANENT (PlaceInBattleAreaSelf); the ＜Delay＞ clause is "by trashing this card in your
  // battle area, [payload]", so the source must be on the field for the delete-self cost to be paid.
  const source = card("BT16-094", 0);
  const selfPerm = new Permanent();
  selfPerm.permanentId = "p-self";
  selfPerm.controllerSeat = 0;
  selfPerm.topCard = source;
  selfPerm.baseDP = 0;
  selfPerm.currentDP = 0;
  state.players[0]!.battleArea.push(selfPerm);

  // A [Four Great Dragons]-trait card in seat 0's hand (the trash-branch target).
  const fgd = card(FGD, 0);
  state.players[0]!.hand.push(fgd);

  // An opponent Digimon on seat 1's field (the -7000 DP target). 8000 DP so -7000 lands above the
  // zero floor (1000 remaining) and is observable.
  const oppDigimon = new Permanent();
  oppDigimon.permanentId = "p-opp";
  oppDigimon.controllerSeat = 1;
  oppDigimon.topCard = card(OPPONENT, 1);
  oppDigimon.baseDP = 8000;
  oppDigimon.currentDP = 8000;
  state.players[1]!.battleArea.push(oppDigimon);

  const ledger = new ModifierLedger();
  const memory = new MemoryGauge(state, (e) => events.push(e));

  const stateLookup: CardStateLookup = {
    permanentOf: (instanceId) => {
      for (const p of state.players)
        for (const perm of p.battleArea) if (perm.topCard?.instanceId === instanceId) return perm;
      return undefined;
    },
    isOnBattleArea: (instanceId) => {
      for (const p of state.players)
        for (const perm of p.battleArea) if (perm.topCard?.instanceId === instanceId) return true;
      return false;
    },
    isSeatsTurn: (seat) => state.turnSeat === seat,
  };

  const ask: SelectionPort = {
    selectInstances: async (_seat, candidates, _min, max) => candidates.slice(0, max),
  };
  const decisionApi = {
    selectPermanents: async () => [],
    optional: async () => true,
    chooseTargets: async (_ctx: unknown, opts: { candidates: string[]; max: number }) =>
      opts.candidates.slice(0, opts.max),
    selectCards: async (_ctx: unknown, opts: { candidates: string[]; max: number }) =>
      opts.candidates.slice(0, opts.max),
    // Pick the modal branch under test (clamped to the available options when reverted).
    chooseOption: async (_ctx: unknown, labels: string[]) => Math.min(branchIndex, labels.length - 1),
  };

  const engine: PrimitivesEngine = {
    state,
    emit: (e) => events.push(e),
    nextPermanentId: () => `perm-${++seq}`,
    memory,
    modifiers: ledger,
    ask,
    controllerSeat: () => state.turnSeat,
  };
  const fx = createPrimitives(engine);
  const game = createGameAccess(state);

  const module = irCardModule("BT16-094", compiled);
  const src = createCardSource(source, stateLookup);
  // The <Delay> clause is a non-security [Main] effect (OnDeclaration / OnUseOption window). Resolve
  // only the Modal-bearing effect (skip the reveal-add [Main] and the [Security] timings).
  const effects = module
    .effectsForTiming(EffectTiming.OnDeclaration, src)
    .filter((e) => e.description.includes("Modal"));
  for (const e of effects) {
    const ctx = createEffectContext({ source: src, trigger: {}, game, fx, ask: decisionApi });
    await e.resolve(ctx);
  }

  return {
    fgdTrashed: state.players[0]!.trash.some((c) => c.instanceId === fgd.instanceId),
    opponentCurrentDP: state.players[1]!.battleArea[0]?.currentDP ?? 8000,
  };
}

/**
 * A clone of BT16-094's registered IR with the trash-then-debuff TAIL (the gated -7000 DP ModifyDP
 * after the modal) removed — the precise revert lever for the "trash-then -7000 DP" residual.
 */
function withoutDebuffTail(compiled: CompiledCard): CompiledCard {
  const clone: CompiledCard = JSON.parse(JSON.stringify(compiled));
  for (const eff of clone.effects ?? []) {
    if (!(eff.keywords ?? []).some((k) => k.keyword === "Delay")) continue;
    eff.actions = (eff.actions ?? []).filter((a) => (a as { kind?: string }).kind !== "ModifyDP");
  }
  return clone;
}

describe("BT16-094 Dragon's Breath — [Main] <Delay> OR-modal (place-from-hand / trash-then -7000 DP)", () => {
  it("authors a 2-branch Modal (place | trash) then an ifThisEffectActed-gated -7000 DP tail", () => {
    const delay = (BT16_094.effects ?? []).find((e) => (e.keywords ?? []).some((k) => k.keyword === "Delay"));
    expect(delay).toBeDefined();
    const modal = (delay!.actions ?? []).find((a) => (a as { kind?: string }).kind === "Modal") as
      | { options?: { kind?: string }[][] }
      | undefined;
    expect(modal?.options?.length).toBe(2);
    const branchKinds = (modal!.options ?? []).map((branch) => branch.map((a) => a.kind));
    expect(branchKinds[0]).toEqual(["PlayWithoutCost"]);
    expect(branchKinds[1]).toEqual(["Trash"]);
    const debuff = (delay!.actions ?? []).find((a) => (a as { kind?: string }).kind === "ModifyDP") as
      | { amount?: number; condition?: { kind?: string } }
      | undefined;
    expect(debuff?.amount).toBe(-7000);
    expect(debuff?.condition?.kind).toBe("ifThisEffectActed"); // "if you did either"
  });

  it("trashes a [Four Great Dragons] card and applies -7000 DP via branch B (as authored)", async () => {
    const r = await runDelayModal(BT16_094, 1); // choose the trash branch
    expect(r.fgdTrashed).toBe(true);
    expect(r.opponentCurrentDP).toBe(8000 - 7000); // 1000 (the debuff fired: "if you did either")
  });

  it("goes inert when the trash-then-debuff tail is reverted (fails-when-reverted)", async () => {
    const r = await runDelayModal(withoutDebuffTail(BT16_094), 1); // trash still happens, no debuff
    expect(r.fgdTrashed).toBe(true); // the trash branch still ran
    expect(r.opponentCurrentDP).toBe(8000); // but no -7000 DP without the gated tail
  });
});
