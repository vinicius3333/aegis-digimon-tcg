import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-102.js";

describe("BT15-102", () => {
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
          cost: { kind: "place", target: { count: 3, upTo: true } },
        },
      ],
    }));
  it("at end of turn may place a level 6 or lower trash card underneath and trashes opponent deck per level 6 source", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [
        { kind: "ActivateEffect", effectType: "OnPlay", cost: { kind: "place" } },
        { kind: "TrashTopDeck", controller: "opponent", amount: 2, scaling: { per: 1, unit: "digivolutionCards" } },
      ],
    }));

  it("reduces its play cost by 4 per Dark Masters placed from trash or battle area top", async () => {
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
    const shedSourceId = s.inst("shedSource").instanceId;

    // Placing MetalSeadramon + Puppetmon (trash) and Machinedramon (battle-area top)
    // reduces the cost to 15 - 12 = 3, payable from 3 memory.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("apocalymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT15-102" && p.stack.length === 3),
    );

    const apocalymon = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT15-102");
    expect(apocalymon?.stack.map(({ cardId }) => cardId).sort()).toEqual(["BT15-031", "BT15-052", "BT15-066"]);
    expect(s.state.memory).toBe(0);
    // KB Q2599: only the battle-area permanent's top card is placed; the rest is trashed.
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT15-066")).toBe(false);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(shedSourceId);
  });

  it("ends the turn automatically when digivolving into it pushes memory across", async () => {
    const s = setupEngine(
      {
        0: {
          // BT15-066 Machinedramon: a level 6 black Digimon, a legal digivolution base.
          battleArea: [{ card: "BT15-066", as: "base" }],
          hand: [{ card: "BT15-102", as: "apocalymon" }],
          deck: [{ card: "AD1-001" }, { card: "AD1-001" }],
        },
        1: {
          deck: [
            { card: "AD1-001" },
            { card: "AD1-001" },
            { card: "AD1-001" },
            { card: "AD1-001" },
            { card: "AD1-001" },
          ],
        },
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
