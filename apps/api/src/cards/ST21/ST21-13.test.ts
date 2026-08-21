import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
describe("ST21-13", () => {
  it("reduces ADVENTURE Digimon hand play cost by suspending this Tamer", () => {
    const reduction = (runtimeCompiledCard("ST21-13")?.effects ?? [])[0];
    expect(reduction).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "Replacement", event: "wouldBePlayed" }] });
    expect(reduction.actions[0].actions[0]).toMatchObject({ kind: "Replacement", mode: "reduceCost", amount: 1 });
  });
  it("grants Rush to level 5+ ADVENTURE Digimon and has a security play effect", () => {
    const effects = runtimeCompiledCard("ST21-13")?.effects ?? [];
    expect(effects[1]).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "GainKeyword", keyword: { keyword: "Rush" } }] });
    expect(effects.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true });
  });

  it("plays itself without cost when revealed from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "ST21-13", as: "mattTk" }] },
      1: { battleArea: [{ card: "ST1-03", as: "attacker" }], security: ["BT1-001"] },
    }, { autoAcceptOptional: true, autoOrderTriggers: true });
    s.state.turnSeat = 1;
    expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("mattTk").instanceId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("mattTk").instanceId)).toBe(true);
  });

  it("grants Rush only to level 5 or higher Adventure Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [
        { card: "ST21-13", as: "mattTk" },
        { card: "ST21-11", as: "level5Adventure" },
        { card: "ST21-08", as: "level4Adventure" },
      ] },
    });
    await s.ready();
    await settle(() => observe(s.engine).hasKeyword(s.perm("level5Adventure"), "Rush"));
    expect(observe(s.engine).hasKeyword(s.perm("level5Adventure"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("level4Adventure"), "Rush")).toBe(false);
  });
});
