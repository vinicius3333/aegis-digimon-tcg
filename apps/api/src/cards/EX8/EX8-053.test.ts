import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-053.js";

describe("EX8-053", () => {
  it("has Blocker, gains +5000 DP when the opponent has a 13000 DP or higher Digimon, and plays a Mineral/Rock Digimon costing 8 or less on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static" && entry.keywords)?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "Aura", effect: { kind: "modifyDP", amount: 5000 }, while: { kind: "opponentHas" } });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, add: [{ count: 1, to: "play", optional: true }], rest: "trash" });
  });
  it("gains and loses the live +5000 DP aura at the exact 13000 DP boundary", async () => {
    const high = setupEngine({ 0: { battleArea: [{ card: "EX8-053", as: "bancho" }] }, 1: { battleArea: [{ card: "AD1-004", as: "opponent", dp: 13000 }] } });
    await high.ready();
    await settle(() => high.perm("bancho").currentDP === 16000);
    expect(high.perm("bancho").currentDP).toBe(16000);

    const low = setupEngine({ 0: { battleArea: [{ card: "EX8-053", as: "bancho" }] }, 1: { battleArea: [{ card: "AD1-004", as: "opponent", dp: 12999 }] } });
    await low.ready();
    await settle(() => low.perm("bancho").currentDP === 11000);
    expect(low.perm("bancho").currentDP).toBe(11000);
  });
  it("plays a revealed Mineral/Rock Digimon after deletion and trashes the misses", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-053", as: "bancho", suspended: true }], deck: ["EX8-048", "BT1-009", "BT1-010"] },
        1: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm("bancho").permanentId },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX8-048") &&
      s.state.players[0]!.deck.length === 0 &&
      s.state.players[0]!.trash.filter((card) => ["BT1-009", "BT1-010"].includes(card.cardId)).length === 2,
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX8-048")).toBe(true);
    expect(s.state.players[0]!.trash.filter((card) => ["BT1-009", "BT1-010"].includes(card.cardId))).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
