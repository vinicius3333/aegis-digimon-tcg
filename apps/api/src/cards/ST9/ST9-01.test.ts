import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST9-01.js";

describe("ST9-01 Minomon", () => {
  it("grants +1000 DP to its host while a blue Digimon is in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST9-05", as: "host", under: ["ST9-01"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not buff its host when no blue Digimon is in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["ST9-01"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not buff its host during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST9-05", as: "host", under: ["ST9-01"] }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});
