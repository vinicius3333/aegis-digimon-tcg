import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST12-09.js";
import "./ST12-10.js";

describe("ST12-09 Volcanomon", () => {
  it("has Blocker and grants Security Attack +1 as an inherited effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST12-09", as: "volcano" },
          { card: "ST12-10", as: "host", under: ["ST12-09"] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("volcano"), "Blocker")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("redirects a player attack through its real Blocker window", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST12-04", as: "attacker" }] },
      1: { battleArea: [{ card: "ST12-09", as: "blocker" }], security: ["BT1-001"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "ST12-04")).toBe(true);
    expect(s.perm("blocker").isSuspended).toBe(true);
  });

  it("resolves inherited Security Attack through actual combat", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST12-10", as: "host", under: ["ST12-09"] }] },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
