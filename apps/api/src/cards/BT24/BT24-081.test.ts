import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { printedKeywordsOf } from "../../engine/combat/keywords.js";
import { getCardDefinition } from "@aegis/shared";
import { compiled as BT24_081 } from "./BT24-081.js";
import "../index.js";

describe("BT24-081 Titamon + SkullBaluchimon", () => {
  it("requires the printed hand-trash cost and separates Titamon from the level-limited Titan branch", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const action = BT24_081.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0];
      expect(action).toMatchObject({
        kind: "Delete",
        target: { filter: { superlative: "lowestLevel" }, count: "all" },
        cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" } } },
        optional: true,
        abortOnDecline: true,
      });
    }
    const deletion = BT24_081.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0];
    expect(deletion).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: { nameOrTrait: [{ tokens: ["Titamon"], match: "nameExact" }] },
        orFilters: [{ levelComparison: { op: "lte", value: 5 }, nameOrTrait: [{ tokens: ["Titan"], match: "trait" }] }],
      },
      from: ["trash"],
    });
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving, EffectTiming.OnUseAttack])(
    "pays one hand card to delete every lowest-level Digimon on %s",
    async (timing) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT24-081", as: "titamon" }],
            hand: [{ card: "BT1-001", as: "cost" }],
          },
          1: {
            battleArea: [
              { card: "BT1-009", as: "lowA" },
              { card: "BT1-010", as: "lowB" },
              { card: "BT1-014", as: "high" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const lowAId = s.perm("lowA").permanentId;
      const lowBId = s.perm("lowB").permanentId;
      await s.ready();

      await advance(s.engine).fire(timing, s.perm("titamon"));

      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lowAId);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lowBId);
      expect(s.state.players[1]!.battleArea).toHaveLength(1);
    },
  );

  it("deletes nothing when the hand-trash cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-081", as: "titamon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("titamon"));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("revives exact Titamon without admitting the composite name", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-081", as: "source" }],
          trash: [
            { card: "BT24-081", as: "composite" },
            { card: "BT1-080", as: "exactTitamon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("composite").instanceId, s.inst("exactTitamon").instanceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDeletion, s.perm("source"));
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("exactTitamon").instanceId,
      ),
    );

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("composite").instanceId);
  });

  it("revives a level 5 Titan through the alternate branch", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-081", as: "source" }],
          trash: [{ card: "BT24-072", as: "titan" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDeletion, s.perm("source"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("titan").instanceId),
    );
  });

  it("has Rush, Piercing, and Execute", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT24-081", as: "titamon" }] } });
    await s.ready();

    const printed = printedKeywordsOf(getCardDefinition("BT24-081")?.effectText);
    expect(printed).toEqual(expect.arrayContaining(["Rush", "Piercing", "Execute"]));
    expect(observe(s.engine).hasKeyword(s.perm("titamon"), "Rush")).toBe(true);
  });
});
