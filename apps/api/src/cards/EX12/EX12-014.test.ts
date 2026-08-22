import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-014 Canoweissmon", () => {
  it("places a matching hand card underneath itself on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-007", as: "ally" }],
          hand: [{ card: "EX12-014", as: "source" }, { card: "EX12-007", as: "material" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    const sourcePermanent = () => s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === s.inst("source").instanceId);
    await settle(() => sourcePermanent()?.stack.some((card) => card.instanceId === s.inst("material").instanceId) === true);

    expect(sourcePermanent()!.stack.map((card) => card.cardId)).toContain("EX12-007");
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(false);
  });

  it("places a matching trash card underneath itself when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-007", as: "ally" }, { card: "EX12-011", as: "base" }],
          hand: [{ card: "EX12-014", as: "source" }],
          trash: [{ card: "EX12-007", as: "material" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
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
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("EX12-007");
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(false);
  });

  it("still resolves the timing window when no matching card is available", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX12-007", as: "ally" }, { card: "EX12-014", as: "source" }] }, 1: { security: ["BT1-009"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    await (s.engine as unknown as { fireTimingForInstance(timing: string, instanceId: string): Promise<void> }).fireTimingForInstance(
      "OnPlay",
      s.perm("source").topCard!.instanceId,
    );
    await settle();

    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.perm("ally").isSuspended).toBe(false);
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
            abortOnDecline: true,
            position: "bottom",
          },
          { kind: "Attack", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 }, optional: true, withoutSuspending: false },
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
});
