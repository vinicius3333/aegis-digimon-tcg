import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-012.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("EX9-012", () => {
  it("deletes an opposing Digimon up to 8000 DP on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Delete", target: { count: 1, filter: { dp: { op: "lte", value: 8000 } } } });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "Delete", target: { count: 1, filter: { dp: { op: "lte", value: 8000 } } } });
  });
  it("during your turn digivolves into Greymon after Garurumon/Tai and into Greymon after another Garurumon digivolves", () => expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions).toMatchObject([{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "Digivolve", payCost: false }] }, { kind: "SubTrigger", event: "whenOneOfYoursDigivolves", actions: [{ kind: "Digivolve", payCost: false }] }]));

  it("deletes an opposing Digimon at the printed 8000 DP boundary on play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-012", as: "source" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 8000 }] },
    }, { autoSelectCards: true, autoOrderTriggers: true });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
