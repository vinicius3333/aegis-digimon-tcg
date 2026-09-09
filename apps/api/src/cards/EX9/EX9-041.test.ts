import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-041.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-041", () => {
  it("evolves from non-DM Raremon for three and pays the return cost in the real timing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-084", as: "host", under: [{ card: "BT1-009", faceUp: false }] }],
          hand: [{ card: "EX9-041", as: "evo" }],
          deck: ["BT1-048"],
        },
        1: { battleArea: [{ card: "BT1-064", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(2);
    expect(s.perm("host").topCard.cardId).toBe("EX9-041");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["BT3-084"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.players[1]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-064"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["EX9-029", "BT1-037"])("requires DM for the unnamed off-color level-4 route: %s", async (base) => {
    const s = setupEngine({
      0: { breeding: { card: base, as: "host" }, hand: [{ card: "EX9-041", as: "evo" }], deck: ["BT1-009"] },
    });
    s.state.memory = 5;
    await s.ready();
    const eligible = base === "EX9-029";
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }).ok,
    ).toBe(eligible);
    await settle();
    expect(s.state.memory).toBe(eligible ? 1 : 5);
    expect(s.perm("host").topCard.cardId).toBe(eligible ? "EX9-041" : base);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(eligible ? [base] : []);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("requires the exact Raremon name and rejects RareRaremon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-054", as: "host" }], hand: [{ card: "EX9-041", as: "evo" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(false);
    await settle();
    expect(s.perm("host").topCard.cardId).toBe("EX9-054");
    expect(s.state.memory).toBe(5);
  });
  it.each([true, false])("Fortitude replays a fresh permanent only when a source existed: %s", async (hasSource) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-041", as: "source", under: hasSource ? ["BT1-071"] : [] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const originalId = s.perm("source").permanentId;
    await advance(s.engine).verb.deletePermanent([originalId]);
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(hasSource ? 1 : 0);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === originalId)).toBe(false);
    expect(s.state.players[0]!.battleArea.map(({ topCard, stack }) => [topCard.cardId, stack.length])).toEqual(
      hasSource ? [["EX9-041", 0]] : [],
    );
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(hasSource ? ["BT1-071"] : ["EX9-041"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it.each([
    { base: "EX9-039", memory: 3 },
    { base: "EX9-038", memory: 1 },
  ])("counts hidden sources only on a Ver.5 evolution base: $base", async ({ base, memory }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: base,
              as: "host",
              under: [
                { card: "BT1-009", faceUp: false },
                { card: "BT1-048", faceUp: false },
                { card: "BT1-064", faceUp: true },
              ],
            },
          ],
          hand: [{ card: "EX9-041", as: "evo" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard.cardId).toBe("EX9-041");
    expect(s.state.memory).toBe(memory);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-048", "BT1-064", base]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("has Fortitude and reduces Ver.5 digivolution by one per digivolution card", () => {
    expect(
      compiled.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Fortitude"))?.keywords,
    ).toContainEqual({ keyword: "Fortitude", raw: "＜Fortitude＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static" && entry.actions.length > 0)).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Ver.5"], match: "trait" }],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 1,
              scaling: {
                unit: "digivolutionCards",
                per: 1,
                filter: { isSelfRef: true, faceDown: true },
              },
            },
          ],
        },
      ],
    });
  });
  it("suspends and may return the lowest-DP suspended opponent Digimon by trashing its bottom face-down card", () =>
    ["OnPlay", "WhenDigivolving"].forEach((trigger) =>
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
          {
            kind: "Return",
            to: "hand",
            optional: true,
            abortOnDecline: true,
            cost: {
              kind: "trash",
              target: {
                filter: { isSelfRef: true, zone: "digivolutionCards", faceDown: true, position: "bottom" },
                count: 1,
                isSelf: true,
              },
            },
            target: {
              filter: {
                controller: "opponent",
                suspended: true,
                kind: ["Digimon"],
                superlative: "lowestDP",
              },
              count: 1,
            },
          },
        ],
      }),
    ));
  it("requires Raremon or a level-4 DM Digimon for the alternate routes", () =>
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Raremon"], cost: 3, isAlternate: true },
      { level: 4, traits: ["DM"], cost: 4, isAlternate: true },
    ]));
  it("inherits security trash when an opponent Digimon is deleted in battle", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }],
        },
      ],
    }));

  it("suspends and returns the lowest-DP opponent by trashing this bottom face-down card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-039",
              as: "base",
              under: [
                { card: "EX9-034", faceUp: false },
                { card: "EX9-038", faceUp: true },
              ],
            },
          ],
          hand: [{ card: "EX9-041", as: "evo" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 2000, suspended: true },
            { card: "BT1-010", as: "high", dp: 5000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("high").permanentId, s.perm("high").topCard.instanceId);
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT1-009"));
    await settle();
    expect(s.perm("base").topCard.cardId).toBe("EX9-041");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["EX9-038", "EX9-039"]);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-010")).toBe(true);
    expect(s.perm("high").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX9-034");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resolves the On Play body through a public play intent when no return cost is available", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-041", as: "source" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("EX9-041");
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("trashes once per turn, then resets for the next inherited-host battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-080", as: "host", under: ["EX9-041"] }],
          deck: ["BT1-048", "BT1-048", "BT1-048", "BT1-048"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target", suspended: true },
            { card: "BT1-009", as: "second", suspended: true },
            { card: "BT1-011", as: "third", suspended: true },
          ],
          security: ["BT1-011", "BT1-012", "BT1-013"],
          deck: ["BT1-048", "BT1-048", "BT1-048", "BT1-048"],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-011")).toBe(true);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("second").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-012", "BT1-013"]);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("third").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("third").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("keeps the face-down source card when the optional return cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-039", as: "base", under: [{ card: "BT1-071", faceUp: false }] }],
          hand: [{ card: "EX9-041", as: "evo" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("base").topCard.cardId).toBe("EX9-041");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-071", "EX9-039"]);
    expect(s.perm("base").stack[0]!.faceUp).toBe(false);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-010")).toBe(false);
    expect(s.state.memory).toBe(2);
  });

  it("does not trash security when another allied Digimon deletes in battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-080", as: "host", dp: 10000, under: ["EX9-041"] },
          { card: "BT1-009", as: "ally", dp: 10000 },
        ],
      },
      1: {
        battleArea: [{ card: "BT1-010", as: "target", dp: 1000, suspended: true }],
        security: [{ card: "BT1-011" }, { card: "BT1-012" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("does not activate when the host and opposing Digimon are deleted simultaneously", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-080", as: "host", dp: 1000, under: ["EX9-041"] }] },
        1: {
          battleArea: [{ card: "BT1-010", as: "target", dp: 1000, suspended: true }],
          security: ["BT1-011", "BT1-012"],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
