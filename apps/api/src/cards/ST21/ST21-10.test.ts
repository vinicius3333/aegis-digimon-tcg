import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
describe("ST21-10", () => {
  it("requires either the 10000 DP opponent threshold or three Tamer colors", () => {
    const effect = (runtimeCompiledCard("ST21-10")?.effects ?? []).find(
      (candidate) => candidate.trigger === "YourTurn",
    );
    const action = effect?.actions[0];
    expect(action).toMatchObject({ kind: "Digivolve", payCost: true, from: ["hand"] });
    expect(action.into.nameOrTrait).toEqual([{ tokens: ["MetalGarurumon"], match: "name" }]);
    expect(action.condition).toMatchObject({ kind: "orConditions" });
    expect(action.condition.conditions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "opponentHas" }),
        expect.objectContaining({ kind: "zoneColorCount", value: 3 }),
      ]),
    );
  });

  it("draws one then trashes one from hand once per turn as inherited behavior", () => {
    const effect = (runtimeCompiledCard("ST21-10")?.effects ?? []).find(
      (candidate) => candidate.trigger === "WhenAttacking",
    );
    expect(effect).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    expect(effect?.actions).toEqual([
      expect.objectContaining({ kind: "Draw", amount: 1 }),
      expect.objectContaining({
        kind: "Trash",
        target: expect.objectContaining({ filter: expect.objectContaining({ zone: "hand" }) }),
      }),
    ]);
  });

  it("executes inherited draw-then-trash behavior when the stack attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST21-11", as: "attacker", under: ["ST21-10"] }],
          hand: [{ card: "BT1-001", as: "discard" }],
          deck: [{ card: "BT1-002", as: "drawn" }],
        },
        1: { security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const handBefore = s.state.players[0]!.hand.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discard").instanceId));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("discard").instanceId);
    expect(s.state.players[0]!.hand.length).toBe(handBefore);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("exposes and resolves the Your Turn digivolution when the opponent has 10000 DP or more", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST21-10", as: "gabumon" }], hand: [{ card: "ST21-11", as: "metal" }] },
        1: { battleArea: [{ card: "ST21-11", as: "opponentMetal", dp: 12000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    const source = s.perm("gabumon");
    const [effect] = observe(s.engine).activatableEffects(source) as { effectKey: string; description: string }[];
    expect(effect).toBeDefined();
    expect(effect.description).toContain("MetalGarurumon");
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: source.topCard!.instanceId,
        effectKey: effect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "ST21-11")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "ST21-11")).toBe(false);
  });

  it("does not expose the Your Turn digivolution without either qualifying branch", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST21-10", as: "gabumon" }], hand: [{ card: "ST21-11", as: "metal" }] },
      1: { battleArea: [{ card: "ST1-03", as: "opponentRookie" }] },
    });
    expect(observe(s.engine).activatableEffects(s.perm("gabumon"))).toEqual([]);
  });
});
