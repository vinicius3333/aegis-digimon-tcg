import { describe, it, expect } from "vitest";
import { GameState, PlayerState, Permanent, CardInstance, type Seat, type ServerEvent } from "@aegis/shared";
import { MemoryGauge } from "../../engine/MemoryGauge.js";
import { ModifierLedger } from "../../engine/effects/modifiers.js";
import { SubTriggerRegistry } from "../../engine/effects/subtriggers.js";
import { createPrimitives, type PrimitivesEngine, type SelectionPort } from "../../engine/effects/primitives.js";
// Self-register the compiled-IR cards so getCompiledCard can resolve the fusion target's
// appFusionRequirement at runtime (the engine reads it inside appFuseInto).
import "../index.js";

/**
 * Phase A3 — App Fusion (the Appmon mechanic) for PRIM-01 (BT24-087 clause).
 *
 * BT24-087's [Your Turn] whenLinked tail lets "1 of your Digimon app fuse into a Digimon
 * card with the [System]/[Life]/[Transmutation] trait in the trash." App Fusion plays the
 * fusion-TARGET card ON TOP of an existing battle-area Digimon, carrying that Digimon's stack
 * underneath — NOT DnaDigivolve (no permanent consumed off the field). Legality and cost are
 * owned by the target card's appFusionRequirement (documented behavior CanAppFusionFromTargetPermanent over
 * AddAppfuseMethodByName): the fusing permanent's TOP card + its LINKED cards must cover >= 2
 * distinct required names.
 *
 * Fusion target: BT24-038 (Biomon, appFusionRequirement names ["Docmon","Medicmon"], [Life]
 * trait). Fusing permanent: top = BT24-057 (Docmon), linked = BT24-036 (Medicmon) — together
 * they cover both required names, so the fusion is LEGAL.
 *
 * This drives the REAL engine appFuseInto verb (the path BT24-087's AppFuse action invokes)
 * and asserts the observable merge. Fails-when-reverted: stub appFuseInto to a no-op and the
 * "fusion result on top + source stack under it" assertions go RED. The legality-denial case
 * proves the documented behavior digimonCondition is enforced server-side (not a free move).
 */

const TARGET = "BT24-038"; // Biomon — appFusion names [Docmon, Medicmon], [Life] trait
const DOCMON = "BT24-057";
const MEDICMON = "BT24-036";
const UNRELATED = "BT23-016"; // Dokamon — not in BT24-038's appFusion names

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
  memory: MemoryGauge;
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
  return { state, fx: createPrimitives(engine), events, memory };
}

/** A battle-area Digimon whose top is `topId` and whose linked card is `linkedId`. */
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
  p.baseDP = 2000;
  p.currentDP = 2000;
  state.players[0]?.battleArea.push(p);
  return p;
}

describe("A3 App Fusion (BT24-087) — fuse into a trash Digimon, carrying the stack", () => {
  it("plays the fusion-target on top of the fusing Digimon, the source sliding under it", async () => {
    const h = harness();
    const p0 = h.state.players[0]!;
    const fuser = fusingPermanent(h.state, DOCMON, MEDICMON);
    const target = card(TARGET, 0, false);
    p0.trash.push(target); // the fusion-result lives in the trash (BT24-087's `from`)

    const result = await h.fx.appFuseInto(fuser.permanentId, target.instanceId);

    expect(result, "the fusion must be legal (top Docmon + linked Medicmon)").toBeDefined();
    // The fusion-target is now the permanent's top card.
    expect(fuser.topCard?.cardId).toBe(TARGET);
    // The original top (Docmon) slid under it as a digivolution card.
    expect(fuser.stack.map((c) => c.cardId)).toContain(DOCMON);
    // The result instance left the trash.
    expect(p0.trash.some((c) => c.instanceId === target.instanceId)).toBe(false);
    // DP recomputed from the new top (Biomon, 8000), not the old Docmon (2000).
    expect(fuser.baseDP).toBe(8000);
  });

  it("DENIES the fusion when the fusing Digimon does not satisfy the target's app-fusion names", async () => {
    const h = harness();
    const p0 = h.state.players[0]!;
    // Top Docmon but the linked card is unrelated (Dokamon) — only ONE required name covered,
    // so digimonCondition (>= 2 distinct names) is NOT met. documented behavior CanAppFusionFromTargetPermanent
    // returns false; the engine must refuse the fusion.
    const fuser = fusingPermanent(h.state, DOCMON, UNRELATED);
    const target = card(TARGET, 0, false);
    p0.trash.push(target);

    const result = await h.fx.appFuseInto(fuser.permanentId, target.instanceId);

    expect(result, "an illegal fusion must be refused (legality enforced server-side)").toBeUndefined();
    expect(fuser.topCard?.cardId).toBe(DOCMON); // unchanged
    expect(p0.trash.some((c) => c.instanceId === target.instanceId)).toBe(true); // still in trash
  });
});
