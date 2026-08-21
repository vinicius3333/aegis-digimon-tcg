import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-014.js";

describe("BT18-014 Gigasmon", () => {
  it("grants Rush to one of your Digimon on play", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "GainKeyword", keyword: { keyword: "Rush" }, duration: "forTheTurn", target: { filter: { controller: "mine", kind: ["Digimon"] } } }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects[2]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn" });
    const s = setupEngine({ 0: { hand: [{ card: "BT18-014", as: "gigasmon" }] } }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gigasmon").instanceId })).toEqual({ ok: true });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.state.players[0]!.battleArea[0]!);
    expect(observe(s.engine).hasKeyword(s.state.players[0]!.battleArea[0]!, "Rush")).toBe(true);
  });
});
