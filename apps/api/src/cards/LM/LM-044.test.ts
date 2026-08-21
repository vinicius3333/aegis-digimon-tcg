import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-044.js";

describe("LM-044 Ghoulmon", () => {
  it("trashes one opposing hand card, then deletes a level 6 or lower Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "LM-044", as: "ghoulmon" }] },
      1: { hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"], battleArea: [{ card: "BT1-060", as: "target" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const targetId = s.perm("target").permanentId;

    await advance(s.engine).verb.deletePermanent([s.perm("ghoulmon").permanentId]);
    await settle(() => s.state.players[1]!.hand.length === 4 && !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId));

    expect(s.state.players[1]!.hand).toHaveLength(4);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
  });
});
