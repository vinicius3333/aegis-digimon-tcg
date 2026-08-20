import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-019.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("EX9-019", () => {
  it("prevents an opposing Digimon or Tamer from suspending on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" });
  });
  it("during your turn digivolves into Garurumon after Greymon/Matt or another Greymon digivolves", () => expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions).toMatchObject([{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "Digivolve", payCost: false }] }, { kind: "SubTrigger", event: "whenOneOfYoursDigivolves", actions: [{ kind: "Digivolve", payCost: false }] }]));

  it("records the opponent's suspend restriction on play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-019", as: "source" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    }, { autoSelectCards: true, autoOrderTriggers: true });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    const continuous = s.engine as unknown as { continuous: { hasRestriction(id: string, restriction: string): boolean } };
    expect(continuous.continuous.hasRestriction(s.perm("target").permanentId, "suspend")).toBe(true);
  });
});
