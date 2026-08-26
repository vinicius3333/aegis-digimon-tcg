import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-065.js";

describe("BT9-065 Megadramon", () => {
  it("matches catalog and direct/inherited play-cost-3 deletion IR", () => {
    expect(getCardDefinition("BT9-065")).toMatchObject({
      cardId: "BT9-065", nameEn: "Megadramon", colors: ["Black", "Red"], kinds: ["Digimon"], level: 5,
      playCost: 8, dp: 8000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 4 }, { color: "Red", level: 4, memoryCost: 4 }],
      forms: ["Ultimate"], attributes: ["Virus"], types: ["Cyborg"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        { trigger: "WhenDigivolving", actions: [{ kind: "Delete", target: { filter: { kind: ["Digimon", "Tamer"], playCostLte: 3 } } }] },
        { trigger: "WhenAttacking", isInherited: true, actions: [{ kind: "Delete", condition: { kind: "selfHasTrait" } }] },
      ],
    });
  });

  it("deletes an opposing Digimon or Tamer costing 3 or less", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-061", as: "base" }], hand: [{ card: "BT9-065", as: "evolving" }] },
        1: { battleArea: [{ card: "BT8-093", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT8-093")).toBe(true);
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
