import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../BT12/BT12-016.js";
import "../BT14/BT14-062.js";
import "../EX3/EX3-057.js";
import "../EX2/EX2-011.js";
import { compiled } from "./BT9-017.js";

describe("BT9-017 Gallantmon (X Antibody)", () => {
  it("matches the complete catalog, lowest-DP branch, watcher, and evolution IR", () => {
    expect(getCardDefinition("BT9-017")).toMatchObject({
      cardId: "BT9-017",
      nameEn: "Gallantmon (X Antibody)",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Red", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Holy Warrior", "Royal Knight", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            { kind: "Delete", target: { filter: { controller: "opponent", superlative: "lowestDP" }, count: 1 } },
            { kind: "Unsuspend", condition: { kind: "ifThisEffectDidNotDelete" } },
          ],
        },
        {
          trigger: "YourTurn",
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "onDeletionOf",
              actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ names: ["Gallantmon"], cost: 1, isAlternate: true }],
    });
  });

  it("uses the 1-cost Gallantmon alternate route after a complete legal breeding chain", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-001", as: "stack" },
          hand: [
            { card: "BT9-009", as: "rookie" },
            { card: "EX3-057", as: "champion" },
            { card: "BT12-016", as: "ultimate" },
            { card: "EX2-011", as: "gallantmon" },
            { card: "BT9-017", as: "gallantmonX" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    for (const alias of ["rookie", "champion", "ultimate", "gallantmon"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("stack").permanentId,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("stack").topCard.instanceId === s.inst(alias).instanceId);
    }
    const before = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("stack").permanentId,
        instanceId: s.inst("gallantmonX").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("stack").topCard.cardId === "BT9-017");
    expect(s.state.memory).toBe(before - 1);
  });
  it("deletes one opposing Digimon with the lowest DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-002", as: "base", suspended: true }],
          hand: [{ card: "BT9-017", as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "lowest" },
            { card: "BT2-047", as: "higher" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT9-017"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("base").isSuspended).toBe(true);
  });

  it("unsuspends when its digivolution effect deletes nothing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-002", as: "base", suspended: true }],
        hand: [{ card: "BT9-017", as: "evolving" }],
      },
    });
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("base").isSuspended);
    expect(s.perm("base").isSuspended).toBe(false);
  });

  it("once per turn trashes opposing security when an opponent's Digimon is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-017", as: "gallant", under: ["BT2-020"] }] },
      1: { battleArea: [{ card: "BT1-028", as: "victim" }], security: ["BT1-001"] },
    });
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("deletes the lowest-DP Digimon and trashes security in the real Gallantmon X line", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-011", as: "gallantmon", suspended: true }],
          hand: [{ card: "BT9-017", as: "gallantmonX" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "lowest" },
            { card: "BT2-047", as: "higher" },
          ],
          security: ["BT1-001", "BT1-002"],
        },
      },
      {
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("lowest").permanentId);
    s.state.memory = 1;
    const lowestId = s.perm("lowest").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gallantmon").permanentId,
        instanceId: s.inst("gallantmonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === lowestId) &&
        s.state.players[1]!.security.length === 1,
    );

    expect(s.perm("gallantmon").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT2-047"]);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("implements Q1814 by allowing an immune tied-lowest choice to produce the unsuspend branch", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-011", as: "base", suspended: true }],
          hand: [{ card: "BT9-017", as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: "BT14-062", as: "immune" },
            { card: "BT1-028", as: "deletable", dp: 6000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("immune").permanentId);
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("base").isSuspended);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });

  it("implements Q1815 exact names and once-per-turn security trashing", async () => {
    for (const [source, qualifies] of [
      ["BT9-109", true],
      ["BT9-015", false],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT9-017", as: "gallant", under: [source] }] },
        1: {
          battleArea: [
            { card: "BT1-028", as: "first" },
            { card: "BT1-028", as: "second" },
          ],
          security: ["BT1-001", "BT1-002"],
        },
      });
      await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId], "byEffect");
      await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId], "byEffect");
      expect(s.state.players[1]!.security).toHaveLength(qualifies ? 1 : 2);
    }
  });

  it("implements related Q2146 by allowing BT12-016 to effect-digivolve into Gallantmon X", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-057", as: "base" }],
          hand: [
            { card: "BT12-016", as: "warGrowlmon" },
            { card: "BT9-017", as: "gallantmonX" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("warGrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT9-017");
    expect(s.perm("base").topCard.cardId).toBe("BT9-017");
  });
});
