import { dnaDigivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-037.js";
import "../index.js";

describe("EX7-037 Tlalocmon", () => {
  it("matches the catalog, Q3850 DNA matrix, complete IR, and exclusive registration", () => {
    expect(getCardDefinition("EX7-037")).toMatchObject({
      cardId: "EX7-037",
      nameEn: "Tlalocmon",
      colors: ["Green", "Yellow", "Black"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 15,
      dp: 15000,
      evoCosts: [
        { color: "Green", level: 6, memoryCost: 6 },
        { color: "Yellow", level: 6, memoryCost: 6 },
        { color: "Black", level: 6, memoryCost: 6 },
      ],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Mineral", "NSp"],
    });
    expect(dnaDigivolutionRequirementsFor("EX7-037")).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Green", level: 6 },
          { color: "Black", level: 6 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Green", level: 6 },
          { color: "Blue", level: 6 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Yellow", level: 6 },
          { color: "Black", level: 6 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Yellow", level: 6 },
          { color: "Blue", level: 6 },
        ],
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const branch = compiled.effects?.[0]?.actions[0];
    expect(branch).toEqual({
      kind: "ConditionalBranch",
      condition: { kind: "isDnaDigivolving", raw: "If DNA digivolving" },
      ifTrue: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              playCostLte: 7,
              nameOrTrait: [{ tokens: ["NSp"], match: "trait" }],
              differentColors: true,
            },
            count: 2,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
      ifFalse: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              playCostLte: 7,
              nameOrTrait: [{ tokens: ["NSp"], match: "trait" }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
      raw: "If DNA digivolving, play 2 with different colors instead",
    });
    for (const effect of compiled.effects?.slice(1) ?? []) {
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
      expect(effect.actions[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -7000,
        duration: "forTheTurn",
        scaling: { per: 1, filter: { controller: "mine", kind: ["Digimon"] }, unit: "cards" },
      });
    }
    expect(hasRegisteredCompiledCard("EX7-037")).toBe(true);
  });

  it("Q3850: DNA evolves Green + Black for 0 and plays two different-color NSp cards", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-036", as: "green" },
            { card: "EX7-047", as: "black" },
          ],
          hand: [
            { card: "EX7-037", as: "tlaloc" },
            { card: "EX7-022", as: "bluePlay" },
            { card: "EX7-028", as: "yellowPlay" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-014", as: "target", dp: 30000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("bluePlay").instanceId, s.inst("yellowPlay").instanceId, s.perm("target").permanentId);
    s.state.memory = 5;
    await s.ready();
    const materialIds = [s.inst("green").instanceId, s.inst("black").instanceId];
    const tlalocId = s.inst("tlaloc").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("green").permanentId, s.perm("black").permanentId],
        instanceId: tlalocId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.length === 3 &&
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === tlalocId),
    );
    const dna = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === tlalocId)!;
    expect(s.state.memory).toBe(5);
    expect(dna.isSuspended).toBe(false);
    expect(dna.stack.map((card) => card.instanceId).sort()).toEqual(materialIds.sort());
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(
      expect.arrayContaining(["EX7-037", "EX7-022", "EX7-028"]),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawnId);
    expect(s.perm("target").currentDP).toBe(9000);
  });

  it("rejects an invalid Green + Yellow Q3850 pair without mutation", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX7-036", as: "green" },
          { card: "EX7-030", as: "yellow" },
        ],
        hand: [{ card: "EX7-037", as: "tlaloc" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("green").permanentId, s.perm("yellow").permanentId],
        instanceId: s.inst("tlaloc").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["EX7-036", "EX7-030"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX7-037"]);
  });

  it("ordinary evolution pays 6, plays only one NSp, scales by two Digimon, and consumes shared OPT", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-036", as: "base" }],
          hand: [
            { card: "EX7-037", as: "tlaloc" },
            { card: "EX7-022", as: "first" },
            { card: "EX7-028", as: "second" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
          security: ["BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-014", as: "target", dp: 25000 }], security: ["BT1-009", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("first").instanceId, s.perm("target").permanentId);
    s.state.memory = 8;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const tlalocId = s.inst("tlaloc").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: tlalocId }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX7-022") &&
        s.perm("target").currentDP === 11000,
    );
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX7-028")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX7-028")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("target").currentDP).toBe(11000);
  });

  it("scales its public When Attacking reduction by every own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-037", as: "tlaloc" },
            { card: "EX7-031", as: "ally1" },
            { card: "EX7-033", as: "ally2" },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-014", as: "target", dp: 25000 }], security: ["BT1-009", "BT1-011"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tlaloc").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("rejects a wrong-color level 6 ordinary evolution without payment, draw, or stack mutation", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-082", as: "base" }],
        hand: [{ card: "EX7-037", as: "tlaloc" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 8;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tlaloc").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(8);
    expect(s.perm("base").topCard.cardId).toBe("BT10-082");
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });
});
