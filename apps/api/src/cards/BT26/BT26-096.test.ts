import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-096.js";
import "../index.js";

describe("BT26-096 compiled behavior", () => {
  it("maps Kosuke's memory setter, Main play, and Security clause", () => {
    expect(getCardDefinition("BT26-096")).toMatchObject({
      nameEn: "Kosuke Misono",
      colors: ["Purple"],
      kinds: ["Tamer"],
      types: ["TS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true });
    expect(compiled.effects.find((effect) => effect.trigger === "StartOfYourTurn")?.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2 },
    });
    expect(compiled.effects.find((effect) => effect.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "trash"],
      reduceCostBy: 2,
      cost: { kind: "return", to: "deckBottom" },
    });
  });

  it("publicly reaches Kosuke's start-of-turn memory floor", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-096", as: "kosuke" }], deck: ["BT1-009", "BT1-010"] },
      1: { deck: ["BT1-011", "BT1-012"] },
    });
    s.state.memory = 2;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps the Chronomon-text and TS target union exact", () => {
    const action = compiled.effects.find((effect) => effect.trigger === "Main")?.actions[0];
    expect(action).toMatchObject({ target: { filter: { kind: ["Digimon"] }, orFilters: [{ kind: ["Tamer"] }] } });
  });
});
