import { describe, it, expect } from "vitest";
import {
  EffectTiming,
  type Action,
  type CardDefinition,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import {
  GameState as GameStateClass,
  PlayerState,
  Permanent as PermanentClass,
  CardInstance as CardInstanceClass,
  Phase,
  type DecisionRequest,
  type DecisionResponse,
  type ServerEvent,
} from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, Primitives } from "../../engine/effects/EffectContext.js";
import type { ContinuousEffectLedger } from "../../engine/effects/continuous.js";
import { runTrashDigivolution } from "../../engine/effects/interpreter/actions/placeUnder.js";
import { GameEngine, type GameEngineHooks } from "../../engine/GameEngine.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine as setupCardEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT10-084.js";
import "../BT2/BT2-094.js";
import "../BT8/BT8-022.js";
import "../BT12/BT12-111.js";
import "../BT24/BT24-040.js";

const CARD_ID = "BT10-084";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? CARD_ID,
    set: "BT10",
    nameEn: over.nameEn ?? "Tactimon",
    kinds: (over.kinds as never) ?? (["Digimon"] as never),
    colors: (over.colors as never) ?? (["Purple"] as never),
    playCost: over.playCost ?? 12,
    level: over.level,
    dp: 12000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makePermanent(permanentId: string, seat: Seat, cardId: string): Permanent {
  return {
    permanentId,
    controllerSeat: seat,
    topCard: { instanceId: `${permanentId}-top`, cardId, ownerSeat: seat },
    stack: [] as never,
    linked: [] as never,
    baseDP: 5000,
    currentDP: 5000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  const perm = makePermanent("tactimon-p1", 0, CARD_ID);
  return {
    instanceId: "inst-tactimon",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef(),
    permanent: () => perm,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  };
}

describe("BT10-084 (Tactimon)", () => {
  const module = getEffectModule(CARD_ID);

  it("is registered", () => {
    expect(module, "BT10-084 must self-register on import").toBeDefined();
  });

  it("routes [On Play] to OnPlay timing", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source).length).toBeGreaterThanOrEqual(1);
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(0);
  });

  it("[On Play] plays two qualifying Digimon and grants each Blocker until the opponent's turn ends", async () => {
    const s = setupCardEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "tactimon" }],
          trash: [
            { card: "BT10-075", as: "damemon" },
            { card: "BT10-076", as: "troopmon" },
            { card: "BT10-081", as: "baalmon" },
          ],
        },
        1: { security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 13;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tactimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId !== CARD_ID).length === 2 &&
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("baalmon").instanceId),
    );

    const played = ["damemon", "troopmon"].map((alias) =>
      s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === s.inst(alias).instanceId),
    );
    expect(played.every((permanent) => permanent !== undefined)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("baalmon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(0);

    const ledger = (s.engine as unknown as { continuous: ContinuousEffectLedger }).continuous;
    for (const permanent of played) {
      expect(permanent).toBeDefined();
      expect(observe(s.engine).hasKeyword(permanent!, "Blocker")).toBe(true);
    }
    ledger.sweep(s.state, "ownerTurnEnd", 0);
    for (const permanent of played) {
      expect(observe(s.engine).hasKeyword(permanent!, "Blocker")).toBe(true);
    }
    ledger.sweep(s.state, "opponentTurnEnd", 1);
    for (const permanent of played) {
      expect(observe(s.engine).hasKeyword(permanent!, "Blocker")).toBe(false);
    }
  });

  it("[On Play] excludes Bagra Army Digimon above level 4", async () => {
    const s = setupCardEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "tactimon" }],
          trash: [{ card: "BT10-081", as: "baalmon" }],
        },
        1: { security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 13;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tactimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === CARD_ID) &&
        s.state.players[0]!.battleArea.length === 1 &&
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("baalmon").instanceId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("baalmon").instanceId)).toBe(true);
  });

  it("[On Play] targets only Bagra Army Digimon at level 4 or lower from trash", async () => {
    const onPlay = compiled.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"], optional: true });
    expect(onPlay?.actions[0]).toMatchObject({
      target: {
        filter: {
          levelComparison: { op: "lte", value: 4 },
          nameOrTrait: [{ tokens: ["Bagra Army"] }],
        },
      },
    });
  });
});

let seq = 0;

