import { digiXrosRequirementFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-081.js";

describe("BT11-081 MadLeomon: Armed Mode", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-081")).toMatchObject({
      cardId: "BT11-081", colors: ["Purple"], level: 4, playCost: 6, dp: 5000, types: ["Undead", "Bagra Army"],
    });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "OpponentsTurn",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenEffectAddsToOpponentHand",
            actions: [{ kind: "Draw", cost: { target: { filter: { hostFilter: { isSelfRef: true } } } } }],
          },
        ],
      },
      { trigger: "OnDeletion", keywords: [{ keyword: "Save" }] },
      { trigger: "OpponentsTurn", isInherited: true, actions: [{ kind: "SubTrigger" }] },
    ]);
  });

  it("publishes and executes its two-material DigiXros -2 recipe", async () => {
    expect(digiXrosRequirementFor("BT11-081")).toEqual([
      {
        materials: [{ names: ["MadLeomon"] }, { traits: ["Bagra Army"] }],
        count: 2,
      },
    ]);
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT11-081", as: "armed-mode" },
          { card: "BT10-077", as: "madleomon" },
          { card: "BT11-082", as: "bagra-army" },
        ],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("armed-mode").instanceId,
        digiXros: { materialInstanceIds: [s.inst("madleomon").instanceId, s.inst("bagra-army").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard, stack }) => topCard?.cardId === "BT11-081" && stack.length === 2),
    );

    expect(s.state.memory).toBe(8);
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT11-081")!;
    expect(played.stack.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT10-077", "BT11-082"]));
  });

  it("on opponent turn trashes 1 source and draws 2 when an effect adds to opponent hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-081", as: "madleo", under: ["BT11-077", "BT11-082"] },
            { card: "BT11-082", as: "other", under: ["BT10-077"] },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-015", "BT1-020"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });
    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });
    expect(s.perm("madleo").stack).toHaveLength(1);
    expect(s.perm("other").stack).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("uses Save to place itself under one of its Tamers on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-081", as: "madleo" },
            { card: "BT11-092", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const cardId = s.perm("madleo").topCard.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("madleo").permanentId]);
    await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === cardId));

    expect(s.perm("tamer").stack.some(({ instanceId }) => instanceId === cardId)).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === cardId)).toBe(false);
  });

  it("gains 1 memory when inherited and trashed by an effect on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-082", as: "host", under: [{ card: "BT11-081", as: "source" }] }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [s.inst("source").instanceId], 1);
    await settle(() => s.state.memory === -1);

    expect(s.state.memory).toBe(-1);
  });
});
