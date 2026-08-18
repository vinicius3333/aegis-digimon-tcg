import { describe, it, expect } from "vitest";
import {
  GameState,
  PlayerState,
  Permanent,
  CardInstance,
  type Seat,
  type ServerEvent,
} from "@aegis/shared";
import { MemoryGauge } from "../../engine/MemoryGauge.js";
import { ModifierLedger } from "../../engine/effects/modifiers.js";
import { SubTriggerRegistry } from "../../engine/effects/subtriggers.js";
import {
  createPrimitives,
  type PrimitivesEngine,
  type SelectionPort,
} from "../../engine/effects/primitives.js";
// Self-register the compiled-IR cards so getCompiledCard can resolve the fusion target's
// appFusionRequirement at runtime (the engine reads it inside appFuseInto).
import "../index.js";

/**
 * Phase A3 — App Fusion (the Appmon mechanic) for PRIM-01 (BT25-089 clause).
 *
 * BT25-089's [End of Your Turn] tail lets "1 of your Digimon app fuse into a Digimon card in
 * the hand." The clause was previously mismodeled as DnaDigivolve (inert); it is now an AppFuse
 * action driving the real engine appFuseInto verb. App Fusion plays the fusion-TARGET card ON
 * TOP of an existing battle-area Digimon, carrying its stack underneath (NOT DnaDigivolve — no
 * permanent consumed). Legality and cost are owned by the target's appFusionRequirement (documented behavior
 * CanAppFusionFromTargetPermanent over AddAppfuseMethodByName): the fusing permanent's TOP card
 * + its LINKED cards must cover >= 2 distinct required names.
 *
 * Fusion target: BT25-072 (Shutmon, appFusionRequirement names ["Logamon","Timemon"]) in HAND.
 * Fusing permanent: top = BT25-070 (Logamon), linked = BT21-059 (Timemon) — both required names
 * covered, so the fusion is LEGAL.
 *
 * Fails-when-reverted: stub appFuseInto to a no-op and the "result on top + source under it"
 * assertions go RED. The denial case proves the legality is enforced server-side.
 */

const TARGET = "BT25-072"; // Shutmon — appFusion names [Logamon, Timemon], DP 7000
const LOGAMON = "BT25-070";
const TIMEMON = "BT21-059";
const UNRELATED = "BT23-016"; // Dokamon — not in BT25-072's appFusion names

let seq = 0;
function card(cardId: string, seat: Seat, faceUp = true): CardInstance {
  const c = new CardInstance();
  c.instanceId = `i${seq++}`;
  c.cardId = cardId;
  c.ownerSeat = seat;
  c.faceUp = faceUp;
  return c;
}

interface Harness {
  state: GameState;
  fx: ReturnType<typeof createPrimitives>;
  events: ServerEvent[];
}

function harness(memoryValue = 5): Harness {
  seq = 0;
  const state = new GameState();
  state.turnSeat = 0;
  state.memory = memoryValue;
  for (const seat of [0, 1] as Seat[]) {
    const player = new PlayerState();
    player.seat = seat;
    state.players[seat] = player;
  }
  const events: ServerEvent[] = [];
  const memory = new MemoryGauge(state, (e) => events.push(e));
  let permSeq = 0;
  let tokSeq = 0;
  const ask: SelectionPort = { selectInstances: async (_s, candidates) => candidates };
  const engine: PrimitivesEngine = {
    state,
    emit: (e) => events.push(e),
    nextPermanentId: () => `perm-${permSeq++}`,
    nextInstanceId: () => `tok-${tokSeq++}`,
    memory,
    modifiers: new ModifierLedger(),
    subTriggers: new SubTriggerRegistry(),
    ask,
    controllerSeat: () => state.turnSeat,
    fireTiming: async () => {},
  };
  return { state, fx: createPrimitives(engine), events };
}

function fusingPermanent(state: GameState, topId: string, linkedId: string): Permanent {
  const p = new Permanent();
  p.permanentId = "fuser";
  p.controllerSeat = 0;
  const top = card(topId, 0);
  top.instanceId = "fuser-top";
  p.topCard = top;
  const linked = card(linkedId, 0);
  linked.instanceId = "fuser-link";
  p.linked.push(linked);
  p.baseDP = 6000;
  p.currentDP = 6000;
  state.players[0]?.battleArea.push(p);
  return p;
}

describe("A3 App Fusion (BT25-089) — fuse into a hand Digimon, carrying the stack", () => {
  it("plays the fusion-target from hand on top of the fusing Digimon, the source sliding under", async () => {
    const h = harness();
    const p0 = h.state.players[0]!;
    const fuser = fusingPermanent(h.state, LOGAMON, TIMEMON);
    const target = card(TARGET, 0, false);
    p0.hand.push(target); // the fusion-result lives in HAND (BT25-089's `from`)

    const result = await h.fx.appFuseInto(fuser.permanentId, target.instanceId);

    expect(result, "the fusion must be legal (top Logamon + linked Timemon)").toBeDefined();
    expect(fuser.topCard?.cardId).toBe(TARGET);
    expect(fuser.stack.map((c) => c.cardId)).toContain(LOGAMON);
    expect(p0.hand.some((c) => c.instanceId === target.instanceId)).toBe(false);
    expect(fuser.baseDP).toBe(7000); // recomputed from Shutmon, not Logamon (6000)
  });

  it("DENIES the fusion when the fusing Digimon does not satisfy the target's app-fusion names", async () => {
    const h = harness();
    const p0 = h.state.players[0]!;
    const fuser = fusingPermanent(h.state, LOGAMON, UNRELATED); // only Logamon covered
    const target = card(TARGET, 0, false);
    p0.hand.push(target);

    const result = await h.fx.appFuseInto(fuser.permanentId, target.instanceId);

    expect(result, "an illegal fusion must be refused").toBeUndefined();
    expect(fuser.topCard?.cardId).toBe(LOGAMON);
    expect(p0.hand.some((c) => c.instanceId === target.instanceId)).toBe(true);
  });
});
