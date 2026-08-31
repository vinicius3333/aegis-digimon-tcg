import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-102.js";

describe("BT15-102", () => {
  it("matches the catalog identity and complete compiled contract", () => {
    expect(getCardDefinition("BT15-102")).toMatchObject({
      cardId: "BT15-102",
      nameEn: "Apocalymon",
      colors: ["White"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 15,
      dp: 15000,
      evoCosts: [
        { color: "Blue", level: 6, memoryCost: 6 },
        { color: "Green", level: 6, memoryCost: 6 },
        { color: "Black", level: 6, memoryCost: 6 },
        { color: "Purple", level: 6, memoryCost: 6 },
      ],
      forms: ["Mega"],
      attributes: ["Unknown"],
      types: ["Unidentified"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("reduces its play cost by 4 per distinct Dark Masters placed from battle area/trash", () =>
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      actions: [
        {
          kind: "Replacement",
          mode: "reduceCost",
          amount: 4,
          amountPerPlaced: 4,
          cost: { kind: "place", target: { count: 3, upTo: true }, host: "self" },
        },
      ],
    }));

  it("places distinct Dark Masters from trash and battle-area tops before paying play cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT15-102", as: "apocalymon" }],
          trash: [
            { card: "BT15-031", as: "metalSeadramon" },
            { card: "BT15-052", as: "puppetmon" },
          ],
          battleArea: [{ card: "BT15-066", as: "machinedramon", under: [{ card: "AD1-001", as: "shedSource" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("apocalymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard, stack }) => topCard.cardId === "BT15-102" && stack.length === 3),
    );

    const apocalymon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT15-102");
    expect(apocalymon?.stack.map(({ cardId }) => cardId).sort()).toEqual(["BT15-031", "BT15-052", "BT15-066"]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT15-066")).toBe(false);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("shedSource").instanceId);
  });
  it("at end of turn may place a level 6 or lower trash card underneath and trashes opponent deck per level 6 source", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ActivateEffect",
          effectType: "OnPlay",
          lastPlacedOnly: true,
          target: { filter: { controller: "mine", zone: "digivolutionCards" } },
          cost: { kind: "place" },
        },
        { kind: "TrashTopDeck", controller: "opponent", amount: 2, scaling: { per: 1, unit: "digivolutionCards" } },
      ],
    }));

  it("at the natural end of its turn places a level 6-or-lower trash card, activates its On Play, then mills per level 6 stack cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-102", as: "apocalymon", under: ["BT15-066"] }],
          trash: [{ card: "BT15-031", as: "onPlaySource" }],
          deck: ["AD1-001"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "onPlayTarget" }],
          deck: ["AD1-001", "AD1-001", "AD1-001", "AD1-001", "AD1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 0;

    await advance(s.engine).runTurn(0);

    expect(s.perm("apocalymon").stack.map(({ cardId }) => cardId)).toEqual(["BT15-031", "BT15-066"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("onPlayTarget").instanceId);
    expect(s.state.players[1]!.trash).toHaveLength(4);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(
      s.inst("onPlaySource").instanceId,
    );
  });

  it("does not activate the following mill when no level 6-or-lower trash card can be placed", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-102", as: "apocalymon", under: ["BT15-066"] }] },
        1: { deck: ["AD1-001", "AD1-001", "AD1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 0;

    await advance(s.engine).runTurn(0);

    expect(s.perm("apocalymon").stack.map(({ cardId }) => cardId)).toEqual(["BT15-066"]);
    expect(s.state.players[1]!.deck).toHaveLength(3);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("ends the turn automatically when digivolving into it pushes memory across", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-066", as: "base" }],
          hand: [{ card: "BT15-102", as: "apocalymon" }],
          deck: ["AD1-001", "AD1-001"],
        },
        1: { deck: ["AD1-001", "AD1-001", "AD1-001", "AD1-001", "AD1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    let turnClosed = false;
    const turn = s.engine.runOneTurn().then(() => {
      turnClosed = true;
    });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;

    // Digivolving costs 6, so paying from 3 memory crosses the gauge — the rulebook
    // turn-pass, with no endPhase intent from the player.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("apocalymon").instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(() => turnClosed);
    expect(turnClosed).toBe(true);
    await turn;
  });
});
