import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-062.js";

describe("EX11-062 Shoto Kazama", () => {
  it("sets memory to 3 at the start of your turn from 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-062", as: "shoto" }] } });
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("shoto"));
    expect(s.state.memory).toBe(3);
  });

  it("draws and grants +3000 DP when an effect suspends a Digimon (Q5917/Q5918)", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["AD1-001"],
          battleArea: [
            { card: "EX11-062", as: "shoto" },
            { card: "EX11-026", as: "bird" },
          ],
        },
        1: { battleArea: [{ card: "AD1-002", as: "effectSuspended" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.suspend([s.perm("effectSuspended").permanentId], 0);

    expect(s.perm("shoto").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.perm("bird").currentDP).toBe(4000);
  });

  it("skips the draw but still grants +3000 DP after an attack-rule suspension (Q5918/Q6517)", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["AD1-001"],
          battleArea: [
            { card: "EX11-062", as: "shoto" },
            { card: "EX11-026", as: "birdAttacker" },
          ],
        },
        1: { security: ["BT1-090"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("birdAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shoto").isSuspended);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("birdAttacker").currentDP).toBe(4000);
  });

  it("publishes full exclusive IR with the suspension cost gating both branches", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "whenSuspended",
        cost: { kind: "suspend" },
        actions: [
          { kind: "Draw", condition: { kind: "triggeredByEffect" } },
          { kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" },
        ],
      },
    ]);
  });
});
