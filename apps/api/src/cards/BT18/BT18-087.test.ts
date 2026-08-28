import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-087.js";

describe("BT18-087 Owen Dreadnought", () => {
  it("covers memory setting, suspended cost, DP boundary, and security play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "StartOfYourTurn" });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        { kind: "SubTrigger", event: "whenSecurityRemoved", actions: [{ kind: "Delete", cost: { kind: "suspend" } }] },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({ trigger: "Security", isSecurity: true });
  });

  it("sets memory to 3 at the natural start of your turn when memory is 2 or less", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-087", as: "owen" }], hand: [{ card: "BT1-010" }] },
      1: { deck: ["BT1-001"] },
    });
    s.state.memory = 2;
    s.state.turnSeat = 0;
    await s.ready();
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    for (let i = 0; i < 500 && !mainPhase.isOpen; i++) await Promise.resolve();

    expect(s.state.memory).toBe(3);
    s.engine.applyIntent(0, { type: "endPhase" });
    await turn;
  });

  it("suspends itself to delete an opposing Digimon at 4000 DP or less after a natural security attack", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-087", as: "owen" },
            { card: "BT1-060", as: "attacker" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "low", dp: 4000 },
            { card: "BT1-010", as: "high", dp: 5000 },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const lowId = s.perm("low").permanentId;
    preferInstanceIds.push(lowId);
    s.state.turnSeat = 0;
    s.state.memory = 1;
    await s.ready();
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.perm("owen").isSuspended && !s.state.players[1]!.battleArea.some((perm) => perm.permanentId === lowId));

    expect(s.perm("owen").isSuspended).toBe(true);
    expect(() => s.perm("low")).toThrow();
    expect(s.perm("high")).toBeDefined();
  });

  it("naturally plays itself without cost from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT18-087", as: "owen", faceUp: true }] },
      1: { battleArea: [{ card: "BT1-060", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("owen").instanceId));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("owen").instanceId)).toBe(
      true,
    );
  });
});
