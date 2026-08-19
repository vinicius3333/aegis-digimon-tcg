import { describe, expect, it } from "vitest";
import { CardKind, EffectTiming } from "@aegis/shared";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "../index.js";

describe("BT21-096 The Champion Ultimate Fighter!", () => {
  it("turns a Marcus Damon into a 12000 DP Rush Digimon and starts its Digimon attack", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "color" },
            { card: "BT2-033", as: "yellow" },
            { card: "BT4-092", as: "marcus" },
          ],
          hand: [{ card: "BT21-096", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("marcus").currentDP === 12000);

    expect(s.perm("marcus").currentDP).toBe(12000);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("targets the chosen Marcus permanent and carries the temporary Digimon grants", () => {
    const module = getEffectModule("BT21-096");
    expect(module).toBeDefined();
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, {} as never)).toHaveLength(1);
    expect(CardKind.Digimon).toBeDefined();
  });
});
