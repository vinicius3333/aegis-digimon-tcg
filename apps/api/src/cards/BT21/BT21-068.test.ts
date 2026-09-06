import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-068.js";
import "../index.js";

describe("BT21-068 Growlmon", () => {
  it("preserves the Guilmon alternate Digivolution requirement and inherited deletion memory", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, names: ["Guilmon"], cost: 2, isAlternate: true }]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDeletion",
        isInherited: true,
        actions: [{ kind: "GainMemory", amount: 1 }],
      }),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("deletes an opposing Digimon and conditionally mills two", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "Delete",
            target: expect.objectContaining({
              filter: expect.objectContaining({
                controller: "opponent",
                kind: ["Digimon"],
                dp: { op: "lte", value: 4000 },
              }),
            }),
          }),
          expect.objectContaining({
            kind: "TrashTopDeck",
            amount: 2,
            condition: expect.objectContaining({ kind: "ifThisEffectDidNotDelete" }),
          }),
        ]),
      );
    }
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "OnDeletion", isInherited: true }));
  });

  it("must delete an eligible 4000 DP Digimon and does not mill", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-068", as: "growlmon" }], deck: ["BT1-009", "BT1-010"] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 4000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("growlmon"));
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("target").instanceId));

    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("deletes an eligible printed opponent through the public play intent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT21-068", as: "growlmon" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("growlmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("mills two after the public When Digivolving trigger has no eligible target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-064", as: "guilmon" }],
          hand: [{ card: "BT21-068", as: "growlmon" }],
          deck: [
            { card: "BT1-011", as: "bonusDraw" },
            { card: "BT1-009", as: "millA" },
            { card: "BT1-010", as: "millB" },
            { card: "BT1-012", as: "sentinel" },
          ],
        },
        1: { battleArea: [{ card: "BT21-045", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("guilmon").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("sentinel").instanceId));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("bonusDraw").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("millA").instanceId, s.inst("millB").instanceId]),
    );
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it.each([4001, 9000])("mills two when the opponent has only a %i DP Digimon", async (dp) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-068", as: "growlmon" }],
          deck: [
            { card: "BT1-009", as: "millA" },
            { card: "BT1-010", as: "millB" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("growlmon"));
    await settle(() => s.state.players[0]!.deck.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("gains 1 memory when a realistic host carrying Growlmon is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-076", as: "host", under: [{ card: "BT21-068", as: "source" }] }] },
    });
    await s.ready();
    s.state.memory = 0;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("uses the Guilmon alternate evolution route for exactly 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-064", as: "guilmon" }],
        hand: [{ card: "BT21-068", as: "growlmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("guilmon").permanentId,
        instanceId: s.inst("growlmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("guilmon").topCard.instanceId === s.inst("growlmon").instanceId);
    expect(s.state.memory).toBe(1);
  });
});
