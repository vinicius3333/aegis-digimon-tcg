import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-075.js";

describe("BT19-075 MoonMillenniummon", () => {
  it("watches deletions of other Digimon or Tamers regardless of controller", () => {
    expect(runtimeCompiledCard("BT19-075")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "AllTurns",
          frequency: "OncePerTurn",
          actions: [
            expect.objectContaining({
              kind: "SubTrigger",
              event: "onDeletionOf",
              sourceFilter: { excludeSelf: true, kind: ["Digimon", "Tamer"] },
              actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
            }),
          ],
        }),
      ]),
    );
  });

  it("trashes the opponent down to five cards and deletes one Tamer per two trashed", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-075", as: "source" }] },
        1: {
          hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          battleArea: [
            { card: "BT1-087", as: "tamer1" },
            { card: "BT1-087", as: "tamer2" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    // Play through the public intent so the watcher is registered by the same path as a game.
    s.state.memory = 15;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.length === 5);
    expect(s.state.players[1]!.hand).toHaveLength(5);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("trashes the opponent's security when an opponent's other Digimon is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-075", as: "source" }] },
      1: { battleArea: [{ card: "BT1-009", as: "other" }], security: ["BT1-001"] },
    });

    await advance(s.engine).verb.deletePermanent([s.perm("other").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-001"]),
    );
  });
});
