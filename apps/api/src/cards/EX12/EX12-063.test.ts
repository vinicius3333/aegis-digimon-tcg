import {
  assemblyRequirementFor,
  compiledEffects,
  digivolutionRequirementsFor,
  EffectTiming,
  getCardDefinition,
} from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { compiled } from "./EX12-063.js";

const CARD_ID = "EX12-063";

async function chooseTarget(s: ReturnType<typeof setupEngine>, permanentId: string): Promise<void> {
  await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
  const decision = s.state.pendingDecision!;
  const seat = s.decisions.at(-1)!.seat;
  expect(
    s.engine.applyIntent(seat, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "chooseTargets", instanceIds: [permanentId] },
    }),
  ).toEqual({ ok: true });
}

describe("EX12-063 Karakurumon", () => {
  it("maps non-white evolution, Assembly, suspend/restrict windows, and both deletion effects", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      {
        level: 4,
        traits: ["Puppet", "Shambala"],
        cost: 3,
        isAlternate: true,
        baseColors: ["Red", "Blue", "Yellow", "Green", "Black", "Purple"],
      },
    ]);
    expect(digivolutionRequirementsFor(CARD_ID)).toEqual([
      {
        level: 4,
        traits: ["Puppet", "Shambala"],
        cost: 3,
        isAlternate: true,
        baseColors: ["Red", "Blue", "Yellow", "Green", "Black", "Purple"],
      },
    ]);
    expect(compiled.assemblyRequirement).toEqual([
      { reduceCost: 2, materials: [{ traits: ["Puppet", "TB"], levelMax: 4, count: 1 }] },
    ]);
    expect(assemblyRequirementFor(CARD_ID)).toEqual(compiled.assemblyRequirement);

    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend", target: { count: 1, filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } } },
          {
            kind: "Restrict",
            target: { count: 1, filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
            restriction: "unsuspend",
            duration: "untilOpponentTurnEnd",
          },
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "OnDeletion" && !effect.isInherited)).toMatchObject({
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }],
    });
    expect(registeredCompiledCards.get(CARD_ID)).toEqual(compiled);
    expect(compiledEffects[CARD_ID]).toEqual(compiled);
  });

  it("suspends one opponent and restricts a different Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "suspendedTarget" },
            { card: "BT1-087", as: "restrictedTarget" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await chooseTarget(s, s.perm("suspendedTarget").permanentId);
    await chooseTarget(s, s.perm("restrictedTarget").permanentId);
    await settle(() => observe(s.engine).isRestricted(s.perm("restrictedTarget"), "unsuspend"));

    expect(s.perm("suspendedTarget").isSuspended).toBe(true);
    expect(s.perm("restrictedTarget").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("suspendedTarget"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("restrictedTarget"), "unsuspend")).toBe(true);
    await advance(s.engine).verb.suspend([s.perm("restrictedTarget").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("restrictedTarget").permanentId]);
    expect(s.perm("restrictedTarget").isSuspended).toBe(true);
  });

  it("applies the same independent choices on digivolution", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "suspendedTarget" },
            { card: "BT1-087", as: "restrictedTarget" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );

    const resolution = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await chooseTarget(s, s.perm("suspendedTarget").permanentId);
    await chooseTarget(s, s.perm("restrictedTarget").permanentId);
    await resolution;
    await settle(() => observe(s.engine).isRestricted(s.perm("restrictedTarget"), "unsuspend"));

    expect(s.perm("suspendedTarget").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("suspendedTarget"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("restrictedTarget"), "unsuspend")).toBe(true);
  });

  it("plays a level 4 Puppet/TB Digimon from trash without cost on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          trash: [
            { card: "BT26-012", as: "valid" },
            { card: "BT1-010", as: "invalid" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    const sourceId = s.perm("source").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([sourceId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT26-012"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT26-012")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX12-062")).toBe(false);
  });

  it("plays the inherited deletion target when the host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-064", as: "host", under: [CARD_ID] }],
          trash: [{ card: "BT26-012", as: "valid" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    const hostId = s.perm("host").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    await settle(
      () => s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT26-012").length === 1,
    );

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT26-012")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT26-012")).toBe(true);
  });

  it("assembles for 5 memory with a legal level 4 Puppet/TB material", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "source" }],
        trash: [{ card: "EX12-062", as: "material" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        assembly: { materialInstanceIds: [s.inst("material").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === CARD_ID));

    const result = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === CARD_ID)!;
    expect(s.state.memory).toBe(0);
    expect(result.stack.map((card) => card.cardId)).toEqual(["EX12-062"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("rejects Assembly with an over-level Puppet material", () => {
    const s = setupEngine({
      0: { hand: [{ card: CARD_ID, as: "source" }], trash: [{ card: "BT1-038", as: "material" }] },
    });
    s.state.memory = 7;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        assembly: { materialInstanceIds: [s.inst("material").instanceId] },
      } as never),
    ).toEqual({ ok: false, reason: "invalid-material" });
  });

  it("uses both normal colors and both alternate traits, rejects white, and matches the catalog", async () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Karakurumon",
      colors: ["Purple", "Green"],
      kinds: ["Digimon"],
      playCost: 7,
      dp: 7000,
      level: 5,
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Puppet", "Shambala", "TB"],
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 3 },
        { color: "Green", level: 4, memoryCost: 3 },
      ],
    });
    for (const [baseCardId, useAlternateCost] of [
      ["EX12-062", false],
      ["BT1-069", false],
      ["BT13-039", true],
      ["EX12-026", true],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: CARD_ID, as: "target" }] },
      });
      s.state.memory = 3;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("target").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === CARD_ID);
      expect(s.state.memory).toBe(0);
    }
    const white = setupEngine({
      0: { battleArea: [{ card: "BT10-085", as: "base" }], hand: [{ card: CARD_ID, as: "target" }] },
    });
    expect(
      white.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: white.perm("base").permanentId,
        instanceId: white.inst("target").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
