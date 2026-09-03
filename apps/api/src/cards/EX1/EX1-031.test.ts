import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-031.js";

describe("EX1-031 Seraphimon", () => {
  it("recovers the deck's top card when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-029", as: "base" }],
          hand: [{ card: "EX1-031", as: "evo" }],
          deck: ["BT1-008", { card: "BT1-009", as: "recovered" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("recovered").instanceId);
  });

  it("gives your Security Digimon +5000 DP on opponent's turn while suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-031", as: "seraphimon" }],
        security: [{ card: "BT1-009", as: "securityDigimon" }, "BT1-001"],
        hand: ["BT1-009"],
        deck: ["BT1-001", "BT1-001"],
      },
      1: {
        security: ["BT1-001", "BT1-001"],
        hand: ["BT1-009"],
        deck: ["BT1-001", "BT1-001"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("seraphimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("seraphimon").isSuspended);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(observe(s.engine).securityDp(0)).toBe(5000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not boost Security Digimon on the opponent's turn while unsuspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-031", as: "seraphimon" }],
        security: [{ card: "BT1-009", as: "securityDigimon" }, "BT1-001"],
        hand: ["BT1-009"],
        deck: ["BT1-001", "BT1-001"],
      },
      1: {
        security: ["BT1-001", "BT1-001"],
        hand: ["BT1-009"],
        deck: ["BT1-001", "BT1-001"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.perm("seraphimon").isSuspended).toBe(false);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(observe(s.engine).securityDp(0)).toBe(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
