import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-067.js";

describe("BT21-067 Garurumon", () => {
  it("preserves both alternate Digivolution requirements and residual-free coverage", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, names: ["Gabumon"], cost: 2, isAlternate: true },
      { traits: ["ADVENTURE"], cost: 2, isAlternate: true, level: 3 },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("supports security play, ADVENTURE recovery, and inherited draw-trash", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        timing: "endOfBattle",
        isSecurity: true,
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenSecurityBattleEnded",
            once: true,
            actions: [expect.objectContaining({ kind: "PlayWithoutCost", from: ["trash"], payCost: false })],
          }),
        ],
      }),
    );
    expect(
      compiled.effects.filter((entry) => entry.trigger === "OnPlay" || entry.trigger === "WhenDigivolving"),
    ).toHaveLength(2);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: expect.arrayContaining([
          expect.objectContaining({ kind: "Draw", amount: 1 }),
          expect.objectContaining({ kind: "Trash" }),
        ]),
      }),
    );
  });

  it("returns an ADVENTURE Digimon from the trash when played", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-067", as: "garurumon" }],
          trash: [{ card: "BT21-057", as: "adventure" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("adventure").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("adventure").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("adventure").instanceId)).toBe(false);
  });

  it("plays itself from security at end of battle without paying cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-032", as: "attacker", dp: 2000 }] },
      1: { security: [{ card: "BT21-067", as: "garurumon" }] },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((card) => card.topCard.instanceId === s.inst("garurumon").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("does not return a non-ADVENTURE Digimon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-067", as: "garurumon" }],
          trash: [{ card: "BT1-009", as: "other" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("garurumon"));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("other").instanceId)).toBe(true);
  });

  it("refuses both alternate routes from a level-3 that is neither Gabumon nor ADVENTURE", async () => {
    for (const alternateRequirementIndex of [0, 1] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT1-009", as: "nonMatching" }], hand: [{ card: "BT21-067", as: "garurumon" }] },
      });
      s.state.memory = 3;
      await s.ready();
      const handId = s.inst("garurumon").instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("nonMatching").permanentId,
          instanceId: handId,
          alternateRequirementIndex,
        }),
      ).toMatchObject({ ok: false });
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === handId)).toBe(true);
      expect(s.perm("nonMatching").topCard.cardId).toBe("BT1-009");
      expect(s.state.memory).toBe(3);
    }
  });

  it("alternate-digivolves from a non-Gabumon ADVENTURE rookie for the printed cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST21-10", as: "adventureRookie" }], hand: [{ card: "BT21-067", as: "garurumon" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("adventureRookie").permanentId,
        instanceId: s.inst("garurumon").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("adventureRookie").topCard.cardId === "BT21-067");
    expect(s.state.memory).toBe(1);
  });

  it("draws and trashes exactly once per turn from a realistic evolution stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-075", as: "host", under: [{ card: "BT21-067", as: "source" }] }],
          hand: [{ card: "BT1-009", as: "discard" }],
          deck: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-011", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("discard").instanceId);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(
      () =>
        s.state.players[0]!.deck.length === 1 &&
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discard").instanceId),
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("first").instanceId)).toBe(true);
  });

  it("retains inherited draw-trash through a legal Ghostmon-to-Garurumon stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-065", as: "source" }],
          hand: [
            { card: "BT21-067", as: "garurumon" },
            { card: "ST6-11", as: "host" },
            { card: "BT1-009", as: "discard" },
          ],
          deck: [
            { card: "BT1-001", as: "firstEvolutionDraw" },
            { card: "BT1-002", as: "secondEvolutionDraw" },
            { card: "BT1-010", as: "drawn" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("garurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "BT21-067");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "ST6-11");
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discard").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});
