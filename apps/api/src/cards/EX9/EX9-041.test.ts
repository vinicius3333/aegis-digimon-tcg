import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-041.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-041", () => {
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
      actions: [{ actions: [{ mode: "reduceCost", amount: 1, scaling: { unit: "digivolutionCards", per: 1 } }] }],
    });
  });
  it("suspends and may return the lowest-DP suspended opponent Digimon by trashing its bottom face-down card", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({
      actions: [
        { kind: "Suspend" },
        {
          kind: "Return",
          to: "hand",
          cost: { kind: "trash" },
          target: { filter: { suspended: true, superlative: "lowestDP" } },
        },
      ],
    }));
  it("inherits security trash when an opponent Digimon is deleted in battle", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
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
              card: "EX9-041",
              as: "source",
              under: [
                { card: "EX9-034", faceUp: false },
                { card: "EX9-038", faceUp: true },
              ],
            },
          ],
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
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT1-009"));
    await settle();
    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.perm("source").stack[0]!.faceUp).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-010")).toBe(true);
    expect(s.perm("high").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX9-034");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("trashes the opponent's top security when the inherited host deletes in battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-080", as: "host", dp: 10000, under: ["EX9-041"] }] },
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
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-011")).toBe(true);
  });

  it("keeps the face-down source card when the optional return cost is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-041", as: "source", under: [{ card: "BT1-071", faceUp: false }] }] },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.perm("source").stack[0]!.faceUp).toBe(false);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-010")).toBe(false);
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
