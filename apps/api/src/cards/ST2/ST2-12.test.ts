import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST2-12.js";

describe("ST2-12 Matt Ishida", () => {
  it("gains 1 memory at the start of your turn when the opponent has a source-less Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST2-12", as: "matt" }] }, 1: { battleArea: ["ST2-03"] } });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("matt"));
    expect(s.state.memory).toBe(1);
  });

  it("gains once for each copy, not once for each source-less opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-12", as: "matt1" }, { card: "ST2-12", as: "matt2" }] },
      1: { battleArea: ["ST2-03", "ST1-03"] },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("matt1"));
    expect(s.state.memory).toBe(2);
  });

  it("ignores breeding and does not gain memory when the battle-area Digimon has a source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-12", as: "matt" }] },
      1: {
        battleArea: [{ card: "ST2-06", under: ["ST2-03"] }],
        breeding: "ST2-03",
      },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("matt"));
    expect(s.state.memory).toBe(0);
  });

  it("does not gain memory when the opponent has no battle-area Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-12", as: "matt" }] },
      1: { breeding: "ST2-03" },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("matt"));
    expect(s.state.memory).toBe(0);
  });

  it("plays itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "ST2-12", as: "securityMatt", faceUp: true }] } });
    const id = s.inst("securityMatt").instanceId;
    s.state.memory = -3;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityMatt"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === id)).toBe(true);
    expect(s.state.memory).toBe(-3);
  });
});