function instance(cardId: string, seat: 0 | 1, faceUp: boolean): CardInstanceClass {
  seq += 1;
  const card = new CardInstanceClass();
  card.instanceId = `inst-${seq}`;
  card.cardId = cardId;
  card.ownerSeat = seat;
  card.faceUp = faceUp;
  return card;
}

function permanentOf(cardId: string, seat: 0 | 1, dp: number): PermanentClass {
  seq += 1;
  const permanent = new PermanentClass();
  permanent.permanentId = `perm-${seq}`;
  permanent.controllerSeat = seat;
  permanent.topCard = instance(cardId, seat, true);
  permanent.isSuspended = false;
  permanent.inBreeding = false;
  permanent.baseDP = dp;
  permanent.currentDP = dp;
  return permanent;
}

function safeDecisionResponse(req: DecisionRequest): DecisionResponse {
  switch (req.kind) {
    case "chooseTargets":
      return { kind: "chooseTargets", instanceIds: [] };
    case "selectCards":
      return { kind: "selectCards", instanceIds: [] };
    case "orderTriggers":
      return { kind: "orderTriggers", order: (req.options?.triggerKeys ?? []).slice(0, 1) };
    case "chooseOption":
      return { kind: "chooseOption", optionIndex: 0 };
    case "optional":
    default:
      return { kind: "optional", accept: false };
  }
}

function setupEngine(acceptOptional: boolean): { engine: GameEngine; state: GameState } {
  const state = new GameStateClass() as unknown as GameState;
  let engineRef: GameEngine | undefined;
  const hooks: GameEngineHooks = {
    seed: 1,
    requestDecision: (seat, req) => {
      const response =
        req.kind === "optional"
          ? ({ kind: "optional", accept: acceptOptional } as DecisionResponse)
          : safeDecisionResponse(req);
      engineRef?.applyIntent(seat, { type: "respondDecision", decisionId: req.decisionId, response });
    },
    emit: (_e: ServerEvent) => {},
  };
  const engine = new GameEngine(state as never, hooks);
  engineRef = engine;
  engine.seatPlayer(0, "sa", { displayName: "A", deck: { mainDeck: [], eggDeck: [] } });
  engine.seatPlayer(1, "sb", { displayName: "B", deck: { mainDeck: [], eggDeck: [] } });
  (state as unknown as { phase: Phase }).phase = Phase.Main;
  state.turnSeat = 1 as Seat;
  return { engine, state };
}

function primitivesOf(engine: GameEngine): Primitives {
  return (engine as unknown as { primitives: Primitives }).primitives;
}

describe("BT10-084 (Tactimon) [Opponent's Turn] digivolution-card-trash redirect (KB Q2002-Q2008)", () => {
  it("redirects an effect-driven trash of another of the controller's Digimon onto Tactimon's own stack, clamping the count (Q2004)", async () => {
    const { engine, state } = setupEngine(true);
    const p0 = state.players[0] as unknown as PlayerState;

    const tactimon = permanentOf("BT10-084", 0, 12000);
    const other = permanentOf("AD1-001", 0, 5000);
    other.stack.push(instance("AD1-001", 0, false), instance("AD1-001", 0, false), instance("AD1-001", 0, false));
    tactimon.stack.push(instance("BT10-084", 0, false), instance("BT10-084", 0, false));
    p0.battleArea.push(tactimon, other);

    await advance(engine).recompute();

    const originalStackSize = other.stack.length;
    const tactimonMaterialIds = tactimon.stack.map((card) => card.instanceId);
    const internals = engine as unknown as {
      cardSourceOf(card: CardInstanceClass): CardSource;
      buildEffectContext(source: CardSource, trigger: Record<string, never>): EffectContext;
    };
    const ctx = internals.buildEffectContext(internals.cardSourceOf(other.topCard), {});
    await runTrashDigivolution(ctx, {
      kind: "TrashDigivolution",
      amount: 3,
      fromTop: true,
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    } satisfies Extract<Action, { kind: "TrashDigivolution" }>);

    expect(ctx.lastEffectActed).toBe(true);
    expect(other.stack.length).toBe(originalStackSize);
    expect(tactimon.stack).toHaveLength(0);
    expect(p0.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(tactimonMaterialIds));
  });

  it("does NOT redirect on the controller's OWN turn — the ability is [Opponent's Turn] only", async () => {
    const { engine, state } = setupEngine(true);
    state.turnSeat = 0 as Seat;
    const p0 = state.players[0] as unknown as PlayerState;

    const tactimon = permanentOf("BT10-084", 0, 12000);
    const other = permanentOf("AD1-001", 0, 5000);
    other.stack.push(instance("AD1-001", 0, false));
    p0.battleArea.push(tactimon, other);

    await advance(engine).recompute();

    const fx = primitivesOf(engine);
    const redirected = await fx.redirectDigivolutionTrashHosts([other.permanentId]);

    expect(redirected).toEqual([other.permanentId]);
  });

  it("does NOT redirect when the controller declines the 'may' prompt", async () => {
    const { engine, state } = setupEngine(false);
    const p0 = state.players[0] as unknown as PlayerState;

    const tactimon = permanentOf("BT10-084", 0, 12000);
    const other = permanentOf("AD1-001", 0, 5000);
    other.stack.push(instance("AD1-001", 0, false));
    p0.battleArea.push(tactimon, other);

    await advance(engine).recompute();

    const fx = primitivesOf(engine);
    const redirected = await fx.redirectDigivolutionTrashHosts([other.permanentId]);

    expect(redirected).toEqual([other.permanentId]);
  });

  it("redirects even when Tactimon itself has 0 digivolution cards (Q2002)", async () => {
    const { engine, state } = setupEngine(true);
    const p0 = state.players[0] as unknown as PlayerState;

    const tactimon = permanentOf("BT10-084", 0, 12000);
    const other = permanentOf("AD1-001", 0, 5000);
    other.stack.push(instance("AD1-001", 0, false));
    p0.battleArea.push(tactimon, other);

    await advance(engine).recompute();

    const fx = primitivesOf(engine);
    const redirected = await fx.redirectDigivolutionTrashHosts([other.permanentId]);

    expect(redirected).toEqual([tactimon.permanentId]);
  });
});

