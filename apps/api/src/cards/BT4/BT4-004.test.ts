import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT4-004.js";
import "./BT4-051.js";
import "./BT4-054.js";
import "./BT4-019.js";
import "./BT4-062.js";

describe("BT4-004 Budmon", () => {
  it("gives +1000 DP to its host while it has Digi-Burst", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-054", as: "host", under: ["BT4-004", "BT4-051"] }] },
    });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not give DP to a host without Digi-Burst", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-051", as: "host", under: ["BT4-004"] }] },
    });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not give DP to its host during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-054", as: "host", under: ["BT4-004", "BT4-051"] }] },
    });
    s.state.turnSeat = 1;

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});

describe("BT4-004 Budmon — KB Q&A rulings", () => {
  it("applies +1000 DP outside the When Digivolving timing of its host's Digi-Burst (Q1151)", async () => {
    const withBudmon = setupEngine({
      0: { battleArea: [{ card: "BT4-019", as: "host", under: ["BT4-004", "BT4-008"] }] },
    });
    const withoutBudmon = setupEngine({
      0: { battleArea: [{ card: "BT4-019", as: "host", under: ["BT4-008"] }] },
    });

    await withBudmon.engine.recomputeContinuousEffects();
    await withoutBudmon.engine.recomputeContinuousEffects();

    expect(withBudmon.perm("host").currentDP).toBe(withBudmon.perm("host").baseDP + 1000);
    expect(withoutBudmon.perm("host").currentDP).toBe(withoutBudmon.perm("host").baseDP);
  });

  it("applies +1000 DP when its host lacks enough digivolution cards to pay Digi-Burst (Q1152)", async () => {
    const digiBurstFourHost = setupEngine({
      0: { battleArea: [{ card: "BT4-062", as: "host", under: ["BT4-004"] }] },
    });
    const hostWithoutDigiBurst = setupEngine({
      0: { battleArea: [{ card: "BT4-051", as: "host", under: ["BT4-004"] }] },
    });

    await digiBurstFourHost.engine.recomputeContinuousEffects();
    await hostWithoutDigiBurst.engine.recomputeContinuousEffects();

    expect(digiBurstFourHost.perm("host").stack).toHaveLength(1);
    expect(digiBurstFourHost.perm("host").currentDP).toBe(digiBurstFourHost.perm("host").baseDP + 1000);
    expect(hostWithoutDigiBurst.perm("host").currentDP).toBe(hostWithoutDigiBurst.perm("host").baseDP);
  });
});
