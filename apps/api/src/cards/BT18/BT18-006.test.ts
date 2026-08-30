import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT18-006.js";

describe("BT18-006 Frimon", () => {
  it("trashes one deck card per distinct opponent Digimon/Tamer color on deletion", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [{ kind: "Trash", scaling: { per: 1, unit: "colors" } }],
    });
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-078", dp: 4000, suspended: true, as: "host", under: ["BT18-006"] }],
          deck: [{ card: "BT1-001" }, { card: "BT1-002" }, { card: "BT1-003" }, { card: "BT1-004" }],
        },
        1: {
          battleArea: [
            { card: "BT11-018", dp: 12000, as: "attacker" },
            { card: "BT12-092", as: "tamer" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("host").permanentId));
    expect(s.state.players[0]!.deck.length).toBe(1);
  });

  it("trashes no deck cards when the opponent controls no Digimon or Tamers", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-078", dp: 4000, as: "host", under: ["BT18-006"] }],
        deck: [{ card: "BT1-001", as: "top" }],
      },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
