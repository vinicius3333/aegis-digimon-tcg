import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-11 Double Typhoon", () => {
  it("adds a green Digimon and green Tamer from the top three, bottoms the rest, and enters the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-03" }],
          hand: [{ card: "ST17-11", as: "option" }],
          deck: ["ST17-03", "ST17-10", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-11"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "ST17-03")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "ST17-10")).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("suspends two opposing Digimon and enters the battle area from Security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "ST17-11", as: "option", faceUp: true }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-11")).toBe(true);
  });

  it("does not add a non-green Tamer revealed among the top three", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-03" }],
          hand: [{ card: "ST17-11", as: "option" }],
          // ST17-03 is the legal green Digimon; BT1-085 is a red Tamer and
          // must remain in the deck; BT1-009 is the unrelated remainder.
          deck: ["ST17-03", "BT1-085", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-11"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "ST17-03")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-085")).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT1-085")).toBe(true);
  });
});
