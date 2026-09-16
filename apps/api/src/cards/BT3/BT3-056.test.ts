import { describe, it, expect } from "vitest";
import {
  GameState,
  PlayerState,
  Permanent,
  CardInstance,
  Phase,
  type Seat,
  type ServerEvent,
  type DecisionRequest,
  getCardDefinition,
  getCompiledCard,
} from "@aegis/shared";
import { GameEngine, type GameEngineHooks } from "../../engine/GameEngine.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT3-056.js";
import "../BT2/BT2-050.js";

let seq = 0;
function instance(cardId: string, seat: Seat): CardInstance {
  seq += 1;
  const c = new CardInstance();
  c.instanceId = `bt3056-inst-${seq}`;
  c.cardId = cardId;
  c.ownerSeat = seat;
  c.faceUp = false;
  return c;
}

function permanent(seat: Seat, cardId: string, dp = 0): Permanent {
  seq += 1;
  const p = new Permanent();
  p.permanentId = `bt3056-perm-${seq}`;
  p.controllerSeat = seat;
  p.topCard = instance(cardId, seat);
  p.topCard.faceUp = true;
  p.isSuspended = false;
  p.inBreeding = false;
  p.baseDP = dp;
  p.currentDP = dp;
  return p;
}

interface Setup {
  engine: GameEngine;
  state: GameState;
  events: ServerEvent[];
}

function setup(opts: { acceptDigisorption: boolean; chooseInstanceId?: () => string | undefined }): Setup {
  const state = new GameState();
  const events: ServerEvent[] = [];
  let engineRef: GameEngine | undefined;
  const hooks: GameEngineHooks = {
    seed: 1,
    requestDecision: (seat: Seat, req: DecisionRequest) => {
      if (req.kind === "optional") {
        queueMicrotask(() =>
          engineRef?.applyIntent(seat, {
            type: "respondDecision",
            decisionId: req.decisionId,
            response: { kind: "optional", accept: opts.acceptDigisorption },
          }),
        );
      } else if (req.kind === "chooseTargets" || req.kind === "selectCards") {
        const candidates = req.options?.candidateInstanceIds ?? [];
        const want = opts.chooseInstanceId?.();
        const pick = want !== undefined && candidates.includes(want) ? want : candidates[0];
        const ids = pick !== undefined ? [pick] : [];
        const response =
          req.kind === "selectCards"
            ? { kind: "selectCards" as const, instanceIds: ids }
            : { kind: "chooseTargets" as const, instanceIds: ids };
        queueMicrotask(() =>
          engineRef?.applyIntent(seat, { type: "respondDecision", decisionId: req.decisionId, response }),
        );
      } else if (req.kind === "chooseOption") {
        queueMicrotask(() =>
          engineRef?.applyIntent(seat, {
            type: "respondDecision",
            decisionId: req.decisionId,
            response: { kind: "chooseOption", optionIndex: 0 },
          }),
        );
      }
    },
    emit: (e) => events.push(e),
  };
  const engine = new GameEngine(state, hooks);
  engineRef = engine;
  engine.seatPlayer(0, "sa", { displayName: "A", deck: { mainDeck: [], eggDeck: [] } });
  engine.seatPlayer(1, "sb", { displayName: "B", deck: { mainDeck: [], eggDeck: [] } });
  state.phase = Phase.Main;
  state.turnSeat = 0;
  return { engine, state, events };
}

const BASE_CARD = "AD1-011";
const BASE_DP = 8000;

