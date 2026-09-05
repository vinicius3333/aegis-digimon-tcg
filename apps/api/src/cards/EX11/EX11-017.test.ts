import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "EX11-017";

describe("EX11-017 Skadimon", () => {
  it("matches the catalog and encodes every printed clause without Security or inherited text", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Skadimon",
      colors: ["Blue", "Yellow"],
      playCost: 12,
      dp: 12000,
      level: 6,
      evoCosts: [
        { color: "Blue", level: 5, memoryCost: 4 },
        { color: "Yellow", level: 5, memoryCost: 4 },
      ],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["Ice-Snow"], cost: 3, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "IceClad", raw: "＜Ice Clad＞" }] }),
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] }),
      ]),
    );
    expect(compiled.effects.some(({ isInherited }) => isInherited)).toBe(false);
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);
  });

  it("shares one optional free-play use across all timings and uses the printed union target", () => {
    const compiled = runtimeCompiledCard(cardId)!;
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: false,
            optional: true,
            target: {
              count: 1,
              filter: {
                controller: "mine",
                nameOrTrait: [{ tokens: ["Suzune Kazuki"], match: "nameExact" }],
              },
              orFilters: [
                {
                  controller: "mine",
                  kind: ["Digimon"],
                  levelComparison: { op: "lte", value: 4 },
                  nameOrTrait: [{ tokens: ["Ice-Snow"], match: "trait" }],
                },
              ],
            },
          },
        ],
      });
    }
  });

  it.each([
    { label: "Suzune despite being a Tamer", candidate: "EX11-057" },
    { label: "a level 3 Ice-Snow Digimon", candidate: "EX11-014" },
  ])("plays $label from hand without paying", async ({ candidate }) => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: cardId, as: "source" }], hand: [{ card: candidate, as: "candidate" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === candidate)).toBe(true);
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it.each([
    { label: "level 5 Ice-Snow", candidate: "EX11-016" },
    { label: "level 4 without Ice-Snow", candidate: "BT1-033" },
  ])("does not play an ineligible $label card", async ({ candidate }) => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: cardId, as: "source" }], hand: [{ card: candidate, as: "candidate" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toContain(candidate);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("spends the shared once-per-turn use at only the first of its three timings", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [
            { card: "EX11-057", as: "first" },
            { card: "EX11-057", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.state.players[0]!.hand).toHaveLength(1);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX11-057")).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("trashes exactly three sources across opposing stacks, restricts a source-less Digimon, and shares the watcher budget", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-009", as: "other" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first", under: ["BT1-001", "BT1-002"] },
            { card: "BT1-011", as: "second", under: ["BT1-003", "BT1-004"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("other").permanentId,
    });
    await settle(() => s.state.players[1]!.trash.length === 3);

    expect(s.perm("first").stack.length + s.perm("second").stack.length).toBe(1);
    const sourceLess = [s.perm("first"), s.perm("second")].find(({ stack }) => stack.length === 0)!;
    expect(observe(s.engine).isRestricted(sourceLess, "suspend")).toBe(true);

    await advance(s.engine).fireSubTrigger("whenAnyDigivolves", {
      subjectPermanentId: s.perm("other").permanentId,
    });
    expect(s.state.players[1]!.trash).toHaveLength(3);
    expect(s.perm("first").stack.length + s.perm("second").stack.length).toBe(1);
    assertNoLoudGap(s);
  });

  it("watches the opponent's plays too, and blocks both being suspended and suspending to attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "stacked", under: ["BT1-001", "BT1-002", "BT1-003"] },
            { card: "BT1-011", as: "newcomer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("newcomer").permanentId,
    });
    await settle(() => s.state.players[1]!.trash.length === 3);

    expect(s.perm("stacked").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(3);
    const restricted = [s.perm("stacked"), s.perm("newcomer")].filter((permanent) =>
      observe(s.engine).isRestricted(permanent, "suspend"),
    );
    expect(restricted).toHaveLength(1);
    expect(observe(s.engine).isRestricted(restricted[0]!, "beSuspended")).toBe(true);
    assertNoLoudGap(s);
  });

  it("ignores Skadimon itself but reacts to the next other Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT1-009", as: "other" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponent", under: ["BT1-001"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAnyDigivolves", {
      subjectPermanentId: s.perm("source").permanentId,
    });
    expect(s.perm("opponent").stack).toHaveLength(1);

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("other").permanentId,
    });
    await settle(() => s.perm("opponent").stack.length === 0);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(true);
    assertNoLoudGap(s);
  });

  it("publishes the pooled watcher and its until-opponent-turn-end suspension restriction", () => {
    const allTurns = runtimeCompiledCard(cardId)!.effects.find((effect) => effect.trigger === "AllTurns")!;
    expect(allTurns.frequency).toBe("OncePerTurn");
    for (const [index, event] of ["whenPlayed", "whenAnyDigivolves"].entries()) {
      expect(allTurns.actions[index]).toMatchObject({
        kind: "SubTrigger",
        event,
        sourceFilter: { excludeSelf: true, kind: ["Digimon"] },
        actions: [
          {
            kind: "TrashDigivolution",
            amount: 3,
            scope: "acrossDigimon",
            target: { count: "all", filter: { controller: "opponent", digivolutionCards: "hasAny" } },
          },
          {
            kind: "Restrict",
            restriction: "suspend",
            blocksCombatSuspend: true,
            duration: "untilOpponentTurnEnd",
            target: { filter: { controller: "opponent", digivolutionCards: "none" }, count: 1 },
          },
        ],
      });
    }
  });

  it("uses Barrier to spend the top security and prevent battle deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: cardId, as: "source", suspended: true }], security: ["BT1-029"] },
    });
    await s.ready();
    const sourceId = s.perm("source").permanentId;
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Barrier")).toBe(true);

    const deletion = advance(s.engine).verb.deletePermanent([sourceId], "byBattle");
    await settle(() => s.events.some(({ kind }) => kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: sourceId, accept: true })).toEqual({
      ok: true,
    });
    expect(await deletion).toBe(0);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("uses Iceclad to win a lower-DP battle by digivolution-card count", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: cardId, as: "source", dp: 1000, under: ["EX11-014", "EX11-015"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "defender", dp: 15000, suspended: true }] },
    });
    await s.ready();
    const defenderId = s.perm("defender").permanentId;
    expect(observe(s.engine).hasKeyword(s.perm("source"), "IceClad")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === defenderId));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("supports both normal colors and the Ice-Snow alternate route, and rejects an off-color level 5", async () => {
    for (const [baseCardId, useAlternateCost, memory] of [
      ["BT1-040", false, 4],
      ["EX12-044", false, 4],
      ["EX11-016", true, 3],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: cardId, as: "source" }] },
      });
      s.state.memory = memory;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("source").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === cardId);
      expect(s.state.memory).toBe(0);
    }

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT23-056", as: "base" }], hand: [{ card: cardId, as: "source" }] },
    });
    invalid.state.memory = 4;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("source").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