describe("BT10-084 Tactimon — KB Q&A rulings", () => {
  const instanceIdsOf = (cards: Iterable<{ instanceId: string }>): string[] =>
    Array.from(cards, (card) => card.instanceId);

  it("trashes all of Tactimon's digivolution cards when it replaces a 'trash all digivolution cards' effect (Q2003)", async () => {
    const s = setupCardEngine(
      {
        0: { hand: [{ card: "BT24-040", as: "venusmon" }], security: 5 },
        1: {
          battleArea: [
            { card: "BT1-037", as: "otherDigimon", under: ["BT1-027", "BT1-028"] },
            {
              card: CARD_ID,
              as: "tactimon",
              under: [
                { card: "BT1-045", as: "tactimonBottom" },
                { card: "BT1-047", as: "tactimonMiddle" },
                { card: "BT1-050", as: "tactimonTop" },
              ],
            },
          ],
        },
      },
      { declineDigiXros: true },
    );
    const tactimonSourceIds = instanceIdsOf(s.perm("tactimon").stack);
    const otherSourceIds = instanceIdsOf(s.perm("otherDigimon").stack);
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("venusmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const targetChoice = s.state.pendingDecision!;
    expect(targetChoice.seat).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targetChoice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("otherDigimon").permanentId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "optional");
    const replacement = s.state.pendingDecision!;
    expect(replacement.seat).toBe(1);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: replacement.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tactimon").stack.length === 0);

    expect(instanceIdsOf(s.state.players[1]!.trash)).toEqual(expect.arrayContaining(tactimonSourceIds));
    expect(instanceIdsOf(s.perm("otherDigimon").stack)).toEqual(otherSourceIds);
  });

  it("lets Tactimon's controller choose which of Tactimon's digivolution cards a replaced 'choose 1 and trash it' effect trashes (Q2005)", async () => {
    const s = setupCardEngine(
      {
        0: {
          battleArea: [{ card: "BT1-028", as: "blueDigimon" }],
          hand: [{ card: "BT2-094", as: "arcticBlizzard" }],
        },
        1: {
          battleArea: [
            { card: "BT1-037", as: "otherDigimon", under: ["BT1-027", "BT1-028"] },
            {
              card: CARD_ID,
              as: "tactimon",
              under: [
                { card: "BT1-045", as: "tactimonBottom" },
                { card: "BT1-047", as: "tactimonMiddle" },
                { card: "BT1-050", as: "tactimonTop" },
              ],
            },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    const otherSourceIds = instanceIdsOf(s.perm("otherDigimon").stack);
    s.state.memory = 2;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arcticBlizzard").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const targetChoice = s.state.pendingDecision!;
    expect(targetChoice.seat).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targetChoice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("otherDigimon").permanentId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "optional");
    const replacement = s.state.pendingDecision!;
    expect(replacement.seat).toBe(1);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: replacement.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const cardChoice = s.state.pendingDecision!;
    expect(cardChoice.seat).toBe(1);
    expect(new Set(s.decisions.at(-1)!.req.options?.candidateInstanceIds)).toEqual(
      new Set([
        s.inst("tactimonBottom").instanceId,
        s.inst("tactimonMiddle").instanceId,
        s.inst("tactimonTop").instanceId,
      ]),
    );
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: cardChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("tactimonMiddle").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tactimon").stack.length === 2);

    expect(instanceIdsOf(s.perm("tactimon").stack)).toEqual([
      s.inst("tactimonBottom").instanceId,
      s.inst("tactimonTop").instanceId,
    ]);
    expect(instanceIdsOf(s.state.players[1]!.trash)).toContain(s.inst("tactimonMiddle").instanceId);
    expect(instanceIdsOf(s.perm("otherDigimon").stack)).toEqual(otherSourceIds);
  });

  it("meets a 'by trashing 5 digivolution cards' condition only when the replacement trashes 5 of Tactimon's cards (Q2006)", async () => {
    const digivolveIntoDarknessBagramonTrigger = async (tactimonSourceCount: number) => {
      const s = setupCardEngine(
        {
          0: {
            battleArea: [
              { card: "BT1-009", as: "digivolvingBase" },
              { card: "AD1-020", as: "opponentTamer" },
            ],
            hand: [{ card: "BT1-014", as: "digivolution" }],
            deck: ["BT1-009", "BT1-009"],
          },
          1: {
            battleArea: [
              {
                card: "BT12-111",
                as: "darknessBagramon",
                under: ["BT1-027", "BT1-028", "BT1-037", "BT1-045", "BT1-047"],
              },
              {
                card: CARD_ID,
                as: "tactimon",
                under: ["BT1-050", "BT1-051", "BT1-064", "BT1-013", "BT1-019"].slice(0, tactimonSourceCount),
              },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, declineDigiXros: true },
      );
      s.state.memory = 3;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("digivolvingBase").permanentId,
          instanceId: s.inst("digivolution").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("digivolvingBase").topCard.instanceId === s.inst("digivolution").instanceId);
      await settle();
      return s;
    };

    const fullReplacement = await digivolveIntoDarknessBagramonTrigger(5);
    expect(fullReplacement.perm("tactimon").stack).toHaveLength(0);
    expect(fullReplacement.perm("darknessBagramon").stack).toHaveLength(5);
    expect(instanceIdsOf(fullReplacement.state.players[0]!.hand)).toContain(
      fullReplacement.inst("opponentTamer").instanceId,
    );

    const shortReplacement = await digivolveIntoDarknessBagramonTrigger(4);
    expect(shortReplacement.perm("tactimon").stack).toHaveLength(0);
    expect(shortReplacement.perm("darknessBagramon").stack).toHaveLength(5);
    expect(shortReplacement.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      shortReplacement.inst("opponentTamer").instanceId,
    );
  });

  it("replaces SnowAgumon's trash aimed at a Digimon with no digivolution cards and trashes Tactimon's instead (Q2007)", async () => {
    const s = setupCardEngine({
      0: { hand: [{ card: "BT8-022", as: "snowAgumon" }] },
      1: {
        battleArea: [
          { card: "BT8-034", as: "sourceFree" },
          {
            card: CARD_ID,
            as: "tactimon",
            under: [
              { card: "BT10-071", as: "tactimonBottom" },
              { card: "BT10-073", as: "tactimonTop" },
            ],
          },
        ],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("snowAgumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const targetChoice = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req.options?.candidateInstanceIds).toContain(s.perm("sourceFree").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targetChoice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("sourceFree").permanentId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "optional");
    const replacement = s.state.pendingDecision!;
    expect(replacement.seat).toBe(1);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: replacement.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tactimon").stack.length === 1);

    expect(s.perm("sourceFree").stack).toHaveLength(0);
    expect(instanceIdsOf(s.perm("tactimon").stack)).toEqual([s.inst("tactimonBottom").instanceId]);
    expect(instanceIdsOf(s.state.players[1]!.trash)).toContain(s.inst("tactimonTop").instanceId);
  });
});
