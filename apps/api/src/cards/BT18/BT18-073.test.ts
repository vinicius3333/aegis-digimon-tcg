import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-073.js";

describe("BT18-073 Machinedramon", () => {
  it("de-digivolves all opponent Digimon and keeps the Composite play reduction", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-073", as: "machine" }] },
        1: {
          battleArea: [
            { card: "BT1-060", as: "first", under: ["BT1-030"] },
            { card: "BT1-060", as: "second", under: ["BT1-032"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.OnPlay, s.perm("machine").topCard!);
    await s.ready();
    expect(s.perm("first").stack).toHaveLength(0);
    expect(s.perm("second").stack).toHaveLength(0);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "Replacement", event: "wouldBePlayed" }],
    });
    expect(compiled.effects[4]).toMatchObject({ trigger: "Rule", actions: [{ kind: "GrantStatic" }] });
  });
});
