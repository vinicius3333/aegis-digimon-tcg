import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST23-06.js";

describe("ST23-06 Gekkomon", () => {
  it("reveals three, adds one Glowing Dawn card, and places another face down under its Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST23-13", as: "tamer" }],
          hand: [{ card: "ST23-06", as: "gekkomon" }],
          deck: ["ST23-02", "ST23-03", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gekkomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("tamer").stack.length === 1 &&
        s.state.players[0]!.hand.some((card) => card.cardId === "ST23-02" || card.cardId === "ST23-03"),
    );
    expect(s.perm("tamer").stack).toHaveLength(1);
    expect(s.perm("tamer").stack[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "ST23-02" || card.cardId === "ST23-03")).toBe(true);
  });

  it("adds the sole revealed Glowing Dawn card to hand without disturbing an existing Tamer stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST23-13", as: "tamer", under: [{ card: "BT1-001", as: "existing", faceUp: false }] }],
          hand: [{ card: "ST23-06", as: "gekkomon" }],
          deck: ["ST23-02", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const existingId = s.inst("existing").instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gekkomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "ST23-02"));

    expect(s.perm("tamer").stack).toHaveLength(1);
    expect(s.perm("tamer").stack[0]!.instanceId).toBe(existingId);
  });

  it("uses inherited Piercing after winning a real unequal-DP attack against an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST4-07", as: "host", under: ["ST23-06"] }] },
        1: { battleArea: [{ card: "ST1-02", as: "target", suspended: true }], security: ["BT1-001", "BT1-002"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const targetId = s.perm("target").permanentId;
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    const combat = s.events.find((event) => event.kind === "combatResolved");
    expect(combat).toMatchObject({ kind: "combatResolved", deletedPermanentIds: [targetId] });
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
