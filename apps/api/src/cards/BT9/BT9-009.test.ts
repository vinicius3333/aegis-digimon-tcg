import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT15/BT15-009.js";
import "../EX2/EX2-008.js";
import "../EX3/EX3-057.js";
import { compiled } from "./BT9-009.js";

describe("BT9-009 Guilmon (X Antibody)", () => {
  it("matches the catalog and complete deletion/evolution IR", () => {
    expect(getCardDefinition("BT9-009")).toMatchObject({
      cardId: "BT9-009",
      nameEn: "Guilmon (X Antibody)",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 4,
      dp: 3000,
      evoCosts: [{ color: "Red", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Dark Dragon", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", dp: { op: "lte", value: 3000 } }, count: 1 },
            },
          ],
        },
        {
          trigger: "YourTurn",
          actions: [{ kind: "CostModifier", mode: "raiseCeiling", costType: "dpDeletion", amount: 1000 }],
          isInherited: true,
        },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ names: ["Guilmon"], cost: 0, isAlternate: true }],
    });
  });

  it("deletes at the printed 3000-DP boundary but leaves 4000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-001", as: "base" }], hand: [{ card: "BT9-009", as: "evolving" }] },
        1: {
          battleArea: [
            { card: "BT1-028", as: "threeThousand" },
            { card: "BT1-015", as: "fourThousand" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-028"));
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-015"]);
  });

  it("implements Q1799 through a legal stack by raising a fixed 3000-DP deletion to 4000", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-001", as: "egg" },
          hand: [
            { card: "BT9-009", as: "guilmonX" },
            { card: "EX3-057", as: "growlmon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-015", as: "fourThousand" }] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("guilmonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("guilmonX").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding === undefined);
    s.state.phase = Phase.Main;
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash).toContainEqual(s.inst("fourThousand"));
    expect(s.perm("egg").stack.map((card) => card.cardId)).toContain("BT9-009");
  });

  it("uses the 0-cost Guilmon alternate route in a complete legal breeding chain", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "egg" },
        hand: [
          { card: "EX2-008", as: "guilmon" },
          { card: "BT9-009", as: "guilmonX" },
        ],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("guilmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "EX2-008");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("guilmonX").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT9-009");
    expect(s.state.memory).toBe(0);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT1-001", "EX2-008"]);
  });

  it("implements Q1800 by not raising Meramon's source-relative DP ceiling", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-001", as: "egg" },
          hand: [
            { card: "BT9-009", as: "guilmonX" },
            { card: "BT15-009", as: "meramon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-013", as: "fiveThousand" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("guilmonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT9-009");
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding === undefined);
    s.state.phase = Phase.Main;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("meramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT15-009");

    const [main] = observe(s.engine).activatableEffects(s.perm("egg")) as Array<{ effectKey: string }>;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("egg").topCard.instanceId,
        effectKey: main!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
