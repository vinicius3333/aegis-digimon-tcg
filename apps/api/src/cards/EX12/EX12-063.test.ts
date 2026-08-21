import { assemblyRequirementFor, digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

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
    const compiled = registeredCompiledCards.get(CARD_ID)!;

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
      { level: 4, traits: ["Puppet", "Shambala"], cost: 3, isAlternate: true },
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
            target: { count: 1, filter: { controllerDefault: "opponent", kind: ["Digimon", "Tamer"] } },
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
            { card: "EX12-062", as: "valid" },
            { card: "BT1-010", as: "invalid" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnDestroyedAnyone, s.perm("source"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-062"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-062")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX12-062")).toBe(false);
  });

  it("plays the inherited deletion target when the host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-064", as: "host", under: [CARD_ID] }],
          trash: [{ card: "EX12-062", as: "valid" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnDestroyedAnyone, s.perm("host"));
    await settle(
      () => s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "EX12-062").length === 1,
    );

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX12-062")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-062")).toBe(true);
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
});
