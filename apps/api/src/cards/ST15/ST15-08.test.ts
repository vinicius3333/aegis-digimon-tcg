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

  it("can play a Tai Kamiya Tamer from hand and does not require an Agumon target", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "ST15-08", as: "greymon", faceUp: true }],
        hand: [{ card: "BT1-085", as: "tai" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("greymon"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("tai").instanceId)).toBe(true);
  });

  it("grants its inherited memory only once when any attack target switches", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST15-12", as: "host", under: ["BT1-009", "ST15-08"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", { attackerPermanentId: s.perm("opponent").permanentId });
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", { attackerPermanentId: s.perm("opponent").permanentId });

    expect(s.state.memory).toBe(1);
  });
});
