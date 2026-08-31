import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-014.js";
import "../index.js";

describe("BT16-014", () => {
  it("has Raid and may play God Flame or a Four Great Dragons Option on digivolving or attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Raid" }] });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "PlayWithoutCost", payCost: false, optional: true, ignorePlayCostLimit: true }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "PlayWithoutCost", payCost: false, optional: true, ignorePlayCostLimit: true }],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Goldramon"], cost: 2, isAlternate: true }]);
  });
  it("grants Goldramon-related effects on all turns", () =>
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "GrantStatic", grant: "effects" }],
    }));

  it("uses God Flame from hand without cost on a natural Goldramon evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-035", as: "base" }],
          hand: [
            { card: "BT16-014", as: "goldramonX" },
            { card: "EX3-068", as: "godFlame" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("goldramonX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("godFlame").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("godFlame").instanceId)).toBe(true);
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("uses the cost-8 Trial of the Four Great Dragons without an implicit cost ceiling", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-035", as: "base" }],
          hand: [
            { card: "BT16-014", as: "goldramonX" },
            { card: "EX3-069", as: "trial" },
          ],
          deck: [
            { card: "BT1-001", as: "drawn" },
            { card: "BT1-002", as: "remaining" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("goldramonX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-069"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("EX3-069");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("trial").instanceId);
    assertNoLoudGap(s);
  });

  it("uses God Flame from hand without cost on a natural attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-014", as: "goldramon" }], hand: [{ card: "EX3-068", as: "godFlame" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("goldramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("godFlame").instanceId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
  });

  it("gains a Goldramon source's When Attacking effect on a legal stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-035", as: "base" }],
          hand: [{ card: "BT16-014", as: "goldramonX" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target", dp: 10000 },
            { card: "BT1-010", as: "raidTarget", dp: 20000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("target").instanceId);
    s.state.memory = 2;
    await s.ready();
    const targetId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("goldramonX").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT16-014");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]!.battleArea.find((permanent) => permanent.permanentId === targetId)?.currentDP === 4000,
    );

    expect(s.state.players[1]!.battleArea.find((permanent) => permanent.permanentId === targetId)?.currentDP).toBe(
      4000,
    );
  });
});
