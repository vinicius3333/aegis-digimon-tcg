import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-197.js";

describe("P-197 Patamon", () => {
  it("encodes free Angel or TS hand digivolution at four or less memory", () => {
    expect(
      runtimeCompiledCard("P-197")!.effects.find((effect) => effect.trigger === "StartOfYourMainPhase"),
    ).toMatchObject({
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: false,
          optional: true,
          condition: { kind: "memoryAtMost", value: 4, controller: "mine" },
          into: { nameOrTrait: [{ tokens: ["Angel", "TS"], match: "trait" }] },
        },
      ],
    });
  });

  it("has the TS evolution requirement and inherited once-per-turn -2000 DP attack effect", () => {
    const card = runtimeCompiledCard("P-197")!;
    expect(card.digivolutionRequirement).toEqual([{ level: 2, traits: ["TS"], cost: 0, isAlternate: true }]);
    expect(card.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
        },
      ],
    });
  });

  it("reduces an opposing Digimon by 2000 when its inherited host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["P-197"] }] },
      1: { security: 1, battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("free-digivolves into a qualifying Angel/TS card at the four-memory boundary", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-197", as: "patamon" }], hand: [{ card: "P-194", as: "aegio" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("patamon"));
    await settle(() => s.perm("patamon").topCard.instanceId === s.inst("aegio").instanceId);
    expect(s.perm("patamon").topCard.instanceId).toBe(s.inst("aegio").instanceId);
    expect(s.state.memory).toBe(4);
  });
});
