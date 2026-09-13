import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT22/BT22-087.js";
import "../BT25/BT25-100.js";
import "../ST3/ST3-14.js";
import "./P-162.js";

const DECK = Array(20).fill("BT1-009");
const SECURITY = Array(20).fill("BT1-009");

describe("P-162 Coelamon", () => {
  it("protects one DS Digimon from DP reduction and opponent De-Digivolve effects", () => {
    const compiled = runtimeCompiledCard("P-162")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "GrantStatic",
        target: {
          filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["DS"], match: "trait" }] },
          count: 1,
        },
        grant: { kind: "Protection", protections: ["dpReduction", "deDigivolve"], from: "opponent" },
        duration: "untilOpponentTurnEnd",
      });
    }
  });

  it("encodes inherited Blocker and DS level-3 digivolution", () => {
    const compiled = runtimeCompiledCard("P-162")!;
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          isInherited: true,
          keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
        }),
      ]),
    );
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["DS"], cost: 2, isAlternate: true }]);
  });

  it("plays for 4 and protects one DS Digimon from a public opponent DP reduction", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-026", as: "selected" },
            { card: "EX8-025", as: "other" },
          ],
          hand: [{ card: "P-162", as: "coelamon" }, "BT1-009"],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponent" },
            { card: "BT22-087", as: "memoryTamer" },
            { card: "BT22-087", as: "memoryTamer2" },
          ],
          hand: [
            { card: "ST3-14", as: "protectedReduction" },
            { card: "ST3-14", as: "controlReduction" },
          ],
          deck: DECK,
          security: SECURITY,
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("selected").topCard!.instanceId);
    const protectedReductionId = s.inst("protectedReduction").instanceId;
    const controlReductionId = s.inst("controlReduction").instanceId;
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("coelamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("coelamon").topCard?.cardId === "P-162" && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(6);
    expect(observe(s.engine).isRestricted(s.perm("selected"), "dpImmune")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("selected"), "cantBeDeDigivolved")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("other"), "dpImmune")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    preferred.splice(0, preferred.length, s.perm("selected").topCard!.instanceId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("protectedReduction").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("selected").currentDP === 12000 && s.state.pendingDecision === undefined);
    expect(s.perm("selected").currentDP).toBe(12000);
    expect(s.perm("other").currentDP).toBe(8000);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(protectedReductionId);
    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).isRestricted(s.perm("selected"), "dpImmune")).toBe(true);

    preferred.splice(0, preferred.length, s.perm("other").topCard!.instanceId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("controlReduction").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("other").currentDP === 6000 && s.state.pendingDecision === undefined);
    expect(s.perm("selected").currentDP).toBe(12000);
    expect(s.perm("other").currentDP).toBe(6000);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(controlReductionId);
    expect(s.state.memory).toBe(1);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(s.perm("selected"), "dpImmune")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("selected"), "cantBeDeDigivolved")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("evolves for the printed cost and keeps the exact DS source while granting protection", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-018", as: "host", under: ["EX8-002"] }],
          hand: [{ card: "P-162", as: "coelamon" }, "BT1-009"],
          deck: DECK,
          security: SECURITY,
        },
        1: { hand: ["BT1-009"], deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("host").permanentId);
    const baseId = s.perm("host").stack[0]!.instanceId;
    const sourceId = s.perm("host").topCard!.instanceId;
    const permanentId = s.perm("host").permanentId;
    s.state.memory = 5;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: s.inst("coelamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "P-162" && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(3);
    expect(s.perm("host").permanentId).toBe(permanentId);
    expect(s.perm("host").topCard?.instanceId).toBe(s.inst("coelamon").instanceId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([baseId, sourceId]);
    expect(observe(s.engine).isRestricted(s.perm("host"), "dpImmune")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("host"), "cantBeDeDigivolved")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("blocks a public De-Digivolve on the protected DS Digimon while the other stack changes", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-162", as: "selected", under: ["EX8-002", "BT26-018"] },
            { card: "EX8-026", as: "other", under: ["EX8-002", "BT26-018", "P-162", "EX8-024"] },
          ],
          hand: [{ card: "P-162", as: "coelamon" }, "BT1-009"],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [
            { card: "BT26-008", as: "tsSource" },
            { card: "BT22-087", as: "memoryTamer1" },
            { card: "BT22-087", as: "memoryTamer2" },
            { card: "BT22-087", as: "memoryTamer3" },
          ],
          hand: [
            { card: "BT25-100", as: "firstHammer" },
            { card: "BT25-100", as: "secondHammer" },
          ],
          deck: DECK,
          security: SECURITY,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("selected").topCard!.instanceId);
    const selectedStack = s.perm("selected").stack.map((card) => card.instanceId);
    const otherRemoved = s.perm("other").stack[3]!.instanceId;
    const firstHammerId = s.inst("firstHammer").instanceId;
    const secondHammerId = s.inst("secondHammer").instanceId;
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("coelamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("coelamon").topCard?.cardId === "P-162" && s.state.pendingDecision === undefined);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    preferred.splice(0, preferred.length, s.perm("selected").topCard!.instanceId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: firstHammerId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === firstHammerId));
    expect(s.perm("selected").stack.map((card) => card.instanceId)).toEqual(selectedStack);
    expect(s.perm("selected").topCard?.cardId).toBe("P-162");
    expect(s.state.memory).toBe(3);

    preferred.splice(0, preferred.length, s.perm("other").topCard!.instanceId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: secondHammerId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === secondHammerId));
    expect(s.perm("other").stack.map((card) => card.instanceId)).not.toContain(otherRemoved);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(otherRemoved);
    expect(s.perm("other").topCard?.cardId).toBe("P-162");
    expect(s.state.memory).toBe(4);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("passes inherited Blocker through a legal DS evolution stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "EX8-026",
            as: "host",
            under: ["EX8-002", "BT26-018", "P-162", "EX8-024"],
          },
        ],
        deck: DECK,
        security: SECURITY,
      },
      1: { hand: ["BT1-009"], deck: DECK, security: SECURITY },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("P-162");
  });
});
