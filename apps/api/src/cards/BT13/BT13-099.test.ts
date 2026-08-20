import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-099.js";

describe("BT13-099 Spencer Damon", () => {
  it("debuffs one opposing Digimon when one of your yellow Digimon becomes suspended", () => {
    const watcher = compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0] as { actions?: unknown[] };
    expect(watcher).toMatchObject({ kind: "SubTrigger", event: "whenSuspended", sourceFilter: { controller: "mine", kind: ["Digimon"], colors: ["Yellow"] } });
    expect(watcher.actions?.[0]).toMatchObject({ kind: "ModifyDP", amount: -1000, duration: "untilOpponentTurnEnd", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } });
  });

  it("becomes a 3000 DP Blocker Digimon through the opponent's turn at six or fewer total security", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(effect).toMatchObject({ frequency: "OncePerTurn" });
    expect(effect?.actions?.some((action) => (action as { kind?: string }).kind === "GrantStatic")).toBe(true);
    expect(effect?.actions?.find((action) => (action as { kind?: string }).kind === "GrantStatic")).toMatchObject({ grant: "kind", tokens: ["Digimon"], staticEffect: { kind: "SetBaseDP", value: 3000 }, duration: "untilOpponentTurnEnd" });
    expect(effect?.actions?.find((action) => (action as { kind?: string }).kind === "Restrict")).toMatchObject({ restriction: "digivolve", duration: "untilOpponentTurnEnd" });
    expect(effect?.actions?.find((action) => (action as { kind?: string }).kind === "GainKeyword")).toMatchObject({ keyword: expect.objectContaining({ keyword: "Blocker" }), duration: "untilOpponentTurnEnd" });
    for (const action of effect?.actions ?? []) expect(action).toMatchObject({ condition: { kind: "totalSecurityCount", op: "lte", value: 6 } });
  });
});
