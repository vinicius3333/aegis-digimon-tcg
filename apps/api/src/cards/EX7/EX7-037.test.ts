import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-037.js";
describe("EX7-037 SaberLeomon", () => {
  it("branches between one and two different-color NSp plays for DNA", () => {
    const action = compiled.effects?.[0]?.actions[0] as any;
    expect(action).toMatchObject({
      kind: "ConditionalBranch",
      condition: { kind: "isDnaDigivolving" },
      ifTrue: [{ kind: "PlayWithoutCost", target: { count: 2 } }],
      ifFalse: [{ kind: "PlayWithoutCost", target: { count: 1 } }],
    });
    expect(action.ifTrue[0].target.filter.differentColors).toBe(true);
  });
  it("reduces an opponent by 7000 per own Digimon on digivolve and attack", () => {
    for (const effect of compiled.effects?.slice(1) ?? [])
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
    for (const effect of compiled.effects?.slice(1) ?? [])
      expect(effect.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -7000, scaling: { unit: "cards" } });
  });
});
