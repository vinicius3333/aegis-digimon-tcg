import { describe, it, expect } from "vitest";
import {
  getCardDefinition,
  GameState,
  PlayerState,
  Permanent,
  CardInstance,
  Phase,
  type Seat,
  type DecisionRequest,
} from "@aegis/shared";
import { GameEngine, type GameEngineHooks } from "../../engine/GameEngine.js";
import "../index.js";
import { compiled } from "./BT11-088.js";
import "../ST18/ST18-12.js";
import "../BT12/BT12-038.js";
import "../BT17/BT17-087.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { cite } from "../../engine/conformance/_kb.js";
import { assertNoLoudGap, setupEngine, settle as settleEngine } from "../../engine/testkit/harness.js";

// A3 for BT11-088 (Bagramon — Purple Lv.6 Digimon).
//
// [On Play] / [When Digivolving]: If the opponent has 1 or fewer Digimon in play, trash 1 card
// from their hand. If they have 2 or more, place 1 of their Digimon under another of their Digimon as its bottom source.
// (Q2113: the source leaves their field and its own sources are trashed.)
//
// FAILS-WHEN-REVERTED: The original stub left both effects inert.
//   Test 1: opponent has 1 Digimon in play → a card is trashed from their hand.
//   Test 2: opponent has 2+ Digimon in play → 1 opponent Digimon is placed under their other Digimon.
//
// Cards:
//   BT11-088  — Bagramon (Purple Lv.6, playCost 14)
//   AD1-001   — Greymon (Red Lv.4) — opponent's Digimon
//   BT1-038   — Monzaemon (Blue Lv.5) — another opponent Digimon for the 2+ test
//   BT1-009   — filler hand card

let seq = 0;

function inst(cardId: string, seat: Seat): CardInstance {
  seq += 1;
  const c = new CardInstance();
  c.instanceId = `bt11088-inst-${seq}`;
  c.cardId = cardId;
  c.ownerSeat = seat;
  c.faceUp = true;
  return c;
}

function perm(cardId: string, seat: Seat, dp = 5000): Permanent {
  seq += 1;
  const p = new Permanent();
  p.permanentId = `bt11088-perm-${seq}`;
  p.controllerSeat = seat;
  p.topCard = inst(cardId, seat);
  p.isSuspended = false;
  p.inBreeding = false;
  p.baseDP = dp;
  p.currentDP = dp;
  return p;
}

function setup(): { engine: GameEngine; state: GameState } {
  const state = new GameState();
  let engineRef: GameEngine | undefined;
  const hooks: GameEngineHooks = {
    seed: 1,
    requestDecision: (seat: Seat, req: DecisionRequest) => {
      if (req.kind === "optional") {
        queueMicrotask(() =>
          engineRef?.applyIntent(seat, {
            type: "respondDecision",
            decisionId: req.decisionId,
            response: { kind: "optional", accept: true },
          }),
        );
      }
      if (req.kind === "selectCards" || req.kind === "chooseTargets") {
        const candidates = req.options?.candidateInstanceIds ?? [];
        const ids = candidates.slice(0, req.options?.max ?? candidates.length);
        queueMicrotask(() =>
          engineRef?.applyIntent(seat, {
            type: "respondDecision",
            decisionId: req.decisionId,
            response:
              req.kind === "selectCards"
                ? { kind: "selectCards", instanceIds: ids }
                : { kind: "chooseTargets", instanceIds: ids },
          }),
        );
      }
    },
    emit: () => {},
  };
  const engine = new GameEngine(state, hooks);
  engineRef = engine;
  engine.seatPlayer(0, "sa", { displayName: "A", deck: { mainDeck: [], eggDeck: [] } });
  engine.seatPlayer(1, "sb", { displayName: "B", deck: { mainDeck: [], eggDeck: [] } });
  state.phase = Phase.Main;
  state.turnSeat = 0;
  return { engine, state };
}

async function settle(predicate: () => boolean, maxTicks = 800): Promise<void> {
  for (let i = 0; i < maxTicks && !predicate(); i++) await Promise.resolve();
}

