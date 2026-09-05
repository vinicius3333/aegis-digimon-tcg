import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST4-14.js";
import "./ST4-15.js";

describe("ST4-14 Izzy Izumi", () => {
  it("suspends to gain memory when an opposing Digimon becomes suspended", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST4-14", as: "izzy" }], hand: [{ card: "ST4-15", as: "option" }] },
        1: { battleArea: [{ card: "ST4-08", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("izzy").isSuspended && s.state.memory === 2);
    expect(s.perm("target").isSuspended).toBe(true);
  });
  it("may trigger when an opposing Blocker suspends during an attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST4-14", as: "izzy" },
            { card: "ST4-13", as: "attacker" },
          ],
        },
        1: { battleArea: [{ card: "ST4-08", as: "blocker" }], security: ["ST4-03"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("izzy").isSuspended && s.state.memory === 1);
    expect(s.perm("izzy").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });
  it("plays itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "ST4-14", as: "izzy", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("izzy"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("izzy").instanceId)).toBe(true);
  });

  it("may decline the optional memory gain after an opposing Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST4-14", as: "izzy" }], hand: [{ card: "ST4-15", as: "option" }] },
        1: { battleArea: [{ card: "ST4-08", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST4-14") &&
        s.state.pendingDecision === undefined,
    );
    expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST4-14")).toBe(true);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("izzy").isSuspended).toBe(false);
    expect(s.state.memory).toBe(1);
  });
});