describe("A3 BT3-056 — interactive ＜Digisorption -3＞ + opponent redirect", () => {
  it("matches official metadata and publishes typed redirect metadata", () => {
    expect(getCardDefinition("BT3-056")).toMatchObject({
      nameEn: "Ceresmon",
      colors: ["Green"],
      level: 6,
      effectText: expect.stringContaining("suspend your opponent's Digimon instead"),
    });
    expect(compiled).toEqual(getCompiledCard("BT3-056"));
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        { trigger: "Static", actions: [{ kind: "Replacement", amount: 3 }] },
        {
          trigger: "YourTurn",
          frequency: "OncePerTurn",
          actions: [{ kind: "GrantStatic", grant: "digisorptionRedirect" }],
        },
      ],
    });
  });
  it("declining the ＜Digisorption＞ suspend pays the full digivolve cost (5)", async () => {
    const s = setup({ acceptDigisorption: false });
    const p0 = s.state.players[0] as PlayerState;
    const own = permanent(0, "ST1-02", 3000);
    p0.battleArea.push(own);
    const base = permanent(0, BASE_CARD, BASE_DP);
    p0.battleArea.push(base);
    const evolving = instance("BT3-056", 0);
    p0.hand.push(evolving);
    s.state.memory = 10;

    await s.engine.recomputeContinuousEffects();
    const before = s.state.memory;
    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: evolving.instanceId });
    await settle(() => s.state.memory !== before);

    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT3-056")).toBe(true);
    expect(before - s.state.memory).toBe(5);
    expect(own.isSuspended).toBe(false);
  });

  it("accepting + suspending your OWN Digimon reduces the cost by 3 (5 - 3 = 2)", async () => {
    let ownInstanceId: string | undefined;
    const s = setup({ acceptDigisorption: true, chooseInstanceId: () => ownInstanceId });
    const p0 = s.state.players[0] as PlayerState;
    const own = permanent(0, "ST1-02", 3000);
    ownInstanceId = own.topCard!.instanceId;
    p0.battleArea.push(own);
    const base = permanent(0, BASE_CARD, BASE_DP);
    p0.battleArea.push(base);
    const evolving = instance("BT3-056", 0);
    p0.hand.push(evolving);
    s.state.memory = 10;

    await s.engine.recomputeContinuousEffects();
    const before = s.state.memory;
    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: evolving.instanceId });
    await settle(() => own.isSuspended && s.state.memory !== before);

    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT3-056")).toBe(true);
    expect(own.isSuspended).toBe(true);
    expect(before - s.state.memory).toBe(2);
  });

  it("with a BT3-056 already in play, the redirect suspends the OPPONENT's Digimon instead", async () => {
    let oppInstanceId: string | undefined;
    const s = setup({ acceptDigisorption: true, chooseInstanceId: () => oppInstanceId });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const redirector = permanent(0, "BT3-056", 12000);
    p0.battleArea.push(redirector);
    const own = permanent(0, "ST1-02", 3000);
    p0.battleArea.push(own);
    const opp = permanent(1, "ST1-03", 2000);
    oppInstanceId = opp.topCard!.instanceId;
    p1.battleArea.push(opp);

    const base = permanent(0, BASE_CARD, BASE_DP);
    p0.battleArea.push(base);
    const evolving = instance("BT3-056", 0);
    p0.hand.push(evolving);
    s.state.memory = 10;

    await s.engine.recomputeContinuousEffects();
    const before = s.state.memory;
    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: evolving.instanceId });
    await settle(() => opp.isSuspended && s.state.memory !== before);

    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT3-056" && p.permanentId === base.permanentId)).toBe(true);
    expect(opp.isSuspended).toBe(true);
    expect(own.isSuspended).toBe(false);
    expect(before - s.state.memory).toBe(2);
  });

  it("resets native redirect usage on the next own turn", async () => {
    let firstTargetId: string | undefined;
    const s = setup({ acceptDigisorption: true, chooseInstanceId: () => firstTargetId });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    p0.deck.push(...Array.from({ length: 8 }, () => instance("BT1-001", 0)));
    p1.deck.push(...Array.from({ length: 8 }, () => instance("BT1-001", 1)));
    const redirector = permanent(0, "BT3-056", 12000);
    p0.battleArea.push(redirector);
    const firstBase = permanent(0, BASE_CARD, BASE_DP);
    const secondBase = permanent(0, BASE_CARD, BASE_DP);
    p0.battleArea.push(firstBase, secondBase);
    const firstTarget = permanent(1, "ST1-03", 2000);
    const secondTarget = permanent(1, "ST1-03", 2000);
    firstTargetId = firstTarget.topCard!.instanceId;
    p1.battleArea.push(firstTarget, secondTarget);
    p0.hand.push(instance("BT2-050", 0), instance("BT2-050", 0));
    const firstEvolutionId = p0.hand[0]!.instanceId;
    const secondEvolutionId = p0.hand[1]!.instanceId;
    await s.engine.recomputeContinuousEffects();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: firstBase.permanentId,
        instanceId: p0.hand[0]!.instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => firstTarget.isSuspended && s.state.memory !== 10);
    expect(firstTarget.isSuspended).toBe(true);
    expect(s.state.memory).toBe(8);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.turnSeat).toBe(0);
    firstTargetId = secondTarget.topCard!.instanceId;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: secondBase.permanentId,
        instanceId: p0.hand[0]!.instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => secondTarget.isSuspended && s.state.memory !== 10);
    expect(secondTarget.isSuspended).toBe(true);
    expect(s.state.memory).toBe(8);
    expect(firstBase.topCard?.instanceId).toBe(firstEvolutionId);
    expect(secondBase.topCard?.instanceId).toBe(secondEvolutionId);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("tracks two native redirectors independently during one turn", async () => {
    let targetId: string | undefined;
    const s = setup({ acceptDigisorption: true, chooseInstanceId: () => targetId });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    p0.battleArea.push(permanent(0, "BT3-056", 12000), permanent(0, "BT3-056", 12000));
    p0.battleArea.forEach((p) => (p.isSuspended = true));
    const firstBase = permanent(0, BASE_CARD, BASE_DP);
    const secondBase = permanent(0, BASE_CARD, BASE_DP);
    const thirdBase = permanent(0, BASE_CARD, BASE_DP);
    firstBase.isSuspended = true;
    secondBase.isSuspended = true;
    thirdBase.isSuspended = true;
    p0.battleArea.push(firstBase, secondBase, thirdBase);
    const firstTarget = permanent(1, "ST1-03", 2000);
    const secondTarget = permanent(1, "ST1-03", 2000);
    const thirdTarget = permanent(1, "ST1-03", 2000);
    p1.battleArea.push(firstTarget, secondTarget, thirdTarget);
    p0.hand.push(instance("BT2-050", 0), instance("BT2-050", 0), instance("BT2-050", 0));
    const evolutionIds = p0.hand.map((card) => card.instanceId);
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();

    targetId = firstTarget.topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: firstBase.permanentId,
        instanceId: p0.hand[0]!.instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => firstTarget.isSuspended && s.state.memory !== 10);
    targetId = secondTarget.topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: secondBase.permanentId,
        instanceId: p0.hand[0]!.instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => secondTarget.isSuspended && s.state.memory !== 8);
    targetId = undefined;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: thirdBase.permanentId,
        instanceId: p0.hand[0]!.instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1 && thirdBase.topCard?.instanceId === evolutionIds[2]);
    expect(firstTarget.isSuspended).toBe(true);
    expect(secondTarget.isSuspended).toBe(true);
    expect(thirdTarget.isSuspended).toBe(false);
    expect(s.state.memory).toBe(1);
    expect(firstBase.isSuspended).toBe(true);
    expect(secondBase.isSuspended).toBe(true);
    expect(thirdBase.isSuspended).toBe(true);
    expect(firstBase.topCard?.instanceId).toBe(evolutionIds[0]);
    expect(secondBase.topCard?.instanceId).toBe(evolutionIds[1]);
    expect(thirdBase.topCard?.instanceId).toBe(evolutionIds[2]);
  });
});
