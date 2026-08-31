import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-008 Shoutmon", () => {
  it("allows its cost-0 alternate evolution only over a level-2 Xros Heart base", () => {
    expect(matchingAlternateDigivolutionRequirement("BT19-008", "BT10-005")?.cost).toBe(0);
    expect(matchingAlternateDigivolutionRequirement("BT19-008", "BT19-005")).toBeUndefined();
  });

  it("digivolves into a legal OmniShoutmon from under a Tamer without paying the cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-079", as: "tamer", under: ["BT19-012"] }],
          hand: [{ card: "BT19-008", as: "shoutmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoutmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-012"));

    const shoutmon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT19-012");
    expect(shoutmon?.stack.some((card) => card.cardId === "BT19-008")).toBe(true);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("does not ignore OmniShoutmon digivolution requirements (Q3062)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-079", as: "tamer", under: ["BT11-018"] },
          ],
          hand: [{ card: "BT19-008", as: "shoutmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoutmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-008"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-008")).toBe(true);
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT11-018"]);
  });

  it("plays an Xros Heart Tamer from the top 3, bottoms the rest, then Saves under that Tamer (Q3063)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-008", as: "shoutmon" }],
          deck: ["BT19-079", "BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("shoutmon").permanentId]);
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) =>
          permanent.topCard?.cardId === "BT19-079" && permanent.stack.some((card) => card.cardId === "BT19-008"),
      ),
    );

    const playedTamer = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT19-079");
    expect(playedTamer?.stack.map((card) => card.cardId)).toContain("BT19-008");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT19-008")).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011", "BT1-009", "BT1-010"]);
  });

  it("grants inherited Rush only to an Xros Heart host and only during its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-012", as: "xrosHost", under: ["BT19-008"] },
          { card: "BT19-015", as: "plainHost", under: ["BT19-008"] },
        ],
      },
    });
    await advance(s.engine).recompute();

    expect(observe(s.engine).hasKeyword(s.perm("xrosHost"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plainHost"), "Rush")).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("xrosHost"), "Rush")).toBe(false);
  });
});
