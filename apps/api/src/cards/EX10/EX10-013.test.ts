import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import compiled from "./EX10-013.js";
import "../index.js";

describe("EX10-013 Lucemon compiled contract", () => {
  it("preserves Blocker, breeding move, exact five-card cost, and legal optional Chaos Mode digivolve", () => {
    expect(getCardDefinition("EX10-013")).toMatchObject({
      colors: ["Yellow"],
      level: 3,
      playCost: 10,
      dp: 10000,
      evoCosts: [],
      types: ["Angel"],
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

  it("digivolves from Cupimon for 5 in breeding and may move to the battle area", async () => {
    // Peer/stack case, not an isolated fixture. The only legal base for the printed
    // [Digivolve] [Cupimon] route is EX10-004, whose INHERITED clause reads "[Your Turn]
    // [Once Per Turn] When any of your Digimon with [Lucemon] in their names move from the
    // breeding area to the battle area, by trashing 1 card in your hand, ＜Draw 1＞ and gain
    // 1 memory." Moving this Digimon out of breeding therefore fires it, so the board carries
    // a spare hand card to pay that peer cost and the assertions below separate the two
    // memory movements: the `digivolve` event proves EX10-013's own cost of 5, and the net
    // +1 is the peer's gain.
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX10-004", as: "cupimon" },
          hand: [
            { card: "EX10-013", as: "lucemon" },
            { card: "BT1-002", as: "spare" },
          ],
          deck: [{ card: "BT1-001", as: "drawn" }],
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
    // EX10-013's printed alternate route costs exactly 5, drained in one payment.
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 5, to: 0, reason: "digivolve" });
    // Then EX10-004's inherited breeding-move clause pays its hand-trash cost and gains 1.
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.memory).toBe(1);
    const moved = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX10-013")!;
    expect(moved.stack.map(({ cardId }) => cardId)).toContain("EX10-004");
    expect(observe(s.engine).hasKeyword(moved, "Blocker")).toBe(true);
  });

  it("returns exactly 5 Lucemon-text cards, evolves into a legal Chaos Mode for free, and grants inherited Blocker", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-013", as: "lucemon" }],
          trash: [
            { card: "EX10-004", as: "cost1" },
            { card: "EX10-004", as: "cost2" },
            { card: "EX10-004", as: "cost3" },
            { card: "EX10-004", as: "cost4" },
            { card: "EX10-004", as: "cost5" },
            { card: "EX10-052", as: "chaos" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(...["cost1", "cost2", "cost3", "cost4", "cost5"].map((alias) => s.inst(alias).instanceId));
    const returnedIds = [...preferred];

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("lucemon"));
    await settle(() => s.perm("lucemon").topCard.cardId === "EX10-052");

    expect(
      [
        ...s.state.players[0]!.deck,
        ...s.state.players[0]!.eggDeck,
        ...s.state.players[0]!.security,
        ...s.state.players[0]!.hand,
        ...[...s.state.players[0]!.battleArea].flatMap(({ stack }) => [...stack]),
      ].map(({ instanceId }) => instanceId),
    ).toEqual(expect.arrayContaining(returnedIds));
    expect(s.state.players[0]!.eggDeck.map(({ instanceId }) => instanceId)).toContain(s.inst("cost1").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toEqual(
      expect.arrayContaining(returnedIds),
    );
    expect(s.perm("lucemon").stack.map(({ cardId }) => cardId)).toContain("EX10-013");
    expect(observe(s.engine).hasKeyword(s.perm("lucemon"), "Blocker")).toBe(true);
  });

  it("Q5039 cannot pay the processing condition with only 4 matching cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-013", as: "lucemon" }],
          trash: ["EX10-004", "BT18-034", "BT4-115", { card: "EX10-052", as: "chaos" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const trashBefore = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("lucemon"));
    await settle();

    expect(s.perm("lucemon").topCard.cardId).toBe("EX10-013");
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(trashBefore);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("CR 15-7-4 may decline the processing condition outright, keeping all 5 cards in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-013", as: "lucemon" }],
          trash: [
            { card: "EX10-004", as: "cost1" },
            { card: "EX10-004", as: "cost2" },
            { card: "EX10-004", as: "cost3" },
            { card: "EX10-004", as: "cost4" },
            { card: "EX10-004", as: "cost5" },
            { card: "EX10-052", as: "chaos" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    const trashBefore = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("lucemon"));
    await settle();

    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(s.perm("lucemon").topCard.cardId).toBe("EX10-013");
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(trashBefore);
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("Q5040 pays the 5-card condition and may still decline the Chaos Mode digivolve", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-013", as: "lucemon" }],
          trash: [
            { card: "EX10-004", as: "cost1" },
            { card: "EX10-004", as: "cost2" },
            { card: "EX10-004", as: "cost3" },
            { card: "EX10-004", as: "cost4" },
            { card: "EX10-004", as: "cost5" },
            { card: "EX10-052", as: "chaos" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(...["cost1", "cost2", "cost3", "cost4", "cost5"].map((alias) => s.inst(alias).instanceId));
    const returnedIds = [...preferred];
    const chaosId = s.inst("chaos").instanceId;

    let optionalsAnswered = 0;
    const run = advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("lucemon"));
    for (let step = 0; step < 4; step += 1) {
      await settle(() => s.state.pendingDecision?.kind === "optional", 40);
      const pending = s.state.pendingDecision;
      if (pending?.kind !== "optional") break;
      optionalsAnswered += 1;
      // Accept the "By returning 5 ..." payment, then refuse the digivolve itself.
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: optionalsAnswered === 1 },
      });
    }
    await run;
    await settle();

    expect(optionalsAnswered).toBe(2);
    expect(s.perm("lucemon").topCard.cardId).toBe("EX10-013");
    expect(s.state.players[0]!.eggDeck.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining(returnedIds),
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([chaosId]);
  });

  it("Q5041 never evolves into the requirements-ignoring hand-only BT7-111 from trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-013", as: "lucemon" }],
          trash: [
            { card: "EX10-004", as: "cost1" },
            { card: "BT18-034", as: "cost2" },
            { card: "BT4-115", as: "cost3" },
            { card: "EX6-018", as: "cost4" },
            { card: "BT19-043", as: "cost5" },
            { card: "BT7-111", as: "illegalChaos" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(...["cost1", "cost2", "cost3", "cost4", "cost5"].map((alias) => s.inst(alias).instanceId));

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("lucemon"));
    await settle();

    expect(s.perm("lucemon").topCard.cardId).toBe("EX10-013");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT7-111");
  });
});
