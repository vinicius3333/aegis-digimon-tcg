import { describe, expect, it } from "vitest";
import { cite } from "./_kb.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";

describe("bounded trigger ordering and pending source departure", () => {
  it("offers simultaneous optional deletion triggers to the owning controllers in turn-player order", async () => {
    cite("comprehensive-0164", "simultaneous effects activate one at a time, with the turn player resolving first");
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
    cite(
      "comprehensive-0164",
      "simultaneous triggers are pending together and the player chooses their activation order",
    );
    cite("comprehensive-0165", "a pending effect whose source no longer meets its trigger conditions cannot activate");

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
});
