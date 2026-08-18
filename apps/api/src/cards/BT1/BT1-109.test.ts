import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT9/BT9-109.js";
import "./BT1-109.js";

describe("BT1-109 Smashed Potatoes", () => {
  it("Q978 floors the next green level-5-to-6 digivolution cost at zero", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-075", as: "base" }],
        hand: [
          { card: "BT1-109", as: "option" },
          { card: "BT1-080", as: "evolving" },
        ],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-109"));
    expect(s.state.memory).toBe(4);

    // Titamon normally costs 2. A reduction of 4 makes it free, never +2 memory.
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-080");

    expect(s.state.memory).toBe(4);
  });

  it("Q979 charges full cost in breeding and preserves the reduction for a battle-area Digimon", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-075", as: "breedingBase" },
        battleArea: [{ card: "BT1-075", as: "battleBase" }],
        hand: [
          { card: "BT1-109", as: "option" },
          { card: "BT1-083", as: "breedingEvolution" },
          { card: "BT9-055", as: "battleEvolution" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.memory === 8);

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("breedingBase").permanentId,
      instanceId: s.inst("breedingEvolution").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("breedingBase").topCard.cardId === "BT1-083");
    expect(s.state.memory).toBe(4);

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("battleBase").permanentId,
      instanceId: s.inst("battleEvolution").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("battleBase").topCard.cardId === "BT9-055");

    expect(s.state.memory).toBe(4);
  });

  it("Q980 applies the reduction to an effect-driven X Antibody digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-075", as: "attacker", under: ["BT9-109"] }],
          hand: [
            { card: "BT1-109", as: "option" },
            { card: "BT9-055", as: "grandisKuwagamon" },
          ],
          deck: ["BT1-001"],
        },
        1: { security: ["BT1-002", "BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.memory === 4);
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.cardId === "BT9-055");

    expect(s.state.memory).toBe(4);
  });
});
