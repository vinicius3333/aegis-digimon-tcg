import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import "./EX2-054.js";

describe("EX2-054 ADR-09 Gatekeeper", () => {
  it("recovers 1 on play while Mother D-Reaper is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX2-007"],
          hand: [{ card: "EX2-054", as: "gatekeeper" }],
          deck: ["BT1-001"],
          security: ["BT1-002", "BT1-003"],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gatekeeper").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 3);
    expect(s.state.players[0]!.security).toHaveLength(3);
  });

  it("does not recover without Mother D-Reaper", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX2-054", as: "gatekeeper" }],
        deck: [{ card: "BT1-001", as: "deckTop" }],
        security: ["BT1-002", "BT1-003"],
      },
    });
    s.state.memory = 20;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("gatekeeper").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("deckTop").instanceId);
  });

  it("gives every opposing Digimon Security Attack -1 with 6+ Mother sources", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-007", as: "mother", under: Array.from({ length: 6 }, () => "EX2-046") },
          { card: "EX2-054", as: "gatekeeper" },
        ],
        deck: ["BT1-001", "BT1-001"],
      },
      1: {
        battleArea: [
          { card: "EX2-019", as: "first" },
          { card: "EX2-025", as: "second" },
        ],
        deck: ["BT1-001", "BT1-001"],
      },
    });
    await s.ready();
    // Advance through seat 0's turn using the public turn driver, then recompute the
    // production continuous-effect ledger while seat 1 is active.
    const turnLoop = s.engine.startTurnLoop();
    await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Main);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Main);

    expect(observe(s.engine).keywordAmount(s.perm("first"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("second"), "SecurityAttack")).toBe(-1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("does not apply Security Attack -1 with only five Mother sources", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-007", as: "mother", under: Array.from({ length: 5 }, () => "EX2-046") },
          { card: "EX2-054", as: "gatekeeper" },
        ],
        deck: ["BT1-001", "BT1-001"],
      },
      1: { battleArea: [{ card: "EX2-019", as: "opponent" }], deck: ["BT1-001", "BT1-001"] },
    });
    await s.ready();
    const turnLoop = s.engine.startTurnLoop();
    await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Main);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Main);

    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("plays itself from Security without battling", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-050", as: "attacker" }], security: ["BT1-001"] },
        1: {
          battleArea: [{ card: "EX2-007", as: "mother" }],
          deck: ["BT1-002"],
          security: [{ card: "EX2-054", as: "securityGatekeeper" }],
        },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some(
        (perm) => perm.topCard?.instanceId === s.inst("securityGatekeeper").instanceId,
      ),
    );
    expect(
      s.state.players[1]!.battleArea.some(
        (perm) => perm.topCard?.instanceId === s.inst("securityGatekeeper").instanceId,
      ),
    ).toBe(true);
  });
});
