import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-066.js";

describe("BT1-066 Tentomon", () => {
  it("matches the catalog and exact inherited IR contract", () => {
    expect(getCardDefinition("BT1-066")).toMatchObject({
      cardId: "BT1-066",
      nameEn: "Tentomon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Insectoid"],
      inheritedEffectText: "[When Attacking] Suspend 1 of your opponent's Digimon with 3000 DP or less.",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "WhenAttacking",
          isInherited: true,
          actions: [
            {
              kind: "Suspend",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } },
                count: 1,
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("suspends an opposing Digimon with 3000 DP or less when its Digimon attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-070", as: "attacker", under: ["BT1-066"] }] },
        1: { battleArea: [{ card: "BT1-016", as: "target", dp: 3000 }], security: ["BT1-010"] },
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
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("does not suspend an opposing Digimon with 4000 DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-070", as: "attacker", under: ["BT1-066"] }] },
      1: { battleArea: [{ card: "BT1-016", as: "target", dp: 4000 }], security: ["BT1-010"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("does not activate from Tentomon as the top card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-066", as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-016", as: "target", dp: 3000 }], security: ["BT1-010"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("digivolves legally from a green level 2 and preserves the inherited source", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-007", as: "base" },
        hand: [{ card: "BT1-066", as: "tentomon" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.state.players[0]!.breeding!.permanentId,
        instanceId: s.inst("tentomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("tentomon").instanceId);

    expect(s.state.players[0]!.breeding!.stack.map((card) => card.cardId)).toEqual(["BT1-007"]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("rejects evolution from a non-green level 2", () => {
    const s = setupEngine({
      0: { breeding: { card: "BT1-001", as: "redBase" }, hand: [{ card: "BT1-066", as: "tentomon" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.state.players[0]!.breeding!.permanentId,
        instanceId: s.inst("tentomon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
