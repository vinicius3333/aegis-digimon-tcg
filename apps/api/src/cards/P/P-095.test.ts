import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-090.js";
import "./P-095.js";

describe("P-095 Pause Plug-In P", () => {
  it("requires a color source without a Tamer, but any off-color Tamer waives that requirement", async () => {
    const withoutTamer = setupEngine({
      0: { hand: [{ card: "P-095", as: "blockedOption" }] },
      1: { battleArea: [{ card: "BT1-075", dp: 12000 }] },
    });
    withoutTamer.state.memory = 10;
    await withoutTamer.ready();

    expect(withoutTamer.engine.applyIntent(0, {
      type: "playCard",
      instanceId: withoutTamer.inst("blockedOption").instanceId,
    })).toEqual({ ok: false, reason: "color-requirement-unmet" });

    const withTamer = setupEngine(
      {
        0: {
          // EX2-061 is a green Tamer: it satisfies "a Tamer", but cannot satisfy the
          // yellow Option's printed color requirement by itself.
          battleArea: ["EX2-061"],
          hand: [{ card: "P-095", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-075", dp: 12000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    withTamer.state.memory = 10;
    await withTamer.ready();

    expect(withTamer.engine.applyIntent(0, {
      type: "playCard",
      instanceId: withTamer.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => withTamer.state.players[0]!.trash.some(
      (card) => card.instanceId === withTamer.inst("option").instanceId,
    ));

    expect(withTamer.state.memory).toBe(5);
    expect(withTamer.perm("target").currentDP).toBe(6000);
    assertNoLoudGap(withTamer);
  });

  it("binds both Main clauses to exactly the chosen Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX2-061"],
          hand: [{ card: "P-095", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-075", dp: 12000, as: "chosen" },
            { card: "BT1-075", dp: 12000, as: "other" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    const request = s.decisions.at(-1)!.req;

    expect(request.sourceCardId).toBe("P-095");
    expect(request.options?.min).toBe(1);
    expect(request.options?.max).toBe(1);
    expect(request.options?.candidateInstanceIds).toEqual(expect.arrayContaining([
      s.perm("chosen").permanentId,
      s.perm("other").permanentId,
    ]));
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "chooseTargets", instanceIds: [s.perm("chosen").permanentId] },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(
      (card) => card.instanceId === s.inst("option").instanceId,
    ));

    expect([
      s.perm("chosen").currentDP,
      s.perm("other").currentDP,
    ]).toEqual([6000, 12000]);
    assertNoLoudGap(s);
  });

  it("keeps the chosen permanent's When Digivolving suppressed after it evolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            "EX2-061",
            { card: "BT1-009", as: "firstSuspendTarget" },
            { card: "BT1-010", as: "secondSuspendTarget" },
          ],
          hand: [{ card: "P-095", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT1-075", dp: 12000, as: "affectedHost" }],
          hand: [{ card: "P-090", as: "evolver" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(
      (card) => card.instanceId === s.inst("option").instanceId,
    ));

    // The restriction belongs to the permanent, not to its old top card. Let the opponent
    // evolve that exact host into P-090, whose mandatory When Digivolving suspends 2 targets.
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const deckBefore = s.state.players[1]!.deck.length;
    expect(s.engine.applyIntent(1, {
      type: "digivolve",
      permanentId: s.perm("affectedHost").permanentId,
      instanceId: s.inst("evolver").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("affectedHost").topCard.instanceId === s.inst("evolver").instanceId);
    await settle(() => false, 40);

    expect(s.state.players[1]!.deck.length).toBe(deckBefore - 1);
    expect(s.perm("firstSuspendTarget").isSuspended).toBe(false);
    expect(s.perm("secondSuspendTarget").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "P-090")).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("applies only the Security DP loss for the turn, then adds itself to hand", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { security: [{ card: "P-095", as: "securityOption" }] },
        1: {
          battleArea: [
            { card: "BT1-025", as: "attacker" },
            { card: "BT1-075", dp: 12000, as: "securityTarget" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("securityTarget").permanentId);
    s.state.turnSeat = 1;

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(
      (card) => card.instanceId === s.inst("securityOption").instanceId,
    ));

    expect(s.perm("securityTarget").currentDP).toBe(6000);
    expect(s.state.players[0]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
