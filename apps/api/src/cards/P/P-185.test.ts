import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-185.js";

describe("P-185 EmperorGreymon", () => {
  it("requires a Takuya Kanbara Tamer with five Hybrid cards under it", () => {
    expect(runtimeCompiledCard("P-185")!.digivolutionRequirement).toEqual([
      {
        namesExact: ["Takuya Kanbara"],
        cost: 4,
        isAlternate: true,
        baseIsTamer: true,
        minTraitStackCount: 5,
        minTraitStackTraits: ["Hybrid"],
      },
    ]);
  });

  it("encodes Blocker, DP-relative deletion, color scaling, and end-of-turn unsuspend", () => {
    const card = runtimeCompiledCard("P-185")!;
    expect(card.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Blocker" }],
    });
    expect(card.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "Delete",
          target: {
            count: 1,
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
          },
        },
      ],
    });
    expect(card.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "permanent",
          scaling: { per: 1, unit: "colors", filter: { controllerDefault: "mine", zone: "digivolutionCards" } },
        },
      ],
    });
    expect(card.effects.find((effect) => effect.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Unsuspend", target: { isSelf: true } }],
    });
  });

  it("exposes Blocker on the live EmperorGreymon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-185", as: "emperor" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("emperor"), "Blocker")).toBe(true);
  });

  it("legally digivolves from Takuya with five Hybrid cards under the Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT7-085",
              as: "takuya",
              under: ["BT7-008", "BT7-011", "BT7-019", "BT7-021", "BT7-035"],
            },
          ],
          hand: [{ card: "P-185", as: "emperor" }],
          deck: [{ card: "BT1-009", as: "drawn" }, ...Array(19).fill("BT1-013")],
          security: Array(3).fill("BT1-009"),
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentHand" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const originalSourceIds = [
      s.perm("takuya").topCard.instanceId,
      ...s.perm("takuya").stack.map((card) => card.instanceId),
    ];
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("emperor").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.instanceId === s.inst("emperor").instanceId);
    expect(s.perm("takuya").topCard.instanceId).toBe(s.inst("emperor").instanceId);
    expect(s.perm("takuya").stack).toHaveLength(6);
    expect(s.perm("takuya").stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining(originalSourceIds));
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("scales from its own digivolution cards, deletes at the DP boundary, and unsuspends on each own turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-063", as: "unrelatedYellow" },
            { card: "BT2-076", as: "unrelatedPurple" },
            {
              card: "BT7-085",
              as: "takuya",
              under: ["BT7-008", "BT7-011", "BT7-019", "BT7-021", "BT7-035"],
            },
          ],
          hand: [{ card: "P-185", as: "emperor" }],
          deck: [{ card: "BT1-009", as: "drawn" }, ...Array(19).fill("BT1-013")],
          security: Array(3).fill("BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 15000, as: "equal" },
            { card: "BT1-009", dp: 16000, as: "over" },
          ],
          hand: [{ card: "BT1-009", as: "opponentHand" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("takuya").permanentId;
    const sourceIds = [s.perm("takuya").topCard.instanceId, ...s.perm("takuya").stack.map((card) => card.instanceId)];
    const equalId = s.perm("equal").permanentId;
    const overId = s.perm("over").permanentId;
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostId,
        instanceId: s.inst("emperor").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("takuya").topCard.instanceId === s.inst("emperor").instanceId &&
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.battleArea.length === 1,
    );
    expect(s.perm("takuya").permanentId).toBe(hostId);
    expect(s.perm("takuya").stack).toHaveLength(6);
    expect(s.perm("takuya").stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining(sourceIds));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 10, to: 6, reason: "digivolve" });
    expect(s.perm("emperor").currentDP).toBe(15000);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === equalId)).toBe(false);
    expect(s.perm("over").currentDP).toBe(16000);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === overId)).toBe(true);

    await advance(s.engine).verb.suspend([hostId]);
    expect(s.perm("takuya").isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("takuya").isSuspended).toBe(false);
    expect(s.perm("takuya").permanentId).toBe(hostId);
    expect(s.perm("takuya").stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining(sourceIds));

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([hostId]);
    expect(s.perm("takuya").isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("emperor").isSuspended).toBe(false);
    expect(s.perm("takuya").permanentId).toBe(hostId);
    expect(s.perm("takuya").stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining(sourceIds));
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
