import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT4/BT4-072.js";
import "./EX1-052.js";

describe("EX1-052 Etemon", () => {
  it("reduces the cost when this Etemon digivolves into another Etemon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-052", as: "base" }],
        hand: [{ card: "EX1-053", as: "evo" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-053" && s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });

  it("does not grant the discount while Etemon is merely the card in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-047", as: "base" }],
        hand: [{ card: "EX1-052", as: "evo" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-052" && s.state.memory === 2);
    expect(s.state.memory).toBe(2);
  });

  it("does not reduce a matching digivolution from the breeding area", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX1-052", as: "breedingBase" },
        hand: [{ card: "EX1-053", as: "evo" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("breedingBase").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("breedingBase").topCard.cardId === "EX1-053");
    expect(s.state.memory).toBe(2);
  });

  it("does not reduce an Etemon digivolution on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-052", as: "etemon" }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT4-072", as: "base" }],
          hand: [{ card: "EX1-053", as: "evo" }, "BT1-009"],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 1);
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-053");
    expect(s.state.memory).toBe(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("grants inherited Jamming to an Etemon-named host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-053", as: "host", under: ["EX1-052"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });

  it("does not grant inherited Jamming to a non-Etemon host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-054", as: "host", under: ["EX1-052"] }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);
  });

  it("expires inherited Jamming when the opponent's turn begins", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["BT1-009"],
          battleArea: [{ card: "EX1-053", as: "host", under: ["EX1-052", "EX1-047"] }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-010", "BT1-011"] },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
