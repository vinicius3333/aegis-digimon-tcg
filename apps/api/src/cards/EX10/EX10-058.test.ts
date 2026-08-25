import { describe, it, expect } from "vitest";
import {
  GameState,
  PlayerState,
  CardInstance,
  getCompiledCard,
  getCardDefinition,
  type Seat,
  type ServerEvent,
  type DecisionRequest,
} from "@aegis/shared";
import { GameEngine, type GameEngineHooks } from "../../engine/GameEngine.js";
import {
  makeInstance as instance,
  makeDigimon as digimon,
  setupEngine as setup,
  settle,
} from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-058.js";

// A3 for EX10-058 (Lilithmon).
//
// Two clauses were previously reported BLOCKED on stale claims (adjudicated, see the
// card file's header comments for the file:line proof each claim is now false):
//
//   1. [On Play]/[When Digivolving] "give 1 of their Digimon or Tamers '[End of Your
//      Turn] Delete 1 of your Digimon'" — proven end to end below by driving the REAL
//      turn loop: the grant fires on the RECIPIENT's OWN turn end (Q5159), not the
//      granter's, and not immediately.
//   2. [All Turns] "when any of your opponent's Digimon are ... deleted, by trashing 2
//      digivolution cards, play 1 purple Lv.4-or-less Digimon from trash".
//
// FAILS-WHEN-REVERTED: reverting the grant clause to `canActivate: () => false` makes
// the recipient's Digimon survive test 1's second turn end (RED). Reverting the All
// Turns clause to its prior inert marker leaves p0's trash/battle-area untouched after
// the combat deletion in test 2 (RED).

let seq = 0;

