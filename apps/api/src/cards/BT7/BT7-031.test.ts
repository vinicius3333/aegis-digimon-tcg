import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-031.js";
import "./BT7-034.js";

describe("BT7-031 Herissmon", () => {
  it("returns itself to hand after being trashed for its host's Digi-Burst", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          // Legal yellow stack: L2 egg -> L3 Herissmon -> L4 Filmon.
            battleArea: [
              {
                card: "BT7-034",
              under: ["BT1-005", { card: "BT7-031", as: "herissmon" }],
              as: "host",
            },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("herissmon").instanceId);
    const source = (s.engine as any).cardSourceOf(s.perm("host").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT7-034/"),
    )!.effectKey;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("host").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("herissmon").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("herissmon").instanceId)).toBe(false);
    expect(s.perm("host").stack).toHaveLength(0);
  });
});