describe("BT11-088 Bagramon [On Play] conditional effect", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-088")).toMatchObject({
      cardId: "BT11-088",
      colors: ["Purple"],
      level: 6,
      playCost: 14,
      dp: 13000,
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "OnPlay", actions: [{ kind: "Trash" }, { kind: "PlaceUnder" }] },
      { trigger: "WhenDigivolving", actions: [{ kind: "Trash" }, { kind: "PlaceUnder" }] },
      { trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger" }, { kind: "SubTrigger" }] },
    ]);
  });

  it("reacts when an effect adds cards under an opponent Digimon and shares its once-per-turn budget", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const bagramon = perm("BT11-088", 0, 11000);
    const payment = inst("BT1-001", 0);
    bagramon.stack.push(payment);
    const opponent = perm("AD1-001", 1, 3000);
    const security = inst("BT1-038", 1);
    p0.battleArea.push(bagramon);
    p1.battleArea.push(opponent);
    p1.security.push(security);
    await s.engine.recomputeContinuousEffects();

    const fire = s.engine as unknown as {
      fireSubTrigger(
        event: "onAddDigivolutionCards" | "whenOneOfYoursDigivolves",
        payload: { subjectPermanentId: string },
      ): Promise<void>;
    };
    await fire.fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: opponent.permanentId,
    });

    expect(bagramon.stack).toHaveLength(0);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(payment.instanceId);
    expect(p1.security).toHaveLength(0);
    expect(p1.trash.map(({ instanceId }) => instanceId)).toContain(security.instanceId);

    bagramon.stack.push(inst("BT1-001", 0));
    p1.security.push(inst("BT1-038", 1));
    await fire.fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: opponent.permanentId,
    });
    expect(bagramon.stack).toHaveLength(1);
    expect(p1.security).toHaveLength(1);
  });

  it.each(["play", "digivolve"] as const)(
    "when opponent has 1 Digimon, %s trashes an exact hand card",
    async (mode) => {
      const s = setupEngine(
        {
          0: {
            battleArea: mode === "digivolve" ? [{ card: "BT6-063", as: "base" }] : [],
            hand: [{ card: "BT11-088", as: "bagramon" }],
            deck: ["BT1-009", "BT1-009", "BT1-009"],
            security: ["BT1-009", "BT1-009"],
          },
          1: {
            battleArea: [{ card: "AD1-001", as: "oppDigimon", dp: 3000 }],
            hand: [{ card: "BT1-009", as: "oppHandCard" }],
            deck: ["BT1-009", "BT1-009", "BT1-009"],
            security: ["BT1-009", "BT1-009"],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      const bagramonId = s.inst("bagramon").instanceId;
      const oppHandCardId = s.inst("oppHandCard").instanceId;
      const opponentPermanentId = s.perm("oppDigimon").permanentId;
      const intent =
        mode === "play"
          ? { type: "playCard" as const, instanceId: bagramonId }
          : { type: "digivolve" as const, instanceId: bagramonId, permanentId: s.perm("base").permanentId };

      expect(s.engine.applyIntent(0, intent)).toEqual({ ok: true });
      await settleEngine(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === oppHandCardId));

      expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([oppHandCardId]);
      expect(s.state.players[1]!.hand).toHaveLength(0);
      expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([opponentPermanentId]);
      const bagramon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === bagramonId);
      expect(bagramon?.topCard.instanceId).toBe(bagramonId);
      expect(bagramon?.stack.map(({ instanceId }) => instanceId)).toEqual(
        mode === "digivolve" ? [s.inst("base").instanceId] : [],
      );
      expect(s.state.memory).toBe(mode === "play" ? -4 : 5);
    },
  );

  it("when opponent has 2+ Digimon, one is placed under their other Digimon", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // Opponent has 2 Digimon.
    const oppDigimon1 = perm("AD1-001", 1, 3000);
    const oppDigimon2 = perm("BT1-038", 1, 5000);
    p1.battleArea.push(oppDigimon1, oppDigimon2);
    const handCard = inst("BT1-009", 1);
    p1.hand.push(handCard);

    const bagramon = inst("BT11-088", 0);
    p0.hand.push(bagramon);
    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: bagramon.instanceId,
    });

    expect(result).toEqual({ ok: true });

    // Wait until the effect resolves: the source opponent Digimon leaves the battle area.
    await settle(() => p1.battleArea.length < 2);

    // The placed Digimon leaves the battle area and becomes a card under the opponent's other Digimon.
    const opponentLostDigimon = p1.battleArea.length < 2;
    const opponentDigimonHasStack = p1.battleArea.some((p) => p.stack.length > 0);

    expect(opponentLostDigimon && opponentDigimonHasStack).toBe(true);
    expect(p1.hand.some((card) => card.instanceId === handCard.instanceId)).toBe(true);
    expect(p1.trash.some((card) => card.instanceId === handCard.instanceId)).toBe(false);
  });
});

