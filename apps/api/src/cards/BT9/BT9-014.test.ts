import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT12/BT12-016.js";
import "../EX3/EX3-057.js";
import "./BT9-009.js";
import "./BT9-011.js";
import { compiled } from "./BT9-014.js";
describe("BT9-014 WarGrowlmon (X Antibody)", () => {
  it("matches the complete catalog, aura, deletion budget, and alternate evolution IR", () => {
    expect(getCardDefinition("BT9-014")).toMatchObject({
      cardId: "BT9-014",
      nameEn: "WarGrowlmon (X Antibody)",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [{ color: "Red", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Cyborg", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "GrantAuraToOpponents",
              target: { count: 2 },
              event: "onDeletionOf",
              actions: [{ kind: "GainMemory", amount: -1 }],
              duration: "untilOpponentTurnEnd",
            },
            { kind: "DeleteByDPBudget", baseBudget: 6000, optional: true },
          ],
        },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ names: ["WarGrowlmon"], cost: 0, isAlternate: true }],
    });
  });

  it("reaches the 0-cost WarGrowlmon alternate route through a complete legal breeding chain", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-001", as: "stack" },
          hand: [
            { card: "BT9-009", as: "guilmonX" },
            { card: "EX3-057", as: "growlmon" },
            { card: "BT9-011", as: "growlmonX" },
            { card: "BT12-016", as: "warGrowlmon" },
            { card: "BT9-014", as: "warGrowlmonX" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    for (const alias of ["guilmonX", "growlmon", "growlmonX", "warGrowlmon"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("stack").permanentId,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("stack").topCard.instanceId === s.inst(alias).instanceId);
    }
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("stack").permanentId,
        instanceId: s.inst("warGrowlmonX").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("stack").topCard.cardId === "BT9-014");
    expect(s.state.memory).toBe(0);
  });
  it("deletes opposing Digimon whose combined DP is at most 6000", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-003", as: "base" }], hand: [{ card: "BT9-014", as: "evolving" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first", dp: 3000 },
            { card: "BT1-011", as: "second", dp: 3000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("uses Guilmon X and Growlmon X sources to raise the combined deletion budget to 8000", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "AD1-003",
              as: "warGrowlmon",
              under: ["BT9-009", "BT9-011"],
            },
          ],
          hand: [{ card: "BT9-014", as: "warGrowlmonX" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first", dp: 4000 },
            { card: "BT1-011", as: "second", dp: 4000 },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
      },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("warGrowlmon").permanentId,
        instanceId: s.inst("warGrowlmonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-010", "BT1-011"]),
    );
  });

  it("grants exactly 2 opponents the timed On Deletion memory loss", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-003", as: "base" }], hand: [{ card: "BT9-014", as: "evolving" }] },
        1: {
          battleArea: [
            { card: "BT1-021", as: "first" },
            { card: "BT1-021", as: "second" },
            { card: "BT1-021", as: "third" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId], "byEffect");
    await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId], "byEffect");
    await advance(s.engine).verb.deletePermanent([s.perm("third").permanentId], "byEffect");
    expect(s.state.memory).toBe(2);
  });

  it("implements Q1807 by rejecting an X Antibody trait without the exact card name", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-012", as: "traitOnly" }], hand: [{ card: "BT9-014", as: "evolving" }] },
        1: { battleArea: [{ card: "BT1-028", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("traitOnly").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
