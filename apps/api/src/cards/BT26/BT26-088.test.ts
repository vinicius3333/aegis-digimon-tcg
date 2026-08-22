import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-088.js";
import "../index.js";

describe("BT26-088 Hiroko Sagisaka", () => {
  it("compiles the conditional memory gain and Security self-play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((e) => e.trigger)).toEqual(["StartOfYourMainPhase", "Static", "Security"]);
    expect(compiled.effects[1]).toMatchObject({ actions: [{ kind: "Replacement", event: "wouldBePlayed", sourceFilter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Boss", "TS"], match: "trait" }] }, actions: [{ kind: "Replacement", mode: "reduceCost", amountChoices: [{ amount: 2 }, { amount: 1 }], cost: { kind: "suspend" } }] }] });
    expect(compiled.effects[2]).toMatchObject({ isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] });
  });
  it("gains memory at start of main only when the opponent has a Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT26-088", as: "hiroko" }] }, 1: { battleArea: [{ card: "BT1-009", as: "opponent" }] } });
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("hiroko"));
    expect(s.state.memory).toBe(2);
    const empty = setupEngine({ 0: { battleArea: [{ card: "BT26-088", as: "hiroko" }] } });
    empty.state.memory = 1;
    await advance(empty.engine).fire(EffectTiming.OnStartMainPhase, empty.perm("hiroko"));
    expect(empty.state.memory).toBe(1);
  });
  it("suspends itself to reduce a TS Digimon's play cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-088", as: "hiroko" }],
        hand: [{ card: "BT26-008", as: "kotemon" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 1;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kotemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("kotemon").instanceId));

    expect(s.state.memory).toBe(0);
    expect(s.perm("hiroko").isSuspended).toBe(true);
  });
});
