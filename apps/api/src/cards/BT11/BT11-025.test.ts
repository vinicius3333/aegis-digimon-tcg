import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT11-025.js";

describe("BT11-025 Gaogamon", () => {
  it("gains 1 memory when attacking while the opponent has 8 cards in hand", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-025", as: "gaogamon" }] },
      1: { hand: Array.from({ length: 8 }, () => "BT1-001") },
    });
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("gaogamon").permanentId });

    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory below the 8-card threshold", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-025", as: "gaogamon" }] },
      1: { hand: Array.from({ length: 7 }, () => "BT1-001") },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("gaogamon").permanentId });

    expect(s.state.memory).toBe(0);
  });

  it("inherited effect returns an opponent level 3 when its host attacks with a Tamer in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-028", as: "host", under: ["BT11-025"] },
            { card: "BT1-086", as: "tamer" },
          ],
        },
        1: { battleArea: [{ card: "BT11-023", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.perm("target").topCard!.instanceId;

    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("host").permanentId });

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(targetId);
  });
});
