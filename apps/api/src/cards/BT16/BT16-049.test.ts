import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-049.js";
import "../index.js";

describe("BT16-049", () => {
  it("gains memory when your Free or yellow Digimon is played or digivolves", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        { kind: "SubTrigger", event: "whenPlayed" },
        { kind: "SubTrigger", event: "whenOneOfYoursDigivolves" },
      ],
    });
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "anyOf" } }],
    });
  });

  it("gives itself inherited permanent DP", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    });
    expect(digivolutionRequirementsFor("BT16-049")).toEqual([{ names: ["Upamon"], cost: 0, isAlternate: true }]);
  });

  it("gains memory when another Free Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-049", as: "armadillo" }],
          hand: [{ card: "BT16-032", as: "sheepmon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sheepmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
  });

  it("gains memory once across qualifying played cards in one turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-049", as: "armadillo" }],
          hand: [{ card: "BT16-032", as: "first" }, { card: "BT1-045", as: "second" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 6);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 4);

    expect(s.state.memory).toBe(4);
  });

  it("uses the Upamon-name route and reacts to the post-digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-049", as: "armadillo" }, { card: "BT16-040", as: "base" }],
          hand: [{ card: "BT16-041", as: "stingmon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("stingmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT16-041");

    expect(s.state.memory).toBe(3);
  });

  it("does not gain memory from a non-Free, non-yellow Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-049", as: "armadillo" }], hand: [{ card: "BT1-009", as: "nonmatch" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nonmatch").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 0);

    expect(s.state.memory).toBe(0);
  });

  it("applies the inherited DP bonus to the live stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-032", as: "host", dp: 5000, under: ["BT16-049"] }] } });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(6000);
  });
});
