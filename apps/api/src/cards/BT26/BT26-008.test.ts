import { EffectTiming, Phase, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-008.js";
import "../index.js";

describe("BT26-008 Kotemon", () => {
  it("compiles On Play, When Moving, and inherited DP effects", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map((e) => [e.trigger, e.isInherited])).toEqual([
      ["OnPlay", undefined],
      ["WhenMoving", undefined],
      ["YourTurn", true],
    ]);
    for (const effect of compiled.effects.slice(0, 2)) {
      expect(effect.actions).toMatchObject([
        { kind: "SelectBind", target: { bindAs: "kotemonBonusTarget" } },
        { kind: "GainKeyword", target: { fromSelectionRef: "kotemonBonusTarget" } },
        { kind: "ModifyDP", target: { fromSelectionRef: "kotemonBonusTarget" } },
      ]);
    }
  });

  it("uses the exact zero-cost Shambala/TS evolution requirement", () => {
    expect(digivolutionRequirementsFor("BT26-008")).toContainEqual({
      level: 2,
      traits: ["Shambala", "TS"],
      cost: 0,
      isAlternate: true,
    });
  });

  it("digivolves for zero over an off-color TS egg and rejects an off-color near-match", async () => {
    const legal = setupEngine({
      0: {
        breeding: { card: "BT24-002", as: "tsEgg" },
        hand: [{ card: "BT26-008", as: "kotemon" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 0;

    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsEgg").permanentId,
        instanceId: legal.inst("kotemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("tsEgg").topCard.cardId === "BT26-008");
    expect(legal.state.memory).toBe(0);

    const invalid = setupEngine({
      0: {
        breeding: { card: "BT1-003", as: "plainBlueEgg" },
        hand: [{ card: "BT26-008", as: "kotemon" }],
      },
    });
    invalid.state.memory = 0;

    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plainBlueEgg").permanentId,
        instanceId: invalid.inst("kotemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("grants Piercing and +3000 DP to one controller-owned Shambala/TS Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-012", as: "target" },
            { card: "BT1-009", as: "other" },
          ],
          hand: [{ card: "BT26-008", as: "self" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("self").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 9000);
    expect(observe(s.engine).hasPierce(s.perm("target"))).toBe(true);
  });

  it("keeps Piercing and +3000 DP on the same chosen Digimon when multiple targets qualify", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-012", as: "chosen" },
            { card: "BT26-013", as: "other" },
          ],
          hand: [{ card: "BT26-008", as: "self" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").topCard.instanceId);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("self").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasPierce(s.perm("chosen")));

    expect(observe(s.engine).hasPierce(s.perm("chosen"))).toBe(true);
    expect(s.perm("other").currentDP).toBe(5000);
    expect(observe(s.engine).hasPierce(s.perm("other"))).toBe(false);
  });

  it("applies the same bound Piercing and DP bonus when Kotemon moves from breeding", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT26-008", as: "mover" },
          battleArea: [
            { card: "BT26-012", as: "chosen" },
            { card: "BT26-013", as: "other" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").topCard.instanceId);
    s.state.phase = Phase.Breeding;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasPierce(s.perm("chosen")));

    expect(observe(s.engine).hasPierce(s.perm("chosen"))).toBe(true);
    expect(s.perm("other").currentDP).toBe(5000);
    expect(observe(s.engine).hasPierce(s.perm("other"))).toBe(false);
  });

  it("grants the inherited +2000 DP only during its controller's turn", async () => {
    const ownTurn = setupEngine({
      0: { battleArea: [{ card: "BT26-013", as: "host", under: ["BT26-008"] }] },
    });
    await ownTurn.ready();
    expect(ownTurn.perm("host").currentDP).toBe(7000);

    const opponentTurn = setupEngine({
      0: { battleArea: [{ card: "BT26-013", as: "host", under: ["BT26-008"] }] },
    });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    expect(opponentTurn.perm("host").currentDP).toBe(5000);
  });
});
