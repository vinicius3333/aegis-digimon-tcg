import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-094.js";

describe("BT3-094 Ken Ichijoji", () => {
  it("sets memory to 3 at turn start and may suspend to gain memory after a blue battle win", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-094", as: "ken" },
            { card: "BT3-025", dp: 5000, as: "attacker" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", dp: 1000, suspended: true, as: "defender" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("ken"));
    expect(s.state.memory).toBe(3);

    const defenderId = s.perm("defender").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ken").isSuspended && s.state.memory === 4, 5000);

    expect(s.perm("ken").isSuspended).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("plays itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT3-094", as: "securityTamer", faceUp: true }] } });
    const id = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === id)).toBe(true);
  });
});

describe("BT3-094 Ken Ichijoji — KB Q&A rulings", () => {
  it("does not activate when a blue Digimon deletes a Security Digimon in battle (Q1124)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-094", as: "ken" },
            { card: "BT3-025", dp: 5000, as: "securityAttacker" },
            { card: "BT1-035", dp: 5000, as: "digimonAttacker" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-010", dp: 1000, suspended: true, as: "defender" }],
          security: [{ card: "BT1-064", as: "securityDigimon" }, "BT1-064"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("securityAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    const securityDigimonId = s.inst("securityDigimon").instanceId;
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === securityDigimonId) &&
        s.state.pendingDecision === undefined,
      5000,
    );
    await drainMicrotasks();
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("securityAttacker").permanentId)).toBe(
      true,
    );
    expect(s.perm("ken").isSuspended).toBe(false);
    expect(s.state.memory).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("digimonAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ken").isSuspended && s.state.memory === 4, 5000);
    expect(s.state.memory).toBe(4);
  });

  it("activates for your green or blue Digimon but not for your red Digimon (Q1125)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-094", as: "ken" },
            { card: "BT1-010", dp: 5000, as: "redAttacker" },
            { card: "BT1-064", dp: 5000, as: "greenAttacker" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 1000, suspended: true, as: "firstDefender" },
            { card: "BT1-010", dp: 1000, suspended: true, as: "secondDefender" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const firstDefenderId = s.perm("firstDefender").permanentId;
    const secondDefenderId = s.perm("secondDefender").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("redAttacker").permanentId,
        target: { kind: "permanent", permanentId: firstDefenderId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === firstDefenderId) &&
        s.state.pendingDecision === undefined,
      5000,
    );
    await drainMicrotasks();
    expect(s.perm("ken").isSuspended).toBe(false);
    expect(s.state.memory).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("greenAttacker").permanentId,
        target: { kind: "permanent", permanentId: secondDefenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ken").isSuspended && s.state.memory === 4, 5000);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === secondDefenderId)).toBe(false);
    expect(s.state.memory).toBe(4);
  });
});
