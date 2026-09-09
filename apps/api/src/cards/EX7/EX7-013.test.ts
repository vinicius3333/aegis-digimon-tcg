import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-013.js";
import "../index.js";

describe("EX7-013 MagnaKidmon", () => {
  it("matches the catalog printing and complete IR", () => {
    expect(getCardDefinition("EX7-013")).toMatchObject({
      cardId: "EX7-013",
      nameEn: "MagnaKidmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Red", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Dragonkin", "Three Musketeers"],
      effectText:
        "[Digivolve]Lv.5 w/[Three Musketeers]\u00a0in its text: Cost 4 \n\n[On Play] [When Digivolving] You may use 1 Option card with the [Three Musketeers]\u00a0trait from your hand without paying the cost. Then, draw cards until there are 6 cards in your hand.\n[End of Your Turn] [Once Per Turn] By trashing 1 Option card in this Digimon's digivolution card, 1 of your Digimon gains ＜Security Attack +1＞ for the turn and that Digimon attacks.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, texts: ["Three Musketeers"], cost: 4, isAlternate: true },
    ]);
    expect(compiled.effects).toEqual([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "UseOptionWithoutCost",
            filter: {
              kind: ["Option"],
              nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }],
              controller: "mine",
            },
            payCost: false,
            from: ["hand"],
            optional: true,
          },
          { kind: "Draw", amount: 1, untilHandSize: 6, controller: "mine" },
        ],
      },
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "UseOptionWithoutCost",
            filter: {
              kind: ["Option"],
              nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }],
              controller: "mine",
            },
            payCost: false,
            from: ["hand"],
            optional: true,
          },
          { kind: "Draw", amount: 1, untilHandSize: 6, controller: "mine" },
        ],
      },
      {
        trigger: "EndOfYourTurn",
        actions: [
          {
            kind: "SelectBind",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, bindAs: "magnaAttackTarget" },
            cost: {
              kind: "trash",
              target: {
                filter: { zone: "digivolutionCards", kind: ["Option"], hostFilter: { isSelfRef: true } },
                count: 1,
              },
              raw: "By trashing 1 Option card in this Digimon's digivolution card",
            },
            optional: true,
            abortOnDecline: true,
          },
          {
            kind: "GainKeyword",
            target: { fromSelectionRef: "magnaAttackTarget", filter: {}, count: 1 },
            keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
            duration: "forTheTurn",
          },
          {
            kind: "Attack",
            target: { fromSelectionRef: "magnaAttackTarget", filter: {}, count: 1 },
            withoutSuspending: false,
            optional: false,
          },
        ],
        frequency: "OncePerTurn",
      },
    ]);
  });

  it("publicly uses a Three Musketeers Option for free on play and draws to six", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-013", as: "magna" },
            { card: "EX7-066", as: "option" },
            { card: "BT1-009", as: "filler1" },
            { card: "BT1-010", as: "filler2" },
            { card: "BT1-011", as: "filler3" },
          ],
          deck: [
            { card: "BT1-012", as: "draw1" },
            { card: "BT1-013", as: "draw2" },
            { card: "BT1-014", as: "draw3" },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: ["BT1-009"], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magna").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("magna").stack.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([
      "BT1-009",
      "BT1-010",
      "BT1-011",
      "BT1-012",
      "BT1-013",
      "BT1-014",
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.perm("magna").stack.map((card) => card.cardId)).toEqual(["EX7-066"]);
  });

  it("Q3832: BT10-077 trashes exactly five cards from the opponent's hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-013", as: "magna" },
            { card: "BT1-009", as: "kept" },
          ],
          deck: [
            { card: "BT1-010", as: "draw1" },
            { card: "BT1-011", as: "draw2" },
            { card: "BT1-012", as: "draw3" },
            { card: "BT1-013", as: "draw4" },
            { card: "BT1-014", as: "draw5" },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT10-077", as: "mad", under: ["BT1-104"] }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magna").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([
      "BT1-009",
      "BT1-010",
      "BT1-011",
      "BT1-012",
      "BT1-013",
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-104"]);
  });

  it("publicly digivolves from a legal Three Musketeers-text level 5, pays 4, draws, and preserves the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-011", as: "base" }],
          hand: [
            { card: "EX7-013", as: "magna" },
            { card: "EX7-066", as: "option" },
            { card: "BT1-009", as: "filler1" },
            { card: "BT1-010", as: "filler2" },
            { card: "BT1-011", as: "filler3" },
          ],
          deck: [
            { card: "BT1-014", as: "drawn" },
            { card: "BT1-012", as: "draw2" },
            { card: "BT1-013", as: "draw3" },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: ["BT1-009"], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 10;
    const sourceInstanceId = s.perm("base").topCard!.instanceId;
    const drawnInstanceId = s.inst("drawn").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magna").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX7-013");

    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("filler1").instanceId,
      s.inst("filler2").instanceId,
      s.inst("filler3").instanceId,
      drawnInstanceId,
      s.inst("draw2").instanceId,
      s.inst("draw3").instanceId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.perm("base").topCard?.instanceId).toBe(s.inst("magna").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([
      s.inst("option").instanceId,
      sourceInstanceId,
    ]);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX7-066", "EX7-011"]);
  });

  it("rejects an illegal non-Three-Musketeers level 5 source without cost, draw, or movement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-038", as: "base" }],
          hand: [{ card: "EX7-013", as: "magna" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
          security: ["BT1-009"],
        },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const handBefore = s.state.players[0]!.hand.map((card) => card.instanceId);
    const deckBefore = s.state.players[0]!.deck.map((card) => card.instanceId);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magna").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(handBefore);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(deckBefore);
    expect(s.perm("base").topCard?.cardId).toBe("BT1-038");
    expect(s.perm("base").stack).toHaveLength(0);
  });

  it("publicly declines the optional End of Your Turn cost and leaves the Option in its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-013", as: "magna", under: ["BT1-104"] }],
          deck: ["BT1-009"],
          security: ["BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-010"], security: ["BT1-009", "BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await drive.waitForMainPhase(1);
    expect(s.perm("magna").stack.map((card) => card.cardId)).toEqual(["BT1-104"]);
    expect(s.perm("magna").isSuspended).toBe(false);
    drive.endMainPhaseIfOpen(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not pay the End of Your Turn cost from another Digimon's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-013", as: "magna" },
            { card: "BT1-009", as: "other", under: ["BT1-104"] },
          ],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-009"],
        },
        1: { deck: ["BT1-011", "BT1-012"], security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await drive.waitForMainPhase(1);

    expect(s.perm("other").stack.map((card) => card.cardId)).toEqual(["BT1-104"]);
    expect(s.perm("magna").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
    drive.endMainPhaseIfOpen(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("runs the End of Your Turn attack once on each of two real own turns", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-013", as: "magna", under: ["BT1-104", "BT1-104"] }],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-009"],
        },
        1: {
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 3);
    expect(s.perm("magna").stack.map((card) => card.cardId)).toEqual(["BT1-104"]);
    expect(s.perm("magna").isSuspended).toBe(true);

    await drive.waitForMainPhase(1);
    drive.endMainPhaseIfOpen(1);
    await drive.waitForMainPhase(0);
    expect(s.perm("magna").isSuspended).toBe(false);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.perm("magna").stack).toHaveLength(0);
    expect(s.perm("magna").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-104")).toHaveLength(2);
    drive.endMainPhaseIfOpen(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
