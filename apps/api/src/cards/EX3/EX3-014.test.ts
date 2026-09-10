import { digiXrosRequirementFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX3-014.js";

describe("EX3-014 Dorbickmon dragon deck", () => {
  it("matches the errata identity and publishes full typed metadata", () => {
    expect(getCardDefinition("EX3-014")).toMatchObject({
      cardId: "EX3-014",
      nameEn: "Dorbickmon",
      colors: ["Red"],
      level: 6,
      playCost: 13,
      dp: 12000,
      evoCosts: [{ color: "Red", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Dragonkin", "Big Death-Stars"],
      imageId: "EX3-014-Errata",
    });
    expect(getCardDefinition("EX3-014")!.effectText).toContain(
      "[DigiXros -2] 5 Digimon cards w/different names + [Dragon], [saur], or [Ceratopsian] in one of its traits",
    );
    expect(getCardDefinition("EX3-014")!.effectText).toContain("Delete 1 of your opponent's Digimon with 3000 or less");
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Static",
          actions: [],
          keywords: [{ keyword: "Rush", raw: "＜Rush＞" }],
        },
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "Delete",
              dpCeilingScaling: {
                per: 1,
                amount: 2000,
                unit: "digivolutionCards",
                filter: {
                  kind: ["Digimon"],
                  traitContains: ["Dragon", "saur", "Ceratopsian"],
                },
              },
            },
          ],
        },
      ],
      digiXrosRequirement: [
        {
          count: 2,
          maxMaterials: 5,
          materials: [{ traitContains: ["Dragon", "saur", "Ceratopsian"], differentNames: true }],
        },
      ],
    });
    expect(digiXrosRequirementFor("EX3-014")).toEqual(compiled.digiXrosRequirement);
  });

  it("DigiXroses five differently named Dragon-family cards, scales deletion, and attacks with Rush", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-011", as: "dinosaur", under: ["BT1-009"] }],
        hand: [
          { card: "EX3-014", as: "dorbickmon" },
          { card: "EX3-006", as: "fireDragon" },
          { card: "BT10-050", as: "ceratopsian" },
          { card: "EX3-008", as: "dragonkin" },
          { card: "EX3-007", as: "rockDragon" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "atBoundary", dp: 13_000 },
          { card: "BT1-010", as: "aboveBoundary", dp: 14_000 },
        ],
        security: ["BT1-009"],
      },
    });
    s.state.memory = 13;
    await s.ready();

    const materials = [
      s.perm("dinosaur").topCard.instanceId,
      s.inst("fireDragon").instanceId,
      s.inst("ceratopsian").instanceId,
      s.inst("dragonkin").instanceId,
      s.inst("rockDragon").instanceId,
    ];
    const deletedInstanceId = s.perm("atBoundary").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dorbickmon").instanceId,
        digiXros: { materialInstanceIds: materials },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === deletedInstanceId));
    const dorbickmon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX3-014")!;
    expect(dorbickmon.stack.map(({ instanceId }) => instanceId)).toEqual(expect.arrayContaining(materials));
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toEqual(
      expect.arrayContaining(["EX3-006", "BT10-050", "EX3-008", "EX3-007"]),
    );
    expect(s.state.memory).toBe(10);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("aboveBoundary").permanentId,
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: dorbickmon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === dorbickmon.permanentId)).toBe(true);
  });

  it("rejects two DigiXros materials with the same printed name", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "EX3-014", as: "dorbickmon" },
          { card: "EX3-005", as: "firstVorvomon" },
          { card: "EX3-005", as: "secondVorvomon" },
        ],
      },
    });
    s.state.memory = 13;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dorbickmon").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("firstVorvomon").instanceId, s.inst("secondVorvomon").instanceId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
  });

  it("rejects a sixth otherwise eligible DigiXros material", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "EX3-014", as: "dorbickmon" },
          { card: "EX3-005", as: "vorvomon" },
          { card: "EX3-006", as: "flarerizamon" },
          { card: "EX3-008", as: "flamedramon" },
          { card: "EX3-009", as: "volcdramon" },
          { card: "EX3-011", as: "lavogaritamon" },
          { card: "EX3-012", as: "volcanicdramon" },
        ],
      },
    });
    s.state.memory = 13;
    const materials = ["vorvomon", "flarerizamon", "flamedramon", "volcdramon", "lavogaritamon", "volcanicdramon"].map(
      (alias) => s.inst(alias).instanceId,
    );

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dorbickmon").instanceId,
        digiXros: { materialInstanceIds: materials },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
  });

  it("rejects a non-Dragon-family Digimon among otherwise eligible materials", () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "EX3-014", as: "dorbickmon" },
          { card: "EX3-006", as: "eligible" },
          { card: "BT1-038", as: "puppet" },
        ],
      },
    });
    s.state.memory = 13;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dorbickmon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("eligible").instanceId, s.inst("puppet").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX3-014", "EX3-006", "BT1-038"]),
    );
  });

  it("Q3377 accepts one Dragonkin material, raises the ceiling to 5000, and charges 11 memory", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "EX3-014", as: "dorbickmon" },
          { card: "EX3-008", as: "dragonkin" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "atBoundary", dp: 5000 },
          { card: "BT1-010", as: "aboveBoundary", dp: 6000 },
        ],
      },
    });
    s.state.memory = 13;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dorbickmon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("dragonkin").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT1-010"));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("aboveBoundary").permanentId,
    );
    expect(s.state.memory).toBe(2);
  });

  it("without DigiXros keeps the printed 3000 DP deletion ceiling", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX3-014", as: "dorbickmon" }] },
      1: {
        battleArea: [
          { card: "BT1-010", as: "atBoundary", dp: 3000 },
          { card: "BT1-010", as: "aboveBoundary", dp: 4000 },
        ],
      },
    });
    s.state.memory = 13;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dorbickmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT1-010"));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("aboveBoundary").permanentId,
    );
    expect(s.state.memory).toBe(0);
  });

  it("does not accept a Dragon-trait Option as a DigiXros material", () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "EX3-014", as: "dorbickmon" },
          { card: "EX3-069", as: "fourGreatDragonsOption" },
        ],
      },
    });
    s.state.memory = 13;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dorbickmon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("fourGreatDragonsOption").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX3-014", "EX3-069"]),
    );
  });
});
