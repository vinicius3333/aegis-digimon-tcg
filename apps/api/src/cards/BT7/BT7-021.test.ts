import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-021.js";

describe("BT7-021 Kumamon", () => {
  it("digivolves onto a blue Tamer for its printed cost but rejects a Tamer of another color", async () => {
    expect(matchingAlternateDigivolutionRequirement("BT7-021", "BT1-086")).toMatchObject({
      cost: 2,
      baseIsTamer: true,
    });
    expect(matchingAlternateDigivolutionRequirement("BT7-021", "BT1-085")).toBeUndefined();

    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-086", as: "blueTamer" },
          { card: "BT1-085", as: "redTamer" },
        ],
        hand: [{ card: "BT7-021", as: "kumamon" }],
      },
    });
    const kumamon = s.inst("kumamon").instanceId;
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redTamer").permanentId,
        instanceId: kumamon,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueTamer").permanentId,
        instanceId: kumamon,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blueTamer").topCard?.instanceId === kumamon);

    expect(s.state.memory).toBe(0);
  });

  it("trashes the bottom source of an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-028", as: "base" }], hand: [{ card: "BT7-021", as: "evolving" }] },
        1: { battleArea: [{ card: "BT1-009", under: ["BT1-001", "BT1-002"], as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    const bottom = s.perm("target").stack[0]!.instanceId;
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.trash.some((card) => card.instanceId === bottom));
    expect(s.perm("target").stack).toHaveLength(1);
  });
});
