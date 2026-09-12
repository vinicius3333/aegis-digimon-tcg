import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-208.js";

describe("P-208 Merukimon", () => {
  it("requires a level 5 Beastkin or TS Digimon and has Execute", () => {
    const card = runtimeCompiledCard("P-208")!;
    expect(card.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Beastkin", "TS"], cost: 3, isAlternate: true },
    ]);
    expect(card.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Execute", raw: "＜Execute＞" }],
    });
  });

  it("plays an eligible card from trash on digivolution and deletion, excluding Sea Animal", () => {
    const card = runtimeCompiledCard("P-208")!;
    for (const trigger of ["WhenDigivolving", "OnDeletion"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["trash"],
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

  it("once per turn returns an opponent's suspended Digimon to deck bottom when attacking", () => {
    expect(runtimeCompiledCard("P-208")!.effects.find((effect) => effect.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Return",
          to: "deckBottom",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], suspended: true } },
        },
      ],
    });
  });

  it("exposes Execute on the live Merukimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-208", as: "meruki" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("meruki"), "Execute")).toBe(true);
  });

  it("plays an eligible level-4 Digimon from trash when deleted", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-208", as: "meruki" }], trash: [{ card: "BT1-017", as: "avian" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("meruki").permanentId]);
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("avian").instanceId)).toBe(true);
  });

  it("publicly digivolves for 3 and plays an eligible level-4 Digimon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-040", as: "base" }],
          hand: [{ card: "P-208", as: "meruki" }],
          trash: [{ card: "BT1-017", as: "avian" }],
          deck: Array.from({ length: 20 }, () => "BT3-059"),
        },
        1: { deck: Array.from({ length: 20 }, () => "BT3-059"), security: Array(3).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceId = s.inst("meruki").instanceId;
    const avianId = s.inst("avian").instanceId;
    const basePermanentId = s.perm("base").permanentId;
    const baseId = s.inst("base").instanceId;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: basePermanentId,
        instanceId: sourceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.perm("base").topCard.instanceId === sourceId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").permanentId).toBe(basePermanentId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.perm("base").topCard.instanceId).toBe(sourceId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === sourceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === avianId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === avianId)).toBe(true);
  });

  it("returns one suspended opposing Digimon per attack and resets after the natural handoff", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-208", as: "meruki" },
            { card: "BT1-009", as: "legalAlly" },
          ],
          hand: ["BT1-009"],
          deck: Array.from({ length: 20 }, () => "BT3-059"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-013", suspended: true, as: "victim1" },
            { card: "BT1-013", suspended: true, as: "victim2" },
          ],
          hand: ["BT1-009"],
          deck: Array.from({ length: 20 }, () => "BT3-059"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const sourcePermanentId = s.perm("meruki").permanentId;
    const victim1Id = s.inst("victim1").instanceId;
    const victim2Id = s.inst("victim2").instanceId;
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: sourcePermanentId,
        target: { kind: "player" },
      });
    const combatIdle = () => !observe(s.engine).isAttacking();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const securityChecksBeforeFirst = s.events.filter((event) => event.kind === "securityChecked").length;
    expect(attack()).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("meruki").instanceId) &&
        s.state.players[1]!.battleArea.length === 1 &&
        combatIdle() &&
        s.state.pendingDecision === undefined &&
        s.events.filter((event) => event.kind === "securityChecked").length === securityChecksBeforeFirst + 1,
    );
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(victim1Id);
    expect(s.perm("meruki").permanentId).toBe(sourcePermanentId);

    await advance(s.engine).verb.unsuspend([sourcePermanentId]);
    const securityChecksBeforeSecond = s.events.filter((event) => event.kind === "securityChecked").length;
    expect(attack()).toEqual({ ok: true });
    await settle(
      () =>
        combatIdle() &&
        s.state.pendingDecision === undefined &&
        s.events.filter((event) => event.kind === "securityChecked").length === securityChecksBeforeSecond + 1,
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === victim2Id)).toBe(true);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(victim1Id);

    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("victim2").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    const securityChecksBeforeOpponent = s.events.filter((event) => event.kind === "securityChecked").length;
    await settle(
      () =>
        s.perm("victim2").isSuspended &&
        s.state.pendingDecision === undefined &&
        combatIdle() &&
        s.events.filter((event) => event.kind === "securityChecked").length === securityChecksBeforeOpponent + 1,
    );
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    const securityBeforeThird = s.state.players[1]!.security.length;
    const securityChecksBeforeThird = s.events.filter((event) => event.kind === "securityChecked").length;
    expect(attack()).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[1]!.deck.at(-1)?.instanceId === victim2Id &&
        combatIdle() &&
        s.state.pendingDecision === undefined &&
        s.events.filter((event) => event.kind === "securityChecked").length === securityChecksBeforeThird + 1,
    );
    expect(s.state.players[1]!.security.length).toBe(securityBeforeThird - 1);
    expect(s.perm("meruki").permanentId).toBe(sourcePermanentId);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
