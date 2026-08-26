import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT12-032.js";

describe("BT12-032 AncientMermaimon", () => {
  it.each([
    ["Hybrid", "BT12-024"],
    ["Aqua", "BT10-023"],
    ["Sea Animal", "BT1-033"],
  ])("may free-play a blue %s card from an owned blue Digimon's sources", async (_trait, card) => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT12-032", as: "ancient", under: [{ card, as: "candidate" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("ancient"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("candidate").instanceId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(0);
  });

  it("does not play a wrong-color Hybrid source", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT12-032", as: "ancient", under: [{ card: "BT12-012", as: "red" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("ancient"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("ancient").stack).toHaveLength(1);
  });

  it("may free-play a blue level-4 Hybrid from hand on deletion but excludes level 5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-032", as: "ancient" }],
          hand: [
            { card: "BT12-024", as: "level4" },
            { card: "BT7-024", as: "level5" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnDeletion, s.perm("ancient"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("level4").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("level5").instanceId);
  });
});
