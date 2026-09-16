import { describe, expect, it } from "vitest";
import { digiXrosRequirementFor, getCardDefinition } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-063.js";

const FILLER = ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-014"];

describe("BT19-063 DarkKnightmon", () => {
  it("matches the catalog print and compiles all five printed clauses onto their printed timings", () => {
    expect(getCardDefinition("BT19-063")).toMatchObject({
      cardId: "BT19-063",
      nameEn: "DarkKnightmon",
      colors: ["Black", "Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      attributes: ["Virus"],
      types: ["Dark Knight", "Twilight"],
      evoCosts: [
        { color: "Black", level: 4, memoryCost: 4 },
        { color: "Purple", level: 4, memoryCost: 4 },
      ],
    });
    const definition = getCardDefinition("BT19-063")!;
    const text = definition.effectText!.replaceAll(" ", " ");
    expect(text).toContain("＜Material Save 1＞");
    expect(text).toContain("＜De-Digivolve1＞ 1 of your opponent's Digimon.");
    expect(text).toContain(
      "Then, if DigiXrosing with 2 cards, you may delete 1 play cost 3 or lower Digimon or Tamer.",
    );
    expect(text).toContain(
      "[On Deletion] You may play 1 level 4 or lower Digimon card with [Knightmon] in its text from under your Tamers without paying the cost.",
    );
    expect(text).toContain("[DigiXros -2] [SkullKnightmon] x [DeadlyAxemon]");
    expect(definition.inheritedEffectText!.replaceAll(" ", " ")).toBe(
      "[On Deletion] You may play 1 level 4 or lower Digimon card with [Knightmon] in its text from your trash without paying the cost.",
    );

    expect(compiled.effects?.map((effect) => [effect.trigger, effect.isInherited === true])).toEqual([
      ["Static", false],
      ["OnPlay", false],
      ["WhenDigivolving", false],
      ["OnDeletion", false],
      ["OnDeletion", true],
    ]);
    for (const index of [3, 4]) {
      expect(compiled.effects?.[index]?.actions?.[0]).toMatchObject({
        kind: "PlayWithoutCost",
        payCost: false,
        optional: true,
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            levelComparison: { op: "lte", value: 4 },
            nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }],
          },
        },
      });
    }
    expect(compiled.effects?.[3]?.actions?.[0]).toMatchObject({ from: ["underMyTamers"] });
    expect(compiled.effects?.[4]?.actions?.[0]).toMatchObject({ from: ["trash"] });
    for (const index of [1, 2]) {
      expect(compiled.effects?.[index]?.actions).toMatchObject([
        { kind: "DeDigivolve", amount: 1, target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
        {
          kind: "Delete",
          optional: true,
          condition: { kind: "digiXrosCount", minimum: 2 },
          target: { filter: { controller: "any", kind: ["Digimon", "Tamer"], playCostLte: 3 }, count: 1 },
        },
      ]);
    }
    expect(digiXrosRequirementFor("BT19-063")).toEqual([
      { materials: [{ names: ["SkullKnightmon"] }, { names: ["DeadlyAxemon"] }], count: 2 },
    ]);
  });

  it("[When Digivolving] de-digivolves from a legal Black Lv.4 route for 4 memory, with no DigiXros deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-058", as: "base" }],
          hand: [{ card: "BT19-063", as: "dark" }, "BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [
            { card: "BT1-014", as: "victim", under: [{ card: "BT1-009", as: "beneath" }] },
            { card: "BT1-013", as: "cheapPeer" },
          ],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const baseInstanceId = s.perm("base").topCard!.instanceId;
    const victimTopId = s.perm("victim").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dark").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("victim").topCard?.cardId === "BT1-009");

    expect(s.state.memory).toBe(6);
    expect(s.perm("base").topCard?.cardId).toBe("BT19-063");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(FILLER.length - 1);
    expect(s.perm("victim").topCard?.instanceId).toBe(s.inst("beneath").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([victimTopId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual([
      "BT1-009",
      "BT1-013",
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("refuses an illegal digivolution source (a Red Lv.4 and a Red Lv.3 both fail Black/Purple Lv.4)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-014", as: "redLv4" },
          { card: "BT1-013", as: "redLv3" },
        ],
        hand: [{ card: "BT19-063", as: "dark" }, "BT1-013"],
        deck: [...FILLER],
      },
      1: { security: [...SECURITY], deck: [...FILLER] },
    });
    s.state.memory = 10;
    await s.ready();

    for (const alias of ["redLv4", "redLv3"]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(alias).permanentId,
          instanceId: s.inst("dark").instanceId,
        }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
    }
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT19-063")).toBe(true);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual([
      "BT1-013",
      "BT1-014",
    ]);
  });

  it("DigiXroses [SkullKnightmon] x [DeadlyAxemon] for -2 per material (8 - 4 = 4) and then deletes MY own cost-2 Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "mine" },
            { card: "BT19-020", as: "expensive" },
          ],
          hand: [
            { card: "BT19-063", as: "dark" },
            { card: "BT19-058", as: "skull" },
            { card: "BT19-059", as: "axe" },
            "BT1-013",
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "victim", under: [{ card: "BT1-009", as: "beneath" }] }],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 0;
    await s.ready();
    preferred.push(s.perm("mine").permanentId);
    const victimTopId = s.perm("victim").topCard!.instanceId;
    const mineTopId = s.perm("mine").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dark").instanceId,
        digiXros: { materialInstanceIds: [s.inst("skull").instanceId, s.inst("axe").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === mineTopId));

    expect(s.state.memory).toBe(-4);
    expect(
      s
        .perm("dark")
        .stack.map((card) => card.instanceId)
        .sort(),
    ).toEqual([s.inst("skull").instanceId, s.inst("axe").instanceId].sort());
    expect(s.perm("victim").topCard?.instanceId).toBe(s.inst("beneath").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([victimTopId]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual([
      "BT19-020",
      "BT19-063",
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([mineTopId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("a 1-material DigiXros costs 8 - 2 = 6 and skips the deletion half, which needs 2 placed cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "mine" }],
          hand: [{ card: "BT19-063", as: "dark" }, { card: "BT19-058", as: "skull" }, "BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "victim", under: [{ card: "BT1-009", as: "beneath" }] }],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dark").instanceId,
        digiXros: { materialInstanceIds: [s.inst("skull").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("victim").topCard?.instanceId === s.inst("beneath").instanceId);

    expect(s.state.memory).toBe(-6);
    expect(s.perm("dark").stack.map((card) => card.instanceId)).toEqual([s.inst("skull").instanceId]);
    expect(s.perm("mine").topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("rejects near-miss DigiXros materials: the recipe slots are exact printed names", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT19-063", as: "dark" },
          { card: "BT1-014", as: "kokatorimon" },
          { card: "BT19-059", as: "axe" },
          { card: "BT19-063", as: "darkPeer" },
        ],
        deck: [...FILLER],
      },
      1: { security: [...SECURITY], deck: [...FILLER] },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dark").instanceId,
        digiXros: { materialInstanceIds: [s.inst("kokatorimon").instanceId, s.inst("axe").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dark").instanceId,
        digiXros: { materialInstanceIds: [s.inst("darkPeer").instanceId, s.inst("axe").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("＜Material Save 1＞ rescues a specified material into a Tamer and [On Deletion] then plays that very card (Q3125)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT19-063",
              as: "dark",
              under: [
                { card: "BT19-058", as: "skull" },
                { card: "BT1-014", as: "notMaterial" },
              ],
            },
            {
              card: "BT19-086",
              as: "tamer",
              under: [
                { card: "BT19-059", as: "axeUnder" },
                { card: "BT18-069", as: "knightLv5" },
              ],
            },
          ],
          hand: ["BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "wall", dp: 20_000, suspended: true }],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("dark"), "MaterialSave")).toBe(1);
    const darkTopId = s.perm("dark").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dark").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("skull").instanceId),
    );

    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.instanceId).sort()).toEqual(
      [s.inst("skull").instanceId, s.perm("tamer").topCard!.instanceId].sort(),
    );
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([
      s.inst("axeUnder").instanceId,
      s.inst("knightLv5").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [darkTopId, s.inst("notMaterial").instanceId].sort(),
    );
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("declining the optional [On Deletion] leaves the Material-Saved card under the Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-063", as: "dark", under: [{ card: "BT19-058", as: "skull" }] },
            { card: "BT19-086", as: "tamer" },
          ],
          hand: ["BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "wall", dp: 20_000, suspended: true }],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const darkTopId = s.perm("dark").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("dark").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === darkTopId));

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("skull").instanceId]);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-086"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("as a digivolution card under a real host, the inherited clause plays a Lv.4 [Knightmon]-text card from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "host", dp: 4000, under: [{ card: "BT19-063", as: "darkUnder" }] }],
          trash: [
            { card: "BT19-059", as: "trashAxe" },
            { card: "BT19-058", as: "trashSkull" },
            { card: "BT18-069", as: "trashKnightLv5" },
          ],
          hand: ["BT1-013"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const hostTopId = s.perm("host").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("trashSkull").instanceId),
    );

    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.instanceId)).toEqual([s.inst("trashSkull").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [
        s.inst("trashAxe").instanceId,
        s.inst("trashKnightLv5").instanceId,
        hostTopId,
        s.inst("darkUnder").instanceId,
      ].sort(),
    );
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });
});
