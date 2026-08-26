import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-051.js";

describe("BT18-051 Entmon", () => {
  it("reduces a suspended qualifying level-6 Plant digivolution by exactly two memory", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true, suspended: true },
          into: { levels: [6], nameOrTrait: [{ tokens: ["Plant", "Vegetation"], match: "trait" }] },
          actions: [{ kind: "Replacement", mode: "reduceCost", amount: 2 }],
        },
      ],
    });
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-051", as: "entmon", suspended: true }],
          hand: [{ card: "EX3-045", as: "hydramon" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("entmon").permanentId,
        instanceId: s.inst("hydramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("entmon").topCard?.cardId === "EX3-045" && s.state.pendingDecision === undefined);

    expect(s.perm("entmon").topCard?.cardId).toBe("EX3-045");
    expect(s.state.memory).toBe(7);
    expect(s.state.pendingDecision).toBeUndefined();

    const inactive = setupEngine({
      0: {
        battleArea: [{ card: "BT18-051", as: "entmon", suspended: false }],
        hand: [{ card: "EX3-045", as: "hydramon" }],
      },
    });
    await inactive.ready();
    inactive.state.memory = 10;
    expect(
      inactive.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: inactive.perm("entmon").permanentId,
        instanceId: inactive.inst("hydramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => inactive.perm("entmon").topCard?.cardId === "EX3-045");
    expect(inactive.state.memory).toBe(5);
    assertNoLoudGap(s);
    assertNoLoudGap(inactive);
  });

  it("does not discount another suspended Digimon's qualifying evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-051", as: "entmon", suspended: true },
          { card: "BT10-053", as: "other", suspended: true },
        ],
        hand: [{ card: "EX3-045", as: "hydramon" }],
      },
    });
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("other").permanentId,
        instanceId: s.inst("hydramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("other").topCard?.cardId === "EX3-045");

    expect(s.state.memory).toBe(5);
    assertNoLoudGap(s);
  });

  it("does not discount a legal level-6 evolution without Plant or Vegetation", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-051", as: "entmon", suspended: true }],
        hand: [{ card: "BT1-081", as: "hercules" }],
        deck: ["BT1-001"],
      },
    });
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("entmon").permanentId,
        instanceId: s.inst("hercules").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("entmon").topCard?.cardId === "BT1-081" && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(7);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("offers no reduction outside its controller's turn or for a wrong-level Vegetation destination", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-051", as: "entmon", suspended: true }] },
    });
    await s.ready();

    expect(observe(s.engine).costReduction("wouldDigivolve", s.perm("entmon"), getCardDefinition("BT1-078"))).toBe(0);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).costReduction("wouldDigivolve", s.perm("entmon"), getCardDefinition("EX3-045"))).toBe(0);
    assertNoLoudGap(s);
  });
});