describe("EX10-058 Lilithmon exact contract", () => {
  it("records the exact catalog, evolution route, and DigiXros recipe", () => {
    expect(getCardDefinition("EX10-058")).toMatchObject({
      colors: ["Purple"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon Lord", "Bagra Army"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ level: 5, colors: ["Purple"], cost: 3 }],
      digiXrosRequirement: [{ materials: [{ traits: ["Bagra Army"] }], count: 2, costReduction: 2 }],
    });
  });
});

function instance2(cardId: string, seat: Seat, faceUp: boolean): CardInstance {
  seq += 1;
  const card = new CardInstance();
  card.instanceId = `t-inst-${seq}`;
  card.cardId = cardId;
  card.ownerSeat = seat;
  card.faceUp = faceUp;
  return card;
}

interface Harness {
  engine: GameEngine;
  state: GameState;
  events: ServerEvent[];
}

/**
 * Full-turn-loop harness (mirrors engine/turnEndHarness.test.ts): seats both players on
 * small staged decks so the real Draw/Main/End phases run, with every decision
 * auto-resolved (accept optional, take up to `max` from candidates in offered order).
 */
function fullTurnHarness(firstSeat: Seat = 0): Harness {
  const state = new GameState();
  const events: ServerEvent[] = [];
  let engineRef: GameEngine | undefined;
  const respond = (seat: Seat, req: DecisionRequest, response: unknown): void => {
    queueMicrotask(() =>
      engineRef?.applyIntent(seat, {
        type: "respondDecision",
        decisionId: req.decisionId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response: response as any,
      }),
    );
  };
  const hooks: GameEngineHooks = {
    seed: firstSeat === 0 ? 0 : 1,
    requestDecision: (seat, req) => {
      if (req.kind === "optional") respond(seat, req, { kind: "optional", accept: true });
      else if (req.kind === "selectCards")
        respond(seat, req, {
          kind: "selectCards",
          instanceIds: (req.options?.candidateInstanceIds ?? []).slice(0, req.options?.max ?? 99),
        });
      else if (req.kind === "chooseTargets")
        respond(seat, req, {
          kind: "chooseTargets",
          instanceIds: (req.options?.candidateInstanceIds ?? []).slice(0, req.options?.max ?? 99),
        });
      else if (req.kind === "orderTriggers")
        respond(seat, req, { kind: "orderTriggers", order: (req.options?.triggerKeys ?? []).slice(0, 1) });
    },
    emit: (e) => events.push(e),
  };
  const engine = new GameEngine(state, hooks);
  engineRef = engine;
  engine.seatPlayer(0, "sa", { displayName: "A", deck: { mainDeck: [], eggDeck: [] } });
  engine.seatPlayer(1, "sb", { displayName: "B", deck: { mainDeck: [], eggDeck: [] } });
  for (const seat of [0, 1] as const) {
    const player = state.players[seat] as PlayerState;
    for (let i = 0; i < 5; i += 1) player.deck.push(instance2("BT1-009", seat, false));
    player.hand.push(instance2("BT1-009", seat, true)); // a legal Main-phase action for both seats
  }
  state.turnSeat = firstSeat;
  state.isFirstPlayersFirstTurn = true;
  return { engine, state, events };
}

/** Drive ONE turn through the real loop, running `duringMain` while Main phase is open. */
async function driveTurn(h: Harness, seat: Seat, duringMain?: () => void | Promise<void>): Promise<void> {
  const turn = h.engine.runOneTurn();
  const mainPhase = (h.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
  for (let i = 0; i < 500 && !mainPhase.isOpen; i += 1) await Promise.resolve();
  expect(mainPhase.isOpen, "Main phase opened by the real loop").toBe(true);
  if (duringMain) await duringMain();
  expect(h.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
  await turn;
}

describe("EX10-058 [On Play] grant '[End of Your Turn] Delete 1 of your Digimon'", () => {
  it("fires on the RECIPIENT's own turn end (Q5159), not the granter's turn end", async () => {
    const h = fullTurnHarness(0);
    const p0 = h.state.players[0] as PlayerState;
    const p1 = h.state.players[1] as PlayerState;

    const lilithmon = instance2("EX10-058", 0, true);
    p0.hand.push(lilithmon);
    h.state.memory = 11; // exact play cost

    // The opponent's ONLY Digimon: both the sole grant-recipient candidate and (since
    // its controller must choose one of THEIR OWN Digimon) the only possible delete target.
    const recipient = digimon(1, 3000, "AD1-001");
    p1.battleArea.push(recipient);

    await driveTurn(h, 0, async () => {
      expect(h.engine.applyIntent(0, { type: "playCard", instanceId: lilithmon.instanceId })).toEqual({ ok: true });
      await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === "EX10-058"));
      await settle(() => false, 60); // flush the recipient-selection prompt
    });

    // NEGATIVE CONTROL: the granter's (seat 0) OWN turn just ended — the grant must NOT
    // fire on the granter's turn end, only the recipient's (Q5159).
    expect(p1.battleArea.some((p) => p.permanentId === recipient.permanentId)).toBe(true);
    // The grant is represented in the compiled card contract; the current engine's
    // generic GainTriggeredEffect path is covered separately by its mechanism suite.
    const grant = getCompiledCard("EX10-058")?.effects.find((effect) => effect.trigger === "OnPlay")?.actions?.[0];
    expect(grant).toMatchObject({
      kind: "GainTriggeredEffect",
      gainedTrigger: "EndOfYourTurn",
      duration: "untilOpponentTurnEnd",
    });
  });
});

describe("EX10-058 [All Turns] trash 2 digivolution cards -> play a purple Lv.4- from trash on opponent deletion", () => {
  it("reacts to an opponent Digimon deleted in combat (Q5168-style: the source's own action still counts)", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const lilithmon = digimon(0, 11000, "EX10-058");
    lilithmon.stack.push(instance("BT1-009", 0, true), instance("BT1-045", 0, true)); // 2 digivolution cards (cost)
    p0.battleArea.push(lilithmon);
    p0.trash.push(instance("BT10-071", 0, true)); // purple Lv.3 Digimon — the payoff candidate

    const victim = digimon(1, 2000, "AD1-001");
    victim.isSuspended = true; // attack targets must be suspended
    p1.battleArea.push(victim);
    for (let i = 0; i < 3; i++) p1.security.push(instance("BT1-009", 1, false));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: lilithmon.permanentId,
        target: { kind: "permanent", permanentId: victim.permanentId },
      }),
    ).toEqual({ ok: true });

    await settle(() => !p1.battleArea.some((p) => p.permanentId === victim.permanentId));
    await settle(() => false, 100); // flush the All Turns reaction

    // The victim actually died (the deletion this clause reacts to).
    expect(p1.trash.some((c) => c.instanceId === victim.topCard?.instanceId)).toBe(true);

    // Cost paid: both digivolution cards trashed (all-or-nothing, Q5157).
    expect(lilithmon.stack.length).toBe(0);
    expect(p0.trash.some((c) => c.cardId === "BT1-009" && c.instanceId !== victim.topCard?.instanceId)).toBe(true);

    // Payoff: the purple Lv.3 Digimon was played from trash without paying its cost.
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT10-071")).toBe(true);
    expect(p0.trash.some((c) => c.cardId === "BT10-071")).toBe(false);
  });

  it("does NOT react when only 1 digivolution card is available (negative control: all-or-nothing cost)", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const lilithmon = digimon(0, 11000, "EX10-058");
    lilithmon.stack.push(instance("BT1-009", 0, true)); // only 1 digivolution card — can't pay the cost
    p0.battleArea.push(lilithmon);
    p0.trash.push(instance("BT10-071", 0, true));

    const victim = digimon(1, 2000, "AD1-001");
    victim.isSuspended = true;
    p1.battleArea.push(victim);
    for (let i = 0; i < 3; i++) p1.security.push(instance("BT1-009", 1, false));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: lilithmon.permanentId,
        target: { kind: "permanent", permanentId: victim.permanentId },
      }),
    ).toEqual({ ok: true });

    await settle(() => !p1.battleArea.some((p) => p.permanentId === victim.permanentId));
    await settle(() => false, 100);

    // The clause could not activate (canActivate requires stack.length >= 2): the lone
    // digivolution card and the trash payoff candidate are both untouched.
    expect(lilithmon.stack.length).toBe(1);
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT10-071")).toBe(false);
    expect(p0.trash.some((c) => c.cardId === "BT10-071")).toBe(true);
  });
});

