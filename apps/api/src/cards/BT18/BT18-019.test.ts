import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-019.js";

describe("BT18-019 Millenniummon", () => {
  it("deletes one opposing Digimon on play and retains the DNA-only return clause", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
        {
          kind: "GainMemory",
          condition: { kind: "isDnaDigivolving" },
          scaling: { unit: "namedCount", countSource: "returnedDistinctLevels" },
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          cost: {
            kind: "return",
            target: {
              filter: {
                nameOrTrait: [
                  { tokens: ["Kimeramon"], match: "name" },
                  { tokens: ["Machinedramon"], match: "name" },
                ],
              },
              count: 2,
              distinctNames: true,
            },
          },
        },
      ],
    });
    const s = setupEngine(
      { 0: { hand: [{ card: "BT18-019", as: "millennium" }] }, 1: { battleArea: [{ card: "BT1-030", as: "target" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 20;
    const targetId = s.perm("target").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("millennium").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
  });

  it("DNA digivolves, returns every available distinct opposing level, and gains 1 memory each", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-015", as: "kimeramon" },
            { card: "BT11-072", as: "machinedramon" },
          ],
          hand: [{ card: "BT18-019", as: "millennium" }],
        },
        1: {
          battleArea: [{ card: "BT1-030", as: "level3" }],
          trash: [
            { card: "BT1-032", as: "level4" },
            { card: "BT1-021", as: "level5" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("kimeramon").permanentId, s.perm("machinedramon").permanentId],
        instanceId: s.inst("millennium").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);

    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(
      s.state.players[1]!.deck.slice(-3)
        .map((card) => card.cardId)
        .sort(),
    ).toEqual(["BT1-021", "BT1-030", "BT1-032"]);
    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT18-015", "BT11-072"]),
    );
  });

  it("may decline the DNA-only distinct-level return and gain no memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-015", as: "kimeramon" },
            { card: "BT11-072", as: "machinedramon" },
          ],
          hand: [{ card: "BT18-019", as: "millennium" }],
        },
        1: { trash: [{ card: "BT1-032", as: "level4" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("kimeramon").permanentId, s.perm("machinedramon").permanentId],
        instanceId: s.inst("millennium").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-032"]);
  });

  it("uses its just-trashed Kimeramon and Machinedramon sources to replay Millenniummon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-019", as: "millennium", under: ["BT18-015", "BT11-072"] }],
          trash: [{ card: "BT18-019", as: "replacement" }],
        },
        1: { battleArea: [{ card: "BT1-030", dp: 15000, as: "defender" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("millennium").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT18-019"));

    expect(
      s.state.players[0]!.deck.slice(0, 2)
        .map((card) => card.cardId)
        .sort(),
    ).toEqual(["BT11-072", "BT18-015"]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT18-019")).toBe(true);
  });

  it("cannot pay the On Deletion condition with only Kimeramon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-019", as: "millennium", under: ["BT18-015"] }],
          trash: [{ card: "BT18-019", as: "replacement" }],
        },
        1: { battleArea: [{ card: "BT1-030", dp: 15000, as: "defender" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("millennium").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("replacement").instanceId));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).not.toContain("BT18-015");
  });

  it("DigiXroses with distinct Kimeramon and Machinedramon slots for 2 less each", async () => {
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ names: ["Kimeramon"] }, { names: ["Machinedramon"] }], count: 2 },
    ]);
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT18-019", as: "millennium" },
          { card: "BT18-015", as: "kimeramon" },
          { card: "BT11-072", as: "machinedramon" },
        ],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("millennium").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("kimeramon").instanceId, s.inst("machinedramon").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]?.stack.length === 2);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.cardId).sort()).toEqual([
      "BT11-072",
      "BT18-015",
    ]);
  });

  it("rejects two Kimeramon as materials for the distinct DigiXros slots", () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT18-019", as: "millennium" },
          { card: "BT18-015", as: "kimeramonA" },
          { card: "BT18-015", as: "kimeramonB" },
        ],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("millennium").instanceId,
        digiXros: { materialInstanceIds: [s.inst("kimeramonA").instanceId, s.inst("kimeramonB").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
  });
});
