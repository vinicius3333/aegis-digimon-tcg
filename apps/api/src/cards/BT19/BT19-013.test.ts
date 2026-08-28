import { describe, expect, it } from "vitest";
import { digiXrosRequirementFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-013 Shoutmon X5", () => {
  it("DigiXroses only with all five exact named materials for zero memory", async () => {
    expect(digiXrosRequirementFor("BT19-013")).toEqual([
      {
        materials: ["Shoutmon", "Ballistamon", "Dorulumon", "Starmons", "Sparrowmon"].map((name) => ({
          names: [name],
        })),
        count: 2,
      },
    ]);
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT19-013", as: "x5" },
          { card: "BT10-008", as: "shoutmon" },
          { card: "BT10-049", as: "ballistamon" },
          { card: "BT10-034", as: "dorulumon" },
          { card: "BT10-029", as: "starmons" },
          { card: "BT10-060", as: "sparrowmon" },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x5").instanceId,
        digiXros: {
          materialInstanceIds: ["shoutmon", "ballistamon", "dorulumon", "starmons", "sparrowmon"].map(
            (alias) => s.inst(alias).instanceId,
          ),
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-013"));
    expect(s.perm("x5").stack).toHaveLength(5);
    expect(s.state.memory).toBe(0);
  });

  it("does not save Shoutmon X5 sources when a different friendly Digimon leaves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-013", as: "x5", under: ["BT19-008"] },
            { card: "BT19-009", as: "other" },
            { card: "BT19-079", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("other").permanentId]);

    expect(s.perm("x5").stack.map((card) => card.cardId)).toEqual(["BT19-008"]);
    expect(s.perm("tamer").stack).toHaveLength(0);
  });

  it("saves an eligible source before deletion, then may play that same card for free (Q3069)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-013", as: "x5", under: ["BT19-008", "BT19-009"] },
            { card: "BT19-079", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).verb.deletePermanent([s.perm("x5").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-008"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-013")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-008")).toBe(true);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT19-013", "BT19-009"]));
    expect(s.state.memory).toBe(0);
  });
});
