import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX8-044.js";

describe("EX8-044", () => {
  it("has Blast Digivolve and may suspend up to 3 Digimon, gaining memory for suspended opposing Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]).toMatchObject({ keyword: "BlastDigivolve" });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "Suspend", optional: true, target: { count: 3, upTo: true } }, { kind: "GainMemory", amount: 1, scaling: { per: 1 } }]);
  });
  it("inherits a once-per-turn effect when suspended that grants Piercing and +3000 DP", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenSuspended", actions: [{ kind: "GainKeyword", keyword: { keyword: "Piercing" } }, { kind: "ModifyDP", amount: 3000 }] }));

  it("gains memory only for the opposing Digimon newly suspended by this effect", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX8-044", as: "hercules" }] },
      1: { battleArea: [{ card: "EX8-043", as: "alreadySuspended", suspended: true }, { card: "EX8-043", as: "freshOpponent" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hercules").instanceId })).toEqual({ ok: true });
    await settle(() => player.battleArea.some((p) => p.topCard?.cardId === "EX8-044") && s.state.memory === 5);

    expect(s.state.memory).toBe(5); // 10 - 6 play cost + 1 newly suspended opponent.
    expect(s.perm("alreadySuspended").isSuspended).toBe(true);
    expect(s.perm("freshOpponent").isSuspended).toBe(true);
  });
  it("grants Piercing and +3000 DP when it becomes suspended", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-044", as: "hercules" }, { card: "AD1-001", as: "ally" }] } }, { autoSelectCards: true });
    await advance(s.engine).verb.suspend([s.perm("hercules").permanentId]);
    await settle(() => observe(s.engine).hasPierce(s.perm("hercules")));
    expect(observe(s.engine).hasPierce(s.perm("hercules"))).toBe(true);
    expect(s.perm("hercules").currentDP).toBe(14000);
  });
});
