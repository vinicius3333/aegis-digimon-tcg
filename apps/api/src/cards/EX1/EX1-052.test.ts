import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evo").instanceId })).toEqual({ ok: true });
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
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evo").instanceId })).toEqual({ ok: true });
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
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("breedingBase").permanentId,
      instanceId: s.inst("evo").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("breedingBase").topCard.cardId === "EX1-053");
    expect(s.state.memory).toBe(2);
  });

  it("grants inherited Jamming to an Etemon-named host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-053", as: "host", under: ["EX1-052"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });
});
