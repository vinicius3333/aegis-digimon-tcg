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
});
