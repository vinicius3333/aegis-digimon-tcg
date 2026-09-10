import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-071.js";
import "../index.js";

describe("EX5-071 Loyalty Deeper than the Sea", () => {
  it("matches the catalog contract", () => {
    expect(getCardDefinition("EX5-071")).toMatchObject({
      cardId: "EX5-071",
      nameEn: "Loyalty Deeper than the Sea",
      colors: ["White"],
      kinds: ["Option"],
      playCost: 1,
      types: ["Deva"],
      effectText: expect.stringContaining("Reveal the top 3 cards of your deck"),
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
  });
  it("waives color requirements with a Deva/Four Sovereigns Digimon and reveals three for a trait card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ match: "trait", tokens: ["Deva", "Four Sovereigns"] }],
        },
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        {
          count: 1,
          to: "placeUnder",
          underFilter: { controllerDefault: "mine", kind: ["Digimon"] },
          filter: { controllerDefault: "mine", nameOrTrait: [{ match: "trait", tokens: ["Deva", "Four Sovereigns"] }] },
          orDispositions: [{ to: "hand" }],
        },
      ],
      rest: "deckTopOrBottom",
    });
  });
  it("uses the public Main intent to place a revealed Deva under an own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-079", as: "host" }],
          hand: [{ card: "EX5-071", as: "option" }],
          deck: ["BT10-079", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").stack.some((card) => card.cardId === "BT10-079"));
    expect(s.perm("host").stack.some((card) => card.cardId === "BT10-079")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("adds a revealed Deva to hand when the public disposition choice selects hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-079", as: "host" }],
          hand: [{ card: "EX5-071", as: "option" }],
          deck: ["BT10-079", "BT1-009", "BT1-010"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
        autoOrderCards: true,
      },
    );
    s.state.memory = 1;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT10-079"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT10-079")).toBe(true);
    expect(s.perm("host").stack).toHaveLength(0);
  });

  it("cannot place under a Digimon when none exists, but can choose the hand disposition, per Q3683", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-095", as: "whiteTamer" }],
          hand: [{ card: "EX5-071", as: "option" }],
          deck: ["BT10-079", "BT1-009", "BT1-010"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderCards: true,
      },
    );
    s.state.memory = 1;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseOption");
    const disposition = s.decisions.at(-1)?.req;
    expect(disposition?.kind).toBe("chooseOption");
    expect(disposition?.options?.choices).toEqual(["placeUnder", "hand"]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseOption", optionIndex: 1 },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT10-079")).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.stack.some((card) => card.cardId === "BT10-079")),
    ).toBe(false);
  });

  it("activates the same Main effect from public Security timing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-079", as: "host" }],
          security: [{ card: "EX5-071", as: "securityOption" }],
          deck: ["BT10-079", "BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], deck: ["BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.cardId === "BT10-079"));
    expect(s.perm("host").stack.some((card) => card.cardId === "BT10-079")).toBe(true);
  });
});
