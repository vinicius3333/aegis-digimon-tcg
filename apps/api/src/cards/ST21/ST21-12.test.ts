import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("ST21-12", () => {
  it("gains memory for an ADVENTURE Digimon and reduces hand play cost by suspending", () => {
    const effects = runtimeCompiledCard("ST21-12")?.effects ?? [];
    expect(effects.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({ kind: "GainMemory", amount: 1 });
    const replacement = effects.find((effect) => effect.trigger === "YourTurn")?.actions[0];
    expect(replacement).toMatchObject({ kind: "Replacement", event: "wouldBePlayed" });
    expect(replacement.actions[0]).toMatchObject({ kind: "Replacement", mode: "reduceCost", amount: 1 });
    expect(replacement.actions[0].cost.actions?.[0] ?? replacement.actions[0].cost).toBeDefined();
  });
  it("plays itself from security without cost", () => {
    expect((runtimeCompiledCard("ST21-12")?.effects ?? []).find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true });
  });

  it("gains exactly one memory only when an Adventure Digimon is present", async () => {
    const withAdventure = setupEngine({
      0: { battleArea: [{ card: "ST21-12", as: "joeMimi" }, { card: "ST21-02", as: "adventure" }] },
    });
    await advance(withAdventure.engine).fire(EffectTiming.OnStartMainPhase, withAdventure.perm("joeMimi"));
    expect(withAdventure.state.memory).toBe(1);

    const withoutAdventure = setupEngine({
      0: { battleArea: [{ card: "ST21-12", as: "joeMimi" }] },
    });
    await advance(withoutAdventure.engine).fire(EffectTiming.OnStartMainPhase, withoutAdventure.perm("joeMimi"));
    expect(withoutAdventure.state.memory).toBe(0);
  });

  it("plays itself without cost when revealed from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "ST21-12", as: "joeMimi" }] },
      1: { battleArea: [{ card: "ST1-03", as: "attacker" }], security: ["BT1-001"] },
    }, { autoOrderTriggers: true, autoAcceptOptional: true });
    s.state.turnSeat = 1;
    expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("joeMimi").instanceId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("joeMimi").instanceId)).toBe(true);
  });
});
