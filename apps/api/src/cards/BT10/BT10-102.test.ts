import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-102.js";

describe("BT10-102 Pyon Dump", () => {
  it("grants Piercing and suspends an opponent when Angoramon is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-051", as: "attacker" }],
          hand: [{ card: "BT10-102", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);

    expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(true);
  });

  it("recognizes Angoramon in a Digimon's digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-043", as: "attacker", under: ["BT10-044"] }],
          hand: [{ card: "BT10-102", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);

    expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(true);
  });

  it("does not recognize Angoramon under a Tamer as a Digimon source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-043", as: "attacker" },
            { card: "BT1-089", under: ["BT10-044"] },
          ],
          hand: [{ card: "BT10-102", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT10-102"));

    expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(true);
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("does not suspend without Angoramon but still grants Piercing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-043", as: "attacker" }],
          hand: [{ card: "BT10-102", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT10-102"));

    expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(true);
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("Security suspends an opponent and adds itself to hand", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT10-102", as: "option", faceUp: true }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    const optionId = s.inst("option").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.perm("target").isSuspended);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
  });
});
