import { describe, it, expect } from "vitest";
import { GameState, PlayerState, Permanent, CardInstance, Phase, type Seat, type DecisionRequest } from "@aegis/shared";
import { GameEngine, type GameEngineHooks } from "../../engine/GameEngine.js";
import "./BT11-033.js";

// A3 for BT11-033 (MirageGaogamon — Blue Lv.6 Digimon, RESTRICTED).
//
// [When Digivolving] Return 1 of your opponent's level 5 or lower Digimon to their owner's
// hand. If no Digimon was returned by this effect, your opponent adds the top card of their
// security stack to their hand.
//
// evoCost: Blue Lv.5 @ 4 memory.
//
// FAILS-WHEN-REVERTED:
//   Test 1 — the bounce clause fires: opponent Lv.4 Digimon is bounced to hand.
//     The original stub's returnToHand IR action was partial; without the hand-written module
//     the bounce is a no-op (the generated fallback runs instead).
//   Test 2 — the fallback: when no valid Lv.5-or-lower target exists, opponent's top security
//     card moves to their hand. The original IR left this clause inert.
//
// Cards used:
//   BT11-033  — MirageGaogamon (the card under test, Blue Lv.6)
//   BT1-038   — Monzaemon (Blue Lv.5) — valid digivolve base (evoCost: Blue Lv.5 @ 4)
//   AD1-001   — Greymon (Red Lv.4) — opponent Digimon; level 4 <= 5, valid bounce target
//   AD1-025   — Omnimon (Lv.7) — opponent Digimon; level 7 > 5, NOT a valid bounce target

let seq = 0;

function inst(cardId: string, seat: Seat): CardInstance {
  seq += 1;
  const c = new CardInstance();
  c.instanceId = `bt11033-inst-${seq}`;
  c.cardId = cardId;
  c.ownerSeat = seat;
  c.faceUp = true;
  return c;
}

function perm(cardId: string, seat: Seat, dp = 5000): Permanent {
  seq += 1;
  const p = new Permanent();
  p.permanentId = `bt11033-perm-${seq}`;
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

async function settle(predicate: () => boolean, maxTicks = 600): Promise<void> {
  for (let i = 0; i < maxTicks && !predicate(); i++) await Promise.resolve();
}

describe("BT11-033 MirageGaogamon [When Digivolving]", () => {
  it("returns an opponent's Lv.4 Digimon to their hand when digivolving", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // Base: Blue Lv.5 Monzaemon (satisfies MirageGaogamon's evoCost: Blue Lv.5 @ 4)
    const base = perm("BT1-038", 0, 5000);
    p0.battleArea.push(base);
    // Put draw-1 fodder in deck (the digivolve draws 1 card).
    p0.deck.push(inst("BT1-001", 0));

    // Opponent has a Lv.4 Digimon (valid bounce target: level 4 <= 5).
    const lv4Digimon = perm("AD1-001", 1, 3000);
    p1.battleArea.push(lv4Digimon);
    const lv4TopCardId = lv4Digimon.topCard!.instanceId;

    // MirageGaogamon in seat 0's hand.
    const mirageCard = inst("BT11-033", 0);
    p0.hand.push(mirageCard);
    s.state.memory = 10; // evoCost 4; memory 10 → 6 after paying

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: mirageCard.instanceId,
    });

    expect(result).toEqual({ ok: true });

    // After [When Digivolving]: the Lv.4 Digimon is bounced to seat 1's hand.
    await settle(() => p1.hand.some((c) => c.instanceId === lv4TopCardId));

    expect(p1.hand.some((c) => c.instanceId === lv4TopCardId)).toBe(true);
    // The Digimon left the battle area.
    expect(p1.battleArea.some((p) => p.permanentId === lv4Digimon.permanentId)).toBe(false);
    // MirageGaogamon is on top of the base.
    expect(base.topCard?.cardId).toBe("BT11-033");
  });

  it("when opponent has only Lv.7 Digimon (not bounceable), top security card moves to opponent's hand", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const base = perm("BT1-038", 0, 5000);
    p0.battleArea.push(base);
    p0.deck.push(inst("BT1-001", 0));

    // Opponent has only a Lv.7 Digimon (level > 5, NOT a valid bounce target).
    const lv7Digimon = perm("AD1-025", 1, 13000);
    p1.battleArea.push(lv7Digimon);

    // Opponent has 1 security card.
    const secCard = inst("BT1-090", 1);
    p1.security.push(secCard);

    const mirageCard = inst("BT11-033", 0);
    p0.hand.push(mirageCard);
    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: mirageCard.instanceId,
    });

    expect(result).toEqual({ ok: true });

    // Fallback: the security card should move to opponent's hand.
    await settle(() => p1.hand.some((c) => c.instanceId === secCard.instanceId));

    expect(p1.hand.some((c) => c.instanceId === secCard.instanceId)).toBe(true);
    expect(p1.security.length).toBe(0);
  });
});
