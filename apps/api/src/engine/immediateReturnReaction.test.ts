import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/BT20/BT20-074.js";
import "../cards/BT20/BT20-076.js";
import "../cards/BT20/BT20-016.js";
import "../cards/ST2/ST2-16.js";
import "../cards/BT5/BT5-097.js";

const materials = [
  { card: "BT20-074", as: "dinobeemon" },
  { card: "BT20-016", as: "paildramon" },
] as const;

describe("immediate public return reactions", () => {
  it("runs BT20-074 DNA before a public Cocytus Breath hand return moves its target", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [...materials], hand: [{ card: "BT20-076", as: "result" }] },
        1: { battleArea: [{ card: "BT1-027", as: "blueSource" }], hand: [{ card: "ST2-16", as: "option" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-076"));
    const merged = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT20-076");
    expect(merged?.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT20-074", "BT20-016"]));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT20-074");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("ST2-16");
    expect(s.state.memory).toBe(7); // Opponent pays 7, then the defending seat pays 4: 10 - 7 + 4.
    const reaction = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT20-074",
    );
    const optionResolved = s.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "ST2-16",
    );
    expect(reaction).toBeGreaterThanOrEqual(0);
    expect(optionResolved).toBeGreaterThan(reaction);
  });

  it("runs BT20-074 DNA before a public Absolute Blast deck-bottom return", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-074", as: "dinobeemon" },
            { card: "BT20-016", as: "paildramon" },
          ],
          hand: [{ card: "BT20-076", as: "result" }],
        },
        1: { battleArea: [{ card: "BT1-027", as: "blueSource" }], hand: [{ card: "BT5-097", as: "option" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-076"));
    const merged = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT20-076");
    expect(merged?.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT20-074", "BT20-016"]));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).not.toContain("BT20-074");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT5-097");
    expect(s.state.memory).toBe(8); // Opponent pays 6, then the defending seat pays 4: 10 - 6 + 4.
  });

  it.each([
    ["hand", "ST2-16", 7],
    ["deck", "BT5-097", 6],
  ] as const)("allows declining the %s return reaction", async (destination, optionId, optionCost) => {
    const s = setupEngine(
      {
        0: {
          battleArea:
            destination === "hand"
              ? [...materials]
              : [
                  { card: "BT20-074", as: "dinobeemon" },
                  { card: "BT20-016", as: "paildramon" },
                ],
          hand: [{ card: "BT20-076", as: "result" }],
        },
        1: { battleArea: [{ card: "BT1-027", as: "blueSource" }], hand: [{ card: optionId, as: "option" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      destination === "hand"
        ? s.state.players[0]!.hand.some((card) => card.cardId === "BT20-074")
        : s.state.players[0]!.deck.some((card) => card.cardId === "BT20-074"),
    );
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT20-016"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT20-076");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain(optionId);
    expect(s.state.memory).toBe(10 - optionCost);
  });
});
