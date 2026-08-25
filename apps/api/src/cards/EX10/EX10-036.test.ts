import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-036.js";
import "../index.js";

const CARD_ID = "EX10-036";

describe("EX10-036 Magneticdramon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Black"],
      level: 7,
      playCost: 14,
      dp: 14000,
      evoCosts: [{ color: "Black", level: 6, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Rock Dragon", "LIBERATOR", "Mineral"],
    });
  });
  it("proves Fragment, deletion plus security trash, shared unsuspend, and alternate digivolution", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      {
        namesExact: ["Proganomon"],
        cost: 6,
        isAlternate: true,
        controllerControls: { kind: ["Tamer"], namesExact: ["Close"], min: 1 },
      },
    ]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Fragment", amount: 3 }],
    });

    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const effects = compiled.effects?.filter((effect) => effect.trigger === trigger);
      expect(effects).toHaveLength(2);
      expect(effects?.[0]).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            cost: { kind: "trash", target: { filter: { controller: "mine" }, count: 3, from: ["digivolutionCards"] } },
          },
          { kind: "trashSecurityTop", controller: "opponent", count: 1 },
        ],
      });
      expect(effects?.[1]).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [{ kind: "Unsuspend", cost: { kind: "place", target: { count: 3, from: ["trash"] } } }],
      });
    }
  });

  it("Q5113/Q5114 pays exactly 3 sources across stacks, deletes 1, and trashes top security", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "magnetic" },
            { card: "EX10-028", as: "firstHost", under: [{ card: "EX10-025", as: "first" }] },
            {
              card: "EX10-028",
              as: "secondHost",
              under: [
                { card: "EX10-003", as: "second" },
                { card: "EX10-028", as: "third" },
              ],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target" }], security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.inst("first").instanceId,
      s.inst("second").instanceId,
      s.inst("third").instanceId,
      s.perm("target").permanentId,
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("magnetic"), "Fragment")).toBe(true);
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("magnetic"));
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId, s.inst("third").instanceId]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("Q5115 places exactly 3 matching trash cards at bottom before unsuspending", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "magnetic", suspended: true, under: [{ card: "BT1-009", as: "old" }] }],
          trash: [
            { card: "EX10-025", as: "first" },
            { card: "EX10-003", as: "second" },
            { card: "EX10-028", as: "third" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("magnetic"));
    expect(
      s
        .perm("magnetic")
        .stack.slice(0, 3)
        .map(({ instanceId }) => instanceId),
    ).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId, s.inst("third").instanceId]),
    );
    expect(s.perm("magnetic").isSuspended).toBe(false);
  });

  it("uses the Close-gated Proganomon evolution for 6 and rejects it without Close", async () => {
    const valid = setupEngine({
      0: {
        battleArea: [
          { card: "EX10-032", as: "base" },
          { card: "EX10-063", as: "close" },
        ],
        hand: [{ card: CARD_ID, as: "magnetic" }],
      },
    });
    valid.state.memory = 6;
    await valid.ready();
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("base").permanentId,
        instanceId: valid.inst("magnetic").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("base").topCard.cardId === CARD_ID);
    expect(valid.state.memory).toBe(0);

    const blocked = setupEngine({
      0: {
        battleArea: [{ card: "EX10-032", as: "base" }],
        hand: [{ card: CARD_ID, as: "magnetic" }],
      },
    });
    blocked.state.memory = 6;
    await blocked.ready();
    expect(
      blocked.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: blocked.perm("base").permanentId,
        instanceId: blocked.inst("magnetic").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
