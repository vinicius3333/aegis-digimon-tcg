import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-063.js";

describe("EX6-063 T.K. Takaishi & Kari Kamiya", () => {
  it("exposes complete IR for Barrier, Angel, and Security clauses", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toHaveLength(4);
    expect(compiled.effects.filter((effect) => effect.trigger === "OnPlay")).toHaveLength(1);
    expect(compiled.effects.filter((effect) => effect.trigger === "StartOfYourMainPhase")).toHaveLength(1);
    expect(compiled.effects.filter((effect) => effect.trigger === "YourTurn")).toHaveLength(1);
    expect(compiled.effects.filter((effect) => effect.trigger === "Security")).toHaveLength(1);
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      actions: [{ kind: "GainMemory", condition: { kind: "triggerSubjectMatchesFilter" } }],
    });
  });
  it("publicly grants Barrier to one of its controller's yellow Digimon on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-063", as: "tamer" },
            { card: "BT1-053", as: "yellow" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("tamer"));
    expect(observe(s.engine).hasKeyword(s.perm("yellow"), "Barrier")).toBe(true);
  });
});
