import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-014.js";

describe("EX2-014 IceDevimon", () => {
  it("returns an opposing level-4-or-lower Digimon without sources when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-014", as: "attacker" }] },
        1: { battleArea: [{ card: "EX2-019", as: "target" }], security: ["BT1-001"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    const targetId = s.perm("target").topCard.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === targetId));
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetId)).toBe(true);
  });

  it("does not return a sourced level 4 or a level 5 Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-014", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "EX2-019", as: "sourced", under: ["EX2-013"] },
            { card: "EX2-023", as: "level5" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });
});
