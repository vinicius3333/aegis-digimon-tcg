import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-022.js";

describe("EX6-022 Angewomon", () => {
  it("has Barrier and reduces one opposing Digimon's Security Attack when Mirei is present", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Barrier");
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: -2 },
      condition: { kind: "youHave" },
    });
  });
  it("plays Mirei from hand only when none is already present and inherits Alliance conditionally", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      condition: { kind: "youHaveNone" },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [
        {
          kind: "Aura",
          effect: { kind: "keyword", keyword: { keyword: "Alliance" } },
          while: { kind: "selfHasTrait" },
        },
      ],
    });
  });

  it("reduces one opposing Digimon's Security Attack by 2 when Mirei is present", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-094", as: "mirei" }], hand: [{ card: "EX6-022", as: "ange" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ange").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack") === -2);
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-2);
  });

  it("publicly plays Mirei from hand when the controller has none", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-022", as: "ange" }], hand: [{ card: "BT11-094", as: "mirei" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("ange"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("mirei").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("mirei").instanceId)).toBe(
      true,
    );
  });
});
