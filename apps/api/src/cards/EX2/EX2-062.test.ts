import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-035.js";
import "./EX2-062.js";

describe("EX2-062 Ryo Akiyama", () => {
  it("adds a Dramon or Justimon card from the top four on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-062", as: "ryo" }],
          deck: [{ card: "EX2-035", as: "cyberdramon" }, "BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ryo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cyberdramon").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cyberdramon").instanceId)).toBe(true);
  });

  it("places every unselected reveal at the deck bottom in the chosen order", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-062", as: "ryo" }],
          deck: [
            { card: "EX2-035", as: "chosen" },
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-011", as: "third" },
            { card: "BT1-012", as: "untouched" },
          ],
        },
      },
      { autoSelectCards: false, autoOrderCards: false },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ryo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const selection = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("chosen").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const ordering = s.state.pendingDecision!;
    const order = [s.inst("third").instanceId, s.inst("second").instanceId, s.inst("first").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck[0]?.instanceId === order[0]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("untouched").instanceId, ...order]);
  });

  it("gives a black attacker +1000 DP through the opponent's turn, then clears it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-035", as: "attacker" },
            { card: "EX2-062", as: "ryo" },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-001"],
        },
        1: {
          hand: ["BT1-010"],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    const baseDp = s.perm("attacker").currentDP;
    const turn = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ryo").isSuspended && s.perm("attacker").currentDP === baseDp + 1000);
    expect(s.perm("attacker").currentDP).toBe(baseDp + 1000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("attacker").currentDP).toBe(baseDp);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turn;
  });

  it("plays EX2-062 from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-050", as: "attacker" }], security: ["BT1-001"] },
      1: { security: [{ card: "EX2-062", as: "securityRyo" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityRyo").instanceId),
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityRyo").instanceId)).toBe(
      true,
    );
  });
});
