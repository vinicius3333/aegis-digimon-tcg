import { getCardDefinition, type ServerEvent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import {
  drainMicrotasks,
  setupEngine,
  settle,
  settleAcrossTimers,
  type BoardSpec,
} from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import "../EX8/EX8-074.js";
import "../BT15/BT15-075.js";
import { compiled } from "./BT19-037.js";

const DECK = ["BT1-009", "BT1-010", "BT1-012", "BT1-013", "BT1-014", "BT1-009"];

describe("BT19-037 Taomon", () => {
  it("matches the catalog printed identity, ACE overflow and text", () => {
    expect(getCardDefinition("BT19-037")).toMatchObject({
      cardId: "BT19-037",
      nameEn: "Taomon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 5,
      dp: 8000,
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Wizard"],
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 3 }],
      isAce: true,
      overflowMemory: 3,
      inheritedEffectText: "[When Attacking] 1 of your opponent's Digimon gets -4000 DP for the turn.",
    });
  });

  it("compiles every printed clause", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
    for (const index of [1, 2] as const) {
      expect(compiled.effects?.[index]).toMatchObject({
        trigger: index === 1 ? "OnPlay" : "WhenDigivolving",
        actions: [
          {
            kind: "UseOptionWithoutCost",
            payCost: false,
            optional: true,
            filter: { kind: ["Option"], colorCount: 1, playCostLte: 5 },
            condition: { kind: "isYourTurn" },
          },
          {
            kind: "GainKeyword",
            keyword: { keyword: "SecurityAttack", amount: -1 },
            duration: "untilOpponentTurnEnd",
            condition: { kind: "isOpponentsTurn" },
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          },
          {
            kind: "DisableTimingEffect",
            timings: ["whenDigivolving"],
            duration: "untilOpponentTurnEnd",
            condition: { kind: "isOpponentsTurn" },
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, sameTarget: true },
          },
        ],
      });
    }
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          amount: -4000,
          duration: "forTheTurn",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
  });

  it("uses one eligible single-colour Option for free on a public play, leaving the near misses in hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-037", as: "taomon" },
            { card: "BT1-102", as: "option" },
            { card: "BT12-104", as: "twoColour" },
            { card: "BT1-107", as: "tooExpensive" },
          ],
          deck: [{ card: "BT1-014", as: "optionDraw" }, ...DECK],
          security: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "theirs" }], security: ["BT1-009"], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("taomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    await drainMicrotasks(60);

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("optionDraw").instanceId);
    for (const alias of ["twoColour", "tooExpensive"]) {
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst(alias).instanceId);
    }
    expect(observe(s.engine).keywordAmount(s.perm("theirs"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).timingEffectDisabled(s.perm("theirs"), "whenDigivolving")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses the Option on the [When Digivolving] timing of a public digivolve as well", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "base" }],
          hand: [{ card: "BT19-037", as: "taomon" }, { card: "BT1-102", as: "option" }, "BT1-013"],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-009"], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("taomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    await drainMicrotasks(60);

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard?.cardId).toBe("BT19-037");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
  });

  it("leaves the Option in hand when the optional use is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-037", as: "taomon" },
            { card: "BT1-102", as: "option" },
          ],
          deck: DECK,
          security: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-009"], deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("taomon").instanceId })).toEqual({
      ok: true,
    });
    await drainMicrotasks(80);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(5);
  });

  it("blast digivolves in the opponent's counter window and locks one of their Digimon (Q5536, Q5539)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "base" }],
          hand: [{ card: "BT19-037", as: "taomon" }],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-010", as: "sec2" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "opener" },
            { card: "BT3-076", as: "locked" },
          ],
          hand: [
            { card: "BT15-075", as: "loogarmon" },
            { card: "BT1-009", as: "fodder" },
          ],
          deck: DECK,
          security: ["BT1-009", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("locked").permanentId, s.perm("locked").topCard!.instanceId);
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opener").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isAttacking());
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: s.inst("taomon").instanceId,
        effectKey: `blast-digivolve:${s.perm("base").permanentId}`,
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-037");
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(6);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("evoDraw").instanceId]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("sec2").instanceId]);

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("locked").permanentId,
        instanceId: s.inst("loogarmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("locked").topCard?.cardId === "BT15-075");
    await drainMicrotasks(80);
    expect(s.perm("locked").currentDP).toBe(5000);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("fodder").instanceId);
    expect(s.state.players[1]!.hand).toHaveLength(3);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("locked").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("fodder").instanceId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("sec2").instanceId]);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("suppressed [When Digivolving] does not consume the effect's [Once Per Turn] (Q5540)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-051", as: "base" },
            { card: "BT1-045", as: "bait" },
          ],
          hand: [{ card: "BT19-037", as: "taomon" }],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-010", as: "sec2" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "opener" },
            { card: "BT1-037", as: "locked" },
          ],
          hand: [{ card: "BT25-027", as: "kudamon" }],
          deck: DECK,
          security: ["BT1-009", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("locked").permanentId, s.perm("locked").topCard!.instanceId);
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opener").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isAttacking());
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: s.inst("taomon").instanceId,
        effectKey: `blast-digivolve:${s.perm("base").permanentId}`,
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-037");
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("locked").permanentId,
        instanceId: s.inst("kudamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("locked").topCard?.cardId === "BT25-027");
    await drainMicrotasks(80);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual(
      ["BT1-045", "BT19-037"].sort(),
    );

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("locked").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-037"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bait").instanceId);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("pays ACE Overflow ＜3＞ when it leaves the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-037", as: "taomon" }],
          hand: ["BT1-013"],
          deck: DECK,
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
          security: ["BT1-009"],
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("taomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    await drainMicrotasks(60);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-037"]);
    expect(s.state.memory).toBe(2);
  });

  it("gives exactly one opponent Digimon -4000 DP from under a real host, and only for the turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", dp: 20_000, under: ["BT19-037"] }],
          hand: ["BT1-013"],
          deck: DECK,
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "chosen", dp: 9000 },
            { card: "BT1-012", as: "other", dp: 9000 },
          ],
          hand: ["BT1-013"],
          deck: DECK,
          security: ["BT1-009", "BT1-012"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").permanentId, s.perm("chosen").topCard!.instanceId);
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.perm("chosen").currentDP).toBe(5000);
    expect(s.perm("other").currentDP).toBe(9000);
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("chosen").currentDP).toBe(9000);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not carry the inherited attack effect when BT19-037 is not in the digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", dp: 20_000, under: ["BT1-045"] }],
          hand: ["BT1-013"],
          deck: DECK,
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "peer", dp: 9000 }],
          hand: ["BT1-013"],
          deck: DECK,
          security: ["BT1-009", "BT1-012"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.perm("peer").currentDP).toBe(9000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("BT19-037 Taomon — KB Q&A rulings", () => {
  function gallantmonWhenDigivolvingSources(events: ServerEvent[]) {
    return events.flatMap((event) =>
      event.kind === "effectTriggered" && event.sourceCardId === "EX8-074" && event.timing === "WhenDigivolving"
        ? [event.sourcePermanentId]
        : [],
    );
  }

  async function blastDigivolveAndLock(board: BoardSpec) {
    const preferred: string[] = [];
    const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred });
    preferred.push(s.perm("locked").permanentId, s.perm("locked").topCard!.instanceId);
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opener").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isAttacking());
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: s.inst("taomon").instanceId,
        effectKey: `blast-digivolve:${s.perm("base").permanentId}`,
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-037");
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(observe(s.engine).timingEffectDisabled(s.perm("locked"), "whenDigivolving")).toBe(true);
    return { s, loop };
  }

  it("still activates a locked Digimon's [When Digivolving] [When Attacking] effect on the attack timing (Q5537)", async () => {
    const { s, loop } = await blastDigivolveAndLock({
      0: {
        battleArea: [{ card: "BT1-051", as: "base" }],
        hand: [{ card: "BT19-037", as: "taomon" }],
        deck: DECK,
        security: ["BT1-009", "BT1-010"],
      },
      1: {
        battleArea: [
          { card: "BT1-013", as: "opener" },
          { card: "BT3-076", as: "locked" },
        ],
        hand: [
          { card: "BT15-075", as: "loogarmon" },
          { card: "BT1-009", as: "fodder" },
        ],
        deck: DECK,
        security: ["BT1-009", "BT1-012"],
      },
    });

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("locked").permanentId,
        instanceId: s.inst("loogarmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("locked").topCard?.cardId === "BT15-075");
    await drainMicrotasks(80);
    expect(s.perm("locked").currentDP).toBe(5000);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("fodder").instanceId);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("locked").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("fodder").instanceId);
    expect(s.perm("locked").currentDP).toBe(7000);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("stops other effects from activating a locked Digimon's [When Digivolving] effect (Q5538)", async () => {
    const { s, loop } = await blastDigivolveAndLock({
      0: {
        battleArea: [
          { card: "BT1-051", as: "base" },
          { card: "BT1-045", as: "bait" },
        ],
        hand: [{ card: "BT19-037", as: "taomon" }],
        deck: DECK,
        security: ["BT1-009", "BT1-010"],
      },
      1: {
        battleArea: [
          { card: "BT1-013", as: "opener" },
          { card: "EX8-074", as: "locked" },
          { card: "EX8-074", as: "free" },
        ],
        hand: [{ card: "BT1-009", as: "played" }],
        deck: DECK,
        security: ["BT1-009", "BT1-012"],
      },
    });
    expect(observe(s.engine).timingEffectDisabled(s.perm("free"), "whenDigivolving")).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settleAcrossTimers(() => s.state.players[0]!.battleArea.length < 2 && s.state.pendingDecision === undefined);
    await drainMicrotasks(120);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(gallantmonWhenDigivolvingSources(s.events)).toEqual([s.perm("free").permanentId]);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
