import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-023.js";

describe("EX6-023 Gokuumon", () => {
  it("shares a once-per-turn DigiXros effect that grants Security Attack -1 and deletes a 6000 DP or lower Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "GainKeyword",
        optional: true,
        target: { filter: { controller: "any" } },
        keyword: { keyword: "SecurityAttack", amount: -1 },
      },
      {
        kind: "Delete",
        target: { filter: { dp: { op: "lte", value: 6000 } } },
        condition: { kind: "digiXrosCount", minimum: 1 },
      },
    ]);
  });
  it("permits exactly one listed DigiXros material", () =>
    expect(compiled.digiXrosRequirement).toMatchObject([{ count: 2, maxMaterials: 1 }]));
  it("returns a yellow Digimon source from its own stack when it would leave play", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      actions: [
        {
          kind: "Return",
          to: "hand",
          target: { filter: { colors: ["Yellow"], zone: "digivolutionCards", hostFilter: { isSelfRef: true } } },
        },
      ],
    }));
  it("publicly applies Security Attack -1 to an opposing Digimon on play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-023", as: "goku" }] }, 1: { battleArea: [{ card: "BT1-009", as: "opponent" }] } },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("opponent").topCard!.instanceId);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("goku"));
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
  });
});
