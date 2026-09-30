import { describe, expect, it } from "vitest";
import { setupEngine, settle, type BoardSpec } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT22-086.js";
import "../index.js";
import { battleAreaCardIds, cardIdsIn, runTurnThroughMainStart } from "./returningTamer.testSupport.js";

describe("BT22-086 Yao Qinglan", () => {
  it("models the return-gated start-main sequence and empty-board Sangomon condition", () => {
    const start = compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase");
    expect(start?.actions).toHaveLength(1);
    expect(start?.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      cost: { kind: "return", to: "deckBottom", target: { filter: { isSelfRef: true } } },
      actions: [
        { kind: "PlayWithoutCost", from: ["hand"], optional: true },
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          condition: { kind: "youHaveNone", filter: { kind: ["Digimon"] } },
        },
      ],
    });
  });

  it("suspends this Tamer to draw when an effect adds cards to an own Aqua or Sea Animal Digimon", () => {
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    expect(allTurns?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { controllerDefault: "mine" },
      triggerFilter: {
        controllerDefault: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "traitContains" }],
      },
      cost: { kind: "suspend", target: { filter: { isSelfRef: true } } },
      actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
      optional: true,
      abortOnDecline: true,
    });
  });

  it("plays itself from security without cost", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true });
    expect(security?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      target: { filter: { isSelfRef: true }, isSelf: true },
    });
  });

  it("moves the physical Tamer from hand to battle through the public intent", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT22-086", as: "yao" }] } });
    const id = s.inst("yao").instanceId;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: id })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === id));
    expect(s.state.memory).toBe(2);
  });

  it("returns itself before playing Sangomon even without another Yao in hand", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT22-086", as: "yao" }], trash: [{ card: "BT22-018", as: "sangomon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-018"));

    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT22-086")).toBe(true);
  });

  it("draws when a public digivolve adds a card to an Aqua/Sea Animal Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-086", as: "yao" },
            { card: "BT1-033", under: [{ card: "BT22-069", as: "added" }], as: "base" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("base").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("added").instanceId],
    });
    await settle(() => s.perm("yao").isSuspended && s.state.players[0]!.hand.length > 0, 400);

    expect(s.perm("yao").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it.each([
    { traits: "[Aquatic], which contains [Aqua]", base: "BT12-025", draws: true },
    { traits: "neither [Aqua] nor [Sea Animal]", base: "BT1-009", draws: false },
  ])("reads [Aqua] or [Sea Animal] in any trait: $traits", async ({ base, draws }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-086", as: "yao" },
            { card: base, under: [{ card: "BT22-069", as: "added" }], as: "base" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("base").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("added").instanceId],
    });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("yao").isSuspended).toBe(draws);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(draws ? ["BT1-010"] : []);
  });

  it("plays Yao Qinglan from security during a public security check", async () => {
    const s = setupEngine(
      { 0: { security: ["BT22-086"] }, 1: { battleArea: [{ card: "BT1-009", as: "attacker" }] } },
      { autoAcceptOptional: true },
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
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-086"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-086")).toBe(true);
  });
});

describe("BT22-086 Yao Qinglan — KB Q&A rulings", () => {
  const board = (hand: string[]): BoardSpec => ({
    0: {
      battleArea: [{ card: "BT22-086", as: "yao" }],
      hand,
      trash: ["BT4-022"],
      deck: ["BT1-010", "BT1-011"],
    },
  });

  it('does not process the part after "then" unless it returns this Tamer to the deck (Q4956)', async () => {
    await runTurnThroughMainStart(board([]), false, (declined) => {
      expect(battleAreaCardIds(declined)).toEqual(["BT22-086"]);
      expect(cardIdsIn(declined.state.players[0]!.trash)).toEqual(["BT4-022"]);
    });

    await runTurnThroughMainStart(board([]), true, (accepted) => {
      expect(battleAreaCardIds(accepted)).toEqual(["BT4-022"]);
      expect(accepted.state.players[0]!.deck.at(-1)?.instanceId).toBe(accepted.inst("yao").instanceId);
    });
  });

  it("does not activate the [Start of Your Main Phase] effect of the Yao Qinglan it played (Q5558)", async () => {
    await runTurnThroughMainStart(board(["BT22-086", "BT22-086"]), true, (s) => {
      expect(battleAreaCardIds(s).filter((cardId) => cardId === "BT22-086")).toHaveLength(1);
      expect(cardIdsIn(s.state.players[0]!.hand).filter((cardId) => cardId === "BT22-086")).toHaveLength(1);
      expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("yao").instanceId);
    });
  });
});
