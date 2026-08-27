import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-067.js";
import "../index.js";

describe("BT26-067 Wizardmon", () => {
  it("matches the catalog and mandates draw then hand trash on play and digivolving", () => {
    expect(getCardDefinition("BT26-067")).toMatchObject({
      nameEn: "Wizardmon",
      colors: ["Purple", "Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      types: ["Wizard", "Witchelny", "Iliad", "TS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(digivolutionRequirementsFor("BT26-067")).toContainEqual({
      level: 3,
      traits: ["TS"],
      cost: 2,
      isAlternate: true,
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions).toEqual([
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", target: { filter: { controllerDefault: "mine", zone: "hand" }, count: 1 } },
      ]);
    }
  });

  it("returns itself before the optional reduced-cost red/blue Iliad trash play", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: true,
          reduceCostBy: 4,
          optional: true,
          cost: { kind: "return", to: "deckBottom", target: { filter: { isSelfRef: true } } },
        },
      ],
    });
  });

  it("keeps Retaliation as an inherited keyword", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Retaliation" }],
    });
  });

  it("publicly draws one and trashes one card on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-067", as: "wizardmon" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
          hand: [{ card: "BT1-002", as: "discarded" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("wizardmon"));

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-001"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-002");
  });

  it("returns itself to the deck before playing a red Iliad from trash with cost reduced by 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-067", as: "wizardmon" },
            { card: "BT26-054", as: "yellowDigimon" },
          ],
          trash: [{ card: "BT26-060", as: "iliad" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    const wizardId = s.perm("wizardmon").topCard.instanceId;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("wizardmon"));

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(wizardId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-060");
    expect(s.state.memory).toBe(8);
  });

  it("may decline the legal reduced-cost play without returning itself or moving the target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-067", as: "wizardmon" },
            { card: "BT26-054", as: "yellowDigimon" },
          ],
          trash: [{ card: "BT26-060", as: "iliad" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 20;
    const wizardId = s.perm("wizardmon").permanentId;
    await s.ready();

    const resolving = advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("wizardmon"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(wizardId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("iliad").instanceId);
    expect(s.state.memory).toBe(20);
  });

  it("does not return itself when there is no legal Iliad card to play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-067", as: "wizardmon" },
            { card: "BT26-054", as: "yellowDigimon" },
          ],
          trash: [{ card: "BT1-009", as: "illegalTarget" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const wizardId = s.perm("wizardmon").permanentId;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("wizardmon"));

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(wizardId);
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
  });

  it("does not return itself when the reduced play cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-067", as: "wizardmon" },
            { card: "BT26-054", as: "yellowDigimon" },
          ],
          trash: [{ card: "BT26-060", as: "iliad" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -10;
    const wizardId = s.perm("wizardmon").permanentId;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("wizardmon"));

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(wizardId);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-060");
  });

  it("requires a blue or yellow Digimon before offering the end-turn payment", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-067", as: "wizardmon" }],
          trash: [{ card: "BT26-060", as: "iliad" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const wizardId = s.perm("wizardmon").permanentId;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("wizardmon"));

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(wizardId);
  });

  it("digivolves for 2 from a differently colored level 3 TS card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-008", as: "base" }],
        hand: [{ card: "BT26-067", as: "wizardmon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wizardmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT26-067");

    expect(s.state.memory).toBe(0);
  });

  it("grants executable inherited Retaliation in battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-068", as: "host", under: ["BT26-067"] }] },
        1: { battleArea: [{ card: "BT26-060", as: "defender", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const defenderId = s.perm("defender").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(defenderId);
  });
});
