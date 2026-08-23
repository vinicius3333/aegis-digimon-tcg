import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-075.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-075", () => {
  it("trashes three from deck on play or attack and gains +1000 DP per three trash cards", () => {
    for (const trigger of ["OnPlay", "WhenAttacking"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "TrashTopDeck",
        amount: 3,
      });
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 1000,
      scaling: { per: 3, unit: "trash" },
    });
  });
  it("trashes one card from the opponent's hand on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "Trash",
      target: { filter: { controller: "opponent", zone: "hand" } },
    }));
  it("trashes three cards from the deck when played", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT14-075", as: "ogre" }], deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ogre").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length >= 3);
    expect(s.state.players[0]!.trash.slice(-3).map((card) => card.cardId)).toEqual(["BT1-001", "BT1-002", "BT1-003"]);
  });
  it("trashes a random opponent hand card on deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT14-075", as: "source" }] }, 1: { hand: [{ card: "BT1-002", as: "victim" }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-002"));
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-002")).toBe(true);
  });
});