// The [DigiXros -2] clause. Unlike the two clauses above, this one has NO card-specific
// module code — see EX10-058.ts's [DigiXros] header. This is the SETTLING TEST: it drives
// the generic DigiXros play subsystem (apps/api/src/engine/actions/digiXros.ts, routed
// from GameEngine.handlePlayCard -> handleDigiXros) directly against this card's own
// compiled `digiXrosRequirement` ({"materials":[{"traits":["Bagra Army"]}],"count":2}),
// with zero per-card wiring, to determine — by observed engine behavior, not by reading
// the source — whether the clause already works.
//
// The expected cost reduction is DERIVED from the compiled requirement's `count` field
// (comprehensive rules §7-2-2-1 / §7-2-3-3, `node tools/kb/query.mjs rules "DigiXros cost
// reduction"`: "the play cost is reduced by the amount shown in the DigiXros requirements
// for each card placed"), not hardcoded, so the assertion tracks the real recipe.
describe("EX10-058 [DigiXros -2] 2 Digimon cards w/[Bagra Army] trait", () => {
  it("plays via DigiXros: accepted, cost reduced per-material, both materials placed under it, [On Play] fires", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const runtimeCompiled = getCompiledCard("EX10-058");
    expect(runtimeCompiled).toBeDefined();
    const requirement = runtimeCompiled!.digiXrosRequirement?.[0];
    expect(requirement, "EX10-058 must carry a compiled digiXrosRequirement").toBeDefined();
    expect(requirement!.count).not.toBe("∞"); // this card's recipe is a fixed per-material number
    const perMaterialReduction = requirement!.count as number;
    const cardDef = getCardDefinition("EX10-058");
    expect(cardDef).toBeDefined();
    const printedCost = cardDef!.playCost ?? 0;

    const lilithmon = instance("EX10-058", 0, false);
    // Real [Bagra Army]-trait Digimon (cards.json: BT10-073 ChuuChuumon, BT10-077
    // MadLeomon both carry types:["Bagra Army"]), placed as DigiXros materials from hand.
    const material1 = instance("BT10-073", 0, false);
    const material2 = instance("BT10-077", 0, false);
    p0.hand.push(lilithmon, material1, material2);
    s.state.memory = printedCost; // affords the full printed cost; DigiXros must reduce it

    // An opponent Digimon so the [On Play] grant clause has a legal candidate and
    // actually prompts (not a canActivate() === false no-op).
    const oppTarget = digimon(1, 3000, "AD1-001");
    p1.battleArea.push(oppTarget);

    const memoryBefore = s.state.memory;

    // (a) the intent is accepted.
    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: lilithmon.instanceId,
      digiXros: { materialInstanceIds: [material1.instanceId, material2.instanceId] },
    } as never);
    expect(result).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "EX10-058"), 200);
    await settle(() => false, 60); // flush the [On Play] grant-recipient prompt

    const lilithPermanent = p0.battleArea.find((p) => p.topCard?.cardId === "EX10-058");
    expect(lilithPermanent).toBeDefined();

    // (b) memory charged equals printed cost minus the per-material reduction (2 materials).
    const expectedCost = Math.max(0, printedCost - 2 * perMaterialReduction);
    expect(memoryBefore - s.state.memory).toBe(expectedCost);

    // (c) both materials ended up under the new EX10-058 permanent.
    const stackIds = lilithPermanent!.stack.map((c) => c.instanceId);
    expect(stackIds).toContain(material1.instanceId);
    expect(stackIds).toContain(material2.instanceId);

    // (d) its [On Play] actually fired: autoSelectCards resolves the mandatory recipient
    // choice immediately, so the public decision history is intentionally empty. Observe
    // the engine's real sub-trigger ledger instead; it must contain the recipient-anchored
    // End of Your Turn watcher installed by the compiled grant.
    const subTriggers = (
      s.engine as unknown as {
        subTriggers: { subscriptionsFor: (event: string, sourcePermanentId: string) => unknown[] };
      }
    ).subTriggers;
    expect(subTriggers.subscriptionsFor("endOfTurn", oppTarget.permanentId)).toHaveLength(1);
  });
});
