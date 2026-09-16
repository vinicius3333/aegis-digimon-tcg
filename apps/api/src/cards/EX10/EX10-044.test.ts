import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-044.js";
import "../index.js";

const CARD_ID = "EX10-044";

describe("EX10-044 Damemon", () => {
  it("matches the catalog and compiles both bottom placements", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Damemon",
      colors: ["Purple"],
      level: 4,
      playCost: 4,
      dp: 3000,
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Mutant", "Bagra Army"],
    });
    expect(getCardDefinition(CARD_ID)?.inheritedEffectText?.replace(/\s+/g, " ")).toBe(
      "When effects trash this card from a [Bagra Army] trait Digimon's digivolution cards, ＜Draw 1＞",
    );
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "Draw",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            target: { from: ["hand", "trash"], count: 1 },
            underFilter: { controller: "mine", kind: ["Tamer"] },
            position: "bottom",
          },
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["underTamers"],
          payCost: false,
          optional: true,
          target: { filter: { playCostLte: 7, nameOrTrait: [{ tokens: ["Tuwarmon"], match: "nameExact" }] } },
        },
        {
          kind: "PlaceUnder",
          target: { filter: { isSelfRef: true }, isSelf: true },
          underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
          position: "bottom",
          optional: true,
        },
      ],
      keywords: [{ keyword: "Save" }],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: { isSelfRef: true },
          hostFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
          },
          actions: [{ kind: "Draw", amount: 1 }],
        },
      ],
    });
  });

  it("[On Play] Q5126: the placed [Bagra Army] card lands at the BOTTOM of the Tamer, then draws 1", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "damemon" },
            { card: "EX10-026", as: "material" },
            { card: "BT1-013", as: "notBagra" },
          ],
          battleArea: [
            {
              card: "EX10-064",
              as: "tamer",
              under: [
                { card: "BT1-013", as: "older1" },
                { card: "BT1-014", as: "older2" },
              ],
            },
          ],
          deck: [{ card: "BT1-014", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    const damemonId = s.inst("damemon").instanceId;
    const materialId = s.inst("material").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: damemonId })).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 3 && s.state.pendingDecision === undefined);
    await settle(() => false, 30);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.instanceId)).toEqual([
      s.perm("tamer").topCard!.instanceId,
      damemonId,
    ]);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([
      materialId,
      s.inst("older1").instanceId,
      s.inst("older2").instanceId,
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("notBagra").instanceId,
      s.inst("drawn").instanceId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Play]: with no [Bagra Army] card available the cost is unpayable, so nothing is placed or drawn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "damemon" },
            { card: "BT1-013", as: "notBagra" },
          ],
          battleArea: [{ card: "EX10-064", as: "tamer", under: [{ card: "BT1-014", as: "older" }] }],
          trash: [{ card: "BT1-013", as: "trashFodder" }],
          deck: [{ card: "BT1-014", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("damemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2 && s.state.pendingDecision === undefined);
    await settle(() => false, 30);

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("older").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("notBagra").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("trashFodder").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Deletion]: a battle deletion plays the cost-7 Tuwarmon free, then Saves at the BOTTOM", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "damemon" },
            {
              card: "EX10-064",
              as: "tamer",
              under: [
                { card: "BT11-082", as: "tuwarmon" },
                { card: "BT1-013", as: "older1" },
                { card: "BT1-014", as: "older2" },
              ],
            },
          ],
          hand: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-038", as: "wall", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 1;
    const damemonId = s.inst("damemon").instanceId;
    const tuwarmonId = s.inst("tuwarmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("damemon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === damemonId));
    await settle(() => false, 30);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.instanceId)).toEqual([
      s.perm("tamer").topCard!.instanceId,
      tuwarmonId,
    ]);
    expect(s.state.memory).toBe(1);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([
      damemonId,
      s.inst("older1").instanceId,
      s.inst("older2").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(damemonId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Deletion]: with no [Tuwarmon] under the Tamer nothing is played, but ＜Save＞ still resolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "damemon" },
            {
              card: "EX10-064",
              as: "tamer",
              under: [
                { card: "BT1-013", as: "older1" },
                { card: "BT1-014", as: "older2" },
              ],
            },
          ],
          hand: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-038", as: "wall", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const damemonId = s.inst("damemon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("damemon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === damemonId));
    await settle(() => false, 30);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.instanceId)).toEqual([
      s.perm("tamer").topCard!.instanceId,
    ]);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([
      damemonId,
      s.inst("older1").instanceId,
      s.inst("older2").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Deletion]: ＜Save＞ is optional — declining sends Damemon to the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "damemon" },
            { card: "EX10-064", as: "tamer", under: [{ card: "BT1-013", as: "older" }] },
          ],
          hand: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-038", as: "wall", suspended: true }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const damemonId = s.inst("damemon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("damemon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === damemonId));
    await settle(() => false, 30);

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("older").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(damemonId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherited: a real digivolve stack whose [Bagra Army] host effect-trashes this card draws 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "damemon" }],
          hand: [
            { card: "EX10-045", as: "tuwarmon" },
            { card: "BT1-013", as: "spare" },
          ],
          deck: [
            { card: "BT1-013", as: "evoDraw" },
            { card: "BT1-014", as: "inheritedDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const damemonId = s.inst("damemon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("damemon").permanentId,
        instanceId: s.inst("tuwarmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === damemonId));
    await settle(() => false, 30);

    expect(s.state.memory).toBe(2);
    expect(s.perm("damemon").topCard!.cardId).toBe("EX10-045");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(damemonId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("spare").instanceId,
      s.inst("evoDraw").instanceId,
      s.inst("inheritedDraw").instanceId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherited: an effect trash from a non-[Bagra Army] host draws nothing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-013", as: "host", under: [{ card: CARD_ID, as: "source" }] }],
        deck: ["BT1-014"],
      },
    });
    await s.ready();
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [s.inst("source").instanceId], 0);
    await settle(() => false, 30);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("source").instanceId]);
  });
});
