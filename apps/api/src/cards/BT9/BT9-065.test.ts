import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-065.js";

describe("BT9-065 Megadramon", () => {
  it("deletes an opposing Digimon or Tamer costing 3 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-061", as: "base" }], hand: [{ card: "BT9-065", as: "evolving" }] }, 1: { battleArea: [{ card: "BT8-093", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.some(card => card.cardId === "BT8-093")).toBe(true);
  });

  it("deletes a cost-3-or-less card when inherited by a Dragonkin attacker", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-068", as: "attacker", under: ["BT9-065"] }] },
        1: {
          battleArea: [{ card: "BT8-093", as: "tamerTarget" }],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT8-093")).toBe(true);
  });

  it("does not delete when inherited by a host without Machine or Dragonkin", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-066", as: "attacker", under: ["BT9-065"] }] },
        1: {
          battleArea: [{ card: "BT8-093", as: "mustSurvive" }],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
