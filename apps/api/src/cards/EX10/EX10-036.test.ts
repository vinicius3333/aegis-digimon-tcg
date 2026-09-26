import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-036.js";
import "../index.js";

const TRASH_CLAUSE_PROMPT = "By trashing 3";
const CARD_ID = "EX10-036";

describe("EX10-036 Magneticdramon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Magneticdramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 14,
      dp: 14000,
      evoCosts: [{ color: "Black", level: 6, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Rock Dragon", "LIBERATOR", "Mineral"],
    });
  });

  it("compiles both timings of both clauses, the alternate route and the Fragment marker", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      {
        namesExact: ["Proganomon"],
        cost: 6,
        isAlternate: true,
        controllerControls: { kind: ["Tamer"], namesExact: ["Close"], min: 1 },
      },
    ]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Fragment", amount: 3 }],
    });

    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const effects = compiled.effects?.filter((effect) => effect.trigger === trigger);
      expect(effects).toHaveLength(2);
      expect(effects?.[0]).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            allowCostWithoutTarget: true,
            optional: true,
            abortOnDecline: true,
            cost: {
              kind: "trash",
              target: {
                filter: { controller: "mine", nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }] },
                count: 3,
                from: ["digivolutionCards"],
              },
            },
          },
          { kind: "trashSecurityTop", controller: "opponent", count: 1 },
        ],
      });
      expect(effects?.[1]).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "Unsuspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            cost: {
              kind: "place",
              destination: "digivolutionStack",
              position: "bottom",
              host: "self",
              target: {
                filter: {
                  zone: "trash",
                  controller: "mine",
                  nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }],
                },
                count: 3,
                from: ["trash"],
              },
            },
          },
        ],
      });
    }
  });

  it("Q5114 [When Digivolving] trashes 3 sources spread across two Digimon, deletes 1 and trashes top security", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT2-064",
              as: "base",
              under: [
                { card: "BT10-062", as: "a" },
                { card: "BT10-064", as: "b" },
              ],
            },
            {
              card: "BT1-009",
              as: "ally",
              dp: 20_000,
              under: [
                { card: "BT4-065", as: "c" },
                { card: "BT2-011", as: "nearMiss" },
              ],
            },
          ],
          hand: [{ card: CARD_ID, as: "magnetic" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-019", as: "target" }],
          security: ["BT1-013", "BT1-014"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
        preferTriggerKeys: ["ir-shared-0"],
        declinePrompts: ["placing 3 [Mineral] or [Rock]"],
      },
    );
    preferred.push(
      s.inst("a").instanceId,
      s.inst("b").instanceId,
      s.inst("c").instanceId,
      s.perm("target").topCard!.instanceId,
    );
    s.state.memory = 4;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Fragment")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magnetic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await settle(() => false, 30);

    const p0 = s.state.players[0]!;
    const magnetic = s.perm("magnetic");
    expect(magnetic.topCard!.cardId).toBe(CARD_ID);
    expect(observe(s.engine).hasKeyword(magnetic, "Fragment")).toBe(true);
    expect(magnetic.stack.map((card) => card.cardId)).toEqual(["BT2-064"]);
    expect(s.perm("ally").stack.map((card) => card.instanceId)).toEqual([s.inst("nearMiss").instanceId]);
    expect(p0.trash.map((card) => card.instanceId)).toEqual([
      s.inst("a").instanceId,
      s.inst("b").instanceId,
      s.inst("c").instanceId,
    ]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-013", "BT1-019"]),
    );
    expect(s.state.memory).toBe(0);
    expect(p0.hand.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5113 refuses a partial payment: 2 eligible digivolution cards buy nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT2-064",
              as: "base",
              under: [
                { card: "BT10-062", as: "a" },
                { card: "BT2-011", as: "nearMiss" },
              ],
            },
            { card: "BT1-009", as: "ally", dp: 20_000, under: [{ card: "BT4-065", as: "b" }] },
          ],
          hand: [{ card: CARD_ID, as: "magnetic" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-019", as: "target" }],
          security: ["BT1-013", "BT1-014"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        declinePrompts: ["placing 3 [Mineral] or [Rock]"],
      },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magnetic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard!.cardId === CARD_ID);
    await settle(() => false, 40);

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT10-062", "BT2-011", "BT2-064"]);
    expect(
      s
        .perm("base")
        .stack.map((card) => card.instanceId)
        .slice(0, 2),
    ).toEqual([s.inst("a").instanceId, s.inst("nearMiss").instanceId]);
    expect(s.perm("ally").stack.map((card) => card.instanceId)).toEqual([s.inst("b").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5115 [When Attacking] places exactly 3 matching trash cards at the BOTTOM, then unsuspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "magnetic",
              under: [
                { card: "BT1-009", as: "old1" },
                { card: "BT1-013", as: "old2" },
              ],
            },
          ],
          trash: [
            { card: "BT10-062", as: "t1" },
            { card: "BT10-064", as: "t2" },
            { card: "BT4-065", as: "t3" },
            { card: "BT2-011", as: "tNear" },
          ],
          hand: ["BT1-013"],
        },
        1: { security: ["BT1-013", "BT1-014"] },
      },
      // The trash clause becomes payable once the placement lands; declining it keeps this test
      // about the placement alone.
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: [TRASH_CLAUSE_PROMPT] },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magnetic").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await settle(() => false, 30);

    const magnetic = s.perm("magnetic");
    expect(magnetic.stack).toHaveLength(5);
    expect(
      magnetic.stack
        .slice(0, 3)
        .map((card) => card.instanceId)
        .sort(),
    ).toEqual([s.inst("t1").instanceId, s.inst("t2").instanceId, s.inst("t3").instanceId].sort());
    expect(magnetic.stack.slice(3).map((card) => card.instanceId)).toEqual([
      s.inst("old1").instanceId,
      s.inst("old2").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("tNear").instanceId]);
    expect(magnetic.isSuspended).toBe(false);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resolves the trash clause after the placement makes it payable in the same window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "magnetic", under: [{ card: "BT1-009", as: "old1" }] }],
          trash: [
            { card: "BT10-062", as: "t1" },
            { card: "BT10-064", as: "t2" },
            { card: "BT4-065", as: "t3" },
          ],
          hand: ["BT1-013"],
        },
        1: { security: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magnetic").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 60);

    expect(s.perm("magnetic").stack.map((card) => card.instanceId)).toEqual([s.inst("old1").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("t1").instanceId, s.inst("t2").instanceId, s.inst("t3").instanceId].sort(),
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("Q5115 refuses a partial placement: 2 matching cards in the trash leave it suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "magnetic", under: [{ card: "BT1-009", as: "old1" }] }],
          trash: [
            { card: "BT10-062", as: "t1" },
            { card: "BT4-065", as: "t2" },
            { card: "BT2-011", as: "tNear" },
          ],
          hand: ["BT1-013"],
        },
        1: { security: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magnetic").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await settle(() => false, 30);

    expect(s.perm("magnetic").stack.map((card) => card.instanceId)).toEqual([s.inst("old1").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("t1").instanceId,
      s.inst("t2").instanceId,
      s.inst("tNear").instanceId,
    ]);
    expect(s.perm("magnetic").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("trashes the top security card even when the opponent controls no Digimon to delete", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT2-064",
              as: "base",
              under: [
                { card: "BT10-062", as: "a" },
                { card: "BT10-064", as: "b" },
                { card: "BT4-065", as: "c" },
              ],
            },
          ],
          hand: [{ card: CARD_ID, as: "magnetic" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { security: ["BT1-013", "BT1-014", "BT1-009"] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        declinePrompts: ["placing 3 [Mineral] or [Rock]"],
      },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magnetic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard!.cardId === CARD_ID);
    await settle(() => false, 40);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("a").instanceId,
      s.inst("b").instanceId,
      s.inst("c").instanceId,
    ]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-014", "BT1-009"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5112 offers both simultaneous [When Digivolving] effects as one orderTriggers choice", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT2-064",
              as: "base",
              suspended: true,
              under: [
                { card: "BT10-062", as: "a" },
                { card: "BT10-064", as: "b" },
                { card: "BT4-065", as: "c" },
              ],
            },
          ],
          hand: [{ card: CARD_ID, as: "magnetic" }],
          deck: ["BT1-013", "BT1-014"],
          trash: ["BT10-062", "BT10-064", "BT4-065"],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target" }], security: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magnetic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");

    const logged = s.decisions.filter((entry) => entry.req.kind === "orderTriggers");
    expect(logged).toHaveLength(1);
    const { seat, req: request } = logged[0]!;
    expect(seat).toBe(0);
    expect(request.decisionId).toBe(s.state.pendingDecision!.decisionId);
    expect(request.sourceCardId).toBe(CARD_ID);
    const keys = request.options?.triggerKeys ?? [];
    expect(keys).toHaveLength(2);
    const selfInstanceId = s.perm("magnetic").topCard!.instanceId;
    expect(keys.every((key) => key.startsWith(`${selfInstanceId}::`))).toBe(true);
    expect(keys.some((key) => key.endsWith("/ir-shared-0"))).toBe(true);
    expect(keys.some((key) => !key.endsWith("/ir-shared-0"))).toBe(true);
    expect(request.options?.triggerTimings).toEqual(["WhenDigivolving", "WhenDigivolving"]);

    const placementKey = keys.find((key) => key.endsWith("/ir-shared-0"))!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "orderTriggers", order: [placementKey] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await settle(() => false, 30);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[Once Per Turn] is shared by both timings and resets on the next own turn", async () => {
    const declinePrompts = [TRASH_CLAUSE_PROMPT];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT2-064",
              as: "base",
              under: [{ card: "BT1-009", as: "old1" }],
            },
          ],
          hand: [{ card: CARD_ID, as: "magnetic" }, "BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"],
          trash: ["BT10-062", "BT10-064", "BT4-065", "BT10-062", "BT10-064", "BT4-065"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          hand: ["BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"],
        },
      },
      // Declined only while digivolving: the placement makes the trash clause payable in the same
      // window, and this test spends the trash clause on the next attack instead.
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 4);
    expect(s.perm("base").isSuspended).toBe(true);

    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magnetic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard!.cardId === CARD_ID);
    await settle(() => s.state.players[0]!.trash.length === 3);
    expect(s.perm("base").stack).toHaveLength(5);
    expect(s.perm("base").isSuspended).toBe(false);
    declinePrompts.length = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 6);
    await settle(() => false, 30);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-009", "BT2-064"]);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("base").isSuspended).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    expect(s.perm("base").isSuspended).toBe(false);
    declinePrompts.push(TRASH_CLAUSE_PROMPT);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.length === 5);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.perm("base").isSuspended).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("＜Fragment (3)＞ saves it from battle deletion by trashing 3 of its own digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "magnetic",
              under: [
                { card: "BT1-009", as: "u1" },
                { card: "BT1-013", as: "u2" },
                { card: "BT1-014", as: "u3" },
              ],
            },
          ],
          hand: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }], security: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("magnetic"), "Fragment")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magnetic").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 3);
    await settle(() => false, 30);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("magnetic").topCard!.cardId).toBe(CARD_ID);
    expect(s.perm("magnetic").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("u1").instanceId, s.inst("u2").instanceId, s.inst("u3").instanceId]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses the Close-gated Proganomon evolution for 6 and rejects it without Close", async () => {
    const valid = setupEngine({
      0: {
        battleArea: [
          { card: "EX10-032", as: "base", under: [{ card: "BT1-009", as: "under1" }] },
          { card: "EX10-063", as: "close" },
        ],
        hand: [{ card: CARD_ID, as: "magnetic" }],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    valid.state.memory = 6;
    await valid.ready();
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("base").permanentId,
        instanceId: valid.inst("magnetic").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("base").topCard!.cardId === CARD_ID);
    await settle(() => false, 30);
    expect(valid.state.memory).toBe(0);
    expect(valid.perm("magnetic").stack.map((card) => card.cardId)).toEqual(["BT1-009", "EX10-032"]);
    expect(valid.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-013"]);

    const blocked = setupEngine({
      0: {
        battleArea: [{ card: "EX10-032", as: "base" }],
        hand: [{ card: CARD_ID, as: "magnetic" }],
        deck: ["BT1-013"],
      },
    });
    blocked.state.memory = 6;
    await blocked.ready();
    expect(
      blocked.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: blocked.perm("base").permanentId,
        instanceId: blocked.inst("magnetic").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(
      blocked.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: blocked.perm("base").permanentId,
        instanceId: blocked.inst("magnetic").instanceId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("does not activate main-body effects for a card that merely sits in the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-064", as: "host", dp: 1_000, under: [{ card: CARD_ID, as: "buried" }] },
            {
              card: "BT1-009",
              as: "ally",
              dp: 20_000,
              under: [
                { card: "BT10-062", as: "a" },
                { card: "BT10-064", as: "b" },
                { card: "BT4-065", as: "c" },
              ],
            },
          ],
          hand: ["BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-019", as: "target", dp: 20_000, suspended: true }],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.every(({ permanentId }) => permanentId !== hostId));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("ally").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("a").instanceId,
      s.inst("b").instanceId,
      s.inst("c").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toEqual(
      expect.arrayContaining([s.inst("a").instanceId, s.inst("b").instanceId, s.inst("c").instanceId]),
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
