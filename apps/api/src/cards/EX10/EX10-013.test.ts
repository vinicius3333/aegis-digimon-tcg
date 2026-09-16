import { describe, expect, it } from "vitest";
import { getCardDefinition, Zone } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import compiled from "./EX10-013.js";
import "../index.js";

async function answerOptionals(s: EngineSetup, answers: boolean[]): Promise<void> {
  for (const accept of answers) {
    await settleAcrossTimers(() => s.state.pendingDecision?.kind === "optional");
    const pending = s.state.pendingDecision;
    expect(pending?.kind).toBe("optional");
    if (pending?.kind !== "optional") return;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept },
      }),
    ).toEqual({ ok: true });
    await settle();
  }
}

const LUCEMON_TEXT_MAIN_DECK = ["BT18-034", "BT4-115", "EX6-018", "BT19-043"] as const;

const neutralSeat = () => ({
  hand: ["ST1-02"],
  security: ["BT1-009", "BT1-010", "BT1-011"],
  deck: ["BT1-012", "BT1-013", "BT1-014"],
});

describe("EX10-013 Lucemon", () => {
  it("matches the catalog and compiles every printed clause", () => {
    expect(getCardDefinition("EX10-013")).toMatchObject({
      nameEn: "Lucemon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 10,
      dp: 10000,
      evoCosts: [],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Angel"],
      inheritedEffectText: "＜Blocker＞",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Blocker" })] }),
        expect.objectContaining({
          trigger: "Static",
          isInherited: true,
          keywords: [expect.objectContaining({ keyword: "Blocker" })],
        }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          isBreeding: true,
          actions: [expect.objectContaining({ kind: "MovePermanent", direction: "toBattle", optional: true })],
        }),
        expect.objectContaining({
          trigger: "EndOfYourTurn",
          actions: [
            expect.objectContaining({
              kind: "Digivolve",
              from: ["trash"],
              payCost: false,
              optional: true,
              abortOnDecline: true,
              cost: expect.objectContaining({
                kind: "return",
                target: { filter: { controller: "mine", zone: "trash", textContains: "Lucemon" }, count: 5 },
                to: "deckBottom",
                optional: true,
              }),
            }),
          ],
        }),
      ]),
    );
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Cupimon"], cost: 5, level: 2, isAlternate: true }]);
  });

  it("blocks an opponent attack through the production block window", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX10-013", as: "lucemon", dp: 20_000 }], security: ["BT1-009", "BT1-010"] },
      1: { battleArea: [{ card: "BT1-013", as: "attacker", dp: 3000 }] },
    });
    await s.ready();
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("lucemon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX10-013"]);
  });

  it("digivolves from Cupimon for 5 in breeding and may move to the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX10-004", as: "cupimon" },
          hand: [
            { card: "EX10-013", as: "lucemon" },
            { card: "BT1-002", as: "spare" },
          ],
          deck: [{ card: "BT1-012", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("cupimon").permanentId,
        instanceId: s.inst("lucemon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-013"));

    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 5, to: 0, reason: "digivolve" });
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.memory).toBe(1);
    const moved = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX10-013")!;
    expect(moved.stack.map(({ cardId }) => cardId)).toContain("EX10-004");
    expect(observe(s.engine).hasKeyword(moved, "Blocker")).toBe(true);
  });

  it("refuses an illegal base: a non-Cupimon Lv.2 cannot take the printed [Cupimon] route", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-001", as: "yokomon" },
          hand: [{ card: "EX10-013", as: "lucemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yokomon").permanentId,
        instanceId: s.inst("lucemon").instanceId,
        alternateRequirementIndex: 0,
      }).ok,
    ).toBe(false);
    await settle();
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("BT1-001");
    expect(s.state.memory).toBe(5);
  });

  it("returns 5 Lucemon-text cards on the real turn's End phase — eggs to the egg deck, the rest to the deck bottom (Q5038, Q5734)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          ...neutralSeat(),
          battleArea: [{ card: "EX10-013", as: "lucemon" }],
          trash: [
            { card: "EX10-004", as: "egg1" },
            { card: "EX10-004", as: "egg2" },
            { card: "EX10-004", as: "egg3" },
            { card: LUCEMON_TEXT_MAIN_DECK[0], as: "main1" },
            { card: LUCEMON_TEXT_MAIN_DECK[1], as: "main2" },
            { card: "BT1-009", as: "decoy1" },
            { card: "BT1-010", as: "decoy2" },
            { card: "EX10-052", as: "chaos" },
          ],
        },
        1: neutralSeat(),
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(...["egg1", "egg2", "egg3", "main1", "main2"].map((alias) => s.inst(alias).instanceId));
    const chaosId = s.inst("chaos").instanceId;

    await advance(s.engine).runTurn(0);
    await settleAcrossTimers(() => s.perm("lucemon").topCard.cardId === "EX10-052");
    await settle();

    const p0 = s.state.players[0]!;
    expect(p0.eggDeck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("egg1").instanceId,
      s.inst("egg2").instanceId,
      s.inst("egg3").instanceId,
    ]);
    expect(p0.deck.slice(-2).map(({ instanceId }) => instanceId)).toEqual([
      s.inst("main1").instanceId,
      s.inst("main2").instanceId,
    ]);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("decoy1").instanceId,
      s.inst("decoy2").instanceId,
      p0.trash[2]!.instanceId,
    ]);
    expect(p0.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-010", "ST1-02"]);
    expect(s.perm("lucemon").topCard.instanceId).toBe(chaosId);
    expect(s.perm("lucemon").stack.map(({ cardId }) => cardId)).toEqual(["EX10-013"]);
    expect(observe(s.engine).hasKeyword(s.perm("lucemon"), "Blocker")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5039 cannot pay the processing condition with only 4 matching cards", async () => {
    const s = setupEngine(
      {
        0: {
          ...neutralSeat(),
          battleArea: [{ card: "EX10-013", as: "lucemon" }],
          trash: [
            { card: "EX10-004", as: "egg1" },
            { card: LUCEMON_TEXT_MAIN_DECK[0], as: "main1" },
            { card: LUCEMON_TEXT_MAIN_DECK[1], as: "main2" },
            { card: "BT1-009", as: "decoy1" },
            { card: "EX10-052", as: "chaos" },
          ],
        },
        1: neutralSeat(),
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const trashBefore = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);

    await advance(s.engine).runTurn(0);
    await settle();

    expect(s.perm("lucemon").topCard.cardId).toBe("EX10-013");
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(trashBefore);
    expect(s.state.players[0]!.deck.every(({ cardId }) => cardId.startsWith("BT1-"))).toBe(true);
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);
  });

  it("CR 15-7-4 may decline the processing condition outright, keeping all 5 cards in trash", async () => {
    const s = setupEngine(
      {
        0: {
          ...neutralSeat(),
          battleArea: [{ card: "EX10-013", as: "lucemon" }],
          trash: [
            { card: LUCEMON_TEXT_MAIN_DECK[0], as: "cost1" },
            { card: LUCEMON_TEXT_MAIN_DECK[1], as: "cost2" },
            { card: LUCEMON_TEXT_MAIN_DECK[2], as: "cost3" },
            { card: LUCEMON_TEXT_MAIN_DECK[3], as: "cost4" },
            { card: "EX10-004", as: "cost5" },
            { card: "EX10-052", as: "chaos" },
          ],
        },
        1: neutralSeat(),
      },
      { autoDeclineOptional: true },
    );
    const trashBefore = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);

    await advance(s.engine).runTurn(0);
    await settle();

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(s.perm("lucemon").topCard.cardId).toBe("EX10-013");
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(trashBefore);
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);
    expect(s.state.players[0]!.deck.every(({ cardId }) => cardId.startsWith("BT1-"))).toBe(true);
  });

  it("Q5040 pays the 5-card condition and may still decline the Chaos Mode digivolve", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          ...neutralSeat(),
          battleArea: [{ card: "EX10-013", as: "lucemon" }],
          trash: [
            { card: LUCEMON_TEXT_MAIN_DECK[0], as: "cost1" },
            { card: LUCEMON_TEXT_MAIN_DECK[1], as: "cost2" },
            { card: LUCEMON_TEXT_MAIN_DECK[2], as: "cost3" },
            { card: LUCEMON_TEXT_MAIN_DECK[3], as: "cost4" },
            { card: "EX10-004", as: "cost5" },
            { card: "EX10-052", as: "chaos" },
          ],
        },
        1: neutralSeat(),
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(...["cost1", "cost2", "cost3", "cost4", "cost5"].map((alias) => s.inst(alias).instanceId));
    const chaosId = s.inst("chaos").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await answerOptionals(s, [true, false]);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("lucemon").topCard.cardId).toBe("EX10-013");
    expect(s.state.players[0]!.eggDeck.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost5").instanceId]);
    expect(s.state.players[0]!.deck.slice(-4).map(({ instanceId }) => instanceId)).toEqual(
      ["cost1", "cost2", "cost3", "cost4"].map((alias) => s.inst(alias).instanceId),
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([chaosId]);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5041 never evolves into the requirements-ignoring hand-only BT7-111 from trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          ...neutralSeat(),
          battleArea: [{ card: "EX10-013", as: "lucemon" }],
          trash: [
            { card: "EX10-004", as: "cost1" },
            { card: LUCEMON_TEXT_MAIN_DECK[0], as: "cost2" },
            { card: LUCEMON_TEXT_MAIN_DECK[1], as: "cost3" },
            { card: LUCEMON_TEXT_MAIN_DECK[2], as: "cost4" },
            { card: LUCEMON_TEXT_MAIN_DECK[3], as: "cost5" },
            { card: "BT7-111", as: "illegalChaos" },
          ],
        },
        1: neutralSeat(),
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(...["cost1", "cost2", "cost3", "cost4", "cost5"].map((alias) => s.inst(alias).instanceId));

    await advance(s.engine).runTurn(0);
    await settle();

    expect(s.perm("lucemon").topCard.cardId).toBe("EX10-013");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT7-111");
  });

  it("stays silent at the end of the opponent's turn and fires on the next own turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { ...neutralSeat(), battleArea: [{ card: "EX10-013", as: "lucemon" }] },
        1: neutralSeat(),
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    for (const [index, alias] of ["cost1", "cost2", "cost3", "cost4"].entries()) {
      s.give(0, Zone.Trash, { card: LUCEMON_TEXT_MAIN_DECK[index]!, as: alias });
    }
    s.give(0, Zone.Trash, { card: "EX10-004", as: "cost5" });
    s.give(0, Zone.Trash, { card: "EX10-052", as: "chaos" });
    preferred.push(...["cost1", "cost2", "cost3", "cost4", "cost5"].map((alias) => s.inst(alias).instanceId));

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("lucemon").topCard.cardId).toBe("EX10-013");
    expect(s.state.players[0]!.trash).toHaveLength(6);

    advance(s.engine).endMainPhaseIfOpen(0);
    await settleAcrossTimers(() => s.perm("lucemon").topCard.cardId === "EX10-052");
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("lucemon").topCard.cardId).toBe("EX10-052");
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toEqual(
      expect.arrayContaining(preferred),
    );

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
