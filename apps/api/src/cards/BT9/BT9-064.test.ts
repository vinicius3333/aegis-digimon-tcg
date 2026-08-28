import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-064.js";

describe("BT9-064 Grademon", () => {
  it("matches catalog and complete reveal, placement, and inherited deletion IR", () => {
    expect(getCardDefinition("BT9-064")).toMatchObject({
      cardId: "BT9-064", nameEn: "Grademon", colors: ["Black"], kinds: ["Digimon"], level: 5,
      playCost: 8, dp: 8000, evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }], forms: ["Ultimate"],
      attributes: ["Vaccine"], types: ["Warrior", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        { trigger: "WhenDigivolving", actions: [{ kind: "RevealAdd", revealCount: 3, rest: "trash", add: [{ to: "hand" }, { to: "placeUnder" }] }] },
        { trigger: "EndOfAttack", isInherited: true, actions: [{ kind: "Delete", target: { filter: { playCostLte: 5 } }, condition: { kind: "selfHasNameContaining", names: ["Alphamon"] } }] },
      ],
    });
  });

  it("adds Alphamon, places an X Antibody card under itself, and trashes the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-061", as: "base" }],
          hand: [{ card: "BT9-064", as: "evolving" }],
          deck: [
            { card: "BT6-111", as: "alphamon" },
            { card: "BT9-068", as: "xAntibody" },
            { card: "BT1-001", as: "rest" },
          ],
        },
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
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("rest").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("alphamon").instanceId)).toBe(true);
    expect(s.perm("base").stack.some((card) => card.instanceId === s.inst("xAntibody").instanceId)).toBe(true);
  });

  it("deletes a cost-5-or-less Digimon at end of attack while inherited by Alphamon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-066", as: "attacker", under: ["BT9-064"] }] },
        1: {
          battleArea: [{ card: "BT1-016", as: "deleteTarget" }],
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

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-016")).toBe(true);
  });

  it("does not delete at end of attack when the host is not Alphamon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-068", as: "attacker", under: ["BT9-064"] }] },
        1: {
          battleArea: [{ card: "BT1-016", as: "mustSurvive" }],
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

    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("mustSurvive").permanentId),
    ).toBe(true);
  });
});
