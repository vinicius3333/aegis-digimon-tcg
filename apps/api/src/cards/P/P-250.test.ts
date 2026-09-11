import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
// P-250 registers itself on import; `../index.js` supplies every peer module the fixtures use.
// (`../index.js` does not list P-250 yet — wiring it in is a coordinator-owned step.)
import { compiled } from "./P-250.js";
import "../index.js";

// Neutral fixtures. Every friendly host/recipient below is printed blank or carries only an
// [On Play] clause, which a pre-seeded battle-area permanent never fires — so no fixture can
// open a decision or move a card and steal the assertion.
//  BT3-078 Shamanmon   Purple Lv.3 [Demon]    — blank text, legal Purple Lv.3 base.
//  BT3-076 Candlemon   Purple Lv.3 [Flame]    — blank text, the near-miss trait.
//  BT1-057 Sirenmon    Yellow Lv.5 [Shaman]   — blank text.
//  BT3-084 Raremon     Purple Lv.4 [Undead]   — [On Play] only, play cost 5.
//  BT11-051 Ogremon    Green  Lv.4 [Demon]    — blank text, the named alternate-path base.
//  BT1-080 Titamon     Green  Lv.6 [Shaman]   — blank text, play cost 10.
const HAND_FIVE = ["BT3-076", "BT3-076", "BT3-076", "BT3-076", "BT3-076"];

