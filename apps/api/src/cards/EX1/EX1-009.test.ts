import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-009.js";

describe("EX1-009 WarGreymon", () => {
  it("has Blitz and deletes an opposing Blocker when attacking a player with a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-009", as: "attacker" },
            { card: "ST1-12", as: "tamer" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-072", as: "blocker" },
            { card: "BT1-010", as: "nonBlocker" },
          ],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const blockerId = s.perm("blocker").topCard.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === blockerId));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not delete a Blocker when the attack targets a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-009", as: "attacker" },
            { card: "ST1-12", as: "tamer" },
          ],
        },
        1: { battleArea: [{ card: "BT1-072", as: "blocker", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("blocker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 40);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
