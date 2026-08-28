import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-010 Shoutmon X4", () => {
  it("DigiXroses with its four exact materials for zero memory", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT19-010", as: "x4" },
          { card: "BT10-008", as: "shoutmon" },
          { card: "BT10-049", as: "ballistamon" },
          { card: "BT10-034", as: "dorulumon" },
          { card: "BT10-029", as: "starmons" },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x4").instanceId,
        digiXros: {
          materialInstanceIds: [
            s.inst("shoutmon").instanceId,
            s.inst("ballistamon").instanceId,
            s.inst("dorulumon").instanceId,
            s.inst("starmons").instanceId,
          ],
          expanderPermanentIds: [],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-010"));

    expect(s.perm("x4").stack).toHaveLength(4);
    expect(s.state.memory).toBe(0);
  });

  it("on deletion saves up to 3 Xros Heart Digimon sources under a Tamer, then still leaves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT19-010",
              as: "x4",
              under: ["BT19-008", "BT19-012", "BT19-009", "BT19-031"],
            },
            { card: "BT19-079", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("x4").permanentId]);
    await settle(() => s.perm("tamer").stack.length === 3);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-010")).toBe(false);
    expect(s.perm("tamer").stack.map((card) => card.cardId).sort()).toEqual(
      ["BT19-008", "BT19-012", "BT19-031"].sort(),
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT19-010", "BT19-009"]));
  });

  it("also triggers before a hand return (Q3067) and may be declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-010", as: "x4", under: ["BT19-008", "BT19-012"] },
            { card: "BT19-079", as: "tamer" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );

    await advance(s.engine).verb.returnToHand([s.perm("x4").topCard!.instanceId]);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT19-010");
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT19-008", "BT19-012"]));
  });
});
