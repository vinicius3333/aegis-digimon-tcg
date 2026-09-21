import {
  assemblyRequirementFor,
  digivolutionRequirementsFor,
  EffectDuration,
  EffectTiming,
  getCardDefinition,
} from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX13-044.js";
import "../index.js";

const cardId = "EX13-044";

const NAME_MATCH = "ST8-03";
const TEXT_MATCH = "BT20-023";
const NEAR_MISS = "BT1-009";
const NON_MATCH = "BT1-013";
const TEXT_FILTER = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
  printedTextOnly: true,
};

describe("EX13-044 Breakdramon", () => {
  it("matches the catalog and the committed IR clause for clause", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Breakdramon",
      colors: ["Green", "Red"],
      kinds: ["Digimon"],
      playCost: 12,
      dp: 12000,
      level: 6,
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Machine Dragon"],
      evoCosts: [
        { color: "Green", level: 5, memoryCost: 4 },
        { color: "Red", level: 5, memoryCost: 4 },
      ],
    });

    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects[0]).toEqual({
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Piercing", raw: "＜Piercing＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
      ],
    });

    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger);
      expect(effect?.frequency).toBeUndefined();
      expect(effect?.sharedUseKey).toBeUndefined();
      expect(effect).toMatchObject({
        actions: [
          {
            kind: "Suspend",
            optional: true,
            target: {
              count: 2,
              upTo: true,
              filter: { controllerDefault: "any", kind: ["Digimon", "Tamer"] },
            },
          },
          {
            kind: "Restrict",
            restriction: "unsuspend",
            duration: "untilOpponentTurnEnd",
            target: { count: 2, filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
          },
        ],
      });
      expect(effect?.actions[1]).not.toMatchObject({ restriction: "unsuspendDuringOwnUnsuspendPhase" });
    }

    const battleClauses = compiled.effects.filter((effect) =>
      effect.actions.some((action) => action.kind === "SubTrigger"),
    );
    expect(battleClauses).toHaveLength(2);
    expect(battleClauses.map(({ isInherited }) => isInherited ?? false)).toEqual([false, true]);
    for (const effect of battleClauses) {
      expect(effect).toMatchObject({
        trigger: "AllTurns",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenSuspended",
            sourceFilter: { controller: "mine", kind: ["Digimon"] },
            actions: [
              {
                kind: "Battle",
                optional: true,
                attacker: { count: 1, filter: TEXT_FILTER },
                defender: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
              },
            ],
          },
        ],
      });
      expect(effect.sharedUseKey).toBeUndefined();
      expect(effect.actions[0]).not.toMatchObject({ sourceFilter: { isSelfRef: true } });
    }

    expect(digivolutionRequirementsFor(cardId)).toEqual([
      { namesExact: ["Groundramon", "Wingdramon"], cost: 3, isAlternate: true },
    ]);
    expect(assemblyRequirementFor(cardId)).toEqual([
      {
        reduceCost: 5,
        materials: [5, 4, 3].map((level) => ({
          count: 1,
          level,
          nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
        })),
      },
    ]);
  });

  it("takes both named alternate routes for 3, the printed EvoCost for 4, and rejects an illegal source", async () => {
    for (const [baseCardId, useAlternateCost, memory] of [
      ["EX3-020", true, 3],
      ["EX3-041", true, 3],
      ["BT20-025", false, 4],
    ] as const) {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: cardId, as: "breakdramon" }] },
          1: { battleArea: [{ card: NON_MATCH, as: "bystander" }] },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = memory;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("breakdramon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === cardId);

      expect(s.state.memory).toBe(0);
      expect(s.perm("base").stack.map(({ cardId: id }) => id)).toEqual([baseCardId]);
      expect(observe(s.engine).hasKeyword(s.perm("base"), "Piercing")).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
      expect(observe(s.engine).isRestricted(s.perm("bystander"), "unsuspend")).toBe(true);
    }

    const fallback = setupEngine(
      { 0: { battleArea: [{ card: "BT3-053", as: "base" }], hand: [{ card: cardId, as: "breakdramon" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    fallback.state.memory = 4;
    await fallback.ready();
    expect(
      fallback.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fallback.perm("base").permanentId,
        instanceId: fallback.inst("breakdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => fallback.perm("base").topCard.cardId === cardId);
    expect(fallback.state.memory).toBe(0);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-038", as: "base" }], hand: [{ card: cardId, as: "breakdramon" }] },
    });
    illegal.state.memory = 4;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("breakdramon").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(illegal.state.memory).toBe(4);
  });

  it("Q7347: suspends up to 2 permanents across BOTH seats, Tamers included", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "breakdramon" }] },
        1: {
          battleArea: [
            { card: NON_MATCH, as: "opponentDigimon" },
            { card: "BT2-084", as: "opponentTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("opponentDigimon").topCard.instanceId, s.perm("opponentTamer").topCard.instanceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("breakdramon"));
    await settle(() => s.state.players[1]!.battleArea.filter((permanent) => permanent.isSuspended).length === 2);

    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.isSuspended)).toHaveLength(2);
    expect(observe(s.engine).isRestricted(s.perm("opponentDigimon"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentTamer"), "unsuspend")).toBe(true);
  });

  it("includes the controller's own permanents in the suspend pool", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "breakdramon" },
            { card: NON_MATCH, as: "ally" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("breakdramon"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.isSuspended));

    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.isSuspended)).toHaveLength(2);
  });

  it("Q7348: may lock different opponent permanents from the ones it suspended", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "breakdramon" },
            { card: NON_MATCH, as: "suspended" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT2-084", as: "firstLocked" },
            { card: "BT2-084", as: "secondLocked" },
            { card: "BT2-084", as: "unlocked" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("suspended").topCard.instanceId);
    preferred.includes = (id: string) =>
      s.perm("suspended").isSuspended
        ? [s.perm("firstLocked").topCard.instanceId, s.perm("secondLocked").topCard.instanceId].includes(id)
        : id === s.perm("suspended").topCard.instanceId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("breakdramon"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("suspended").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("suspended"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("firstLocked"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("secondLocked"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("unlocked"), "unsuspend")).toBe(false);
  });

  it("locks exactly 2 opponent permanents, leaving a third free to unsuspend", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "breakdramon" }] },
        1: {
          battleArea: [
            { card: NON_MATCH, as: "first", suspended: true },
            { card: NEAR_MISS, as: "second", suspended: true },
            { card: "BT1-014", as: "third", suspended: true },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("breakdramon"));
    await settle(
      () =>
        s.state.players[1]!.battleArea.filter((permanent) => observe(s.engine).isRestricted(permanent, "unsuspend"))
          .length === 2,
    );

    const locked = s.state.players[1]!.battleArea.filter((permanent) =>
      observe(s.engine).isRestricted(permanent, "unsuspend"),
    );
    expect(locked).toHaveLength(2);

    const unlocked = s.state.players[1]!.battleArea.find(
      (permanent) => !observe(s.engine).isRestricted(permanent, "unsuspend"),
    )!;
    await advance(s.engine).verb.unsuspend(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId));
    await settle();

    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.isSuspended)).toHaveLength(2);
    expect(
      s.state.players[1]!.battleArea.find(({ permanentId }) => permanentId === unlocked.permanentId)!.isSuspended,
    ).toBe(false);
  });

  it("still applies the mandatory lock when the optional suspend is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "breakdramon" }] },
        1: { battleArea: [{ card: NON_MATCH, as: "victim" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("breakdramon"));
    await settle(() => observe(s.engine).isRestricted(s.perm("victim"), "unsuspend"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.isSuspended)).toBe(false);
    expect(s.perm("victim").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("victim"), "unsuspend")).toBe(true);
  });

  it("Q7349: immediately battles with a [Dracomon]-text ally when one of your Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "breakdramon" },
            { card: NON_MATCH, as: "trigger" },
          ],
        },
        1: { battleArea: [{ card: NON_MATCH, dp: 5000, as: "prey" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const preyId = s.perm("prey").permanentId;

    await advance(s.engine).verb.suspend([s.perm("trigger").permanentId]);
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === preyId));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId: id }) => id)).toEqual([NON_MATCH]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
      expect.arrayContaining([cardId, NON_MATCH]),
    );
    expect(s.perm("breakdramon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("Q7350: can choose and battle a Digimon unaffected by the effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "breakdramon" },
            { card: NON_MATCH, as: "trigger" },
          ],
        },
        1: { battleArea: [{ card: NON_MATCH, dp: 5000, as: "immuneDefender" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.restrict(s.perm("immuneDefender").permanentId, "beAffected", EffectDuration.Permanent);
    expect(observe(s.engine).isRestricted(s.perm("immuneDefender"), "beAffected")).toBe(true);

    await advance(s.engine).verb.suspend([s.perm("trigger").permanentId]);
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.map(({ cardId: id }) => id)).toEqual([NON_MATCH]);
  });

  it("does not fire when an OPPONENT's Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "breakdramon" }] },
        1: {
          battleArea: [
            { card: NON_MATCH, dp: 5000, as: "prey" },
            { card: "BT1-014", as: "trigger" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("trigger").permanentId]);
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("Q7345-Q7346: accepts either printed-text token and refuses near misses as the battler", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: [cardId] },
            { card: NEAR_MISS, as: "nearMiss" },
            { card: NON_MATCH, as: "nonMatch" },
          ],
        },
        1: { battleArea: [{ card: NON_MATCH, dp: 5000, as: "prey" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("nonMatch").permanentId]);
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.perm("host").stack.map(({ cardId: id }) => id)).toEqual([cardId]);
  });

  it("installs the same clause from an inheriting host, battling with a matching ally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "host", under: [cardId] },
            { card: TEXT_MATCH, as: "battler" },
            { card: NEAR_MISS, as: "trigger" },
          ],
        },
        1: { battleArea: [{ card: NON_MATCH, dp: 1000, as: "prey" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const preyId = s.perm("prey").permanentId;

    await advance(s.engine).verb.suspend([s.perm("trigger").permanentId]);
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === preyId));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
  });

  it("is once per turn and resets on its controller's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "breakdramon" },
            { card: NON_MATCH, as: "trigger" },
          ],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-014", dp: 4000, as: "firstPrey" },
            { card: "BT1-012", dp: 2000, as: "secondPrey" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const firstPreyId = s.perm("firstPrey").permanentId;
    const secondPreyId = s.perm("secondPrey").permanentId;

    await advance(s.engine).verb.suspend([s.perm("trigger").permanentId]);
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    await advance(s.engine).verb.unsuspend([s.perm("trigger").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("trigger").permanentId]);
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    await advance(s.engine).verb.suspend([s.perm("trigger").permanentId]);
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect([firstPreyId, secondPreyId]).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps the main and inherited printed copies as independent once-per-turn watchers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "main" },
            { card: "EX13-045", as: "inherited", under: [cardId] },
            { card: NON_MATCH, as: "trigger" },
          ],
        },
        1: {
          battleArea: [
            { card: NON_MATCH, dp: 1000, as: "firstPrey" },
            { card: NON_MATCH, dp: 1000, as: "secondPrey" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("trigger").permanentId]);
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(2);
  });

  it("fires off a real attack declaration, whose own suspension is the event", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "breakdramon" }] },
        1: { battleArea: [{ card: NON_MATCH, dp: 5000, as: "prey" }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("breakdramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("breakdramon").isSuspended).toBe(true);
  });

  it("pierces through to security after winning a Digimon battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "breakdramon" }] },
        1: { battleArea: [{ card: NON_MATCH, dp: 5000, suspended: true, as: "defender" }], security: ["BT1-010"] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("breakdramon"))).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("breakdramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("Q7351: performs only one Piercing security check after two battle deletions in one attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "breakdramon" }] },
        1: {
          battleArea: [
            { card: NON_MATCH, dp: 5000, suspended: true, as: "effectDefender" },
            { card: NON_MATCH, dp: 5000, suspended: true, as: "attackDefender" },
          ],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("effectDefender").topCard.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("breakdramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("attackDefender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.filter(({ cardId: id }) => id === NON_MATCH)).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("Q7352: retains Piercing from the effect battle when the attack defender prevents deletion", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "breakdramon" }] },
        1: {
          battleArea: [
            { card: NON_MATCH, dp: 5000, suspended: true, as: "effectDefender" },
            { card: "EX13-033", suspended: true, as: "barrierDefender" },
          ],
          security: [
            { card: "BT1-010", as: "barrierCost" },
            { card: "BT1-011", as: "piercingCheck" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("effectDefender").topCard.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("breakdramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("barrierDefender").permanentId },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenBarrierDecision: boolean } }).combat;
    await settle(() => combat.hasOpenBarrierDecision);
    expect(
      s.engine.applyIntent(1, {
        type: "respondBarrier",
        permanentId: s.perm("barrierDefender").permanentId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("barrierDefender").permanentId,
    ]);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("effectDefender").instanceId, s.inst("barrierCost").instanceId]),
    );
  });

  it("blocks an opponent's attack on the player and wins the battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "breakdramon" }], security: ["BT1-010"] },
        1: { battleArea: [{ card: NON_MATCH, dp: 5000, as: "attacker" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    const window = s.events.findLast(({ kind }) => kind === "blockWindowOpened");
    if (window?.kind !== "blockWindowOpened") throw new Error("block window did not open");
    expect(window.eligibleBlockerIds).toContain(s.perm("breakdramon").permanentId);

    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("breakdramon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("Q7353: assembles only when every level slot independently has Dracomon or Examon in its text", async () => {
    const valid = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "breakdramon" },
            { card: "BT1-010", as: "spare" },
          ],
          trash: [
            { card: "BT20-025", as: "m0" },
            { card: TEXT_MATCH, as: "m1" },
            { card: NAME_MATCH, as: "m2" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    valid.state.memory = 7;
    await valid.ready();

    expect(
      valid.engine.applyIntent(0, {
        type: "playCard",
        instanceId: valid.inst("breakdramon").instanceId,
        assembly: {
          materialInstanceIds: [valid.inst("m0").instanceId, valid.inst("m1").instanceId, valid.inst("m2").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));

    expect(valid.state.memory).toBe(0);
    const assembled = valid.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === cardId)!;
    expect(assembled.stack.map(({ cardId: id }) => id)).toEqual([NAME_MATCH, TEXT_MATCH, "BT20-025"]);

    for (const materials of [
      [TEXT_MATCH, TEXT_MATCH, NAME_MATCH],
      ["BT1-038", TEXT_MATCH, NAME_MATCH],
      ["BT20-025", TEXT_MATCH, NEAR_MISS],
    ]) {
      const s = setupEngine({
        0: {
          hand: [{ card: cardId, as: "breakdramon" }],
          trash: materials.map((card, index) => ({ card, as: `m${index}` })),
        },
      });
      s.state.memory = 7;
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("breakdramon").instanceId,
          assembly: { materialInstanceIds: materials.map((_, index) => s.inst(`m${index}`).instanceId) },
        }),
      ).toEqual({ ok: false, reason: "invalid-material" });
      expect(s.state.memory).toBe(7);
    }
  });
});
