import { EffectTiming } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { GameState, PlayerState, Permanent, CardInstance, type Seat, type ServerEvent } from "@aegis/shared";
import { MemoryGauge } from "../../engine/MemoryGauge.js";
import { ModifierLedger } from "../../engine/effects/modifiers.js";
import { SubTriggerRegistry } from "../../engine/effects/subtriggers.js";
import { createPrimitives, type PrimitivesEngine, type SelectionPort } from "../../engine/effects/primitives.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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

describe("BT24-087 Rei Katsura public behavior", () => {
  it("suspends, draws, trashes, then App Fuses after one of its Digimon gets linked", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-087", as: "rei" },
            { card: DOCMON, as: "fuser", linked: [{ card: MEDICMON, as: "medicmon" }] },
          ],
          hand: [{ card: "BT4-022", as: "discard" }],
          deck: [{ card: "BT4-022", as: "drawn" }],
          trash: [{ card: TARGET, as: "fusion" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("discard").instanceId, s.perm("fuser").topCard.instanceId, s.inst("fusion").instanceId);
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("fuser").permanentId,
    });
    await settle(() => s.perm("fuser").topCard.instanceId === s.inst("fusion").instanceId);
    expect(s.perm("rei").isSuspended).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((instance) => instance.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.trash.map((instance) => instance.instanceId)).toContain(s.inst("discard").instanceId);
    // Biomon's own [When Digivolving] then free-links Docmon from the new stack. Biomon's
    // App Fusion also stacked Medicmon; it stays a digivolution source after Docmon is linked.
    expect(s.perm("fuser").linked.map((instance) => instance.cardId)).toContain(DOCMON);
    expect(s.perm("fuser").stack.map((instance) => instance.cardId)).toContain(MEDICMON);
  });

  it("structurally filters out an opponent's Digimon when the link watcher is injected", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-087", as: "rei" }],
        hand: ["BT1-009"],
        deck: ["BT1-010"],
      },
      1: { battleArea: [{ card: "BT21-009", as: "opponent" }] },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("opponent").permanentId,
    });

    expect(s.perm("rei").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("naturally triggers when a friendly Digimon gets linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-087", as: "rei" },
            { card: DOCMON, as: "host" },
          ],
          hand: [
            { card: MEDICMON, as: "link" },
            { card: "BT1-009", as: "discard" },
          ],
          deck: [
            { card: "BT1-010", as: "drawn" },
            { card: "BT4-022", as: "fusionDraw" },
          ],
          trash: [{ card: TARGET, as: "fusion" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const hostSourceId = s.perm("host").topCard.instanceId;
    const linkId = s.inst("link").instanceId;
    const fusionId = s.inst("fusion").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("fusion").instanceId);
    expect(s.state.memory).toBe(1);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").topCard.cardId).toBe(TARGET);
    expect(s.perm("host").topCard.instanceId).toBe(fusionId);
    expect(s.perm("host").stack.map((instance) => instance.instanceId)).toEqual([linkId]);
    expect(s.perm("host").linked.map((instance) => instance.instanceId)).toEqual([hostSourceId]);
    expect(s.state.players[0]!.trash.map((instance) => instance.instanceId)).not.toContain(fusionId);
    expect(s.perm("rei").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((instance) => instance.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.hand.map((instance) => instance.instanceId)).toContain(s.inst("fusionDraw").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((instance) => instance.instanceId)).toContain(s.inst("discard").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not draw, trash, or App Fuse when Rei cannot pay the suspension cost (Q5675)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-087", as: "rei", suspended: true },
            { card: DOCMON, as: "fuser" },
          ],
          hand: [
            { card: MEDICMON, as: "link" },
            { card: "BT1-009", as: "discard" },
          ],
          deck: [{ card: "BT4-022", as: "drawn" }],
          trash: [{ card: TARGET, as: "fusion" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("fuser").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("fuser").linked.some((instance) => instance.instanceId === s.inst("link").instanceId));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((instance) => instance.instanceId)).toEqual([s.inst("discard").instanceId]);
    expect(s.perm("fuser").topCard.cardId).toBe(DOCMON);
    expect(s.state.players[0]!.trash.map((instance) => instance.instanceId)).toContain(s.inst("fusion").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("may refuse the payable suspension cost after a real Link, stopping the then-tail", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-087", as: "rei" },
            { card: DOCMON, as: "host" },
          ],
          hand: [
            { card: MEDICMON, as: "link" },
            { card: "BT1-009", as: "discard" },
          ],
          deck: [{ card: "BT4-022", as: "drawn" }],
          trash: [{ card: TARGET, as: "fusion" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((instance) => instance.instanceId === s.inst("link").instanceId));

    expect(s.state.memory).toBe(1);
    expect(s.perm("host").linked.map((instance) => instance.instanceId)).toEqual([s.inst("link").instanceId]);
    expect(s.perm("rei").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck.map((instance) => instance.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.hand.map((instance) => instance.instanceId)).toEqual([s.inst("discard").instanceId]);
    expect(s.state.players[0]!.trash.map((instance) => instance.instanceId)).toContain(s.inst("fusion").instanceId);
    expect(s.perm("host").topCard.cardId).toBe(DOCMON);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("gains memory at the start of the main phase only while the opponent has a Digimon", async () => {
    const withOpponent = setupEngine({
      0: { battleArea: [{ card: "BT24-087", as: "rei" }] },
      1: { battleArea: ["BT1-009"] },
    });
    withOpponent.state.memory = 2;
    await withOpponent.ready();
    const withOpponentTurn = withOpponent.engine.runOneTurn();
    await advance(withOpponent.engine).waitForMainPhase(0);
    expect(withOpponent.state.memory).toBe(3);
    advance(withOpponent.engine).endMainPhaseIfOpen(0);
    await withOpponentTurn;

    const withoutOpponent = setupEngine({ 0: { battleArea: [{ card: "BT24-087", as: "rei" }] } });
    withoutOpponent.state.memory = 2;
    await withoutOpponent.ready();
    const withoutOpponentTurn = withoutOpponent.engine.runOneTurn();
    await advance(withoutOpponent.engine).waitForMainPhase(0);
    expect(withoutOpponent.state.memory).toBe(2);
    advance(withoutOpponent.engine).endMainPhaseIfOpen(0);
    await withoutOpponentTurn;
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT24-087", as: "rei" }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("rei"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("rei").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("rei").instanceId),
    ).toBe(true);
  });

  it("plays from security on a real opponent attack and removes only the checked card", async () => {
    const s = setupEngine({
      0: {
        security: [
          { card: "BT24-087", as: "rei" },
          { card: "BT1-013", as: "remainingSecurity" },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const reiId = s.inst("rei").instanceId;
    const remainingId = s.inst("remainingSecurity").instanceId;
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());

    const checked = s.events.filter((event) => event.kind === "securityChecked");
    expect(checked).toHaveLength(1);
    expect(checked[0]).toMatchObject({ revealedCardId: "BT24-087" });
    expect(s.state.players[0]!.security.map((instance) => instance.instanceId)).toEqual([remainingId]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(reiId);
    expect(s.perm("rei").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map((instance) => instance.instanceId)).not.toContain(reiId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(3);
  });
});
