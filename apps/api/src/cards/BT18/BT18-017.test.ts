import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT18-017.js";

describe("BT18-017 AncientVolcanomon", () => {
  it("deletes every opposing Digimon tied for the lowest DP on play", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "Delete", target: { count: "all", filter: { controller: "opponent", superlative: "lowestDP" } } },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects[2]).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "Replacement" }] });
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-017", as: "ancient" }] },
        1: {
          battleArea: [
            { card: "BT1-030", dp: 2000, as: "lowA" },
            { card: "BT1-030", dp: 2000, as: "lowB" },
            { card: "BT1-030", dp: 3000, as: "high" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 20;
    const lowA = s.perm("lowA").permanentId;
    const lowB = s.perm("lowB").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ancient").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard?.cardId).toBe("BT1-030");
    expect([lowA, lowB]).not.toContain(s.state.players[1]!.battleArea[0]!.permanentId);
  });

  it("deletes every opposing Digimon tied for the lowest DP when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-021", as: "base" }],
          hand: [{ card: "BT18-017", as: "ancient" }],
        },
        1: {
          battleArea: [
            { card: "BT1-030", dp: 2000, as: "lowA" },
            { card: "BT1-030", dp: 2000, as: "lowB" },
            { card: "BT1-030", dp: 3000, as: "high" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ancient").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.perm("base").topCard.cardId).toBe("BT18-017");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("high").topCard.cardId).toBe("BT1-030");
  });

  it("may return a level 4 or lower red Digimon from its stack when it leaves", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-017", as: "ancient", under: ["BT18-011"], dp: 12000 }] },
        1: { battleArea: [{ card: "BT1-030", as: "defender", dp: 15000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const materialId = s.perm("ancient").stack[0]!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ancient").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === materialId));
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === materialId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("may play a level 4 or lower red Digimon from its stack without paying the cost when it leaves", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-017", as: "ancient", under: ["BT18-011"], dp: 12000 }] },
        1: { battleArea: [{ card: "BT1-030", as: "defender", dp: 15000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    await s.ready();
    const materialId = s.perm("ancient").stack[0]!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ancient").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === materialId),
    );
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === materialId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === materialId)).toBe(false);
  });

  it("DigiXroses with one Grumblemon and one Gigasmon for 2 less per material", async () => {
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ names: ["Grumblemon"] }, { names: ["Gigasmon"] }], count: 2 },
    ]);
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT18-017", as: "ancient" },
          { card: "BT18-012", as: "grumblemon" },
          { card: "BT18-014", as: "gigasmon" },
        ],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ancient").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("grumblemon").instanceId, s.inst("gigasmon").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.cardId).sort()).toEqual([
      "BT18-012",
      "BT18-014",
    ]);
  });

  it("rejects two Grumblemon as materials for the distinct Grumblemon and Gigasmon slots", () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT18-017", as: "ancient" },
          { card: "BT18-012", as: "grumbleA" },
          { card: "BT18-012", as: "grumbleB" },
        ],
      },
    });
    s.state.memory = 20;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ancient").instanceId,
        digiXros: { materialInstanceIds: [s.inst("grumbleA").instanceId, s.inst("grumbleB").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
  });
});
