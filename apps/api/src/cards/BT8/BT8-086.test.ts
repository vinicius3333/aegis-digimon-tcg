import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-086.js";

describe("BT8-086 Hiro Amanokawa", () => {
  it("suspends when a level 5 or higher Digimon attacks to give one of your Digimon +2000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-086", as: "hiro" },
            { card: "BT8-078", as: "attacker" },
          ],
        },
        1: { security: ["BT8-034"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const before = s.perm("attacker").currentDP;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").currentDP > before);
    expect(s.perm("hiro").isSuspended).toBe(true);
    expect(s.perm("attacker").currentDP).toBe(before + 2000);
  });

  it("also suspends when a Digimon with Gammamon in its name attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-086", as: "hiro" }, { card: "BT8-008", as: "gammamon" }],
        },
        1: { security: ["BT8-034"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const before = s.perm("gammamon").currentDP;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gammamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gammamon").currentDP > before);

    expect(s.perm("hiro").isSuspended).toBe(true);
    expect(s.perm("gammamon").currentDP).toBe(before + 2000);
  });

  it("sets memory to 3 at the start of its turn when memory is 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-086", as: "hiro" }] } });
    s.state.turnSeat = 0;
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("hiro"));
    expect(s.state.memory).toBe(3);
  });

  it("plays itself from a face-up Security check without memory cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT8-086", as: "securityHiro", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityHiro"));
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("securityHiro").instanceId,
      ),
    ).toBe(true);
  });
});
