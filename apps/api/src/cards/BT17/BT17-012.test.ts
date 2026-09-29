import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import "../BT13/BT13-007.js";
import "../BT16/BT16-084.js";
import "../BT18/BT18-088.js";
import { compiled } from "./BT17-012.js";

const PRINTED_EFFECT =
  "[Digivolve][Takuya Kanbara]: Cost 2 [Digivolve][Agunimon]: Cost 1 \n\nYou may digivolve this card from your hand onto one of your red Tamers as if that card is a level 3 red Digimon.\n＜Raid＞ \n[When Attacking] This Digimon may digivolve into a Digimon card with the [Hybrid]\u00a0trait in the hand with the digivolution cost reduced by 1.\n[Rule] Name: Not treated as including [Greymon].";

describe("BT17-012 BurningGreymon", () => {
  it("matches the catalog and carries the printed IR contract", () => {
    expect(getCardDefinition("BT17-012")).toMatchObject({
      cardId: "BT17-012",
      nameEn: "BurningGreymon",
      colors: ["Red", "Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 6000,
      forms: ["Hybrid"],
      types: ["Dark Dragon"],
      effectText: PRINTED_EFFECT,
      inheritedEffectText: "[Your Turn] This Digimon gets +2000 DP.",
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Takuya Kanbara"], cost: 2, isAlternate: true, baseIsTamer: true },
      { namesExact: ["Agunimon"], cost: 1, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "Digivolve",
          asLevel: 3,
          from: ["hand"],
          payCost: true,
          onto: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Red"] } },
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Raid" }] });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: true,
          reduceCost: 1,
          optional: true,
          into: { nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
        },
      ],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });

  it("gates the named routes on the exact base name", () => {
    expect(matchingAlternateDigivolutionRequirement("BT17-012", "BT12-088")).toMatchObject({
      cost: 2,
      baseIsTamer: true,
    });
    expect(matchingAlternateDigivolutionRequirement("BT17-012", "BT18-088")).toMatchObject({ cost: 2 });
    expect(matchingAlternateDigivolutionRequirement("BT17-012", "BT17-011")).toMatchObject({ cost: 1 });
    expect(matchingAlternateDigivolutionRequirement("BT17-012", "BT1-014")).toBeUndefined();
  });

  it("digivolves from hand onto a [Takuya Kanbara] Tamer for 2, drawing the bonus card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-088", as: "takuya" }],
        hand: [{ card: "BT17-012", as: "burning" }],
        deck: [{ card: "BT1-009", as: "bonus" }, "BT1-010"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const takuyaId = s.inst("takuya").instanceId;
    const burningId = s.inst("burning").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: burningId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.instanceId === burningId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("takuya").stack.map((card) => card.instanceId)).toEqual([takuyaId]);
    expect(s.perm("takuya").topCard?.cardId).toBe("BT17-012");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonus").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("digivolves onto an unnamed red Tamer for the level-3 cost of 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-085", as: "tai" }],
        hand: [{ card: "BT17-012", as: "burning" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const taiId = s.inst("tai").instanceId;
    const burningId = s.inst("burning").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tai").permanentId,
        instanceId: burningId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tai").topCard?.instanceId === burningId);

    expect(s.state.memory).toBe(2);
    expect(s.perm("tai").stack.map((card) => card.instanceId)).toEqual([taiId]);
  });

  it("refuses a Tamer that is not red and leaves the board untouched", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST3-12", as: "tk" }],
        hand: [{ card: "BT17-012", as: "burning" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const tkId = s.inst("tk").instanceId;
    const burningId = s.inst("burning").instanceId;

    for (const useAlternateCost of [true, false]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("tk").permanentId,
          instanceId: burningId,
          useAlternateCost,
        }),
      ).not.toEqual({ ok: true });
    }

    expect(s.perm("tk").topCard?.instanceId).toBe(tkId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([burningId]);
    expect(s.state.memory).toBe(5);
  });

  it("digivolves from hand onto [Agunimon] for 1 but refuses a same-level red Digimon with another name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-011", as: "agunimon" },
          { card: "BT1-014", as: "kokatorimon" },
        ],
        hand: [{ card: "BT17-012", as: "burning" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const agunimonId = s.inst("agunimon").instanceId;
    const kokatorimonId = s.inst("kokatorimon").instanceId;
    const burningId = s.inst("burning").instanceId;

    for (const useAlternateCost of [true, false]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("kokatorimon").permanentId,
          instanceId: burningId,
          useAlternateCost,
        }),
      ).not.toEqual({ ok: true });
    }
    expect(s.perm("kokatorimon").topCard?.instanceId).toBe(kokatorimonId);
    expect(s.state.memory).toBe(5);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agunimon").permanentId,
        instanceId: burningId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agunimon").topCard?.instanceId === burningId);

    expect(s.state.memory).toBe(4);
    expect(s.perm("agunimon").stack.map((card) => card.instanceId)).toEqual([agunimonId]);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("cannot attack on the turn its Tamer base was placed (Q2735)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-088", as: "takuya", enteredThisTurn: true }],
        hand: [{ card: "BT17-012", as: "burning" }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 5;
    await s.ready();
    const burningId = s.inst("burning").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: burningId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.instanceId === burningId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("takuya").permanentId,
        target: { kind: "player" },
      }),
    ).not.toEqual({ ok: true });
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("digivolves from an attack into a legal Hybrid for one less memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-012", as: "burning" }],
          hand: [{ card: "BT17-014", as: "aldamon" }, "BT1-009"],
          deck: [{ card: "BT1-010", as: "bonus" }, "BT1-011"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const burningPermanentId = s.perm("burning").permanentId;
    const burningId = s.inst("burning").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: burningPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("burning").topCard?.cardId === "BT17-014" && !observe(s.engine).isAttacking());

    expect(s.state.memory).toBe(2);
    expect(s.perm("burning").stack.map((card) => card.instanceId)).toEqual([burningId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT1-010"]);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("cannot use the attack digivolution on a Hybrid whose requirements are unmet (Q2737)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-012", as: "burning" }],
          hand: [{ card: "BT12-017", as: "emperor" }, "BT1-009"],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const emperorId = s.inst("emperor").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("burning").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.perm("burning").topCard?.cardId).toBe("BT17-012");
    expect(s.perm("burning").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(emperorId);
    expect(s.state.memory).toBe(5);
  });

  it("cannot use the attack digivolution on a non-Hybrid card in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-012", as: "burning" }],
          hand: [{ card: "BT17-013", as: "warGrowlmon" }, "BT1-009"],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("burning").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.perm("burning").topCard?.cardId).toBe("BT17-012");
    expect(s.state.memory).toBe(5);
  });

  it("publishes Raid through the shared keyword runtime (Q2738 ordering)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-012", as: "burning" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("burning"), "Raid")).toBe(true);
  });

  it("grants its inherited +2000 DP only on its controller's turn, and only to its own carrier", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-013", as: "carrier", under: ["BT17-012"] },
          { card: "BT17-013", as: "peer" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
        hand: ["BT1-009"],
      },
      1: { deck: ["BT1-009", "BT1-010"], hand: ["BT1-009"] },
    });
    await s.ready();
    expect(s.perm("carrier").currentDP).toBe(9000);
    expect(s.perm("peer").currentDP).toBe(7000);

    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("carrier").currentDP).toBe(7000);
    expect(s.perm("peer").currentDP).toBe(7000);
  });

  it("gains a Tamer digivolution card's inherited effect but not its security effect (Q6556/Q6557)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-012", as: "burning", under: ["BT17-079"] }] },
    });
    await s.ready();

    expect(s.perm("burning").currentDP).toBe(8000);
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("burning").currentDP).toBe(6000);
    s.state.turnSeat = 0;
    await s.ready();

    expect(getCardDefinition("BT17-079")?.securityEffectText).toBeUndefined();
    expect(getCardDefinition("BT17-079")?.effectText).toContain("[Security] Play this card without paying the cost.");
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});

