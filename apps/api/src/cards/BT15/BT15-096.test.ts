import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-096.js";

describe("BT15-096", () => {
  it("reveals five to add a Machine/Cyborg and trash another, then places itself in battle", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 5,
          rest: "deckTop",
          add: [{ to: "hand" }, { to: "trash", requiresMinRevealed: 2 }],
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });
  it("may play a level 5 or higher Machine/Cyborg from hand with cost reduced by 3 and has the same security reveal", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 3, optional: true }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "RevealAdd" }, { kind: "PlaceInBattleAreaSelf" }],
    });
  });

  it("naturally adds one revealed Machine/Cyborg, trashes a second, preserves the rest on deck, and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-056", as: "source" }],
          hand: [{ card: "BT15-096", as: "option" }],
          deck: [
            { card: "BT15-055", as: "added" },
            "BT15-007",
            { card: "BT15-061", as: "trashed" },
            "BT15-008",
            "BT15-009",
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("option").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("added").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("trashed").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT15-007", "BT15-008", "BT15-009"]);
  });

  it("naturally leaves the sole revealed Machine/Cyborg in hand and cannot trash a second card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-056", as: "source" }],
          hand: [{ card: "BT15-096", as: "option" }],
          deck: [{ card: "BT15-055", as: "onlyHit" }, "BT15-007", "BT15-008", "BT15-009", "BT15-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("option").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("onlyHit").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("onlyHit").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT15-007", "BT15-008", "BT15-009", "BT15-010"]);
  });
});
