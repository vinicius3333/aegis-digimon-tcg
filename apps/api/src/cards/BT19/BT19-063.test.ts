import { describe, expect, it } from "vitest";
import { digiXrosRequirementFor, getCardDefinition } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-063.js";

/**
 * BT19-063 DarkKnightmon (Black/Purple, Lv.5, Virus, Dark Knight/Twilight, 8000 DP, play cost 8).
 *
 * Main:      ＜Material Save 1＞
 *            [On Play] [When Digivolving] ＜De-Digivolve1＞ 1 of your opponent's Digimon. Then, if
 *            DigiXrosing with 2 cards, you may delete 1 play cost 3 or lower Digimon or Tamer.
 *            [On Deletion] You may play 1 level 4 or lower Digimon card with [Knightmon] in its
 *            text from under your Tamers without paying the cost.
 *            [DigiXros -2] [SkullKnightmon] x [DeadlyAxemon]
 * Inherited: [On Deletion] ... from your trash without paying the cost.
 *
 * Every clause below is driven through a public intent — playCard (with and without a DigiXros
 * declaration), digivolve, attack — and asserted on exact instance ids after the flow settles.
 * No injected timing and no injected turn seat.
 */

/** Inert main-deck filler: BT1-009/013/014 print no effect text and no Digi-Egg is ever seeded. */
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
    // "[Knightmon] in its text" is the full card-information union, not a name or a trait.
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
    // The "you may delete" half is gated on the DigiXros material count, and reaches BOTH
    // players' cards (KB Q3124: your own Digimon or Tamer is a legal choice).
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

  // --- Evolution routes -------------------------------------------------------------------

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

    // Route: 10 - 4 = 6 memory, the base becomes the single digivolution card, +1 bonus draw.
    expect(s.state.memory).toBe(6);
    expect(s.perm("base").topCard?.cardId).toBe("BT19-063");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(FILLER.length - 1);
    // ＜De-Digivolve 1＞: the top card is trashed and the card beneath it becomes the top.
    expect(s.perm("victim").topCard?.instanceId).toBe(s.inst("beneath").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([victimTopId]);
    // No DigiXros happened, so the "if DigiXrosing with 2 cards" deletion never resolves —
    // the play-cost-3 peer is untouched even though it matches the filter.
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

  // --- [DigiXros -2] ----------------------------------------------------------------------

  it("DigiXroses [SkullKnightmon] x [DeadlyAxemon] for -2 per material (8 - 4 = 4) and then deletes MY own cost-2 Digimon", async () => {
    // KB Q3124: the "you may delete 1 play cost 3 or lower Digimon or Tamer" half reaches either
    // player's cards. `preferred` pins the choice onto the controller's own Digimon so the
    // assertion is about the printed reach, not about which candidate the responder happened to take.
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "mine" },
            // Play cost 5: the near-miss the cost-3-or-lower gate must exclude.
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

    // 8 printed - 2 per placed material x 2 materials = 4.
    expect(s.state.memory).toBe(-4);
    expect(
      s
        .perm("dark")
        .stack.map((card) => card.instanceId)
        .sort(),
    ).toEqual([s.inst("skull").instanceId, s.inst("axe").instanceId].sort());
    // De-Digivolve resolved first.
    expect(s.perm("victim").topCard?.instanceId).toBe(s.inst("beneath").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([victimTopId]);
    // Then the DigiXros-gated deletion took the controller's own play-cost-2 Digimon (Q3124),
    // and left the play-cost-5 peer alone.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual([
      "BT19-020",
      "BT19-063",
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([mineTopId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("a 1-material DigiXros costs 8 - 2 = 6 and skips the deletion half, which needs 2 placed cards", async () => {
    // Comprehensive 7-2-2-4: a player may place ANY number of the specified cards (never 0), so a
    // single-material DigiXros is legal — and `digiXrosCount >= 2` then fails.
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
    // De-Digivolve still resolved; nothing was deleted on either side.
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

    // A Lv.4 Digimon that is neither [SkullKnightmon] nor [DeadlyAxemon].
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dark").instanceId,
        digiXros: { materialInstanceIds: [s.inst("kokatorimon").instanceId, s.inst("axe").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });

    // [DarkKnightmon] contains "Knightmon" but is not the printed [SkullKnightmon] slot.
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

  // --- ＜Material Save 1＞ + [On Deletion] --------------------------------------------------

  it("＜Material Save 1＞ rescues a specified material into a Tamer and [On Deletion] then plays that very card (Q3125)", async () => {
    // Under the Tamer beforehand: BT19-059 DeadlyAxemon (Lv.4, no [Knightmon] anywhere in its
    // card text) and BT18-069 Knightmon (in text, but Lv.5). Both are near-misses that the
    // level-4-or-lower + [Knightmon]-in-text filter must reject, leaving the Material-Saved
    // BT19-058 SkullKnightmon as the only candidate.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT19-063",
              as: "dark",
              under: [
                { card: "BT19-058", as: "skull" },
                // Comprehensive 16-21-1: only cards named in the TOP card's own DigiXros
                // requirement are eligible, so this Red Lv.4 must be trashed with the permanent.
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

    // The saved SkullKnightmon left the Tamer again as a free play; the two near-misses stayed.
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.instanceId).sort()).toEqual(
      [s.inst("skull").instanceId, s.perm("tamer").topCard!.instanceId].sort(),
    );
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([
      s.inst("axeUnder").instanceId,
      s.inst("knightLv5").instanceId,
    ]);
    // The permanent and its non-material digivolution card are in the trash.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [darkTopId, s.inst("notMaterial").instanceId].sort(),
    );
    // The play cost nothing: memory only moved by the attack itself, never by the play.
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

  // --- Inherited [On Deletion] ------------------------------------------------------------

  it("as a digivolution card under a real host, the inherited clause plays a Lv.4 [Knightmon]-text card from trash", async () => {
    // A realistic evolution stack: the host carries BT19-063 beneath it, so the clause runs as an
    // inherited effect of the HOST's deletion. The trash holds the eligible SkullKnightmon plus two
    // near-misses (a Lv.4 with no [Knightmon] in text, and a [Knightmon] card that is Lv.5).
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
    // The near-misses stayed in the trash, joined by the deleted host and its digivolution card.
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
