import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-061.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-061", () => {
  it("requires the printed trash return for both triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0];
      expect(action).toMatchObject({
        kind: "GainMemory",
        amount: 1,
        cost: { kind: "return", target: { filter: { zone: "trash", controller: "opponent", kind: ["Digimon"] } } },
      });
      expect(action).toHaveProperty("optional", true);
      expect(action?.cost).not.toHaveProperty("optional");
      expect(action).toHaveProperty("abortOnDecline", true);
    }
  });
  it("returns an opponent Digimon to deck top and gains memory", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT14-061", as: "source" }] }, 1: { trash: [{ card: "BT14-044", as: "returned" }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.deck.some((card) => card.cardId === "BT14-044") && s.state.memory === 6);
    expect(s.state.players[1]!.deck[0]?.cardId).toBe("BT14-044");
    expect(s.state.memory).toBe(7);
  });

  it("gains one memory on a natural digivolution after returning the opponent's Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-055", as: "base" }], hand: [{ card: "BT14-061", as: "source" }] },
        1: { trash: [{ card: "BT14-044", as: "returned" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard.cardId === "BT14-061" &&
        s.state.players[1]!.deck[0]?.cardId === "BT14-044" &&
        s.state.memory === 1,
    );

    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.deck[0]?.cardId).toBe("BT14-044");
    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.cardId)).toEqual(["BT14-055"]);
  });

  it("does not gain memory when the mandatory return has no legal trash card", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT14-061", as: "source" }] } });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-061"));

    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT14-061");
  });

  it("allows declining the optional by-cost activation", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT14-061", as: "source" }] }, 1: { trash: [{ card: "BT14-044", as: "returned" }] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-061"));

    expect(s.state.memory).toBe(6);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT14-044"]);
  });
});
