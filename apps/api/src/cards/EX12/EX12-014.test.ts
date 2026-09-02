import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-014 Canoweissmon", () => {
  it("places a matching hand card underneath itself on play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-007", as: "ally" }],
          hand: [
            { card: "EX12-014", as: "source" },
            { card: "EX12-007", as: "material" },
          ],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("source").instanceId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    const sourcePermanent = () =>
      s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === s.inst("source").instanceId);
    await settle(
      () => sourcePermanent()?.stack.some((card) => card.instanceId === s.inst("material").instanceId) === true,
    );

    expect(sourcePermanent()!.stack.map((card) => card.cardId)).toContain("EX12-007");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(false);
  });

  it("places a matching trash card underneath itself when digivolving", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-007", as: "ally" },
            { card: "EX12-011", as: "base" },
          ],
          hand: [{ card: "EX12-014", as: "source" }],
          trash: [{ card: "BT10-011", as: "material" }],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("source").instanceId);
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.some((card) => card.instanceId === s.inst("material").instanceId));

    expect(s.perm("base").topCard?.cardId).toBe("EX12-014");
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT10-011");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(false);
  });

  it("still offers the following attack when no eligible material is available", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-007", as: "ally" }],
          hand: [
            { card: "EX12-014", as: "source" },
            { card: "EX12-017", as: "tooHigh" },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const allyId = s.perm("ally").topCard!.instanceId;
    preferred.push(allyId);
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === allyId));

    const source = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("source").instanceId,
    )!;

    expect(source.stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tooHigh").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === allyId)).toBe(true);
  });

  it("encodes Decode, both recovery windows, the level ceiling, and optional attack", () => {
    const compiled = registeredCompiledCards.get("EX12-014")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, texts: ["Gammamon"], cost: 3, isAlternate: true },
      { traits: ["VB"], cost: 3, isAlternate: true, level: 4 },
    ]);
    expect(compiled.effects.filter((effect) => effect.trigger === "Static")).toHaveLength(2);
    expect(compiled.effects.find((effect) => effect.trigger === "Static" && !effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Decode", raw: "＜Decode (Lv.4 or lower w/[Gammamon] in text or w/[VB] trait)＞" }],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "PlaceUnder",
            target: {
              count: 1,
              from: ["hand", "trash"],
              filter: { kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
            },
            optional: true,
            position: "bottom",
          },
          {
            kind: "Attack",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            optional: true,
            withoutSuspending: false,
          },
        ],
      });
    }
  });

  it("keeps Decode inherited with the corrected printed restriction", () => {
    const compiled = registeredCompiledCards.get("EX12-014")!;
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Decode", raw: "＜Decode (Lv.4 or lower w/[Gammamon] in text or w/[VB] trait)＞" }],
    });
  });

  it.each([
    {
      placement: "printed",
      stack: { card: "EX12-014", as: "host", under: [{ card: "EX12-013", as: "decodeTarget" }] },
    },
    {
      placement: "inherited",
      stack: {
        card: "EX12-015",
        as: "host",
        under: [
          { card: "EX12-013", as: "decodeTarget" },
          { card: "EX12-014", as: "decodeSource" },
        ],
      },
    },
  ])("executes $placement Decode before an effect-caused leave", async ({ stack }) => {
    const s = setupEngine({ 0: { battleArea: [stack] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const targetId = s.inst("decodeTarget").instanceId;

    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === targetId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === targetId)).toBe(true);
  });

  it("plays only from its own digivolution cards, never from a neighbor's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-014", as: "host" },
            { card: "EX12-015", as: "neighbor", under: [{ card: "EX12-013", as: "foreign" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const foreignId = s.inst("foreign").instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === foreignId)).toBe(false);
    expect(s.perm("neighbor").stack.some((card) => card.instanceId === foreignId)).toBe(true);
  });

  it("does not trigger Decode when the host leaves by battle", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX12-014", as: "host", under: [{ card: "EX12-013", as: "decodeTarget" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.inst("decodeTarget").instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byBattle")).toBe(1);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === targetId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === targetId)).toBe(true);
  });

  it("uses both normal colors and both printed cost-3 alternatives", async () => {
    expect(digivolutionRequirementsFor("EX12-014")).toEqual([
      { level: 4, texts: ["Gammamon"], cost: 3, isAlternate: true },
      { level: 4, traits: ["VB"], cost: 3, isAlternate: true },
    ]);

    for (const [baseCardId, useAlternateCost, startingMemory] of [
      ["EX12-011", false, 4],
      ["BT1-051", false, 4],
      ["BT21-019", true, 3],
      ["EX12-024", true, 3],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "EX12-014", as: "canoweissmon" }],
        },
      });
      s.state.memory = startingMemory;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("canoweissmon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-014");
      expect(s.state.memory).toBe(0);
    }
  });

  it("rejects an off-color level-4 card without Gammamon text or VB", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-069", as: "base" }],
        hand: [{ card: "EX12-014", as: "canoweissmon" }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("canoweissmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
