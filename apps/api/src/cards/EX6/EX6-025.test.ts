import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-025.js";

describe("EX6-025 Sanzomon", () => {
  it("during DigiXros grants Security Attack -1 and reveals four named cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "GainKeyword",
        target: { filter: { controller: "any" } },
        keyword: { keyword: "SecurityAttack", amount: -1 },
        optional: true,
      },
      { kind: "RevealAdd", revealCount: 4, condition: { kind: "digiXrosCount", minimum: 1 }, rest: "deckBottom" },
    ]);
  });
  it("returns a yellow digivolution card when leaving play and inherits Security Attack -1", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      actions: [{ kind: "Return", to: "hand", target: { filter: { zone: "digivolutionCards", colors: ["Yellow"] } } }],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: -1 },
    });
  });
  it("publicly applies Security Attack -1 to an opposing Digimon on play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-025", as: "sanzo" }] }, 1: { battleArea: [{ card: "BT1-009", as: "opponent" }] } },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("opponent").topCard!.instanceId);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("sanzo"));
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
  });
});
