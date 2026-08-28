import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/index.js";
import { compiled } from "./BT18-089.js";

describe("BT18-089 Tommy Himi", () => {
  it("covers the paid Hybrid memory gain and inherited bottom-card trash followed by conditional draw", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[1]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "GainMemory", amount: 1, cost: { kind: "trash" } }],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "TrashDigivolution",
          amount: 1,
          fromTop: false,
          target: { filter: { controller: "opponent", digivolutionCards: "hasAny" } },
        },
        { kind: "Draw", amount: 1, condition: { kind: "opponentHasNone" } },
      ],
    });
  });

  it("naturally gains memory after trashing a Hybrid card at the start of main", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-089", as: "tommy" }],
          hand: [{ card: "BT18-011", as: "hybrid" }, { card: "BT1-010" }],
          deck: ["BT1-001"],
        },
        1: { deck: ["BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    for (let i = 0; i < 500 && !mainPhase.isOpen; i++) await Promise.resolve();
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("hybrid").instanceId));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(true);
    s.engine.applyIntent(0, { type: "endPhase" });
    await turn;
  });

  it("naturally plays from security when an opponent's attack reveals it", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT18-089", as: "tommy", faceUp: true }] },
      1: { battleArea: [{ card: "BT1-060", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("tommy").instanceId));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("tommy").instanceId)).toBe(true);
  });

  it("naturally trashes an opponent's bottom source and draws after the last source is removed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-060", as: "host", under: ["BT18-089"] }],
          deck: ["BT1-005"],
        },
        1: {
          battleArea: [{ card: "BT1-030", as: "target", under: ["BT1-001"] }],
          security: ["BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-005"));

    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-005")).toBe(true);
  });
});
