import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./P-147.js";
import "../BT16/BT16-043.js";

describe("P-147 Pal", () => {
  it("encodes the mandatory When Digivolving reactivation after placing a Pulsemon-text level 4", () => {
    const compiled = runtimeCompiledCard("P-147")!;
    const attacking = compiled.effects.find((effect) => effect.trigger === "WhenAttacking");
    expect(attacking).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ActivateForeignEffect",
          zone: "digivolutionCards",
          fromTriggers: ["WhenDigivolving"],
          lastPlacedOnly: true,
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
    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("activates only the newly placed card, not an older matching stack card", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          // An earlier P-147 placement can leave another level-4 card underneath.
          // BT16-043 would also gain memory; only the new P-150 may activate.
          battleArea: [{ card: "P-147", as: "pal", under: [{ card: "BT16-043", as: "oldPulse" }] }],
          hand: [{ card: "P-150", as: "newPulse" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstOpponent" },
            { card: "BT1-009", as: "secondOpponent" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("oldPulse").instanceId);
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("pal").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("firstOpponent").isSuspended).toBe(true);
    expect(s.perm("secondOpponent").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.memory).toBe(0);
  });

  it("keeps hand, stack, and targets unchanged when the optional placement is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-147", as: "pal" }],
          hand: [{ card: "P-150", as: "pulse" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
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
    expect(s.perm("pal").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("pulse").instanceId)).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(false);
  });

  it("does not resolve the optional placement a second time in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-147", as: "pal" }],
          hand: [
            { card: "P-150", as: "firstPulse" },
            { card: "P-150", as: "secondPulse" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack" as const,
        attackerPermanentId: s.perm("pal").permanentId,
        target: { kind: "player" as const },
      });
    expect(attack()).toEqual({ ok: true });
    await settle();
    await advance(s.engine).verb.unsuspend([s.perm("pal").permanentId]);
    expect(attack()).toEqual({ ok: true });
    await settle();
    expect(s.perm("pal").stack).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("secondPulse").instanceId)).toBe(true);
  });
});
