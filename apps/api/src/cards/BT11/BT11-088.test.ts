import { describe, it, expect } from "vitest";
import { getCardDefinition, GameState, PlayerState, Permanent, CardInstance, Phase, type Seat, type DecisionRequest } from "@aegis/shared";
import { GameEngine, type GameEngineHooks } from "../../engine/GameEngine.js";
import "../index.js";
import { compiled } from "./BT11-088.js";

// A3 for BT11-088 (Bagramon — Purple Lv.6 Digimon).
//
// [On Play] / [When Digivolving]: If the opponent has 1 or fewer Digimon in play, trash 1 card
// from their hand. If they have 2 or more, place 1 of their Digimon under this Digimon.
// (Q2113: source Digimon leaves their field when placed under Bagramon.)
//
// FAILS-WHEN-REVERTED: The original stub left both effects inert.
//   Test 1: opponent has 1 Digimon in play → a card is trashed from their hand.
//   Test 2: opponent has 2+ Digimon in play → 1 opponent Digimon is placed under Bagramon.
//
// Cards:
//   BT11-088  — Bagramon (Purple Lv.6, playCost 11)
//   AD1-001   — Greymon (Red Lv.4) — opponent's Digimon
//   BT1-038   — Monzaemon (Blue Lv.5) — another opponent Digimon for the 2+ test
//   BT1-001   — filler hand card

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
    expect(getCardDefinition("BT11-088")).toMatchObject({ cardId: "BT11-088", colors: ["Purple"], level: 6, playCost: 14, dp: 13000 });
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

  it("when opponent has 1 Digimon, trashes a card from their hand", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // Opponent has exactly 1 Digimon in play.
    const oppDigimon = perm("AD1-001", 1, 3000);
    p1.battleArea.push(oppDigimon);

    // Opponent has 1 card in hand (will be trashed).
    const oppHandCard = inst("BT1-001", 1);
    p1.hand.push(oppHandCard);

    // Bagramon in seat 0's hand. playCost = 11, memory needs to cover it.
    const bagramon = inst("BT11-088", 0);
    p0.hand.push(bagramon);
    s.state.memory = 10; // memory 10 for opponent seat → enough

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: bagramon.instanceId,
    });

    expect(result).toEqual({ ok: true });

    // After [On Play]: opponent had 1 Digimon → their hand card should be trashed.
    await settle(() => p1.trash.some((c) => c.instanceId === oppHandCard.instanceId));

    expect(p1.trash.some((c) => c.instanceId === oppHandCard.instanceId)).toBe(true);
    expect(p1.hand.some((c) => c.instanceId === oppHandCard.instanceId)).toBe(false);
    expect(p1.battleArea).toHaveLength(1);
    expect(p1.battleArea[0]!.permanentId).toBe(oppDigimon.permanentId);

    // Bagramon on the battle area.
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT11-088")).toBe(true);
  });

  it("when opponent has 2+ Digimon, one is placed under their other Digimon", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // Opponent has 2 Digimon.
    const oppDigimon1 = perm("AD1-001", 1, 3000);
    const oppDigimon2 = perm("BT1-038", 1, 5000);
    p1.battleArea.push(oppDigimon1, oppDigimon2);
    const handCard = inst("BT1-001", 1);
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
