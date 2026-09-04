import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-028.js";

describe("EX6-028 Seraphimon", () => {
  it("has Blast Digivolve and Recovery +1 on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]?.keyword).toBe(
      "BlastDigivolve",
    );
    expect(
      compiled.effects
        ?.filter((entry) => entry.trigger === "OnPlay" || entry.trigger === "WhenDigivolving")
        .every((entry) => entry.keywords?.[0]?.keyword === "Recovery"),
    ).toBe(true);
  });
  it("returns an opposing Digimon based on your security additions once per turn", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAddSecurity",
      fireCondition: { kind: "triggerSecurityIsYours" },
      actions: [
        {
          kind: "Return",
          to: "hand",
          target: {
            filter: {
              controller: "opponent",
              levelComparison: { op: "lte", value: 0, scaling: { unit: "security", per: 1 } },
            },
          },
        },
      ],
    }));
  it("publicly recovers one card from the deck on play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX6-028", as: "sera" }], deck: [{ card: "BT1-001", as: "recovery" }], security: ["BT1-002"] } });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("sera"));
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
