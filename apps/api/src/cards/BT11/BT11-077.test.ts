import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-077.js";

describe("BT11-077 Chikurimon", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-077")).toMatchObject({
      cardId: "BT11-077", colors: ["Purple"], level: 3, playCost: 4, dp: 1000, types: ["Mine", "Bagra Army"],
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 5 }] },
      { trigger: "OnDeletion", keywords: [{ keyword: "Save" }], actions: [{ kind: "PlaceUnder" }] },
      { trigger: "OpponentsTurn", isInherited: true, actions: [{ kind: "SubTrigger" }] },
    ]);
  });

  it("deletes itself on play to reveal 5 and add a Bagra Army card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-077", as: "chikurimon" }],
          deck: ["BT11-082", "BT1-009", "BT1-010", "BT1-015", "BT1-020"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chikurimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT11-082"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT11-077")).toBe(false);
  });

  it("may decline to delete itself and reveal", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-077", as: "chikurimon" }],
          deck: ["BT11-082", "BT1-009", "BT1-010", "BT1-015", "BT1-020"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chikurimon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT11-077")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(5);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("uses Save to place itself under one of its Tamers on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-077", as: "chikurimon" },
            { card: "BT11-092", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const chikurimonId = s.perm("chikurimon").topCard.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("chikurimon").permanentId]);
    await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === chikurimonId));

    expect(s.perm("tamer").stack.some(({ instanceId }) => instanceId === chikurimonId)).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === chikurimonId)).toBe(false);
  });

  it("gains memory when this inherited card is trashed by an effect on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-082", as: "host", under: [{ card: "BT11-077", as: "source" }] }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [s.inst("source").instanceId], 1);
    await settle(() => s.state.memory === -1);

    expect(s.state.memory).toBe(-1);
  });
});
