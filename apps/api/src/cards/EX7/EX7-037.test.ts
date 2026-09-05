import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-037.js";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";
describe("EX7-037 SaberLeomon", () => {
  it("branches between one and two different-color NSp plays for DNA", () => {
    const action = compiled.effects?.[0]?.actions[0];
    if (action?.kind !== "ConditionalBranch") throw new Error("expected DNA conditional branch");
    expect(action).toMatchObject({
      kind: "ConditionalBranch",
      condition: { kind: "isDnaDigivolving" },
      ifTrue: [{ kind: "PlayWithoutCost", target: { count: 2 } }],
      ifFalse: [{ kind: "PlayWithoutCost", target: { count: 1 } }],
    });
    const dnaPlay = action.ifTrue[0];
    expect(dnaPlay?.kind).toBe("PlayWithoutCost");
    if (dnaPlay?.kind !== "PlayWithoutCost") throw new Error("expected DNA play action");
    expect(dnaPlay.target.filter.differentColors).toBe(true);
  });
  it("reduces an opponent by 7000 per own Digimon on digivolve and attack", () => {
    for (const effect of compiled.effects?.slice(1) ?? [])
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
    for (const effect of compiled.effects?.slice(1) ?? [])
      expect(effect.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -7000, scaling: { unit: "cards" } });
  });

  it("scales the shared once-per-turn reduction by the number of own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-037", as: "source" },
            { card: "EX7-031", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "EX7-011", as: "target", dp: 15000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.perm("target").currentDP === 1000);
    expect(s.perm("target").currentDP).toBe(1000);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    expect(s.perm("target").currentDP).toBe(1000);
  });
});
