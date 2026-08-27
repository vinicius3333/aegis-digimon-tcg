import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-049.js";

describe("BT8-049 Namakemon", () => {
  it("suspends to reveal 3 and add a green Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-049", as: "namakemon" }],
          deck: [{ card: "BT8-053", as: "green" }, "BT8-033", "BT8-034"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const source = (s.engine as any).cardSourceOf(s.perm("namakemon").topCard);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source)[0]!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("namakemon").topCard.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("green").instanceId));
    expect(s.perm("namakemon").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("namakemon").topCard.instanceId,
        effectKey,
      }),
    ).not.toEqual({ ok: true });
  });
});
