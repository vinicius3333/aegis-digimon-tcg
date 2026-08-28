import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-053.js";
import "../index.js";

const CARD_ID = "EX10-053";

describe("EX10-053 Regulusmon", () => {
  it("records the exact catalog and live keywords", async () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple", "Red"],
      level: 5,
      playCost: 10,
      dp: 10000,
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 5 },
        { color: "Red", level: 4, memoryCost: 5 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Evil Dragon"],
    });
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "regulus" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("regulus"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("regulus"), "Blocker")).toBe(true);
  });

  it("proves distinct-name Gammamon stacking, DP-bounded deletion, end-turn attack, and deletion memory", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, names: ["Gammamon"], cost: 5, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects?.find((candidate) => candidate.trigger === trigger);
      expect(effect).toMatchObject({
        actions: [
          {
            kind: "PlaceUnder",
            target: { count: 5, upTo: true, distinctNames: true, from: ["trash"] },
            position: "bottom",
          },
          {
            kind: "Delete",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
              count: 1,
            },
          },
        ],
      });
      expect(effect?.actions?.[1]?.optional).toBeUndefined();
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Attack",
          withoutSuspending: true,
          optional: true,
          condition: { kind: "selfDigivolutionCountAtLeast", value: 5 },
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });

  it("places differently named Gammamon cards at the true bottom, then deletes within its DP", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "regulus", under: [{ card: "BT1-009", as: "existing" }] }],
          trash: [
            { card: "LM-016", as: "first" },
            { card: "BT21-010", as: "second" },
            { card: "LM-016", as: "duplicate" },
          ],
        },
        1: {
          battleArea: [
            { card: "EX10-053", as: "target", dp: 10000 },
            { card: "EX10-052", as: "large", dp: 13000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.inst("first").instanceId,
      s.inst("duplicate").instanceId,
      s.inst("second").instanceId,
      s.perm("large").permanentId,
      s.perm("target").permanentId,
    );
    await s.ready();
    const targetId = s.perm("target").permanentId;
    const largeId = s.perm("large").permanentId;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("regulus"));
    expect(s.perm("regulus").stack.at(-1)?.instanceId).toBe(s.inst("existing").instanceId);
    expect(
      new Set(
        s
          .perm("regulus")
          .stack.slice(0, 2)
          .map(({ cardId }) => getCardDefinition(cardId)!.nameEn),
      ).size,
    ).toBe(2);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(targetId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(largeId);
  });

  it("Q5136 deletes even when no Gammamon card can be placed", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "regulus" }], trash: ["BT1-009"] },
        1: { battleArea: [{ card: "EX10-053", as: "target", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.perm("target").permanentId;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("regulus"));
    expect(s.perm("regulus").stack).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(targetId);
  });

  it("attacks at end of turn without suspending when it has 5 sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "regulus", under: ["BT1-009", "BT1-010", "BT1-009", "BT1-010", "BT1-009"] },
          ],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("regulus"));
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.perm("regulus").isSuspended).toBe(false);
  });

  it("the inherited watcher gains 1 memory only once for opposing deletions on the owner's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX10-074", as: "host", under: [{ card: CARD_ID }] }] },
      1: {
        battleArea: [
          { card: "EX10-040", as: "first" },
          { card: "EX10-040", as: "second" },
        ],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId], "byEffect");
    await settle(() => s.state.memory === 1);
    await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId], "byEffect");
    expect(s.state.memory).toBe(1);
  });
});
