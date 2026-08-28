import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-026.js";

describe("BT18-026 DaiPenmon", () => {
  it("deletes an opposing Digimon with no digivolution cards when digivolving", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Main",
      isFromHand: true,
      actions: [{ kind: "Digivolve", costOverride: 3, ignoreRequirements: true, additionalCosts: [{ kind: "place" }] }],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "IceClad" }] });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" } },
        },
      ],
    });
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-026", as: "dai" }] },
        1: {
          battleArea: [
            { card: "BT1-030", as: "empty" },
            { card: "BT1-030", as: "stacked", under: ["BT18-021"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const emptyId = s.perm("empty").permanentId;
    const stackedId = s.perm("stacked").permanentId;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("dai"));
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === emptyId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === emptyId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === stackedId)).toBe(true);
  });

  it("pays both named trash placements and 3 memory for its hand Main evolution", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-089", as: "tommy" }],
          hand: [{ card: "BT18-026", as: "dai" }],
          trash: [
            { card: "BT18-022", as: "kumamon" },
            { card: "BT18-025", as: "korikakumon" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("tommy").topCard.instanceId, s.inst("kumamon").instanceId, s.inst("korikakumon").instanceId);
    s.state.memory = 5;

    await advance(s.engine).fireForInstance(EffectTiming.OnDeclaration, s.inst("dai"));
    await settle(() => s.perm("tommy").topCard.cardId === "BT18-026");

    expect(s.state.memory).toBe(2);
    expect(s.perm("tommy").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT18-022", "BT18-025", "BT18-089"]),
    );
  });

  it("cannot partially pay the hand Main cost when Korikakumon is absent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-089", as: "tommy" }],
          hand: [{ card: "BT18-026", as: "dai" }],
          trash: [{ card: "BT18-022", as: "kumamon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    await advance(s.engine).fireForInstance(EffectTiming.OnDeclaration, s.inst("dai"));

    expect(s.perm("tommy").topCard.cardId).toBe("BT18-089");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT18-022");
    expect(s.state.memory).toBe(5);
  });

  it("digivolves from a blue/red level-4 Hybrid for 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-025", as: "hybrid" }],
        hand: [{ card: "BT18-026", as: "dai" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hybrid").permanentId,
        instanceId: s.inst("dai").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hybrid").topCard.cardId === "BT18-026");

    expect(s.state.memory).toBe(2);
    expect(s.perm("hybrid").stack.at(-1)?.cardId).toBe("BT18-025");
  });

  it("exposes Ice Clad, the Ice-Snow Rule trait, and inherited +2000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-026", as: "self" },
          { card: "BT1-030", dp: 3000, as: "host", under: ["BT18-026"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("self"), "IceClad")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("self"), "Ice-Snow")).toBe(true);
    expect(s.perm("host").currentDP).toBe(5000);
  });
});
