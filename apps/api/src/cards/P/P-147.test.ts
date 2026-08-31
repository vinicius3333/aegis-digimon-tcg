import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-147.js";

describe("P-147 Pal", () => {
  it("encodes the mandatory When Digivolving reactivation after placing a Pulsemon-text level 4", () => {
    const compiled = runtimeCompiledCard("P-147")!;
    const attacking = compiled.effects.find((effect) => effect.trigger === "WhenAttacking");
    expect(attacking).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ReactivateEffect",
          fromTrigger: "WhenDigivolving",
          count: 1,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            destination: "digivolutionStack",
            position: "bottom",
            target: { filter: { zone: "hand", levels: [4], nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] } },
          },
        },
      ],
    });
  });

  it("encodes Tamer DP and the Pulsemon Rule name", () => {
    const compiled = runtimeCompiledCard("P-147")!;
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "YourTurn",
          actions: [
            expect.objectContaining({
              kind: "Aura",
              effect: { kind: "modifyDP", amount: 3000 },
              while: expect.objectContaining({ kind: "youHave" }),
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "Rule",
          actions: [expect.objectContaining({ kind: "GrantStatic", grant: "name", tokens: ["Pulsemon"] })],
        }),
      ]),
    );
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Bibimon"], cost: 0, isAlternate: true }]);
  });

  it("gets +3000 DP on your turn while you have a Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-147", as: "pal" },
          { card: "BT1-085", as: "tamer" },
        ],
      },
    });
    const base = s.perm("pal").baseDP;
    await s.ready();
    expect(s.perm("pal").currentDP).toBe(base + 3000);
  });

  it("places a level-4 Pulsemon-text card and reactivates its When Digivolving effect on attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-147", as: "pal" }],
          hand: [{ card: "P-150", as: "pulse" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("pal").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("pal").stack.some((card) => card.instanceId === s.inst("pulse").instanceId)).toBe(true);
  });
});
