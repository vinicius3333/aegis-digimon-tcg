import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, settle, setupEngine, type CardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-056.js";

describe("BT14-056", () => {
  it("reveals five and adds a D-Brigade or DigiPolice card", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 5,
      rest: "deckTopOrBottom",
      add: [
        { count: 1, to: "hand", filter: { nameOrTrait: [{ tokens: ["D-Brigade", "DigiPolice"], match: "trait" }] } },
      ],
    }));
  it("inherits once-per-turn leave-play prevention by deleting another D-Brigade Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "otherThanYourEffect",
          actions: [{ kind: "Prevent", cost: { kind: "deleteOwn" } }],
        },
      ],
    }));

  it("naturally plays the matching D-Brigade card from the top-five reveal", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT14-056", as: "commandramon" }],
          deck: ["BT14-060", "AD1-001", "AD1-002", "AD1-003", "AD1-004"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("commandramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT14-060"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT14-060")).toBe(true);
  });

  it("naturally replaces a battle deletion only by deleting another D-Brigade Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-058", as: "host", dp: 2000, suspended: true, under: ["BT14-056"] },
            { card: "BT14-056", as: "sacrifice" },
          ],
        },
        1: { battleArea: [{ card: "BT14-042", as: "attacker", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const hostId = s.perm("host").permanentId;
    const sacrificeId = s.perm("sacrifice").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId) &&
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sacrificeId),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sacrificeId)).toBe(false);
  });

  it("resets inherited leave prevention on the next natural turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-060", as: "host", suspended: true, under: ["BT14-056"] },
            { card: "BT14-056", as: "firstCost" },
            { card: "BT14-056", as: "secondCost" },
            { card: "BT14-055", as: "nearTrait" },
            { card: "BT1-009", as: "neutral" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          hand: ["BT1-009"],
          security: ["BT1-091", "BT1-091", "BT1-091"],
        },
        1: {
          battleArea: [{ card: "BT1-043", as: "attacker" }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-091", "BT1-091"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const hostId = s.perm("host").permanentId;
    const firstCostId = s.perm("firstCost").permanentId;
    const secondCostId = s.perm("secondCost").permanentId;

    const firstOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId) &&
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === firstCostId),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === secondCostId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-055")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-009")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await firstOpponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const secondOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId) &&
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === secondCostId),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === firstCostId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === secondCostId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-055")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-009")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await secondOpponentTurn;
  });
});

