import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-10 Henry Wong", () => {
  it("gains 1 memory at the start of your Main Phase when the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-10", as: "henry" }] },
      1: { battleArea: [{ card: "BT1-009" }] },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("henry"));

    expect(s.state.memory).toBe(1);
  });

  it("plays itself from Security without paying its play cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "ST17-10", as: "henry", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("henry"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-10")).toBe(true);
    expect(s.state.memory).toBe(0);
  });
});
