import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-207.js";
import "../index.js";

describe("P-207 Minervamon", () => {
  it("requires a level 5 Beastkin or TS Digimon and has Alliance", () => {
    const card = runtimeCompiledCard("P-207")!;
    expect(card.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Beastkin", "TS"], cost: 3, isAlternate: true },
    ]);
    expect(card.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }],
    });
  });

  it("plays eligible hand Digimon on play and digivolution, excluding Sea Animal", () => {
    const card = runtimeCompiledCard("P-207")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: false,
            optional: true,
            target: {
              count: 1,
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 4 },
                excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
                nameOrTrait: [{ tokens: ["Avian", "Bird", "Beast", "Animal", "Sovereign"], match: "traitContains" }],
                orFilters: [
                  {
                    controller: "mine",
                    kind: ["Digimon"],
                    levelComparison: { op: "lte", value: 4 },
                    nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
                  },
                ],
              },
            },
          },
        ],
      });
    }
  });

  it("once per turn plays the same eligible card set from trash when attacking", () => {
    expect(runtimeCompiledCard("P-207")!.effects.find((effect) => effect.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          target: {
            count: 1,
            filter: {
              levelComparison: { op: "lte", value: 4 },
              excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
              nameOrTrait: [{ tokens: ["Avian", "Bird", "Beast", "Animal", "Sovereign"], match: "traitContains" }],
              orFilters: [
                { levelComparison: { op: "lte", value: 4 }, nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
              ],
            },
          },
        },
      ],
    });
  });

  it("exposes Alliance on the live Minervamon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-207", as: "minerva" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("minerva"), "Alliance")).toBe(true);
  });

  it("publicly plays for 12 and plays an eligible level-4 Avian from hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-207", as: "minerva" },
            { card: "BT1-017", as: "avian" },
          ],
          deck: Array.from({ length: 20 }, () => "BT3-059"),
        },
        1: { deck: Array.from({ length: 20 }, () => "BT3-059"), security: Array(3).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const sourceId = s.inst("minerva").instanceId;
    const avianId = s.inst("avian").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: sourceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("minerva").topCard.instanceId === sourceId &&
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === avianId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 10, to: -2, reason: "playCard" });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === sourceId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === avianId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("avian").instanceId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays the same eligible card from hand when digivolving", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-207", as: "minerva" }], hand: [{ card: "BT1-017", as: "avian" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("minerva"));
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("avian").instanceId)).toBe(true);
  });

  it("plays one eligible trash card per attack and resets after the natural turn handoff", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-207", as: "minerva" }],
          trash: [
            { card: "BT1-012", as: "avian1" },
            { card: "BT1-012", as: "avian2" },
          ],
          hand: ["BT1-009"],
          deck: Array.from({ length: 20 }, () => "BT3-059"),
        },
        1: {
          hand: ["BT1-009"],
          security: Array.from({ length: 5 }, () => "BT1-009"),
          deck: Array.from({ length: 20 }, () => "BT3-059"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const sourcePermanentId = s.perm("minerva").permanentId;
    const avian1Id = s.inst("avian1").instanceId;
    const avian2Id = s.inst("avian2").instanceId;
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: sourcePermanentId,
        target: { kind: "player" },
      });
    const combatIdle = () => !observe(s.engine).isAttacking();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const securityBeforeFirst = s.state.players[1]!.security.length;
    const securityChecksBeforeFirst = s.events.filter((event) => event.kind === "securityChecked").length;
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "alliancePrompt").length >= 1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondAlliance",
        allyPermanentId: s.perm("avian1").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === avian1Id) &&
        s.state.pendingDecision === undefined &&
        combatIdle() &&
        s.events.filter((event) => event.kind === "securityChecked").length === securityChecksBeforeFirst + 2,
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === avian1Id)).toBe(false);
    expect(s.state.players[1]!.security.length).toBe(securityBeforeFirst - 2);
    expect(s.perm("minerva").permanentId).toBe(sourcePermanentId);
    await advance(s.engine).verb.unsuspend([sourcePermanentId]);
    const securityBeforeSecond = s.events.filter((event) => event.kind === "securityChecked").length;
    expect(attack()).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === securityBeforeSecond + 1 &&
        combatIdle() &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === avian2Id)).toBe(true);

    const securityBeforeThird = s.state.players[1]!.security.length;
    const securityChecksBeforeThird = s.events.filter((event) => event.kind === "securityChecked").length;
    expect(securityBeforeThird).toBe(securityBeforeFirst - 3);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "alliancePrompt").length >= 2);
    expect(
      s.engine.applyIntent(0, {
        type: "respondAlliance",
        allyPermanentId: s.perm("avian1").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === avian2Id) &&
        combatIdle() &&
        s.state.pendingDecision === undefined &&
        s.events.filter((event) => event.kind === "securityChecked").length === securityChecksBeforeThird + 2,
    );
    expect(s.state.players[1]!.security.length).toBe(securityBeforeThird - 2);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === avian2Id)).toBe(false);
    expect(s.perm("minerva").permanentId).toBe(sourcePermanentId);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
