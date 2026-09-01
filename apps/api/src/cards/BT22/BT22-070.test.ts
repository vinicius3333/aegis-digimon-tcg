import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-070.js";

describe("BT22-070 DarkTyrannomon (X Antibody)", () => {
  it("deletes an opposing level 4-or-lower Digimon only with the stack condition", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[0]).toMatchObject({
      kind: "Delete",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
        count: 1,
      },
      condition: {
        kind: "selfDigivolutionStackHasTrait",
        filter: {
          nameOrTrait: [
            { tokens: ["DarkTyrannomon"], match: "name" },
            { tokens: ["X Antibody"], match: "trait" },
          ],
        },
      },
    });
  });

  it("anchors inherited memory gain to this Digimon and excludes simultaneous deletion", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          notSimultaneous: true,
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });

  it("pays the normal evolution cost for its optional attack evolution", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      payCost: true,
      optional: true,
      into: {
        nameOrTrait: [
          { tokens: ["Tyrannomon"], match: "name" },
          { tokens: ["Dinosaur"], match: "trait" },
        ],
      },
    });
  });

  it("deletes a level 4 opponent through the public zero-cost alternate evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-059", as: "darktyrannomon" }],
          hand: [{ card: "BT22-070", as: "x-antibody" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("darktyrannomon").permanentId,
        instanceId: s.inst("x-antibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("gains inherited memory when it deletes an opponent in a public battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-069", as: "attacker", under: ["BT22-070"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 500, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });
});