describe("P-250 Ogremon (X Antibody)", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("P-250")).toMatchObject({
      cardId: "P-250",
      set: "P",
      nameEn: "Ogremon (X Antibody)",
      colors: ["Purple", "Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 7000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Demon", "X Antibody"],
      evoCosts: [
        { color: "Purple", level: 3, memoryCost: 3 },
        { color: "Black", level: 3, memoryCost: 3 },
      ],
      effectText:
        "[Digivolve] [Ogremon]/[Fugamon]/[Hyogamon]: Cost 1 \n\n[Trash] [End of Your Turn] If you have 5 or fewer cards in hand, 1 of your [Demon] trait Digimon may digivolve into this card.\n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] By trashing 1 card in your hand, 1 of your [Demon], [Shaman] or [Undead] trait Digimon gains ＜Blocker＞ and ＜Retaliation＞ until your opponent’s turn ends.",
      inheritedEffectText: "[On Deletion] Delete 1 of your opponent's Digimon with a play cost of 6 or less.",
    });
  });

  it("encodes the [Digivolve] header as three EXACT names at cost 1", () => {
    expect(compiled).toMatchObject({ cardId: "P-250", coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Ogremon", "Fugamon", "Hyogamon"], cost: 1, isAlternate: true },
    ]);
    // A substring match would wrongly accept relatives of those names.
    expect(JSON.stringify(compiled.digivolutionRequirement)).not.toContain('"names"');
  });

  it("encodes the [Trash] clause as a PAID trash-zone digivolve gated on 5 or fewer hand cards", () => {
    const trash = compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn");
    expect(trash).toMatchObject({ isFromTrash: true });
    expect(trash?.actions[0]).toMatchObject({
      kind: "Digivolve",
      target: {
        filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Demon"], match: "trait" }] },
      },
      into: { controller: "mine", zone: "trash", isSelfRef: true, kind: ["Digimon"] },
      from: ["trash"],
      // P-250 does NOT print "without paying the cost" (contrast BT24-080, which does).
      payCost: true,
      optional: true,
      condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 5 },
    });
    expect(JSON.stringify(trash)).not.toContain("ignoreRequirements");
  });

  it("shares one Once Per Turn ledger across the three grant timings", () => {
    const windows = ["OnPlay", "WhenDigivolving", "WhenAttacking"] as const;
    const keys = new Set<string | undefined>();
    for (const trigger of windows) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({ frequency: "OncePerTurn" });
      keys.add(effect?.sharedUseKey);
      expect(effect?.actions[0]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Blocker" },
        duration: "untilOpponentTurnEnd",
        cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
        optional: true,
        abortOnDecline: true,
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Demon", "Shaman", "Undead"], match: "trait" }],
          },
        },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Retaliation" },
        duration: "untilOpponentTurnEnd",
        target: { sameTarget: true },
      });
      expect(effect?.actions).toHaveLength(2);
    }
    expect(keys.size).toBe(1);
    expect([...keys][0]).toBeDefined();
  });

  it("encodes the inherited On Deletion as a play-cost-6-or-less opposing deletion", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited === true);
    expect(inherited).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 6 }, count: 1 } },
      ],
    });
  });

  it("digivolves a [Demon] Lv.3 into the trash copy at five hand cards and pays the Purple Lv.3 cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-078", as: "demon" }],
          hand: [...HAND_FIVE],
          deck: ["BT3-076", "BT3-076"],
          trash: [{ card: "P-250", as: "ogremonX" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseId = s.perm("demon").topCard.instanceId;
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.EndOfYourTurn, s.inst("ogremonX"));
    await settle(() => s.perm("demon").topCard.instanceId === s.inst("ogremonX").instanceId);

    expect(s.perm("demon").topCard.cardId).toBe("P-250");
    expect(s.perm("demon").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("ogremonX").instanceId);
    // Purple Lv.3 -> P-250 costs 3 memory; the printed text grants no waiver.
    expect(s.state.memory).toBe(0);
    // 5 in hand, +1 from the digivolution draw, -1 trashed for the [When Digivolving] grant cost.
    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(observe(s.engine).hasKeyword(s.perm("demon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("demon"), "Retaliation")).toBe(true);
  });

  it("refuses the trash digivolve at six hand cards — the boundary is 5 or fewer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-078", as: "demon" }],
          hand: [...HAND_FIVE, "BT3-076"],
          deck: ["BT3-076"],
          trash: [{ card: "P-250", as: "ogremonX" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseId = s.perm("demon").topCard.instanceId;
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.EndOfYourTurn, s.inst("ogremonX"));
    await settle();

    expect(s.perm("demon").topCard.instanceId).toBe(baseId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ogremonX").instanceId);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand).toHaveLength(6);
  });

  it("may refuse the optional trash digivolve and leave the card in the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-078", as: "demon" }],
          hand: [...HAND_FIVE],
          deck: ["BT3-076"],
          trash: [{ card: "P-250", as: "ogremonX" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const baseId = s.perm("demon").topCard.instanceId;
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.EndOfYourTurn, s.inst("ogremonX"));
    await settle();

    expect(s.perm("demon").topCard.instanceId).toBe(baseId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ogremonX").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("rejects a non-[Demon] base for the trash digivolve even at a legal Purple Lv.3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-076", as: "flame" }],
          hand: [...HAND_FIVE],
          deck: ["BT3-076"],
          trash: [{ card: "P-250", as: "ogremonX" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseId = s.perm("flame").topCard.instanceId;
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.EndOfYourTurn, s.inst("ogremonX"));
    await settle();

    expect(s.perm("flame").topCard.instanceId).toBe(baseId);
    expect(s.perm("flame").topCard.cardId).toBe("BT3-076");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ogremonX").instanceId);
  });

  it("honors the cost-1 alternate path from the trash instead of waiving requirements", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-051", as: "ogremonBase" }],
          hand: [...HAND_FIVE],
          deck: ["BT3-076"],
          trash: [{ card: "P-250", as: "ogremonX" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.EndOfYourTurn, s.inst("ogremonX"));
    await settle(() => s.perm("ogremonBase").topCard.cardId === "P-250");

    // BT11-051 is named Ogremon, so the cost-1 alternate path applies even from the trash.
    expect(s.perm("ogremonBase").topCard.cardId).toBe("P-250");
    expect(s.state.memory).toBe(2);
  });

  it("digivolves from a printed [Ogremon] for 1 memory through the alternate path", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-051", as: "ogremon" }],
          hand: [{ card: "P-250", as: "ogremonX" }, "BT3-076"],
          deck: ["BT3-076"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseId = s.perm("ogremon").topCard.instanceId;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ogremon").permanentId,
        instanceId: s.inst("ogremonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ogremon").topCard.cardId === "P-250");

    expect(s.perm("ogremon").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.memory).toBe(2);
    // 1 card left after P-250 leaves, +1 digivolution draw, -1 trashed for the grant cost.
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("ogremon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ogremon"), "Retaliation")).toBe(true);
  });

  it("rejects a Lv.4 base that is neither a printed [Ogremon]/[Fugamon]/[Hyogamon] nor a Purple/Black Lv.3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-084", as: "raremon" }],
        hand: [{ card: "P-250", as: "ogremonX" }],
      },
    });
    const baseId = s.perm("raremon").topCard.instanceId;
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("raremon").permanentId,
        instanceId: s.inst("ogremonX").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.perm("raremon").topCard.instanceId).toBe(baseId);
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("ogremonX").instanceId);
  });

  it.each([
    ["Demon", "BT3-078", "demon"],
    ["Shaman", "BT1-057", "shaman"],
    ["Undead", "BT3-084", "undead"],
  ])(
    "grants Blocker and Retaliation on play to a [%s] trait Digimon from a mixed board",
    async (_trait, card, alias) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT3-078", as: "demon" },
              { card: "BT1-057", as: "shaman" },
              { card: "BT3-084", as: "undead" },
              { card: "BT3-076", as: "flame" },
            ],
            hand: [
              { card: "P-250", as: "ogremonX" },
              { card: "BT3-076", as: "fodder" },
            ],
            deck: ["BT3-076"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.perm(alias).topCard.instanceId);
      s.state.memory = 8;
      await s.ready();

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ogremonX").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => observe(s.engine).hasKeyword(s.perm(alias), "Retaliation"));

      expect(observe(s.engine).hasKeyword(s.perm(alias), "Blocker")).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm(alias), "Retaliation")).toBe(true);
      // One target, not one per keyword: the near-miss trait never receives either grant.
      expect(observe(s.engine).hasKeyword(s.perm("flame"), "Blocker")).toBe(false);
      expect(observe(s.engine).hasKeyword(s.perm("flame"), "Retaliation")).toBe(false);
      // The cost trashed exactly 1 hand card.
      expect(s.state.players[0]!.hand).toHaveLength(0);
      expect(s.state.players[0]!.trash.map((instance) => instance.instanceId)).toContain(s.inst("fodder").instanceId);
      expect(card).toBe(s.perm(alias).topCard.cardId);
    },
  );

  it("falls back to itself — P-250 is [Demon] — and never reaches a non-matching trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-076", as: "flame" }],
          hand: [
            { card: "P-250", as: "ogremonX" },
            { card: "BT3-076", as: "fodder" },
          ],
          deck: ["BT3-076"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ogremonX").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "P-250"));
    await settle();

    const self = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "P-250")!;
    expect(observe(s.engine).hasKeyword(self, "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(self, "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("flame"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("flame"), "Retaliation")).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("fodder").instanceId);
  });

  it("may decline the 'by trashing 1 card in your hand' cost and grant nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-250", as: "ogremonX", under: ["BT3-078"] },
            { card: "BT3-078", as: "demon" },
          ],
          hand: [{ card: "BT3-076", as: "fodder" }],
          deck: ["BT3-076"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("ogremonX"));
    await settle();

    expect(observe(s.engine).hasKeyword(s.perm("demon"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("demon"), "Retaliation")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("ogremonX"), "Retaliation")).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("fodder").instanceId);
  });

  it("spends the shared Once Per Turn use: the second timing in the same turn grants nothing", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-250", as: "ogremonX", under: ["BT3-078"] },
            { card: "BT3-078", as: "demon" },
            { card: "BT1-057", as: "shaman" },
          ],
          hand: [
            { card: "BT3-076", as: "firstFodder" },
            { card: "BT3-076", as: "secondFodder" },
          ],
          deck: ["BT3-076", "BT3-076"],
        },
        1: { security: 1, deck: ["BT3-076"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("demon").topCard.instanceId);
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("ogremonX"));
    await settle(() => observe(s.engine).hasKeyword(s.perm("demon"), "Retaliation"));
    expect(s.state.players[0]!.hand).toHaveLength(1);

    preferred.length = 0;
    preferred.push(s.perm("shaman").topCard.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ogremonX").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    await settle();

    // Same physical card, different timing — one shared per-turn use, already spent.
    expect(observe(s.engine).hasKeyword(s.perm("shaman"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("shaman"), "Retaliation")).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("keeps both grants through the opponent's turn and drops them when that turn ends", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-250", as: "ogremonX", under: ["BT3-078"] },
            { card: "BT3-078", as: "demon" },
          ],
          hand: [{ card: "BT3-076", as: "fodder" }],
          deck: ["BT3-076", "BT3-076"],
        },
        1: { deck: ["BT3-076", "BT3-076"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("demon").topCard.instanceId);
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("ogremonX"));
    await settle(() => observe(s.engine).hasKeyword(s.perm("demon"), "Retaliation"));

    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).hasKeyword(s.perm("demon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("demon"), "Retaliation")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 0;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).hasKeyword(s.perm("demon"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("demon"), "Retaliation")).toBe(false);
  });

  it("inherits On Deletion: deletes an opposing play-cost-6-or-less Digimon and spares a dearer one", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-084", as: "host", under: ["P-250"] }] },
        1: {
          battleArea: [
            { card: "BT3-078", as: "cheap" },
            { card: "BT1-080", as: "dear" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const cheapId = s.perm("cheap").permanentId;
    const cheapInstanceId = s.inst("cheap").instanceId;
    const dearId = s.perm("dear").permanentId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === cheapId));

    // BT3-078 play cost 3 is deletable; BT1-080 play cost 10 is not a legal choice.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([dearId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(cheapInstanceId);
  });

  it("does not fire the inherited On Deletion when no opposing Digimon costs 6 or less", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT3-084", as: "host", under: ["P-250"] }] },
        1: { battleArea: [{ card: "BT1-080", as: "dear" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const dearId = s.perm("dear").permanentId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle();

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([dearId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
