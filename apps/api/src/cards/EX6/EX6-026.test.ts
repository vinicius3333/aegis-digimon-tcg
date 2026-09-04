import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-026.js";

describe("EX6-026 Cho-Hakkaimon", () => {
  it("grants Security Attack -1, DigiXros DP/Blocker, and inherits Security Attack -1", () => {
    const onPlayActions = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions;
    expect(onPlayActions).toMatchObject([
      {
        kind: "GainKeyword",
        optional: true,
        target: { filter: { controller: "any" } },
        keyword: { keyword: "SecurityAttack", amount: -1 },
      },
      { kind: "ModifyDP", amount: 3000, condition: { kind: "digiXrosCount" } },
      { kind: "GainKeyword", keyword: { keyword: "Blocker" }, condition: { kind: "digiXrosCount" } },
    ]);
    expect(onPlayActions?.[2]).not.toHaveProperty("optional");
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: -1 },
    });
  });
  it("permits exactly one listed DigiXros material", () =>
    expect(compiled.digiXrosRequirement).toMatchObject([{ count: 2, maxMaterials: 1 }]));
  it("returns a yellow evolution card to hand when it would leave play", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      actions: [
        {
          kind: "Return",
          to: "hand",
          target: { filter: { zone: "digivolutionCards", colors: ["Yellow"], hostFilter: { isSelfRef: true } } },
        },
      ],
    }));
  it("publicly applies Security Attack -1 to an opposing Digimon on play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-026", as: "cho" }] }, 1: { battleArea: [{ card: "BT1-009", as: "opponent" }] } },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("opponent").topCard!.instanceId);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("cho"));
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
  });

  it("publicly executes the DigiXros self DP and Blocker tail", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX6-026", as: "cho" }, { card: "EX6-025", as: "material" }] }, 1: { battleArea: [{ card: "EX6-031", as: "opponent" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cho").instanceId, digiXros: { materialInstanceIds: [s.inst("material").instanceId] } } as never)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-026"));
    const host = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "EX6-026");
    expect(host?.stack.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(true);
    expect(host?.currentDP).toBe(10000);
    expect(host && observe(s.engine).hasKeyword(host, "Blocker")).toBe(true);
  });
});