describe("BT14-056 Commandramon — KB Q&A rulings", () => {
  const isOnBoard = (s: EngineSetup, permanentId: string): boolean =>
    s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentId);
  const isTrashed = (s: EngineSetup, instanceId: string): boolean =>
    s.state.players[0]!.trash.some((card) => card.instanceId === instanceId);

  async function playCommandramonRevealing(deck: CardSpec[]): Promise<string[]> {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT14-056", as: "commandramon" }], deck } },
      { autoSelectCards: true, autoChooseOption: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("commandramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length + s.state.players[0]!.hand.length === deck.length);
    await drainMicrotasks(50);
    return s.state.players[0]!.hand.map((card) => card.cardId);
  }

  it("adds a revealed Tamer or Option card with the [D-Brigade] or [DigiPolice] trait to the hand (Q2425)", async () => {
    const fillers = ["AD1-001", "AD1-002", "AD1-003", "AD1-004"];
    expect(await playCommandramonRevealing(["BT14-086", ...fillers])).toEqual(["BT14-086"]);
    expect(await playCommandramonRevealing(["BT14-098", ...fillers])).toEqual(["BT14-098"]);
    expect(await playCommandramonRevealing(["AD1-005", ...fillers])).toEqual([]);
  });

  async function opponentPlacesHostUnderAnotherDigimon(sacrificeCard: string) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-019", as: "host", under: ["BT14-056"] },
            { card: "BT1-010", as: "destination" },
            { card: sacrificeCard, as: "sacrifice" },
          ],
        },
        1: {
          battleArea: [{ card: "BT11-082", as: "bagraArmy" }],
          hand: [{ card: "BT11-109", as: "astralSnatcher" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("host").topCard!.instanceId, s.perm("destination").topCard!.instanceId);
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const hostId = s.perm("host").permanentId;
    const sacrificeId = s.perm("sacrifice").permanentId;
    const hostTopId = s.perm("host").topCard!.instanceId;
    const sacrificeTopId = s.perm("sacrifice").topCard!.instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("astralSnatcher").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("astralSnatcher").instanceId),
    );
    await drainMicrotasks(50);
    return {
      hostInPlay: isOnBoard(s, hostId),
      sacrificeInPlay: isOnBoard(s, sacrificeId),
      sacrificeDeleted: isTrashed(s, sacrificeTopId),
      hostUnderDestination: s.perm("destination").stack.some((card) => card.instanceId === hostTopId),
    };
  }

  it("prevents an opponent's effect from placing the Digimon under another of your Digimon by deleting a [D-Brigade] Digimon (Q2426)", async () => {
    const prevented = await opponentPlacesHostUnderAnotherDigimon("BT4-063");
    expect(prevented).toEqual({
      hostInPlay: true,
      sacrificeInPlay: false,
      sacrificeDeleted: true,
      hostUnderDestination: false,
    });

    const withoutDBrigade = await opponentPlacesHostUnderAnotherDigimon("BT1-009");
    expect(withoutDBrigade).toEqual({
      hostInPlay: false,
      sacrificeInPlay: true,
      sacrificeDeleted: false,
      hostUnderDestination: true,
    });
  });

  type LeaveDestination = "hand" | "deck" | "security";

  async function opponentOptionRemovesHost(optionCard: string, sacrificeCard: string, preferOptionIndex = 0) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-019", as: "host", under: ["BT14-056"] },
            { card: sacrificeCard, as: "sacrifice" },
            { card: "BT1-010", as: "bystander" },
          ],
          security: 1,
        },
        1: {
          battleArea: ["BT1-027", "BT1-045", "BT2-067"],
          hand: [{ card: optionCard, as: "option" }],
          security: 2,
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferOptionIndex, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("host").topCard!.instanceId);
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const owner = s.state.players[0]!;
    const hostId = s.perm("host").permanentId;
    const hostTopId = s.perm("host").topCard!.instanceId;
    const sacrificeId = s.perm("sacrifice").permanentId;
    const sacrificeTopId = s.perm("sacrifice").topCard!.instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    await drainMicrotasks(50);
    const holds = (zone: Iterable<{ instanceId: string }>) =>
      Array.from(zone).some((card) => card.instanceId === hostTopId);
    const hostDestination: LeaveDestination | undefined = holds(owner.hand)
      ? "hand"
      : holds(owner.deck)
        ? "deck"
        : holds(owner.security)
          ? "security"
          : undefined;
    return {
      hostInPlay: isOnBoard(s, hostId),
      hostDestination,
      sacrificeInPlay: isOnBoard(s, sacrificeId),
      sacrificeDeleted: isTrashed(s, sacrificeTopId),
    };
  }

  it("treats return to hand, return to deck and placement in security as leaving the battle area (Q2427)", async () => {
    const placeAtSecurityBottom = 1;
    const removals: [string, LeaveDestination, number?][] = [
      ["ST2-16", "hand"],
      ["BT6-098", "deck"],
      ["ST10-14", "security", placeAtSecurityBottom],
    ];
    for (const [optionCard, destination, optionIndex] of removals) {
      expect(await opponentOptionRemovesHost(optionCard, "BT1-009", optionIndex)).toEqual({
        hostInPlay: false,
        hostDestination: destination,
        sacrificeInPlay: true,
        sacrificeDeleted: false,
      });
      expect(await opponentOptionRemovesHost(optionCard, "BT4-063", optionIndex)).toEqual({
        hostInPlay: true,
        hostDestination: undefined,
        sacrificeInPlay: false,
        sacrificeDeleted: true,
      });
    }
  });
});