describe("BT11-088 public bottom placement and Q2113 source shedding", () => {
  it("does not pay the watcher cost when an opponent normally digivolves without sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-088", as: "bagramon" }],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT3-067", as: "base" }],
          hand: [{ card: "BT6-063", as: "digivolver" }],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-028", "BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();
    const securityIds = s.state.players[1]!.security.map(({ instanceId }) => instanceId);

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        instanceId: s.inst("digivolver").instanceId,
        permanentId: s.perm("base").permanentId,
      }),
    ).toEqual({ ok: true });
    await settleEngine(() => s.perm("base").topCard.cardId === "BT6-063" && s.state.pendingDecision === undefined);
    await settleEngine();

    expect(s.perm("bagramon").stack).toHaveLength(0);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual(securityIds);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(2);
  });

  it("pays the watcher cost when an opponent normally digivolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-088", as: "bagramon", under: ["BT2-075"] }],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT3-067", as: "base" }],
          hand: [{ card: "BT6-063", as: "digivolver" }],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-028", "BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const digivolverId = s.inst("digivolver").instanceId;
    const sourceId = s.perm("bagramon").stack[0]!.instanceId;
    const securityId = s.state.players[1]!.security[0]!.instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        instanceId: digivolverId,
        permanentId: s.perm("base").permanentId,
      }),
    ).toEqual({ ok: true });
    await settleEngine(() => s.perm("base").topCard.cardId === "BT6-063" && s.state.pendingDecision === undefined);
    await settleEngine();

    expect(s.perm("base").topCard.cardId).toBe("BT6-063");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === digivolverId)).toBe(false);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(s.perm("bagramon").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([securityId]);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("preserves the source and security when the watcher cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-088", as: "bagramon", under: ["BT2-075"] }],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT3-067", as: "base" }],
          hand: [{ card: "BT6-063", as: "digivolver" }],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-028", "BT1-028"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();
    const sourceId = s.perm("bagramon").stack[0]!.instanceId;
    const securityIds = s.state.players[1]!.security.map(({ instanceId }) => instanceId);

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        instanceId: s.inst("digivolver").instanceId,
        permanentId: s.perm("base").permanentId,
      }),
    ).toEqual({ ok: true });
    await settleEngine(() => s.perm("base").topCard.cardId === "BT6-063" && s.state.pendingDecision === undefined);
    await settleEngine();

    expect(s.perm("bagramon").stack.map(({ instanceId }) => instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual(securityIds);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(2);
  });

  it("shares the watcher budget across real triggers and resets it on the next turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-088", as: "originalBag", under: ["BT11-079", "BT2-075"] }],
          hand: [{ card: "BT11-088", as: "newBag" }],
          deck: Array.from({ length: 8 }, () => "BT1-009"),
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT3-067", as: "tankmonA" },
            { card: "BT3-067", as: "tankmonB" },
          ],
          hand: [
            { card: "BT6-063", as: "bigMamemonA" },
            { card: "BT2-064", as: "hiAndromonA" },
          ],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
          security: ["BT1-009", "BT1-028", "BT1-038"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    const lowerId = s.perm("originalBag").stack[0]!.instanceId;
    const upperId = s.perm("originalBag").stack[1]!.instanceId;
    const securityIds = s.state.players[1]!.security.map(({ instanceId }) => instanceId);
    const tankmonBId = s.perm("tankmonB").topCard.instanceId;
    const tankmonBPermanentId = s.perm("tankmonB").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        instanceId: s.inst("bigMamemonA").instanceId,
        permanentId: s.perm("tankmonA").permanentId,
      }),
    ).toEqual({ ok: true });
    await settleEngine(() => s.perm("tankmonA").topCard.cardId === "BT6-063" && s.state.pendingDecision === undefined);
    await settleEngine();
    expect(s.perm("originalBag").stack.map(({ instanceId }) => instanceId)).toEqual([upperId]);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual(securityIds.slice(1));
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([securityIds[0]]);

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        instanceId: s.inst("hiAndromonA").instanceId,
        permanentId: s.perm("tankmonA").permanentId,
      }),
    ).toEqual({ ok: true });
    await settleEngine(() => s.perm("tankmonA").topCard.cardId === "BT2-064" && s.state.pendingDecision === undefined);
    await settleEngine();
    expect(s.perm("originalBag").stack.map(({ instanceId }) => instanceId)).toEqual([upperId]);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual(securityIds.slice(1));
    expect(s.state.memory).toBe(5);

    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    preferred.push(tankmonBId, tankmonBPermanentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("newBag").instanceId })).toEqual({
      ok: true,
    });
    await settleEngine(() => s.perm("tankmonA").stack.some(({ instanceId }) => instanceId === tankmonBId));
    await settleEngine();

    expect(s.perm("tankmonA").stack.map(({ instanceId }) => instanceId)).toContain(tankmonBId);
    expect(s.perm("originalBag").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([lowerId, upperId]);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([securityIds[2]]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(securityIds.slice(0, 2));
    expect(s.state.memory).toBe(-4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("Q5207: cannot place an opponent Digimon under an effect-immune destination", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "ready", suspended: true }],
          hand: [{ card: "BT11-088", as: "bagramon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "ST18-12", as: "zepha" },
            { card: "BT3-067", as: "tankmon", under: ["BT2-052"] },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const tankmonId = s.perm("tankmon").topCard.instanceId;
    const tankmonPermanentId = s.perm("tankmon").permanentId;
    const zephaPermanentId = s.perm("zepha").permanentId;
    const tankmonStack = s.perm("tankmon").stack.map(({ instanceId }) => instanceId);
    const zephaStack = s.perm("zepha").stack.map(({ instanceId }) => instanceId);
    const ownSecurity = s.state.players[0]!.security.map(({ instanceId }) => instanceId);
    const opponentSecurity = s.state.players[1]!.security.map(({ instanceId }) => instanceId);
    preferred.push(tankmonId, tankmonPermanentId, zephaPermanentId);

    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestrictedByEffect(s.perm("zepha"), "beAffected", "Digimon")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bagramon").instanceId })).toEqual({
      ok: true,
    });
    await settleEngine(() => s.state.pendingDecision === undefined);

    expect(s.perm("tankmon").stack.map(({ instanceId }) => instanceId)).toEqual(tankmonStack);
    expect(s.perm("tankmon").permanentId).toBe(tankmonPermanentId);
    expect(s.perm("zepha").stack.map(({ instanceId }) => instanceId)).toEqual(zephaStack);
    expect(s.perm("zepha").permanentId).toBe(zephaPermanentId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      zephaPermanentId,
      tankmonPermanentId,
    ]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual(ownSecurity);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual(opponentSecurity);
    expect(s.state.memory).toBe(-4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("Q2114: a placed GeoGreymon inherits under a temporarily Digimon-treated Marcus", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-088", as: "bagramon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          hand: [{ card: "BT17-087", as: "marcus" }],
          battleArea: [{ card: "BT12-038", as: "oppGeo" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("marcus").instanceId })).toEqual({
      ok: true,
    });
    await settleEngine(() => s.perm("marcus").topCard.cardId === "BT17-087");
    const geoId = s.perm("oppGeo").topCard.instanceId;
    const marcusId = s.perm("marcus").permanentId;
    const marcusStack = s.perm("marcus").stack.map(({ instanceId }) => instanceId);
    const geoPermanentId = s.perm("oppGeo").permanentId;
    const securityIds = s.state.players[1]!.security.map(({ instanceId }) => instanceId);
    preferred.push(geoId, s.perm("oppGeo").permanentId, marcusId);

    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    let eligibleAtPlacement = false;
    const placementEvents = await observe(s.engine).captureSubTriggers(
      async () => {
        expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bagramon").instanceId })).toEqual({
          ok: true,
        });
        await settleEngine(() => s.perm("marcus").stack.some(({ instanceId }) => instanceId === geoId));
      },
      (event, payload) => {
        if (event === "onAddDigivolutionCards" && payload.subjectPermanentId === marcusId) {
          eligibleAtPlacement = observe(s.engine).canUseInheritedEffect(s.perm("marcus"), "BT12-038");
        }
      },
    );
    expect(placementEvents.filter(({ event }) => event === "onAddDigivolutionCards")).toHaveLength(1);

    expect(s.perm("marcus").permanentId).toBe(marcusId);
    expect(s.perm("marcus").stack.map(({ instanceId }) => instanceId)).toEqual([geoId, ...marcusStack]);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === geoPermanentId)).toBe(false);
    expect(eligibleAtPlacement).toBe(true);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual(securityIds);
    expect(s.state.memory).toBe(-4);

    // Q2114's inherited [Your Turn] suspension window is unavailable here: Marcus's
    // temporary Digimon treatment expires at the end of this opponent turn before its
    // controller receives a turn. This assertion proves the public gain/loss boundary.
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    expect(observe(s.engine).canUseInheritedEffect(s.perm("marcus"), "BT12-038")).toBe(false);
  });

  it.each([
    { mode: "play", stacked: true },
    { mode: "play", stacked: false },
    { mode: "digivolve", stacked: true },
    { mode: "digivolve", stacked: false },
  ])("$mode places only the source top card at the bottom; source stacked $stacked", async ({ mode, stacked }) => {
    cite(
      "comprehensive-0292",
      "4-7-7: the moved permanent becomes a stacked card",
      "703276fe13872e365e719f8577a6ccf56e5e00dac5dc84cd15a5434784dee855",
    );
    cite(
      "comprehensive-0293",
      "4-7-8: own sources are trashed simultaneously, not added under the destination",
      "1220b7f0fc0cb6ccc76d4ad371d1f788922a265df857413971108e64da24bc0f",
    );
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: mode === "digivolve" ? [{ card: "BT6-063", as: "base" }] : [],
          hand: [{ card: "BT11-088", as: "bagramon" }],
          deck: ["BT1-028", "BT1-028"],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            {
              card: "BT6-063",
              as: "host",
              under: [
                { card: "BT2-052", as: "hostBottom" },
                { card: "BT3-067", as: "hostUpper" },
              ],
            },
            {
              card: "BT3-067",
              as: "source",
              under: stacked ? [{ card: "BT4-065", as: "sourceUnder" }] : [],
            },
          ],
          hand: [{ card: "BT1-028", as: "untouchedHand" }],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-028", "BT1-028"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    const sourceId = s.inst("source").instanceId;
    const hostId = s.inst("host").instanceId;
    const bagramonId = s.inst("bagramon").instanceId;
    const hostStack = [s.inst("hostBottom").instanceId, s.inst("hostUpper").instanceId];
    const sourceUnderId = stacked ? s.inst("sourceUnder").instanceId : undefined;
    preferred.push(sourceId);
    const intent =
      mode === "play"
        ? { type: "playCard" as const, instanceId: bagramonId }
        : { type: "digivolve" as const, instanceId: bagramonId, permanentId: s.perm("base").permanentId };
    const busEvents = await observe(s.engine).captureSubTriggers(async () => {
      expect(s.engine.applyIntent(0, intent)).toEqual({ ok: true });
      await settleEngine(() => s.state.players[1]!.battleArea.length === 1);
      await settleEngine();
    });
    const additions = busEvents.filter((entry) => entry.event === "onAddDigivolutionCards");
    expect(additions).toHaveLength(1);
    expect(additions[0]!.payload).toMatchObject({
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [sourceId],
      addedDigivolutionCardsPosition: "bottom",
      byEffectSeat: 0,
    });
    const host = s.perm("host");
    expect(host.stack.map((card) => card.instanceId)).toEqual([sourceId, ...hostStack]);
    expect(host.stack[0]!.faceUp).toBe(true);
    expect(host.topCard.instanceId).toBe(hostId);
    expect(host.controllerSeat).toBe(1);
    expect(host.currentDP).toBe(10000);
    expect(host.isSuspended).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(sourceUnderId ? [sourceUnderId] : []);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([s.inst("untouchedHand").instanceId]);
    expect(s.state.players[1]!.deck).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(2);
    const bagramon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === bagramonId)!;
    expect(bagramon.stack.map((card) => card.instanceId)).toEqual(
      mode === "digivolve" ? [s.inst("base").instanceId] : [],
    );
    expect(bagramon.controllerSeat).toBe(0);
    expect(bagramon.currentDP).toBe(13000);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(mode === "digivolve" ? 1 : 2);
    expect(s.state.players[0]!.hand).toHaveLength(mode === "digivolve" ? 1 : 0);
    expect(s.state.memory).toBe(mode === "digivolve" ? 5 : -4);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });
});
