import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-025.js";
import "./EX2-026.js";
import "./EX2-027.js";

describe("EX2 mixed Terriermon evolution line", () => {
  it("reduces Rapidmon's cost and stacks both inherited DP boosts with a green Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-026", under: ["EX2-025"], as: "gargomon" },
            { card: "EX2-061", as: "henry" },
          ],
          hand: [{ card: "EX2-027", as: "rapidmon" }],
        },
        1: { battleArea: [{ card: "EX2-031", as: "opponent" }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gargomon").permanentId,
        instanceId: s.inst("rapidmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("gargomon").topCard.instanceId === s.inst("rapidmon").instanceId &&
        s.perm("opponent").isSuspended &&
        s.perm("gargomon").currentDP === 11000,
    );

    expect(s.state.memory).toBe(8);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("gargomon").currentDP).toBe(11000);
    assertNoLoudGap(s);
  });

  it("does not treat a yellow Tamer as the green-Tamer gate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-026", under: ["EX2-025"], as: "gargomon" },
            { card: "EX2-060", as: "rika" },
          ],
          hand: [{ card: "EX2-027", as: "rapidmon" }],
        },
        1: { battleArea: [{ card: "EX2-031", as: "opponent" }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gargomon").permanentId,
        instanceId: s.inst("rapidmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gargomon").topCard.instanceId === s.inst("rapidmon").instanceId);

    expect(s.state.memory).toBe(7);
    expect(s.perm("opponent").isSuspended).toBe(false);
    expect(s.perm("gargomon").currentDP).toBe(7000);
    assertNoLoudGap(s);
  });
});
