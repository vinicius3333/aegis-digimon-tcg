import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine, type BoardSpec } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-068.js";

const NEUTRAL_DECK = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"];

describe("BT23-068 GranDracmon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-068")).toMatchObject({
      cardId: "BT23-068",
      nameEn: "GranDracmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 5 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Dark Animal", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Undead", "CS"], cost: 4, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.map((effect) => effect.trigger)).toEqual([
      "StartOfYourMainPhase",
      "OnDeletion",
      "WhenDigivolving",
      "AllTurns",
    ]);
  });

  describe("[Digivolve] Lv.5 w/[Undead]/[CS] trait: Cost 4", () => {
    const routeSetup = (baseCard: string) =>
      setupEngine(
        {
          0: {
            battleArea: [{ card: baseCard, as: "base" }],
            hand: [{ card: "BT23-068", as: "gran" }],
            deck: [...NEUTRAL_DECK],
          },
        },
        { autoDeclineOptional: true },
      );

    it("charges the printed Purple Lv.5 route 5 memory", async () => {
      const s = routeSetup("BT23-066");
      await s.ready();
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("gran").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "BT23-068");
      expect(s.state.memory).toBe(0);
    });

    it("charges 4 on the alternate [Undead]/[CS] route and keeps the base under the stack", async () => {
      const s = routeSetup("BT23-066");
      await s.ready();
      s.state.memory = 5;
      const baseInstanceId = s.inst("base").instanceId;
      const handBefore = s.state.players[0]!.hand.length;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("gran").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "BT23-068");
      expect(s.state.memory).toBe(1);
      expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
      expect(s.perm("base").topCard?.instanceId).toBe(s.inst("gran").instanceId);
      // Digivolution bonus: one card drawn, one card left the hand.
      expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    });

    it("takes the alternate route from a Lv.5 with only the [CS] trait", async () => {
      const s = routeSetup("BT23-067");
      await s.ready();
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("gran").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "BT23-068");
      expect(s.state.memory).toBe(1);
    });

    it("denies the cost-4 route to a Lv.5 purple base with neither [Undead] nor [CS]", async () => {
      const s = routeSetup("BT23-065");
      await s.ready();
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("gran").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "BT23-068");
      expect(s.state.memory).toBe(0);
    });

    it("rejects an off-colour Lv.5 [Dark Animal] source outright", () => {
      const s = routeSetup("BT1-039");
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("gran").instanceId,
        }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
    });
  });

  describe("[Start of Your Main Phase] free digivolution from the trash", () => {
    const board: BoardSpec = {
      0: {
        battleArea: [
          { card: "BT23-068", as: "gran" },
          { card: "BT23-061", as: "base" },
        ],
        hand: [{ card: "BT23-061", as: "spare" }],
        trash: [
          { card: "BT23-063", as: "qualifying" },
          { card: "BT23-064", as: "offTrait" },
          { card: "BT23-066", as: "unreachable" },
        ],
        deck: [...NEUTRAL_DECK],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "lowA" },
          { card: "BT1-013", as: "lowB" },
          { card: "BT1-020", as: "high" },
        ],
        deck: [...NEUTRAL_DECK],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
    };

    it("digivolves a Digimon into the trash [Dark Animal] card for free and skips the off-trait card", async () => {
      const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true });
      const qualifyingId = s.inst("qualifying").instanceId;
      const offTraitId = s.inst("offTrait").instanceId;
      const baseInstanceId = s.inst("base").instanceId;
      const highId = s.perm("high").permanentId;

      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      await settle(() => s.perm("base").topCard?.instanceId === qualifyingId);

      expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
      expect(s.perm("base").topCard?.instanceId).toBe(qualifyingId);
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === offTraitId)).toBe(true);
      // The trait matches but no legal route does: a Lv.3 base cannot reach a Lv.4-requirement card.
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("unreachable").instanceId)).toBe(true);
      // Free: the Lv.3 -> Lv.4 route costs 2, which would have driven memory to -2.
      expect(s.state.memory).toBe(0);
      // Clause 4 rides along: both Lv.3 opponents go, the Lv.5 stays.
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([highId]);

      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    });

    it("leaves the board untouched when the controller declines", async () => {
      const s = setupEngine(board, { autoDeclineOptional: true, autoSelectCards: true });
      const qualifyingId = s.inst("qualifying").instanceId;

      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      await settle(() => s.state.pendingDecision === undefined);

      expect(s.state.players[0]!.trash.some((card) => card.instanceId === qualifyingId)).toBe(true);
      expect(s.perm("base").topCard?.cardId).toBe("BT23-061");
      expect(s.state.players[1]!.battleArea).toHaveLength(3);

      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    });

    it("does not fire on the opponent's main phase", async () => {
      const s = setupEngine(board, { autoDeclineOptional: true, autoSelectCards: true });
      const qualifyingId = s.inst("qualifying").instanceId;

      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      await settle(() => s.state.pendingDecision === undefined);

      expect(s.state.players[0]!.trash.some((card) => card.instanceId === qualifyingId)).toBe(true);
      expect(s.perm("base").topCard?.cardId).toBe("BT23-061");

      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    });
  });

  describe("[On Deletion] free digivolution from the trash", () => {
    it("fires when the opponent deletes it with an Option on their own turn", async () => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            // BT2-075 Myotismon and BT4-082 Dobermon are inert: purple, no printed or inherited
            // text, so nothing but GranDracmon's own clauses can move this board.
            battleArea: [
              { card: "BT2-075", as: "source" },
              { card: "BT4-082", as: "base" },
            ],
            hand: [
              { card: "BT23-068", as: "gran" },
              { card: "BT1-009", as: "spare0" },
            ],
            trash: [
              { card: "BT2-075", as: "qualifying" },
              // BT23-065 Phantomon: purple Lv.5 [Ghost]/[LIBERATOR]. Wrong trait for this clause,
              // and above the level cap of the [When Digivolving] clause, so it stays put.
              { card: "BT23-065", as: "offTrait" },
            ],
            deck: [...NEUTRAL_DECK],
            security: ["BT1-009", "BT1-010", "BT1-011"],
          },
          1: {
            // A red Digimon on the field: an Option needs a matching colour (CR 4-21-2).
            battleArea: [{ card: "BT1-015", as: "redAnchor" }],
            hand: [{ card: "ST1-16", as: "gaiaForce" }],
            deck: [...NEUTRAL_DECK],
            security: ["BT1-009", "BT1-010", "BT1-011"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      await s.ready();
      const granInstanceId = s.inst("gran").instanceId;
      const qualifyingId = s.inst("qualifying").instanceId;
      const offTraitId = s.inst("offTrait").instanceId;
      const baseInstanceId = s.inst("base").instanceId;
      preferred.push(granInstanceId, qualifyingId);

      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      // GranDracmon reaches the board DURING seat 0's main phase, so its [Start of Your Main
      // Phase] clause has already passed and cannot consume the trash card this test needs.
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("source").permanentId,
          instanceId: granInstanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("source").topCard?.instanceId === granInstanceId);
      // The [When Digivolving] play found no level 4 or lower purple card in the trash.
      expect(s.state.players[0]!.battleArea).toHaveLength(2);

      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      expect(s.state.turnSeat).toBe(1);
      await s.ready();

      // ST1-16 Gaia Force: "[Main] Delete 1 of your opponent's Digimon." A public deletion, by the
      // opponent, on the opponent's own turn — no injected verb and no direct state write.
      s.state.memory = 10;
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === qualifyingId) &&
          s.state.pendingDecision === undefined,
      );

      // GranDracmon is in the trash, stack and all.
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === granInstanceId)).toBe(true);
      // Its [On Deletion] digivolved the Lv.4 base into the trash [Undead] card, free, with the
      // base preserved underneath.
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
        s.perm("base").permanentId,
      ]);
      expect(s.perm("base").topCard?.instanceId).toBe(qualifyingId);
      expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === qualifyingId)).toBe(false);
      // The off-trait [Ghost] card was never eligible.
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === offTraitId)).toBe(true);
      // Only Gaia Force's cost of 8 was paid; the Lv.4 -> Lv.5 route (2) cost nothing.
      expect(s.state.memory).toBe(2);
      expect(s.state.pendingDecision).toBeUndefined();

      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    });
  });

  describe("[When Digivolving] free purple play from the trash", () => {
    it("plays a level 4 or lower purple Digimon from the trash and leaves the Lv.5 behind", async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT23-066", as: "base" }],
            hand: [{ card: "BT23-068", as: "gran" }],
            trash: [
              { card: "BT23-065", as: "tooHigh" },
              { card: "BT23-063", as: "eligible" },
            ],
            deck: [...NEUTRAL_DECK],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = 5;
      const eligibleId = s.inst("eligible").instanceId;
      const tooHighId = s.inst("tooHigh").instanceId;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("gran").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.length === 2 && s.state.pendingDecision === undefined);

      expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === eligibleId)).toBe(true);
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === tooHighId)).toBe(true);
      // Only the digivolution cost of 5 was paid; the trash play cost nothing.
      expect(s.state.memory).toBe(0);
    });

    it("leaves the trash alone when the controller declines", async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT23-066", as: "base" }],
            hand: [{ card: "BT23-068", as: "gran" }],
            trash: [{ card: "BT23-063", as: "eligible" }],
            deck: [...NEUTRAL_DECK],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = 5;
      const eligibleId = s.inst("eligible").instanceId;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("gran").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "BT23-068" && s.state.pendingDecision === undefined);

      expect(s.state.players[0]!.trash.some((card) => card.instanceId === eligibleId)).toBe(true);
      expect(s.state.players[0]!.battleArea).toHaveLength(1);
    });
  });

  describe("[All Turns] [Once Per Turn] delete on a digivolution from the trash", () => {
    it("does not delete when the watched evolution comes from hand", async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT23-068", as: "watcher" },
              { card: "BT23-062", as: "base" },
            ],
            hand: [{ card: "BT23-063", as: "manual" }],
            deck: [...NEUTRAL_DECK],
          },
          1: { battleArea: [{ card: "BT23-055", as: "opponent" }] },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 5;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("manual").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.instanceId === s.inst("manual").instanceId);
      expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT23-055")).toBe(true);
    });

    it("triggers its own effect when a Digimon digivolves into it from the trash (Q5336)", async () => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT23-068", as: "source" },
              { card: "BT23-066", as: "base" },
            ],
            hand: [{ card: "BT1-009", as: "spare" }],
            trash: [{ card: "BT23-068", as: "into" }],
            deck: [...NEUTRAL_DECK],
          },
          1: {
            battleArea: [
              { card: "BT1-009", as: "low1" },
              { card: "BT1-013", as: "low2" },
              { card: "BT1-014", as: "mid" },
              { card: "BT1-020", as: "high" },
            ],
            deck: [...NEUTRAL_DECK],
            security: ["BT1-009", "BT1-010", "BT1-011"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      await s.ready();
      preferred.push(s.inst("into").instanceId);
      const baseInstanceId = s.inst("base").instanceId;
      const highId = s.perm("high").permanentId;
      const intoInstanceId = s.inst("into").instanceId;

      // Public route: the watcher's own [Start of Your Main Phase] offers the free trash
      // digivolution, and the card digivolved INTO is another BT23-068 (Q5336).
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      await settle(() => s.state.players[1]!.battleArea.length === 1);

      expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
      expect(s.perm("base").topCard?.instanceId).toBe(intoInstanceId);
      // Free: the Lv.5 -> Lv.6 route costs 4 or 5, which would have driven memory below zero.
      expect(s.state.memory).toBe(0);
      // Two watchers see one event. The Digimon already in play spends its once-per-turn on the
      // two level 3s; the level 4 can only have been taken by the card that was digivolved INTO
      // from the trash, which is exactly what Q5336 says fires.
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([highId]);
      const opponentTrash = s.state.players[1]!.trash.map((card) => card.cardId);
      expect(opponentTrash).toContain("BT1-014");

      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    });

    it("fires on the opponent's turn", async () => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            // Two inert purple Lv.5 [Undead] sources; both GranDracmon arrive from hand DURING
            // seat 0's main phase, so neither [Start of Your Main Phase] clause ever runs and the
            // trash card survives to the opponent's turn.
            battleArea: [
              { card: "BT2-075", as: "sourceA" },
              { card: "BT2-075", as: "sourceB" },
              { card: "BT4-082", as: "base" },
            ],
            hand: [
              { card: "BT23-068", as: "victim" },
              { card: "BT23-068", as: "watcher" },
              { card: "BT1-009", as: "spare0" },
            ],
            trash: [{ card: "BT2-075", as: "fromTrash" }],
            deck: [...NEUTRAL_DECK],
            security: ["BT1-009", "BT1-010", "BT1-011"],
          },
          1: {
            battleArea: [
              { card: "BT1-009", as: "low" },
              { card: "BT1-015", as: "redAnchor" },
            ],
            hand: [{ card: "ST1-16", as: "gaiaForce" }],
            deck: [...NEUTRAL_DECK],
            security: ["BT1-009", "BT1-010", "BT1-011"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      await s.ready();
      const victimId = s.inst("victim").instanceId;
      const watcherId = s.inst("watcher").instanceId;
      const fromTrashId = s.inst("fromTrash").instanceId;
      const baseInstanceId = s.inst("base").instanceId;
      preferred.push(victimId, fromTrashId);

      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      s.state.memory = 12;
      for (const [sourceAlias, handInstanceId] of [
        ["sourceA", victimId],
        ["sourceB", watcherId],
      ] as const) {
        expect(
          s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: s.perm(sourceAlias).permanentId,
            instanceId: handInstanceId,
            useAlternateCost: true,
          }),
        ).toEqual({ ok: true });
        await settle(() => s.perm(sourceAlias).topCard?.instanceId === handInstanceId);
      }
      // Neither arrival was a digivolution FROM THE TRASH, so nothing was deleted yet.
      expect(s.state.players[1]!.battleArea).toHaveLength(2);

      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      expect(s.state.turnSeat).toBe(1);
      await s.ready();
      const lowId = s.perm("low").permanentId;
      const redAnchorId = s.perm("redAnchor").permanentId;

      // On the OPPONENT's turn: the opponent's Gaia Force deletes one GranDracmon, whose
      // [On Deletion] digivolves the Lv.4 base out of the trash. The second GranDracmon is still
      // on the board and watches that trash digivolution.
      s.state.memory = 10;
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);

      expect(s.perm("base").topCard?.instanceId).toBe(fromTrashId);
      expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
      // The [All Turns] delete fired on the opponent's turn and took their lowest level only.
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([redAnchorId]);
      expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("low").instanceId)).toBe(true);
      expect(lowId).not.toBe(redAnchorId);
      expect(s.state.pendingDecision).toBeUndefined();

      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    });

    it("fires once per turn and resets on the next own turn", async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT23-068", as: "gran" },
              { card: "BT23-061", as: "baseA" },
              { card: "BT23-061", as: "baseB" },
            ],
            hand: [{ card: "BT23-061", as: "spare" }],
            trash: [
              { card: "BT23-063", as: "firstTrashCard" },
              // BT2-075 Myotismon: inert purple Lv.5 [Undead], reachable from a Lv.4 purple base.
              { card: "BT2-075", as: "secondTrashCard" },
              { card: "BT23-063", as: "thirdTrashCard" },
            ],
            deck: [...NEUTRAL_DECK],
            security: ["BT1-009", "BT1-010", "BT1-011"],
          },
          1: {
            battleArea: [
              { card: "BT1-009", as: "lowest" },
              { card: "BT1-014", as: "middle" },
              { card: "BT1-020", as: "highest" },
            ],
            deck: [...NEUTRAL_DECK],
            security: ["BT1-010", "BT1-011", "BT1-012"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const firstId = s.inst("firstTrashCard").instanceId;
      const secondId = s.inst("secondTrashCard").instanceId;
      const thirdId = s.inst("thirdTrashCard").instanceId;
      const middleId = s.perm("middle").permanentId;
      const highestId = s.perm("highest").permanentId;
      const topCardIds = (): (string | undefined)[] =>
        s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId);

      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      // First trash digivolution of the turn, offered by GranDracmon's own [Start of Your Main
      // Phase]: the delete fires and takes the Lv.3.
      await settle(() => s.state.players[1]!.battleArea.length === 2);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([middleId, highestId]);
      expect(topCardIds()).toContain(firstId);

      // Second trash digivolution in the SAME turn, through a public attack: the BT23-063
      // Sangloupmon that just arrived has "[When Attacking] This Digimon may digivolve into a
      // Digimon card with the [Undead] or [CS] trait in the trash". The once-per-turn gate on
      // GranDracmon's watcher holds the delete.
      const sangloupmon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === firstId);
      expect(sangloupmon).toBeDefined();
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: sangloupmon!.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => topCardIds().includes(secondId) && s.state.pendingDecision === undefined);

      expect(topCardIds()).toContain(secondId);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([middleId, highestId]);

      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([middleId, highestId]);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      // Next own turn: the counter has reset, so the third trash digivolution deletes again.
      await settle(() => s.state.players[1]!.battleArea.length === 1);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([highestId]);
      expect(topCardIds()).toContain(thirdId);

      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    });
  });
});
