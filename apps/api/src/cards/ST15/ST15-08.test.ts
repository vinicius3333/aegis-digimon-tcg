import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST15-08.js";

describe("ST15-08 Greymon security effect", () => {
  it("can play an Agumon Digimon from hand, not only a Tai Tamer", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "ST15-08", as: "greymon", faceUp: true }],
        hand: [{ card: "BT1-010", as: "agumon" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("greymon"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("agumon").instanceId)).toBe(true);
  });
});
