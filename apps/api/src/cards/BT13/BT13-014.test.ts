import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT13-014.js";

describe("BT13-014 Garudamon", () => {
  it("on play may play a red Tamer costing 3 or less, but not a cost-4 red Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT13-014", as: "garudamon" },
            { card: "BT13-094", as: "kristy" },
            { card: "BT1-085", as: "tai" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garudamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT13-094"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-085")).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("when digivolving may play the eligible red Tamer without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-011", as: "base" }],
          hand: [
            { card: "BT13-014", as: "garudamon" },
            { card: "BT13-094", as: "kristy" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("garudamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT13-094"));
    expect(s.state.memory).toBe(7);
  });

  it("may decline to play an eligible red Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT13-014", as: "garudamon" },
            { card: "BT13-094", as: "kristy" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garudamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT13-014"));
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("kristy").instanceId)).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("on deletion inherited deletes one opposing Digimon at 6000 DP but not 7000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-021", as: "host", under: ["BT13-014"] }] },
        1: {
          battleArea: [
            { card: "BT1-019", as: "sixK" },
            { card: "BT1-021", as: "sevenK" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-021"]);
  });
});
