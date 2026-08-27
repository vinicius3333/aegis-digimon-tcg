import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT11-111.js";
import "./BT11-111.js";
describe("BT11-111 Galacticmon", () => {
  it("models all printed effects, including the Vemmon leave-play replacement", () => {
    expect(getCardDefinition("BT11-111")!.effectText).toContain("8 or more [Vemmon]");
    expect(compiled.effects).toHaveLength(3);
    expect(compiled.effects[0]?.actions[1]).toMatchObject({
      kind: "Delete",
      condition: { kind: "selfDigivolutionStackCountAtLeast", count: 8 },
    });
    expect(compiled.effects[1]?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          cost: {
            target: { filter: { zone: "digivolutionCards", hostFilter: { isSelfRef: true } }, from: ["digivolutionCards"] },
          },
        },
      ],
    });
  });

  it("trashes the opponent's top security at start of main", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-111", as: "galactic" }] },
      1: { security: ["BT1-001", "BT1-002"] },
    });
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("galactic"));
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });
});
