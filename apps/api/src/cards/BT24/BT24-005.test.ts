import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-005.js";
import "../index.js";

describe("BT24-005 Kyokyomon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-005")).toMatchObject({
      cardId: "BT24-005",
      nameEn: "Kyokyomon",
      colors: ["Black"],
      kinds: ["DigiEgg"],
      level: 2,
      types: ["Lesser", "X Antibody", "DigiPolice", "SEEKERS"],
    });
  });

  it("reveals exactly three cards and lets the player return them to the top or bottom", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: { kind: ["Tamer"] },
          actions: [{ kind: "RevealAdd", revealCount: 3, add: [], rest: "deckTopOrBottom" }],
        },
      ],
    });
  });

  it("ignores a placement event when the named Tamer is still in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-054", as: "host", under: ["BT24-005"] }],
          hand: [{ card: "BT24-085", as: "addedTamer" }],
          deck: [
            { card: "BT24-085", as: "revealedTamer" },
            { card: "BT24-066", as: "revealedDigimon" },
            { card: "BT1-009", as: "revealedNonMatch" },
            { card: "BT1-001", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    const originalDeckIds = s.state.players[0]!.deck.map((card) => card.instanceId).sort();

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("addedTamer").instanceId],
    });

    expect(s.events.filter((event) => event.kind === "cardRevealed")).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("addedTamer").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId).sort()).toEqual(originalDeckIds);
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(s.state.players[0]!.deck.every((card) => card.faceUp === false)).toBe(true);
  });

  it("does not reveal when a non-Tamer is added or a different host receives the Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-054", as: "host", under: ["BT24-005"] },
          { card: "BT24-054", as: "otherHost" },
        ],
        hand: [
          { card: "BT24-085", as: "tamer" },
          { card: "BT24-066", as: "digimon" },
        ],
        deck: [{ card: "BT1-001", as: "top" }, "BT1-002", "BT1-003"],
      },
    });

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("digimon").instanceId],
    });
    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("otherHost").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("tamer").instanceId],
    });

    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("top").instanceId);
    expect(s.state.players[0]!.deck.every((card) => card.faceUp === false)).toBe(true);
  });

  it("reaches Tamer placement through BT24-086's public play and Mind Link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-054", as: "host", under: ["BT24-005"] },
            { card: "BT24-086", as: "mindLinker" },
          ],
          hand: [{ card: "BT24-054", as: "playedDigimon" }],
          deck: [{ card: "BT1-001", as: "first" }, "BT1-002", "BT1-003", "BT1-004"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedDigimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === s.inst("mindLinker").instanceId));
    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(s.inst("mindLinker").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });

  it.each([
    [0, ["BT1-045", "BT1-013", "BT1-015", "BT1-009"]],
    [1, ["BT1-009", "BT1-045", "BT1-013", "BT1-015"]],
  ])(
    "reveals three cards and returns them to the %s of deck with visible order metadata",
    async (optionIndex, expected) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT24-054", as: "host", under: ["BT24-005", { card: "BT24-085", as: "addedTamer" }] }],
            deck: [
              { card: "BT1-013", as: "first" },
              { card: "BT1-015", as: "second" },
              { card: "BT1-045", as: "third" },
              { card: "BT1-009", as: "unrevealed" },
            ],
          },
        },
        { autoSelectCards: true, autoOrderCards: false, preferOptionIndex: optionIndex },
      );
      await s.ready();
      const trigger = advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
        subjectPermanentId: s.perm("host").permanentId,
        addedDigivolutionCardInstanceIds: [s.inst("addedTamer").instanceId],
      });
      await settle(() => s.state.pendingDecision?.kind === "orderCards");
      expect(s.events.filter((event) => event.kind === "cardRevealed")).toEqual([
        { kind: "cardRevealed", seat: 0, cardId: "BT1-013" },
        { kind: "cardRevealed", seat: 0, cardId: "BT1-015" },
        { kind: "cardRevealed", seat: 0, cardId: "BT1-045" },
      ]);
      const orderDecision = s.decisions.at(-1)!.req;
      expect(orderDecision.kind).toBe("orderCards");
      expect(orderDecision.options?.visibleCards).toEqual(
        expect.arrayContaining([
          { instanceId: s.inst("first").instanceId, cardId: "BT1-013" },
          { instanceId: s.inst("second").instanceId, cardId: "BT1-015" },
          { instanceId: s.inst("third").instanceId, cardId: "BT1-045" },
        ]),
      );
      expect(orderDecision.options?.orderDestination).toBe(optionIndex === 0 ? "deckTop" : "deckBottom");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: orderDecision.decisionId,
          response: {
            kind: "orderCards",
            order: [s.inst("third").instanceId, s.inst("first").instanceId, s.inst("second").instanceId],
          },
        }),
      ).toEqual({ ok: true });
      await trigger;
      expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(expected);
      expect(s.state.players[0]!.hand).toHaveLength(0);
      expect(s.state.players[0]!.deck.every((card) => card.faceUp === false)).toBe(true);
      await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
        subjectPermanentId: s.perm("host").permanentId,
        addedDigivolutionCardInstanceIds: [s.inst("addedTamer").instanceId],
      });
      expect(s.events.filter((event) => event.kind === "cardRevealed")).toHaveLength(3);
      expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(expected);
    },
  );

  it("does not trigger during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-054", as: "host", under: ["BT24-005", { card: "BT24-085", as: "tamer" }] }],
        deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const before = s.state.players[0]!.deck.map((card) => card.instanceId);
    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("tamer").instanceId],
    });
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(before);
  });

  it("reaches Kyokyomon through a legal black egg-to-DigiPolice evolution stack", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT24-005", as: "egg" },
        hand: [{ card: "BT24-054", as: "ryudamon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    const eggId = s.perm("egg").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggId,
        instanceId: s.inst("ryudamon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT24-054");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT24-005"]);
  });
});
