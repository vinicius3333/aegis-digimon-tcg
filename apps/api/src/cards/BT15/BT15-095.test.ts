import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-095.js";

describe("BT15-095", () => {
  it("suspends an opposing Digimon and grants its On Deletion security-trash effect with Izzy", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "Suspend",
      target: { filter: { controller: "opponent" } },
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "GainTriggeredEffect",
      gainedTrigger: "onDeletionOf",
      gainedActions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }],
      condition: { kind: "youHave" },
      duration: "untilOpponentTurnEnd",
    });
  });
  it("suspends an opposing Digimon and returns itself from security", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "Suspend" }, { kind: "AddToHandSelf" }],
    }));

  it("naturally grants the deletion trigger and trashes the opponent's security after the recipient is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-053", as: "attacker" },
            { card: "BT15-043", as: "source" },
            { card: "BT15-085", as: "izzy" },
          ],
          hand: [{ card: "BT15-095", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT15-007", as: "recipient" }],
          security: ["BT15-034", "BT15-037"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("recipient").isSuspended);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("recipient").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("recipient").permanentId));
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
