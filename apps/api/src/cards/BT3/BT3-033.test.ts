import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-033.js";

describe("BT3-033 Salamon", () => {
  it("gives 1 opposing Digimon -1000 DP for the turn when its host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-036", as: "host", under: ["BT3-033"] }] },
        1: {
          battleArea: [{ card: "BT1-019", as: "target" }],
          security: ["BT1-011"],
        },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === s.perm("target").baseDP - 1000, 5000);

    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP - 1000);
  });

  it("only reduces one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-036", as: "host", under: ["BT3-033"] }] },
        1: {
          battleArea: [
            { card: "BT1-019", as: "first" },
            { card: "BT1-019", as: "second" },
          ],
          security: ["BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("first").currentDP < s.perm("first").baseDP || s.perm("second").currentDP < s.perm("second").baseDP,
      5000,
    );
    const reduced = [s.perm("first"), s.perm("second")].filter((p) => p.currentDP < p.baseDP);
    expect(reduced).toHaveLength(1);
    expect(reduced[0]!.currentDP).toBe(reduced[0]!.baseDP - 1000);
  });
});
