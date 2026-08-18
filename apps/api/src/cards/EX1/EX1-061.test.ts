import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-061.js";

describe("EX1-061 Myotismon", () => {
  it("reduces only this field Myotismon's evolution into a Myotismon-named card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-061", as: "base" }],
        hand: [{ card: "EX1-063", as: "evo" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evo").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-063" && s.state.memory === 2);
    expect(s.state.memory).toBe(2);
  });

  it("does not reduce evolution just because Myotismon is in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-057", as: "base" }],
        hand: [{ card: "EX1-061", as: "evo" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evo").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-061" && s.state.memory === 2);
    expect(s.state.memory).toBe(2);
  });

  it("lets Retaliation Digimon attack only unsuspended level 4 or lower Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-061", as: "myotismonHost", under: ["EX1-061"] },
          { card: "BT2-074", as: "retaliationAttacker" },
        ],
      },
      1: {
        battleArea: [
          { card: "ST1-03", as: "levelThree" },
          { card: "BT6-077", as: "levelFive" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).canAttackUnsuspended(s.perm("retaliationAttacker"))).toBe(true);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("retaliationAttacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("levelFive").permanentId },
    })).toEqual({ ok: false, reason: "illegal-target" });

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("retaliationAttacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("levelThree").permanentId },
    })).toEqual({ ok: true });
  });
});