describe("BT17-012 BurningGreymon — KB Q&A rulings", () => {
  const TAKUYA = "BT12-088";
  const TAKUYA_AND_KOJI = "BT18-088";
  const AGUNIMON = "BT17-011";
  const ANCIENT_GREYMON = "BT17-017";
  const RED_TAMER = "BT1-085";
  const BLUE_TAMER = "BT1-086";
  const INERT_RED_LV3 = "BT1-009";
  const YOLEI_AND_KARI = "BT16-084";
  const KING_DRASIL = "BT13-007";

  function digivolveIntoBurningGreymon(s: EngineSetup, base: string, useAlternateCost: boolean) {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm(base).permanentId,
      instanceId: s.inst("burning").instanceId,
      useAlternateCost,
    });
  }

  async function digivolveWithYoleiAndKari(base: string, useAlternateCost: boolean) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: base, as: "base" },
            { card: YOLEI_AND_KARI, as: "yoleiAndKari" },
          ],
          hand: [{ card: "BT17-012", as: "burning" }],
          deck: [INERT_RED_LV3, INERT_RED_LV3],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(digivolveIntoBurningGreymon(s, "base", useAlternateCost)).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT17-012");
    await drainMicrotasks();
    return { watcherFired: s.perm("yoleiAndKari").isSuspended, memory: s.state.memory };
  }

  async function digivolveUnderKingDrasil(base: string, useAlternateCost: boolean) {
    const s = setupEngine({
      0: {
        breeding: { card: KING_DRASIL, as: "drasil" },
        battleArea: [{ card: base, as: "base" }],
        hand: [{ card: "BT17-012", as: "burning" }],
        deck: [INERT_RED_LV3],
      },
    });
    s.state.memory = 5;
    await s.ready();

    const result = digivolveIntoBurningGreymon(s, "base", useAlternateCost);
    await drainMicrotasks();
    return { accepted: result.ok, top: s.perm("base").topCard?.cardId, memory: s.state.memory };
  }

  async function chainIntoAncientGreymon(runAttack: (s: EngineSetup) => Promise<void>) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-012", as: "burning", under: [TAKUYA_AND_KOJI] }],
          hand: [
            { card: AGUNIMON, as: "agunimon" },
            { card: ANCIENT_GREYMON, as: "ancient" },
          ],
          deck: [INERT_RED_LV3, INERT_RED_LV3, INERT_RED_LV3, INERT_RED_LV3],
        },
        1: {
          security: [INERT_RED_LV3, INERT_RED_LV3, INERT_RED_LV3],
          deck: [INERT_RED_LV3, INERT_RED_LV3, INERT_RED_LV3],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 5;
    await s.ready();
    const stackId = s.perm("burning").permanentId;
    preferred.push(s.inst("agunimon").instanceId, s.inst("ancient").instanceId);

    await runAttack(s);
    const stackAfterTurn = s.state.players[0]!.battleArea.find((p) => p.permanentId === stackId);
    return {
      top: stackAfterTurn?.topCard?.cardId,
      sources: stackAfterTurn?.stack.map(({ cardId }) => cardId),
      opponentSecurity: s.state.players[1]!.security.length,
    };
  }

  it.fails("does not delete [AncientGreymon] reached through the end-of-turn attack chain, because the end-of-turn timing has passed (Q2731)", async () => {
    const mainPhaseAttack = await chainIntoAncientGreymon(async (s) => {
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("burning").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await advance(s.engine).finishAttack();
      advance(s.engine).endMainPhaseIfOpen(0);
      await turn;
    });
    expect(mainPhaseAttack).toEqual({ top: undefined, sources: undefined, opponentSecurity: 1 });

    const endOfTurnAttack = await chainIntoAncientGreymon(async (s) => {
      await advance(s.engine).runTurn(0);
    });
    expect(endOfTurnAttack).toEqual({
      top: ANCIENT_GREYMON,
      sources: [TAKUYA_AND_KOJI, "BT17-012", AGUNIMON],
      opponentSecurity: 1,
    });
  });

  it.fails("treats a red Tamer digivolved as a level 3 Digimon as a digivolving Digimon: watchers fire and a can't-digivolve lock blocks it (Q2732)", async () => {
    expect(await digivolveWithYoleiAndKari(AGUNIMON, true)).toEqual({ watcherFired: true, memory: 5 - 1 + 1 });
    expect(await digivolveUnderKingDrasil(AGUNIMON, true)).toEqual({ accepted: false, top: AGUNIMON, memory: 5 });

    expect(await digivolveWithYoleiAndKari(RED_TAMER, true)).toEqual({ watcherFired: true, memory: 5 - 3 + 1 });
    expect(await digivolveUnderKingDrasil(RED_TAMER, true)).toEqual({ accepted: false, top: RED_TAMER, memory: 5 });
  });

  it.fails("treats [Takuya Kanbara] on the cost-2 route as a digivolving Digimon: watchers fire and a can't-digivolve lock blocks it (Q2733)", async () => {
    expect(await digivolveWithYoleiAndKari(AGUNIMON, true)).toEqual({ watcherFired: true, memory: 5 - 1 + 1 });
    expect(await digivolveUnderKingDrasil(AGUNIMON, true)).toEqual({ accepted: false, top: AGUNIMON, memory: 5 });

    expect(await digivolveWithYoleiAndKari(TAKUYA, true)).toEqual({ watcherFired: true, memory: 5 - 2 + 1 });
    expect(await digivolveUnderKingDrasil(TAKUYA, true)).toEqual({ accepted: false, top: TAKUYA, memory: 5 });
  });

  it("performs the digivolution bonus draw when it digivolves from a Tamer (Q2734)", async () => {
    for (const base of [TAKUYA, RED_TAMER]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "BT17-012", as: "burning" }],
          deck: [{ card: INERT_RED_LV3, as: "bonus" }, "BT1-010"],
        },
      });
      s.state.memory = 5;
      await s.ready();

      expect(digivolveIntoBurningGreymon(s, "base", true)).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "BT17-012");

      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonus").instanceId]);
      expect(s.state.players[0]!.deck).toHaveLength(1);
    }
  });

  it("keeps the Tamer under it as a digivolution card that is trashed with it when it leaves the field (Q2736)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAKUYA, as: "takuya" }],
          hand: [{ card: "BT17-012", as: "burning" }],
          deck: [INERT_RED_LV3, INERT_RED_LV3],
        },
        1: {
          battleArea: [{ card: "BT1-084", as: "wall", dp: 20000, suspended: true }],
          security: [INERT_RED_LV3],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const takuyaId = s.inst("takuya").instanceId;
    const burningId = s.inst("burning").instanceId;
    const stackId = s.perm("takuya").permanentId;

    expect(digivolveIntoBurningGreymon(s, "takuya", true)).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.instanceId === burningId);
    expect(s.perm("takuya").stack.map(({ instanceId }) => instanceId)).toEqual([takuyaId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: stackId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === stackId)).toBe(false);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual([burningId, takuyaId].sort());
  });

  it("digivolves without an opt-out once declared, and cannot be declared without a card it can digivolve onto (Q4658)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: BLUE_TAMER, as: "blueTamer" },
          { card: RED_TAMER, as: "redTamer" },
        ],
        hand: [{ card: "BT17-012", as: "burning" }],
        deck: [INERT_RED_LV3, INERT_RED_LV3],
      },
    });
    s.state.memory = 5;
    await s.ready();

    for (const useAlternateCost of [true, false]) {
      expect(digivolveIntoBurningGreymon(s, "blueTamer", useAlternateCost)).not.toEqual({ ok: true });
    }
    expect(s.perm("blueTamer").topCard?.cardId).toBe(BLUE_TAMER);
    expect(s.state.memory).toBe(5);

    expect(digivolveIntoBurningGreymon(s, "redTamer", true)).toEqual({ ok: true });
    await settle(() => s.perm("redTamer").topCard?.cardId === "BT17-012");
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toEqual([]);
    expect(s.state.memory).toBe(2);
  });
});
