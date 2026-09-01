import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-099.js";

describe("BT13-099 Spencer Damon", () => {
  it("debuffs one opposing Digimon when one of your yellow Digimon becomes suspended", () => {
    const watcher = compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0] as {
      actions?: unknown[];
    };
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { controller: "mine", kind: ["Digimon"], colors: ["Yellow"] },
    });
    expect(watcher.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -1000,
      duration: "untilOpponentTurnEnd",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
  });

  it("becomes a 3000 DP Blocker Digimon through the opponent's turn at six or fewer total security", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(effect).toMatchObject({ frequency: "OncePerTurn" });
    expect(effect?.actions?.some((action) => (action as { kind?: string }).kind === "GrantStatic")).toBe(true);
    expect(effect?.actions?.find((action) => (action as { kind?: string }).kind === "GrantStatic")).toMatchObject({
      grant: "kinds",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      tokens: ["Digimon"],
      staticEffect: { kind: "SetBaseDP", value: 3000 },
      duration: "untilOpponentTurnEnd",
    });
    expect(effect?.actions?.find((action) => (action as { kind?: string }).kind === "Restrict")).toMatchObject({
      restriction: "digivolve",
      duration: "untilOpponentTurnEnd",
    });
    expect(effect?.actions?.find((action) => (action as { kind?: string }).kind === "GainKeyword")).toMatchObject({
      keyword: expect.objectContaining({ keyword: "Blocker" }),
      duration: "untilOpponentTurnEnd",
    });
    for (const action of effect?.actions ?? [])
      expect(action).toMatchObject({ condition: { kind: "totalSecurityCount", op: "lte", value: 6 } });
  });

  it("becomes a live 3000 DP Blocker when the end-of-turn condition is met", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-099", as: "spencer" }] } });
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("spencer"));
    await s.engine.recomputeContinuousEffects();
    await settle();
    expect(observe(s.engine).hasKeyword(s.perm("spencer"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("spencer"), "digivolve")).toBe(true);
  });

  it("gains the temporary Digimon and Blocker status through a real turn end", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-099", as: "spencer" }] } });
    await advance(s.engine).runTurn(0);
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("spencer"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("spencer"), "digivolve")).toBe(true);
  });
});
