import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-036.js";
import "../BT7/BT7-054.js";
import "./EX1-033.js";

describe("EX1-033 Tentomon", () => {
  it("reduces the next Insectoid digivolution cost by 1 after its host attacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-070", as: "attacker", under: ["EX1-033"] },
          { card: "BT1-066", as: "base" },
        ],
        hand: [{ card: "BT1-070", as: "evo" }],
      },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-070");
    expect(s.state.memory).toBe(4);
  });

  it("consumes the reduction after the first matching digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-070", as: "attacker", under: ["EX1-033"] },
          { card: "BT1-066", as: "firstBase" },
          { card: "BT1-066", as: "secondBase" },
        ],
        hand: [
          { card: "BT1-070", as: "firstEvolution" },
          { card: "BT1-070", as: "secondEvolution" },
        ],
      },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("firstBase").permanentId,
        instanceId: s.inst("firstEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstBase").topCard.instanceId === s.inst("firstEvolution").instanceId);
    expect(s.state.memory).toBe(4);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("secondBase").permanentId,
        instanceId: s.inst("secondEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("secondBase").topCard.instanceId === s.inst("secondEvolution").instanceId);
    expect(s.state.memory).toBe(2);
  });

  it("does not consume the reduction on a non-Insectoid digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-070", as: "attacker", under: ["EX1-033"] },
          { card: "BT1-066", as: "nonMatchingBase" },
          { card: "BT1-066", as: "matchingBase" },
        ],
        hand: [
          { card: "BT1-071", as: "nonMatchingEvolution" },
          { card: "BT1-070", as: "matchingEvolution" },
        ],
      },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("nonMatchingBase").permanentId,
        instanceId: s.inst("nonMatchingEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("nonMatchingBase").topCard.instanceId === s.inst("nonMatchingEvolution").instanceId);
    expect(s.state.memory).toBe(4);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("matchingBase").permanentId,
        instanceId: s.inst("matchingEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("matchingBase").topCard.instanceId === s.inst("matchingEvolution").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("reduces an Ancient Insect digivolution in the battle area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-070", as: "attacker", under: ["EX1-033"] },
          { card: "BT1-076", as: "base" },
        ],
        hand: [{ card: "BT7-054", as: "ancientEvolution" }],
      },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ancientEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT7-054");
    expect(s.state.memory).toBe(2);
  });

  it("accumulates one reduction for each public attack before matching evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-070", as: "attacker", under: ["EX1-033"] },
            { card: "BT1-030", as: "blueColor" },
            { card: "BT1-066", as: "base" },
          ],
          hand: [
            { card: "BT1-036", as: "unsuspender" },
            { card: "BT1-070", as: "evolution" },
          ],
        },
        1: { security: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack" as const,
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" as const },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("attacker").isSuspended);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-070");
    expect(s.state.memory).toBe(6);
  });

  it("does not reduce a digivolution performed in the breeding area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-070", as: "attacker", under: ["EX1-033"] }],
        breeding: { card: "BT1-066", as: "breedingBase" },
        hand: [{ card: "EX1-035", as: "breedingEvolution" }],
      },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("breedingBase").permanentId,
        instanceId: s.inst("breedingEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("breedingBase").topCard.cardId === "EX1-035");
    expect(s.state.memory).toBe(-2);
  });
});
