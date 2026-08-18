import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX3-038.js";
import "./EX3-045.js";

const whenDigivolving = "[When Digivolving] You may suspend 1 Digimon.";
const endTurn =
  "[End of Your Turn][Once Per Turn] If you have 2 or more suspended Digimon with [Vegetation], [Plant], or [Fairy] in one of their traits, return 1 of your opponent's suspended Digimon to the bottom of its owner's deck.";

describe("EX3-045 Hydramon", () => {
  it("has the official errata metadata and digivolves from a green level 5 for 5", async () => {
    expect(getCardDefinition("EX3-045")).toMatchObject({
      cardId: "EX3-045",
      nameEn: "Hydramon",
      colors: ["Green"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 5 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Vegetation"],
      rarity: "SR",
      imageId: "EX3-045-Errata",
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-043", as: "base" }],
        hand: [{ card: "EX3-045", as: "hydramon" }],
        deck: ["BT1-003"],
      },
    });
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("hydramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-045");

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").topCard.cardId).toBe("EX3-045");
  });

  it("may suspend exactly 1 chosen Digimon on digivolution, including an opponent's", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-043", as: "base" }],
          hand: [{ card: "EX3-045", as: "hydramon" }],
          deck: ["BT1-003"],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "chosen" },
            { card: "BT1-029", as: "untouched" },
            { card: "BT1-030", suspended: true, as: "alreadySuspended" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").permanentId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("hydramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("chosen").isSuspended);

    expect(s.perm("base").topCard.cardId).toBe("EX3-045");
    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(s.perm("untouched").isSuspended).toBe(false);
    expect(s.perm("alreadySuspended").isSuspended).toBe(true);
    const targetRequest = s.decisions.find(({ req }) => req.kind === "chooseTargets")!.req;
    expect(targetRequest).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-045",
      options: { timing: "WhenDigivolving", effectText: whenDigivolving, min: 1, max: 1 },
    });
    expect(targetRequest.options!.candidateInstanceIds).not.toContain(s.perm("alreadySuspended").permanentId);
  });

  it("can decline the optional When Digivolving suspension without opening a target choice", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-043", as: "base" }],
        hand: [{ card: "EX3-045", as: "hydramon" }],
        deck: ["BT1-003"],
      },
      1: { battleArea: [{ card: "BT1-028", as: "opponent" }] },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("hydramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.state.pendingDecision!;
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "optional",
      sourceCardId: "EX3-045",
      options: { timing: "WhenDigivolving", effectText: whenDigivolving },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-045");

    expect(s.perm("opponent").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets")).toHaveLength(0);
  });

  it("gains memory for every other suspended Vegetation or Fairy Digimon when an opponent suspends", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-045", suspended: true, as: "hydramon" },
          { card: "EX3-038", suspended: true, as: "vegetation" },
          { card: "BT1-047", suspended: true, as: "fairy" },
        ],
      },
      1: { battleArea: [{ card: "BT1-028", as: "opponent" }] },
    });
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    await settle(() => s.state.memory === 2);

    expect(s.state.memory).toBe(2);
    expect(s.events.some(({ kind }) => kind === "memoryChanged")).toBe(true);
  });

  it("Vegetation family: Pomumon's effect suspends the opponent and feeds Hydramon's watcher", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-045", as: "hydramon" },
            { card: "EX3-038", as: "pomumon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-028", as: "opponent" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").permanentId);
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).verb.suspend([s.perm("pomumon").permanentId]);
    await settle(() => s.perm("opponent").isSuspended && s.state.memory === 1);

    expect(s.perm("pomumon").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("ignores an own suspension and is once per turn across two opposing suspensions", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-045", as: "hydramon" },
          { card: "EX3-038", suspended: true, as: "vegetation" },
          { card: "BT1-028", as: "ownDigimon" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-028", as: "firstOpponent" },
          { card: "BT1-029", as: "secondOpponent" },
        ],
      },
    });
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).verb.suspend([s.perm("ownDigimon").permanentId]);
    expect(s.state.memory).toBe(0);
    await advance(s.engine).verb.suspend([s.perm("firstOpponent").permanentId]);
    await settle(() => s.state.memory === 1);
    await advance(s.engine).verb.suspend([s.perm("secondOpponent").permanentId]);
    await settle();

    expect(s.state.memory).toBe(1);
  });

  it("uses its once-per-turn activation even when there are no other suspended family Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-045", as: "hydramon" },
          { card: "BT1-047", as: "fairy" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-028", as: "firstOpponent" },
          { card: "BT1-029", as: "secondOpponent" },
        ],
      },
    });
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).verb.suspend([s.perm("firstOpponent").permanentId]);
    await settle();
    await advance(s.engine).verb.suspend([s.perm("fairy").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("secondOpponent").permanentId]);
    await settle();

    expect(s.state.memory).toBe(0);
  });

  it("resets its memory once-per-turn use on the controller's next turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-045", as: "hydramon" },
          { card: "BT1-047", suspended: true, as: "fairy" },
        ],
        deck: ["BT1-001", "BT1-002", "BT1-003"],
      },
      1: {
        battleArea: [
          { card: "BT1-028", as: "firstOpponent" },
          { card: "BT1-029", as: "secondOpponent" },
        ],
        deck: ["BT1-004", "BT1-005", "BT1-006"],
      },
    });
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).verb.suspend([s.perm("firstOpponent").permanentId]);
    await settle(() => s.state.memory === 1);
    const firstTurn = s.state.turnCount;
    await advance(s.engine).runTurn(0);
    expect(s.state.turnCount).toBeGreaterThan(firstTurn);
    s.state.turnSeat = 0;
    s.state.memory = 0;
    s.perm("fairy").isSuspended = true;
    await advance(s.engine).verb.suspend([s.perm("secondOpponent").permanentId]);
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
  });

  it("returns a chosen suspended opposing Digimon to deck bottom at end of turn and trashes its sources", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-045", suspended: true, as: "hydramon" },
            { card: "EX3-038", suspended: true, as: "vegetation" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-028", under: ["BT1-003"], suspended: true, as: "chosen" },
            { card: "BT1-029", suspended: true, as: "untouched" },
          ],
          deck: ["BT1-004"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("hydramon"));
    await settle(() => !s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-028"));

    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-028");
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-003");
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-029")).toBe(true);
    expect(s.decisions.find(({ req }) => req.sourceCardId === "EX3-045")?.req).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-045",
      options: { timing: "OnEndTurn", effectText: endTurn, min: 1, max: 1 },
    });
  });

  it("does not offer the end-turn action below 2 suspended family Digimon or during the opponent's turn", async () => {
    for (const opponentTurn of [false, true]) {
      const s = setupEngine({
        0: {
          battleArea: [
            { card: "EX3-045", suspended: !opponentTurn, as: "hydramon" },
            ...(opponentTurn ? [{ card: "EX3-038", suspended: true, as: "vegetation" }] : []),
          ],
        },
        1: { battleArea: [{ card: "BT1-028", suspended: true, as: "opponent" }] },
      });
      await s.ready();
      if (opponentTurn) s.state.turnSeat = 1;

      await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("hydramon"));
      await settle();

      expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-028")).toBe(true);
      expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-045")).toHaveLength(0);
    }
  });

  it("keeps the All Turns memory watcher active during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-045", as: "hydramon" },
          { card: "EX3-038", suspended: true, as: "vegetation" },
        ],
      },
      1: { battleArea: [{ card: "BT1-028", as: "opponent" }] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 0;

    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    await settle(() => s.state.memory === -1);

    expect(s.state.memory).toBe(-1);
  });
});
