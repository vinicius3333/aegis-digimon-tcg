import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-070.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("EX6-070 Phantom Pain", () => {
  it("requires an armed Delay and does not double-pay its delayed deletion", () => {
    const runtime = runtimeCompiledCard("EX6-070");
    const text = JSON.stringify(runtime);
    expect(runtime).toMatchObject({ coverage: "full", residual: [] });
    expect(text).toContain("PlaceInBattleAreaSelf");
    expect(runtime?.effects?.find((entry) => entry.trigger === "EndOfOpponentsTurn")?.actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Delay" } });
    expect(runtime?.effects?.filter((entry) => entry.trigger === "Main").at(-1)).toMatchObject({ keywords: [{ keyword: "Delay" }], actions: [{ kind: "Delete", optional: true, requiresDelayArmed: true, target: { filter: { unsuspended: true } } }] });
    expect(runtime?.effects?.filter((entry) => entry.trigger === "Main").at(-1)?.actions[0]?.cost).toBeUndefined();
    expect(runtime).toEqual(compiled);
  });
});
