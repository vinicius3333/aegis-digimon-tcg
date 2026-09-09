import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-057.js";
import "../index.js";

describe("EX7-057 Loudmon", () => {
  it("matches the catalog and fully registered IR", () => {
    expect(getCardDefinition("EX7-057")).toMatchObject({
      cardId: "EX7-057",
      nameEn: "Loudmon",
      colors: ["Purple", "Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 4 },
        { color: "Red", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Cyborg", "LIBERATOR", "Dark Dragon"],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions).toMatchObject([
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 2 } },
        { kind: "Delete", target: { count: 1, filter: { controller: "opponent", dp: { op: "lte", value: 7000 } } } },
      ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "trait",
      tokens: ["Dark Dragon"],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "Aura",
      target: { count: "all" },
      effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
      while: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 4 },
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, traits: ["Dark Dragon", "Evil Dragon"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-057")).toBe(true);
  });

  it("publicly plays, trashes exactly two, and deletes only the 7000-DP target", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-057", as: "loud" },
            { card: "BT1-009", as: "cost1" },
            { card: "BT1-010", as: "cost2" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "ceiling", dp: 7000 },
            { card: "BT1-010", as: "over", dp: 8000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("loud").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("ceiling").instanceId,
        ),
    );
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("cost1").instanceId, s.inst("cost2").instanceId]),
    );
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("over").instanceId,
    ]);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("loud"), "Dark Dragon")).toBe(true);
  });

  it("publicly uses the Dark Dragon route for 3 and resolves the same evolution effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-053", as: "base" }],
          hand: [
            { card: "EX7-057", as: "loud" },
            { card: "BT1-009", as: "cost1" },
            { card: "BT1-010", as: "cost2" },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 7000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const sourceId = s.perm("base").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("loud").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-009"));
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("cost1").instanceId, s.inst("cost2").instanceId]),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it.each([
    ["BT11-079", true, 3],
    ["BT1-015", false, 4],
  ])("evolves from %s with alternate=%s for exactly %i", async (base, useAlternateCost, expectedCost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [
            { card: "EX7-057", as: "loud" },
            { card: "BT1-009", as: "cost1" },
            { card: "BT1-010", as: "cost2" },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 7000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const sourceId = s.perm("base").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("loud").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("target").instanceId,
        ),
    );
    expect(s.state.memory).toBe(5 - expectedCost);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("uses the inherited aura for two Security checks at four cards and only matching traits", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX7-055", as: "host", under: ["EX7-057"] },
          { card: "BT1-015", as: "nonmatch" },
        ],
        hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
      1: { security: ["BT1-009", "BT1-010", "BT1-011"] },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("nonmatch"), "SecurityAttack")).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not grant the inherited extra check at five hand cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-055", as: "host", under: ["EX7-057"] }],
        hand: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
      },
      1: { security: ["BT1-009", "BT1-010", "BT1-011"] },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });
});
