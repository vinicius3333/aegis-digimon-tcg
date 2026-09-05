import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-024.js";
import "../index.js";

describe("EX4-024 Renamon", () => {
  it("registers its official identity and alternate Viximon evolution", () => {
    expect(getCardDefinition("EX4-024")).toMatchObject({
      cardId: "EX4-024",
      nameEn: "Renamon",
      colors: ["Yellow", "Blue"],
      level: 3,
      playCost: 4,
      dp: 2000,
      evoCosts: [
        { color: "Yellow", level: 2, memoryCost: 1 },
        { color: "Blue", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Beastkin"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Viximon"], cost: 0, isAlternate: true }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Restrict",
      restriction: "attack",
      duration: "untilOpponentTurnEnd",
      target: { filter: { controller: "opponent", dp: { op: "lte", value: 4000 } }, count: 2 },
    });
  });

  it.each([
    ["yellow", "BT1-006"],
    ["blue", "BT1-003"],
  ])("digivolves from a %s level-2 Digi-Egg for 1", async (_color, baseCard) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "EX4-024", as: "renamon" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("renamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-024");

    expect(s.state.memory).toBe(0);
  });

  it("digivolves from exact Viximon for 0", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-003", as: "viximon" }],
        hand: [{ card: "EX4-024", as: "renamon" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("viximon").permanentId,
        instanceId: s.inst("renamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("viximon").topCard.cardId === "EX4-024");

    expect(s.state.memory).toBe(0);
  });
  it("gains memory once per turn when using an Option costing at least two", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });

  it("blocks attacks at 4000 DP while leaving the 5000-DP boundary free", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX4-024", as: "renamon" }], security: ["BT1-001", "BT1-002"] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "restrictedAtBoundary", dp: 4000 },
            { card: "BT1-010", as: "secondRestricted", dp: 3000 },
            { card: "BT1-013", as: "allowed", dp: 5000 },
          ],
          security: ["BT1-090", "BT1-090"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("renamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX4-024"));

    s.state.turnSeat = 1;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("restrictedAtBoundary").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondRestricted").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("allowed").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("gains memory from one real cost-2 Option, not a cost-1 Option or a second cost-2 use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-029", as: "host", under: ["EX4-024"] }],
          hand: [
            { card: "BT1-098", as: "qualifying1" },
            { card: "BT1-096", as: "cheap" },
            { card: "BT1-098", as: "qualifying2" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
          security: 4,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    s.state.turnSeat = 0;
    await s.ready();
    const qualifying1Id = s.inst("qualifying1").instanceId;
    const cheapId = s.inst("cheap").instanceId;
    const qualifying2Id = s.inst("qualifying2").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: qualifying1Id })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === qualifying1Id));
    expect(s.state.memory).toBe(9);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: cheapId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === cheapId));
    expect(s.state.memory).toBe(8);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: qualifying2Id })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === qualifying2Id));
    expect(s.state.memory).toBe(6);
  });

  it("uses the effective Option cost boundary and still recognizes a free-use cost-7 Option", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-029", as: "host", under: ["EX4-024"] }] },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenOptionUsed", {
      usedOptionCost: 1,
      subjectPermanentId: "reduced-use-cost",
    });
    expect(s.state.memory).toBe(0);

    await advance(s.engine).fireSubTrigger("whenOptionUsed", {
      usedOptionCost: 7,
      subjectPermanentId: "free-use",
    });
    expect(s.state.memory).toBe(1);

    await advance(s.engine).fireSubTrigger("whenOptionUsed", {
      usedOptionCost: 2,
      subjectPermanentId: "second-use",
    });
    expect(s.state.memory).toBe(1);
  });
});
