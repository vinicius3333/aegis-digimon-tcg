import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-008.js";

describe("EX1-008 MetalGreymon", () => {
  it("deletes an opposing Digimon with 4000 DP or less when attacking a player", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-008", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "small", dp: 4000 },
            { card: "BT1-011", as: "large", dp: 5000 },
          ],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const smallId = s.perm("small").topCard.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === smallId));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not delete an opposing Digimon when the attack targets a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-008", as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-010", as: "target", dp: 4000, suspended: true }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 40);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("grants inherited Piercing to a Machine host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-042", as: "machine", under: ["EX1-008"] }] } });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("machine"))).toBe(true);
  });
});
