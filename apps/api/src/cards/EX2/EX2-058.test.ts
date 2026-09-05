import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-058.js";

describe("EX2-058 Jeri Kato", () => {
  it("may play Leomon from hand for free on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX2-058", as: "jeri" },
            { card: "EX2-017", as: "leomon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jeri").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("leomon").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("leomon").instanceId),
    ).toBe(true);
  });

  it("plays from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-050", as: "attacker" }], security: ["BT1-001"] },
      1: { security: [{ card: "EX2-058", as: "securityJeri" }] },
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
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityJeri").instanceId),
    );
    expect(
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityJeri").instanceId),
    ).toBe(true);
  });

  it("may suspend on the opponent's attack to draw 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-058", as: "jeri" }],
          deck: ["BT1-004", { card: "BT1-001", as: "drawn" }, "BT1-005", "BT1-006"],
          security: ["BT1-002"],
        },
        1: {
          battleArea: [{ card: "EX2-050", as: "attacker" }],
          deck: ["BT1-007", "BT1-008", "BT1-009", "BT1-010"],
          security: ["BT1-003"],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 3;
    const turn = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    for (let i = 0; i < 100 && !s.perm("jeri").isSuspended; i += 1) await Promise.resolve();
    expect(s.perm("jeri").isSuspended).toBe(true);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("drawn").instanceId }),
    );
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turn;
  });

  it("does not draw when the attack response is declined or during its own turn", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-058", as: "jeri" }],
          deck: ["BT1-004", { card: "BT1-001", as: "drawn" }, "BT1-005", "BT1-006"],
          security: ["BT1-002"],
        },
        1: {
          battleArea: [{ card: "EX2-050", as: "attacker" }],
          deck: ["BT1-007", "BT1-008", "BT1-009", "BT1-010"],
          security: ["BT1-003"],
        },
      },
      { autoDeclineOptional: true },
    );
    declined.state.memory = 3;
    const declinedTurn = declined.engine.startTurnLoop();
    await advance(declined.engine).waitForMainPhase(0);
    advance(declined.engine).endMainPhaseIfOpen(0);
    await advance(declined.engine).waitForMainPhase(1);
    expect(
      declined.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: declined.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(declined.engine).isAttacking());
    expect(declined.perm("jeri").isSuspended).toBe(false);
    expect(declined.state.players[0]!.deck).toHaveLength(3);
    expect(declined.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await declinedTurn;

    const ownTurn = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-058", as: "jeri" },
          { card: "EX2-050", as: "attacker" },
        ],
        deck: [{ card: "BT1-001", as: "drawn" }],
        security: ["BT1-002"],
      },
      1: { security: ["BT1-003"] },
    });
    await ownTurn.ready();
    expect(
      ownTurn.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: ownTurn.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(ownTurn.engine).isAttacking());
    expect(ownTurn.perm("jeri").isSuspended).toBe(false);
    expect(ownTurn.state.players[0]!.deck).toHaveLength(1);
  });
});
