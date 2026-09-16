import { getCardDefinition, Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-042.js";
import "../index.js";

const CARD_ID = "EX10-042";

async function answerOptional(s: EngineSetup, accept: boolean, promptMatch: RegExp): Promise<void> {
  await settle(() => s.state.pendingDecision?.kind === "optional");
  const pending = s.state.pendingDecision;
  expect(pending?.kind, "an optional prompt was expected").toBe("optional");
  expect(pending!.promptText).toMatch(promptMatch);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: pending!.decisionId,
      response: { kind: "optional", accept },
    }),
  ).toEqual({ ok: true });
}

const stackCardIds = (s: EngineSetup, alias: string): string[] => s.perm(alias).stack.map((card) => card.cardId);

describe("EX10-042 GulusGammamon", () => {
  it("records the exact catalog, including the printed clauses this suite proves", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "GulusGammamon",
      colors: ["Purple", "Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Purple", level: 3, memoryCost: 3 },
        { color: "Red", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dragonkin"],
      inheritedEffectText: "＜Raid＞",
    });
    expect(getCardDefinition(CARD_ID)!.effectText).toContain(
      "1 Digimon card with [Gammamon]\u00a0in its name from your trash",
    );
  });

  it("compiles the three printed clauses with the right name-match strictness", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Gammamon"], cost: 2, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "TrashTopDeck", controller: "mine", amount: 2 },
          {
            kind: "PlaceUnder",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Gammamon"], match: "name" }],
              },
              count: 1,
              from: ["trash"],
            },
            position: "bottom",
            optional: true,
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Digivolve",
              into: { nameOrTrait: [{ tokens: ["Regulusmon"], match: "nameExact" }] },
              from: ["hand", "trash"],
              payCost: true,
              reduceCost: 1,
              optional: true,
            },
          ],
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({ keywords: [{ keyword: "Raid" }] });
  });

  it("[On Play]: mills 2, places the trash [Gammamon] card at the stack bottom, then digivolves into Regulusmon for 1 less", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "bystander" }],
          hand: [
            { card: CARD_ID, as: "gulus" },
            { card: "BT21-077", as: "regulus" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [
            { card: "BT1-013", as: "mill1" },
            { card: "BT1-009", as: "mill2" },
            { card: "BT1-014", as: "rest" },
          ],
          trash: [
            { card: "LM-016", as: "gammamon" },
            { card: "BT1-013", as: "nonMatch" },
          ],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("gammamon").instanceId, s.inst("regulus").instanceId);
    s.state.memory = 9;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gulus").instanceId })).toEqual({ ok: true });
    await answerOptional(s, true, /place/i);
    await answerOptional(s, true, /digivolve/i);
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT21-077"));

    const gulus = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT21-077")!;
    expect(gulus.stack.map((card) => card.instanceId)).toEqual([
      s.inst("gammamon").instanceId,
      s.inst("gulus").instanceId,
    ]);
    expect(gulus.topCard.instanceId).toBe(s.inst("regulus").instanceId);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("nonMatch").instanceId,
      s.inst("mill1").instanceId,
      s.inst("mill2").instanceId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("spare").instanceId,
      s.inst("rest").instanceId,
    ]);
    expect(s.perm("bystander").topCard.cardId).toBe(CARD_ID);
    expect(s.perm("bystander").stack).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(gulus, "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("bystander"), "Raid")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("[When Digivolving] over [Gammamon] for cost 2: mills 2, places, and the Regulusmon digivolve may be declined", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-016", as: "base" }],
          hand: [
            { card: CARD_ID, as: "gulus" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [
            { card: "BT1-013", as: "mill1" },
            { card: "BT1-009", as: "mill2" },
            { card: "BT1-014", as: "rest" },
          ],
          trash: [
            { card: "BT8-008", as: "gammamon" },
            { card: "BT1-013", as: "nonMatch" },
            { card: "BT21-077", as: "regulus" },
          ],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("gammamon").instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gulus").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await answerOptional(s, true, /place/i);
    await answerOptional(s, false, /digivolve/i);
    await settle(() => stackCardIds(s, "base").length === 2);

    expect(s.perm("base").topCard.instanceId).toBe(s.inst("gulus").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([
      s.inst("gammamon").instanceId,
      s.inst("base").instanceId,
    ]);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("spare").instanceId,
      s.inst("mill1").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("nonMatch").instanceId,
      s.inst("regulus").instanceId,
      s.inst("mill2").instanceId,
      s.inst("rest").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("refuses an illegal digivolution source: a green Lv.3 base, and the [Gammamon] route from a non-Gammamon base", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-064", as: "green" },
          { card: "BT1-009", as: "red" },
        ],
        hand: [{ card: CARD_ID, as: "gulus" }],
        deck: ["BT1-013", "BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("green").permanentId,
        instanceId: s.inst("gulus").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("red").permanentId,
        instanceId: s.inst("gulus").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });

    expect(s.perm("green").topCard.cardId).toBe("BT1-064");
    expect(s.perm("red").topCard.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("gulus").instanceId);
    expect(s.state.memory).toBe(5);
  });

  it("places nothing when the trash holds no [Gammamon]-named Digimon, so the Regulusmon watcher never fires", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "gulus" },
            { card: "BT21-077", as: "regulus" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [
            { card: "BT1-013", as: "mill1" },
            { card: "BT1-009", as: "mill2" },
            { card: "BT1-014", as: "rest" },
          ],
          trash: [{ card: "BT1-013", as: "nonMatch" }],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 9;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gulus").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 3);

    const gulus = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === CARD_ID)!;
    expect(gulus.stack).toHaveLength(0);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("regulus").instanceId,
      s.inst("spare").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("[Once Per Turn]: a second same-turn placement offers nothing, and the next own turn resets it", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gulus" },
            { card: "P-097", as: "legend" },
          ],
          hand: [
            { card: "BT9-109", as: "xAntibody" },
            { card: "EX6-065", as: "arms1" },
            { card: "EX6-065", as: "arms2" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014", "BT1-009"],
          trash: [
            { card: "P-097", as: "zuba1" },
            { card: "ST13-02", as: "zuba2" },
            { card: "BT21-077", as: "regulus" },
          ],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          hand: ["BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("gulus").permanentId, s.perm("gulus").topCard.instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("xAntibody").instanceId })).toEqual({
      ok: true,
    });
    await answerOptional(s, false, /digivolve/i);
    await settle(() => s.perm("gulus").stack.length === 1 && s.state.pendingDecision === undefined);
    expect(stackCardIds(s, "gulus")).toEqual(["BT9-109"]);
    expect(s.perm("gulus").topCard.cardId).toBe(CARD_ID);

    const decisionsBefore = s.decisions.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arms1").instanceId })).toEqual({ ok: true });
    await answerOptional(s, true, /plac/i);
    await settle(() => s.perm("gulus").stack.length === 2 && s.state.pendingDecision === undefined);

    expect(stackCardIds(s, "gulus")).toEqual(["BT9-109", "P-097"]);
    expect(
      s.decisions
        .slice(decisionsBefore)
        .filter((entry) => entry.req.kind === "optional" && /digivolve/i.test(entry.req.promptText ?? "")),
    ).toEqual([]);
    expect(s.perm("gulus").topCard.cardId).toBe(CARD_ID);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("regulus").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arms2").instanceId })).toEqual({ ok: true });
    await answerOptional(s, true, /plac/i);
    await answerOptional(s, false, /digivolve/i);
    await settle(() => s.perm("gulus").stack.length === 3 && s.state.pendingDecision === undefined);

    expect(stackCardIds(s, "gulus")).toEqual(["BT9-109", "P-097", "ST13-02"]);
    expect(s.perm("gulus").topCard.cardId).toBe(CARD_ID);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("regulus").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[Your Turn]: an opponent's effect placing cards under it on their turn offers nothing", async () => {
    const preferred: string[] = [];
    const placementTurnSeats: { instanceIds: string[]; turnSeat: number }[] = [];
    let liveState: { turnSeat: number } | undefined;
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "gulus" },
            { card: "BT1-009", as: "victim" },
          ],
          hand: ["BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          trash: [{ card: "BT21-077", as: "regulus" }],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          hand: [
            { card: "BT11-088", as: "bagramon" },
            { card: "BT1-013", as: "theirSpare" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      {
        autoSelectCards: true,
        autoChooseOption: true,
        autoAcceptOptional: true,
        preferInstanceIds: preferred,
        onEvent: (event) => {
          if (event.kind === "cardsMoved" && event.to === Zone.BattleArea && liveState !== undefined) {
            placementTurnSeats.push({ instanceIds: [...event.instanceIds], turnSeat: liveState.turnSeat });
          }
        },
      },
    );
    liveState = s.state;
    preferred.push(s.perm("victim").topCard.instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;

    const decisionsBefore = s.decisions.length;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("bagramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("gulus").stack.length === 1 && s.state.pendingDecision === undefined);

    expect(
      placementTurnSeats
        .filter((entry) => entry.instanceIds.includes(s.perm("gulus").stack[0]!.instanceId))
        .map((entry) => entry.turnSeat),
    ).toEqual([1]);
    expect(stackCardIds(s, "gulus")).toEqual(["BT1-009"]);
    expect(s.perm("gulus").topCard.cardId).toBe(CARD_ID);
    expect(
      s.decisions
        .slice(decisionsBefore)
        .filter((entry) => entry.req.kind === "optional" && /digivolve/i.test(entry.req.promptText ?? "")),
    ).toEqual([]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("regulus").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
