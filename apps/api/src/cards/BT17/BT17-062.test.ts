import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-062.js";
import "./index.js";

describe("BT17-062 Dorumon", () => {
  it("matches the catalog printed text, evolution costs and requirement", () => {
    expect(getCardDefinition("BT17-062")).toMatchObject({
      cardId: "BT17-062",
      nameEn: "Dorumon",
      colors: ["Purple", "Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      types: ["Beast", "X Antibody", "SoC"],
      evoCosts: [
        { color: "Purple", level: 2, memoryCost: 1 },
        { color: "Black", level: 2, memoryCost: 1 },
      ],
      inheritedEffectText: "＜Reboot＞.",
    });
  });

  it("compiles the printed [Digivolve][Dorimon]: Cost 0 alternate requirement", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Dorimon"], cost: 0, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("requires Kosuke underneath and an opposing level-6-or-higher Digimon", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "WhenAttacking")?.actions[0];
    expect(action).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      payCost: true,
      costOverride: 4,
      ignoreRequirements: true,
      optional: true,
      condition: {
        kind: "allOf",
        conditions: [
          {
            kind: "selfDigivolutionStackHasTrait",
            // Printed [Kosuke Kisakata] is an exact name reference, not a substring.
            filter: { nameOrTrait: [{ tokens: ["Kosuke Kisakata"], match: "nameExact" }] },
          },
          {
            kind: "opponentHas",
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "gte", value: 6 } },
          },
        ],
      },
      // Printed [Dorugoramon] is exact: DexDorugoramon must not qualify.
      into: { nameOrTrait: [{ tokens: ["Dorugoramon"], match: "nameExact" }] },
    });
  });

  it("retains Reboot as its inherited keyword", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([
      { keyword: "Reboot", raw: "＜Reboot＞" },
    ]);
  });

  it("digivolves from a Dorimon egg for the printed cost of 0 with the bonus draw", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT16-005", as: "dorimon" },
        hand: [{ card: "BT17-062", as: "dorumon" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 2;
    await s.ready();
    const eggId = s.inst("dorimon").instanceId;
    const dorumonId = s.inst("dorumon").instanceId;
    const drawnId = s.inst("drawn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.state.players[0]!.breeding!.permanentId,
        instanceId: dorumonId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === dorumonId);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.instanceId)).toEqual([eggId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("costs 1 on the catalog Black route from the same Dorimon egg", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT16-005", as: "dorimon" },
        hand: [{ card: "BT17-062", as: "dorumon" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 2;
    await s.ready();
    const dorumonId = s.inst("dorumon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.state.players[0]!.breeding!.permanentId,
        instanceId: dorumonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === dorumonId);

    expect(s.state.memory).toBe(1);
  });

  it("refuses both routes from an off-color egg that is not a Dorimon", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "yokomon" },
        hand: [{ card: "BT17-062", as: "dorumon" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 2;
    await s.ready();
    const dorumonId = s.inst("dorumon").instanceId;
    const breedingId = s.state.players[0]!.breeding!.permanentId;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: breedingId, instanceId: dorumonId })).not.toEqual({
      ok: true,
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingId,
        instanceId: dorumonId,
        alternateRequirementIndex: 0,
      }),
    ).not.toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT1-001");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === dorumonId)).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("digivolves into Dorugoramon for 4 while attacking with both conditions", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-062", under: ["BT16-087"], as: "dorumon" }],
          hand: [{ card: "BT7-065", as: "dorugoramon" }],
        },
        1: {
          battleArea: [{ card: "BT17-070", as: "levelSix" }],
          security: [{ card: "BT1-009" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const dorugoramonId = s.inst("dorugoramon").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dorumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dorumon").topCard?.instanceId === dorugoramonId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("dorumon").stack.map((card) => card.cardId)).toEqual(["BT16-087", "BT17-062"]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not accept DexDorugoramon for the exact [Dorugoramon] reference", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-062", under: ["BT16-087"], as: "dorumon", dp: 20_000 }],
          hand: [{ card: "BT17-073", as: "dexDorugoramon" }],
        },
        1: {
          battleArea: [{ card: "BT17-070", as: "levelSix" }],
          security: [{ card: "BT1-009" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const dexId = s.inst("dexDorugoramon").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dorumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("dorumon").topCard?.cardId).toBe("BT17-062");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([dexId]);
    expect(s.state.memory).toBe(4);
  });

  it("does not offer the attack evolution without an opposing level 6", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-062", under: ["BT16-087"], as: "dorumon", dp: 20_000 }],
          hand: [{ card: "BT7-065", as: "dorugoramon" }],
        },
        1: { battleArea: [{ card: "BT17-025", as: "levelFive" }], security: [{ card: "BT1-009" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const dorugoramonId = s.inst("dorugoramon").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dorumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("dorumon").topCard?.cardId).toBe("BT17-062");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([dorugoramonId]);
    expect(s.state.memory).toBe(4);
  });

  it("does not offer the attack evolution without Kosuke in the digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-062", as: "dorumon", dp: 20_000 }],
          hand: [{ card: "BT7-065", as: "dorugoramon" }],
        },
        1: { battleArea: [{ card: "BT17-070", as: "levelSix" }], security: [{ card: "BT1-009" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const dorugoramonId = s.inst("dorugoramon").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dorumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("dorumon").topCard?.cardId).toBe("BT17-062");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([dorugoramonId]);
    expect(s.state.memory).toBe(4);
  });

  it("grants inherited Reboot to its host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-065", under: ["BT17-062"], as: "host" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
  });
});
