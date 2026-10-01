import { Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-042.js";

describe("BT3-042 ClavisAngemon", () => {
  it("gives 1 opposing Digimon -6000 DP for the turn when attacking at 3 security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-042", as: "clavisAngemon" }],
          security: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT3-040", as: "target" }],
          security: ["BT1-011"],
        },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("clavisAngemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === s.perm("target").baseDP - 6000, 5000);

    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP - 6000);
  });

  it("does not reduce DP when you have more than 3 security cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-042", as: "clavisAngemon" }],
          security: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: { battleArea: [{ card: "BT3-040", as: "target" }], security: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("clavisAngemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP);
  });
});

describe("BT3-042 ClavisAngemon — KB Q&A rulings", () => {
  it("keeps the -6000 DP for the turn after security grows to 4 or more (Q1079)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-042", as: "clavisAngemon" }],
          security: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 10_000 }],
          security: ["BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("clavisAngemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4_000, 5000);
    await settle(() => s.state.players[1]!.security.length === 1, 5000);

    s.give(0, Zone.Security, "BT1-014");
    await s.engine.recomputeContinuousEffects();

    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.perm("target").currentDP).toBe(4_000);
  });
});
