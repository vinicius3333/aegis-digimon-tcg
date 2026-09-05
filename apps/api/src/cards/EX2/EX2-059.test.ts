import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-059.js";

describe("EX2-059 Shu-Chong Wong", () => {
  it("may play Lopmon from hand for free on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX2-059", as: "shu" },
            { card: "EX2-020", as: "lopmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shu").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("lopmon").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("lopmon").instanceId),
    ).toBe(true);
  });

  it("draws at the start of turn with three or fewer Security, but not four", async () => {
    const eligible = setupEngine({
      0: {
        battleArea: [{ card: "EX2-059", as: "shu" }],
        deck: [{ card: "BT1-001", as: "drawn" }, "BT1-002"],
        security: ["BT1-003", "BT1-004", "BT1-005"],
      },
    });
    await eligible.ready();
    const eligibleTurn = eligible.engine.runOneTurn();
    await advance(eligible.engine).waitForMainPhase(0);
    expect(eligible.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: eligible.inst("drawn").instanceId }),
    );
    advance(eligible.engine).endMainPhaseIfOpen(0);
    await eligibleTurn;

    const boundary = setupEngine({
      0: {
        battleArea: [{ card: "EX2-059", as: "shu" }],
        deck: [{ card: "BT1-001", as: "drawn" }, "BT1-002"],
        security: ["BT1-003", "BT1-004", "BT1-005", "BT1-006"],
      },
    });
    await boundary.ready();
    const boundaryTurn = boundary.engine.runOneTurn();
    await advance(boundary.engine).waitForMainPhase(0);
    expect(boundary.state.players[0]!.hand).not.toContainEqual(
      expect.objectContaining({ instanceId: boundary.inst("drawn").instanceId }),
    );
    advance(boundary.engine).endMainPhaseIfOpen(0);
    await boundaryTurn;
  });

  it("keeps an eligible Lopmon in hand when the optional play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX2-059", as: "shu" },
            { card: "EX2-020", as: "lopmon" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shu").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("shu").instanceId),
    );
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("lopmon").instanceId }),
    );
  });

  it("plays from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-050", as: "attacker" }], security: ["BT1-001"] },
      1: { security: [{ card: "EX2-059", as: "securityShu" }] },
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
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityShu").instanceId),
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityShu").instanceId)).toBe(
      true,
    );
  });
});
