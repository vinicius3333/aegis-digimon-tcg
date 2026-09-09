import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-021.js";
import "./index.js";

function labramonPermanent(s: EngineSetup) {
  return s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT17-021")!;
}

describe("BT17-021 Labramon", () => {
  it("matches every catalog field and carries both printed clauses in IR", () => {
    expect(getCardDefinition("BT17-021")).toMatchObject({
      cardId: "BT17-021",
      nameEn: "Labramon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Beast"],
      effectText:
        "[On Play] By placing 1 [Seasarmon] or 1 level 3 blue Digimon card from your hand as this Digimon's bottom digivolution card, ＜Draw 1＞.",
      inheritedEffectText: "[When Attacking] [Once Per Turn] If this Digimon has ＜Jamming＞, gain 1 memory.",
    });
    expect(compiled.effects).toEqual([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "Draw",
            controller: "mine",
            amount: 1,
            cost: {
              kind: "place",
              target: {
                filter: {
                  zone: "hand",
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Seasarmon"], match: "name" }],
                  orFilters: [{ zone: "hand", controller: "mine", kind: ["Digimon"], colors: ["Blue"], levels: [3] }],
                },
                count: 1,
                from: ["hand"],
              },
              raw: "By placing 1 [Seasarmon] or 1 level 3 blue Digimon card from your hand as this Digimon's bottom digivolution card",
              destination: "digivolutionStack",
              position: "bottom",
              host: "self",
            },
            optional: true,
            abortOnDecline: true,
          },
        ],
      },
      {
        trigger: "WhenAttacking",
        actions: [
          {
            kind: "GainMemory",
            amount: 1,
            condition: { kind: "selfHasKeyword", keyword: "Jamming", raw: "this Digimon has ＜Jamming＞" },
          },
        ],
        isInherited: true,
        frequency: "OncePerTurn",
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it.each([
    ["the named [Seasarmon] branch", "BT17-024"],
    ["the level 3 blue branch", "BT1-028"],
  ])("places %s from hand as its bottom digivolution card and draws 1", async (_branch, material) => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-021", as: "labramon" },
            { card: material, as: "material" },
          ],
          deck: [
            { card: "BT1-009", as: "drawn" },
            { card: "BT1-013", as: "kept" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const materialId = s.inst("material").instanceId;
    const drawnId = s.inst("drawn").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("labramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));

    const labramon = labramonPermanent(s);
    expect(labramon.stack.map((card) => card.instanceId)).toEqual([materialId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([drawnId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("kept").instanceId]);
    // Play cost 3 only; the placement is a cost paid in cards, not memory.
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("offers only the [Seasarmon] and level 3 blue cards as placement candidates", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-021", as: "labramon" },
            { card: "BT17-024", as: "seasarmon" },
            { card: "BT1-028", as: "blueLv3" },
            { card: "BT1-009", as: "redLv3" },
            { card: "BT2-024", as: "blueLv4" },
          ],
          deck: [{ card: "BT1-013", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("labramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));

    const candidates = s.decisions.find(({ req }) => req.kind === "selectCards")!.req.options!.candidateInstanceIds!;
    expect(candidates).toEqual(expect.arrayContaining([s.inst("seasarmon").instanceId, s.inst("blueLv3").instanceId]));
    expect(candidates).not.toContain(s.inst("redLv3").instanceId);
    expect(candidates).not.toContain(s.inst("blueLv4").instanceId);
  });

  it("plays without drawing when the hand holds no legal placement source", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-021", as: "labramon" },
            { card: "BT1-009", as: "redLv3" },
            { card: "BT2-024", as: "blueLv4" },
          ],
          deck: [{ card: "BT1-013", as: "top" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await settle();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("labramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => labramonPermanent(s) !== undefined);
    await settle();

    expect(labramonPermanent(s).stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("redLv3").instanceId,
      s.inst("blueLv4").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("top").instanceId]);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("neither places nor draws when the optional effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-021", as: "labramon" },
            { card: "BT17-024", as: "seasarmon" },
          ],
          deck: [{ card: "BT1-013", as: "top" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("labramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => labramonPermanent(s) !== undefined);
    await settle();

    expect(labramonPermanent(s).stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("seasarmon").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("top").instanceId]);
    expect(s.state.memory).toBe(2);
  });

  it("gains 1 memory once per turn when its ＜Jamming＞ host attacks", async () => {
    const s = setupEngine({
      0: {
        // BT17-024 Seasarmon's inherited clause is a bare ＜Jamming＞ grant.
        battleArea: [{ card: "BT17-025", under: ["BT17-021", "BT17-024"], as: "host", dp: 20_000 }],
      },
      1: { security: ["BT1-009", "BT1-013", "BT1-027"] },
    });
    s.state.memory = 0;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);

    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      });

    expect(attack()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.security).toHaveLength(2);

    // Plumbing only: the second attack in the same turn needs an unsuspended attacker.
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(attack()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not gain memory when the host lacks ＜Jamming＞", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-025", under: ["BT17-021"], as: "host", dp: 20_000 }] },
      1: { security: ["BT1-009", "BT1-013"] },
    });
    s.state.memory = 0;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("resets the once-per-turn memory gain on the next own turn through the public turn flow", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-025", under: ["BT17-021", "BT17-024"], as: "host", dp: 20_000 }],
        // A spare playable card keeps Main open; with an empty hand the phase
        // auto-passes as soon as the attacker is suspended.
        hand: ["BT1-009"],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        security: ["BT1-009", "BT1-013", "BT1-027"],
      },
      1: {
        hand: ["BT1-009"],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        security: ["BT1-009", "BT1-013", "BT1-027", "BT1-028", "BT2-022", "BT3-020"],
      },
    });
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      });

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const firstMemory = s.state.memory;
    expect(attack()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(firstMemory + 1);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    const afterFirst = s.state.memory;
    expect(attack()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(afterFirst);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const secondMemory = s.state.memory;
    expect(attack()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(secondMemory + 1);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([
    ["breeding", "breeding"],
    ["battle area", "battleArea"],
  ] as const)("digivolves from a blue Lv.2 source in the %s for 0 memory and draws 1", async (_where, zone) => {
    // BT13-002 Chapmon is a blue Lv.2 Digi-Egg whose only clause is an
    // [Opponent's Turn] window, so it stays inert on seat 0's turn.
    const base = { card: "BT13-002", as: "base" } as const;
    const s = setupEngine({
      0: {
        ...(zone === "breeding" ? { breeding: base } : { battleArea: [base] }),
        hand: [{ card: "BT17-021", as: "labramon" }],
        deck: [
          { card: "BT1-009", as: "drawn" },
          { card: "BT1-013", as: "kept" },
        ],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const baseCardId = s.inst("base").instanceId;
    const labramonId = s.inst("labramon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: labramonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === labramonId);

    // Blue Lv.2: cost 0, so memory is untouched; digivolving still draws 1.
    expect(s.state.memory).toBe(5);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseCardId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("kept").instanceId]);
    // [On Play] does not fire on a digivolve, so no placement prompt is raised.
    expect(s.decisions).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses an off-colour Lv.2 source", async () => {
    const s = setupEngine({
      0: {
        // BT17-004 Argomon is a green Lv.2 Digi-Egg: the wrong colour for `Blue Lv.2: 0`.
        breeding: { card: "BT17-004", as: "base" },
        hand: [{ card: "BT17-021", as: "labramon" }],
        deck: [{ card: "BT1-009", as: "top" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("labramon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });

    expect(s.perm("base").topCard?.cardId).toBe("BT17-004");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("labramon").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("top").instanceId]);
    expect(s.state.memory).toBe(5);
  });
});
