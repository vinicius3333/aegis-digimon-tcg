import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-049.js";
import "../index.js";

const CARD_ID = "EX10-049";

describe("EX10-049 SkullSatamon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "SkullSatamon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Undead", "Fallen Angel"],
      maxCountInDeck: 4,
    });
    const definition = getCardDefinition(CARD_ID)!;
    expect(definition.effectText).toContain("＜Blocker＞");
    expect(definition.effectText).toContain("add 2 to this effect's level maximum");
    expect(definition.inheritedEffectText).toContain("[When Attacking] [Once Per Turn]");
    expect(definition.securityEffectText ?? "").toBe("");
  });

  it("records the compiled contract: Blocker, the twin timings, and the inherited OPT", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [],
      keywords: [{ keyword: "Blocker" }],
    });
    for (const trigger of ["WhenDigivolving", "OnDeletion"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "TrashTopDeck",
            controller: "both",
            amount: 3,
            condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "lte", value: 10 },
          },
          {
            kind: "ConditionalBranch",
            condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "gte", value: 10 },
            ifTrue: [{ kind: "Delete", target: { count: 1, filter: { levelComparison: { op: "lte", value: 5 } } } }],
            ifFalse: [{ kind: "Delete", target: { count: 1, filter: { levelComparison: { op: "lte", value: 3 } } } }],
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "SecurityAttack", amount: 1 },
          duration: "forTheTurn",
          condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "gt", value: 10 },
        },
        {
          kind: "TrashTopDeck",
          controller: "both",
          amount: 2,
          condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "lte", value: 10 },
        },
      ],
    });
  });

  it("[When Digivolving] at a low trash count: mills 3 each, then deletes only a level 3 or lower", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-080", as: "bakemon" }],
          hand: [{ card: CARD_ID, as: "skull" }],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-020", "BT1-080"],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "lv3" },
            { card: "BT1-020", as: "lv5" },
          ],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-080"],
          trash: Array.from({ length: 6 }, () => "BT1-009"),
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const bakemonInstanceId = s.perm("bakemon").topCard!.instanceId;
    const lv3Id = s.perm("lv3").permanentId;
    const lv5Id = s.perm("lv5").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bakemon").permanentId,
        instanceId: s.inst("skull").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle(() => false, 30);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-080"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-080"]);
    expect(s.state.players[1]!.trash).toHaveLength(10);

    const survivors = s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId);
    expect(survivors).toEqual([lv5Id]);
    expect(survivors).not.toContain(lv3Id);

    const skull = s.perm("bakemon");
    expect(skull.topCard!.cardId).toBe(CARD_ID);
    expect(skull.stack.map((card) => card.instanceId)).toEqual([bakemonInstanceId]);
    expect(observe(s.engine).hasKeyword(skull, "Blocker")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("re-reads the trash after the mill (§15-6-2): 8 + 3 milled reaches 10 and raises the maximum to 5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-080", as: "bakemon" }],
          hand: [{ card: CARD_ID, as: "skull" }],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-020"],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "lv5" }],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-080"],
          trash: Array.from({ length: 8 }, () => "BT1-009"),
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const lv5Id = s.perm("lv5").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bakemon").permanentId,
        instanceId: s.inst("skull").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle(() => false, 30);

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-080"]);
    expect(s.state.players[1]!.trash).toHaveLength(12);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lv5Id);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5395: above 10 the mill is skipped, but the 'then' delete still runs at the raised maximum", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-080", as: "bakemon" }],
          hand: [{ card: CARD_ID, as: "skull" }],
          deck: ["BT1-009", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "lv5" },
            { card: "BT1-080", as: "lv6" },
          ],
          deck: ["BT1-009", "BT1-013", "BT1-014"],
          trash: Array.from({ length: 11 }, () => "BT1-009"),
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const lv5Id = s.perm("lv5").permanentId;
    const lv6Id = s.perm("lv6").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bakemon").permanentId,
        instanceId: s.inst("skull").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle(() => false, 30);

    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-013", "BT1-014"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-013", "BT1-014"]);
    expect(s.state.players[1]!.trash).toHaveLength(12);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([lv6Id]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lv5Id);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("no legal target: the delete is a silent no-op and leaves no pending decision", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-080", as: "bakemon" }],
          hand: [{ card: CARD_ID, as: "skull" }],
          deck: ["BT1-009", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "lv6" }],
          deck: ["BT1-009", "BT1-013", "BT1-014"],
          trash: Array.from({ length: 11 }, () => "BT1-009"),
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bakemon").permanentId,
        instanceId: s.inst("skull").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("bakemon").topCard?.cardId === CARD_ID);
    await settle(() => false, 40);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(11);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("＜Blocker＞ into a bigger attacker: the block redirects the attack and [On Deletion] fires", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "skull" }],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-020"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-014", as: "attacker", dp: 20_000 },
            { card: "BT1-013", as: "lv3" },
          ],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-020"],
          trash: Array.from({ length: 6 }, () => "BT1-009"),
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const lv3Id = s.perm("lv3").permanentId;
    const skullId = s.perm("skull").permanentId;

    expect(observe(s.engine).hasKeyword(s.perm("skull"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: skullId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    await settle(() => false, 40);

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-020"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-020"]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lv3Id);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(10);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("Q5132 inherited: at 10 or fewer the mill REPLACES ＜Security A. +1＞, so only 1 card is checked", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-013", as: "host", dp: 20_000, under: [{ card: CARD_ID }] }],
        deck: ["BT1-009", "BT1-013", "BT1-014"],
      },
      1: {
        deck: ["BT1-009", "BT1-013", "BT1-014"],
        security: ["BT1-009", "BT1-013"],
        trash: Array.from({ length: 10 }, () => "BT1-009"),
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await settle(() => false, 40);

    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("Q5132 inherited: above 10 the standard processing stands, granting ＜Security A. +1＞ for 2 checks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-013", as: "host", dp: 20_000, under: [{ card: CARD_ID }] }],
        deck: ["BT1-009", "BT1-013", "BT1-014"],
      },
      1: {
        deck: ["BT1-009", "BT1-013", "BT1-014"],
        security: ["BT1-009", "BT1-013"],
        trash: Array.from({ length: 11 }, () => "BT1-009"),
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    await settle(() => false, 40);

    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-013", "BT1-014"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-013", "BT1-014"]);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("inherited [Once Per Turn]: one grant per turn on the same carrier, reset on the next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-013", as: "host", dp: 20_000, under: [{ card: CARD_ID }] }],
        deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-020", "BT1-080", "BT1-009", "BT1-013", "BT1-014"],
        hand: ["BT1-009"],
        security: ["BT1-009", "BT1-013", "BT1-014"],
      },
      1: {
        battleArea: [{ card: "BT1-014", as: "theirs", dp: 20_000 }],
        deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-020", "BT1-080", "BT1-009", "BT1-013", "BT1-014"],
        hand: ["BT1-009"],
        security: Array.from({ length: 7 }, () => "BT1-009"),
        trash: Array.from({ length: 12 }, () => "BT1-009"),
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const attack = async (remainingSecurity: number): Promise<void> => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === remainingSecurity);
      await settle(() => false, 30);
    };

    const myDeckBefore = s.state.players[0]!.deck.length;
    await attack(5);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(myDeckBefore);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    await attack(3);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(myDeckBefore);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    await attack(1);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
