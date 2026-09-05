import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-055.js";
import "../index.js";

const CARD_ID = "EX10-055";

it("rejects a third DigiXros material without spending memory or moving cards", async () => {
  const s = setupEngine({
    0: {
      hand: [
        { card: CARD_ID, as: "played" },
        { card: "EX10-026", as: "firstMaterial" },
        { card: "EX10-027", as: "secondMaterial" },
        { card: "EX10-045", as: "thirdMaterial" },
      ],
    },
  });
  s.state.memory = 9;
  await s.ready();
  const originalHand = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("played").instanceId,
      digiXros: {
        materialInstanceIds: ["firstMaterial", "secondMaterial", "thirdMaterial"].map(
          (alias) => s.inst(alias).instanceId,
        ),
      },
    }).ok,
  ).toBe(false);
  expect(s.state.memory).toBe(9);
  expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(originalHand);
  expect(s.state.players[0]!.battleArea).toHaveLength(0);
});

describe("EX10-055 Tactimon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple", "Black"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Purple", level: 5, memoryCost: 4 },
        { color: "Black", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Wizard", "Bagra Army"],
    });
  });

  it("proves level-relative sacrifice/delete, all-target Bagra Army replacement, and DigiXros", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ traits: ["Bagra Army"] }], count: 2, costReduction: 2, maxMaterials: 2 },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        optional: true,
        actions: [
          { kind: "SelectBind", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, bindAs: "A" } },
          { kind: "Delete", target: { fromSelectionRef: "A" } },
          {
            kind: "Delete",
            target: {
              filter: {
                controller: "opponent",
                kind: ["Digimon"],
                relativeTo: { attr: "level", op: "lte", selectionRef: "A" },
              },
              count: 1,
            },
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          affectsAll: true,
          leaveCause: "byEffect",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" },
          cost: { kind: "trash", target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 } },
        },
      ],
    });
  });

  it("deletes the chosen own Digimon and only an opposing Digimon at or below its level", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "tactimon" },
            { card: "EX10-026", as: "cost" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "EX10-026", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("cost").permanentId, s.perm("low").permanentId);
    const costId = s.perm("cost").permanentId;
    const highId = s.perm("high").permanentId;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("tactimon"));
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(costId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([highId]);
  });

  it("Q5139/Q5140/Q5141 trashes exactly 2 own sources to prevent every simultaneous Bagra Army departure", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "tactimon",
              under: [
                { card: "BT1-009", as: "first" },
                { card: "BT1-010", as: "second" },
              ],
            },
            { card: "EX10-026", as: "ally" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const ids = [s.perm("tactimon").permanentId, s.perm("ally").permanentId];
    await advance(s.engine).verb.deletePermanent(ids, "byEffect");
    await settle(() => s.state.pendingDecision === null);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual(expect.arrayContaining(ids));
    expect(s.perm("tactimon").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
    );
  });

  it("Q5140 cannot pay the replacement with only 1 digivolution card", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: CARD_ID, as: "tactimon", under: [{ card: "BT1-009", as: "only" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const id = s.perm("tactimon").permanentId;
    await advance(s.engine).verb.deletePermanent([id], "byEffect");
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === id));
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("only").instanceId);
  });

  it("does not protect an own Digimon without the [Bagra Army] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "tactimon", under: ["BT1-009", "BT1-010"] },
            { card: "EX10-040", as: "outsider" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const outsiderId = s.perm("outsider").permanentId;
    await advance(s.engine).verb.deletePermanent([outsiderId], "byEffect");
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === outsiderId));
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(outsiderId);
    // No trait matched, so the prevention cost was never paid.
    expect(s.perm("tactimon").stack).toHaveLength(2);
  });

  it("DigiXroses with 2 Bagra Army Digimon for 4 less", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "tactimon" },
            { card: "EX10-026", as: "first" },
            { card: "EX10-027", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("tactimon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));
    expect(s.state.memory).toBe(4);
  });
});
