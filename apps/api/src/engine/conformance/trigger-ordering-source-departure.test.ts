import { beforeEach, describe, expect, it } from "vitest";
import { cite } from "./_kb.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";

const SIMULTANEOUS_SHA256 = "8d2bf2fd50af6a37b28b64a0db252f4d9d0a9f033e72539337b25d6d330e5494";
const PENDING_ACTIVATION_SHA256 = "a67b8c006fddd924465986923295d048cb04f1430880d8750558da4c425f05a0";
const DERIVED_TRIGGER_SHA256 = "c12a72babb8fa25e11755af5c32e4d0efccdb4e812e15d3b2dd8cc2e2df1ee50";

describe("bounded trigger ordering and pending source departure", () => {
  beforeEach(() => {
    cite("comprehensive-0164", "§15-4-3 Simultaneous Triggering", SIMULTANEOUS_SHA256);
    cite("comprehensive-0165", "§15-4-4 Pending Activation", PENDING_ACTIVATION_SHA256);
    cite("comprehensive-0166", "§15-4-5 Derived Triggering", DERIVED_TRIGGER_SHA256);
  });

  it("offers simultaneous optional deletion triggers to the owning controllers in turn-player order", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-040", as: "turnHolder", suspended: true }],
          security: [{ card: "BT1-028", as: "turnSecurity" }],
        },
        1: {
          battleArea: [{ card: "BT25-040", as: "opponentHolder", suspended: true }],
          security: [{ card: "BT1-028", as: "opponentSecurity" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: false, autoOrderTriggers: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // Equal-DP battle deletion is the public legal action that creates one simultaneous
    // deletion event for both physical Ascension holders.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("turnHolder").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponentHolder").permanentId },
      }),
    ).toMatchObject({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const first = s.state.pendingDecision!;
    expect(first.seat).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: first.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toMatchObject({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const second = s.state.pendingDecision!;
    expect(second.seat).toBe(1);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: second.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toMatchObject({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("turnHolder").instanceId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("opponentHolder").instanceId,
    );
    const surrender = s.state.gameOver ? undefined : s.engine.applyIntent(0, { type: "surrender" });
    expect(surrender === undefined || surrender.ok).toBe(true);
    await loop;
  });

  it("offers two real trash triggers together, then drops only the source that departed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-083", as: "base" }],
          hand: [{ card: "EX7-061", as: "lilithmonX" }],
          trash: [
            { card: "EX7-072", as: "first" },
            { card: "EX7-072", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lilithmonX").instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const pending = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
    const keys = request.options?.triggerKeys ?? [];
    expect(keys).toHaveLength(2);
    expect(keys).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${s.inst("first").instanceId}::`),
        expect.stringContaining(`${s.inst("second").instanceId}::`),
      ]),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "orderTriggers", order: [keys[0]!] },
      }),
    ).toMatchObject({ ok: true });
    await settle(() => s.state.players[0]!.deck.some(({ instanceId }) => instanceId === s.inst("first").instanceId));

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("first").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("second").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
    );
  });

  it("keeps the public deletion priority turn-player-first with valid optional payloads", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-065", as: "turnMachine", dp: 11000 }],
          trash: [{ card: "ST5-10", as: "playedMachine" }],
        },
        1: {
          battleArea: [
            { card: "BT19-065", as: "opponentMachine", dp: 11000, suspended: true },
            { card: "BT19-020", as: "derivedVictim" },
          ],
          hand: [{ card: "BT19-081", as: "kiriha" }],
          trash: [{ card: "ST5-10", as: "olderMaterial" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.phase).toBe("Main");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("turnMachine").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponentMachine").permanentId },
      }),
    ).toMatchObject({ ok: true });
    expect(s.state.turnSeat).toBe(0);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("turnMachine").instanceId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("opponentMachine").instanceId,
    );
    const first = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === first.decisionId)?.req;
    expect({ seat: first.seat, sourceCardId: request?.sourceCardId }).toEqual({ seat: 0, sourceCardId: "BT19-065" });
    const surrender = s.state.gameOver ? undefined : s.engine.applyIntent(0, { type: "surrender" });
    expect(surrender === undefined || surrender.ok).toBe(true);
    await loop;
  });

  it("prioritizes a public derived deletion trigger over an older pending trigger", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-065", as: "turnMachine", dp: 11000 },
            { card: "BT1-009", as: "turnSacrifice" },
          ],
          trash: [{ card: "BT20-073", as: "playedMachine" }],
        },
        1: {
          battleArea: [
            { card: "BT19-065", as: "opponentMachine", dp: 11000, suspended: true },
            { card: "BT19-020", as: "derivedVictim" },
          ],
          hand: [{ card: "BT19-081", as: "kiriha" }],
          trash: [{ card: "ST5-10", as: "olderMaterial" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: false, autoOrderTriggers: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.turnSeat).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("turnMachine").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponentMachine").permanentId },
      }),
    ).toMatchObject({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "optional");
    const initial = s.state.pendingDecision!;
    expect(initial.seat).toBe(0);
    expect(s.decisions.find(({ req }) => req.decisionId === initial.decisionId)?.req.sourceCardId).toBe("BT19-065");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: initial.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toMatchObject({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "optional");
    const cost = s.state.pendingDecision!;
    expect(s.decisions.find(({ req }) => req.decisionId === cost.decisionId)?.req.sourceCardId).toBe("BT20-073");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: cost.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toMatchObject({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const sacrifice = s.state.pendingDecision!;
    const sacrificeRequest = s.decisions.find(({ req }) => req.decisionId === sacrifice.decisionId)?.req;
    expect(sacrificeRequest?.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("turnSacrifice").permanentId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: sacrifice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("turnSacrifice").permanentId] },
      }),
    ).toMatchObject({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const derived = s.state.pendingDecision!;
    const derivedRequest = s.decisions.find(({ req }) => req.decisionId === derived.decisionId)?.req;
    expect(derived.seat).toBe(1);
    expect(derivedRequest?.sourceCardId).toBe("BT19-020");
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: derived.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toMatchObject({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const older = s.state.pendingDecision!;
    const olderRequest = s.decisions.find(({ req }) => req.decisionId === older.decisionId)?.req;
    expect(older.seat).toBe(1);
    expect(olderRequest?.sourceCardId).toBe("BT19-065");
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: older.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toMatchObject({ ok: true });
    await settle();
    const surrender = s.state.gameOver ? undefined : s.engine.applyIntent(0, { type: "surrender" });
    expect(surrender === undefined || surrender.ok).toBe(true);
    await loop;
  });
});
