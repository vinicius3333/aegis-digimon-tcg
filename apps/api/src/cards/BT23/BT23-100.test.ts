import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-100.js";

const CAFE = "BT23-100";
const CS_DIGIMON_LV3 = "BT22-008";
const CS_DIGIMON_LV3_ALT = "BT23-006";
const CS_DIGIMON_LV4 = "BT23-053";
const PLAIN_DIGIMON_LV3 = "BT1-009";
const CS_TAMER = "BT23-082";
const PLAIN_TAMER = "BT1-087";
const NEUTRAL = "BT1-020";

const DECK = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"];

const DELAY_KEY = `${CAFE}/ir-${EffectTiming.OnDeclaration}-0`;

describe("BT23-100 Hudie Net Café", () => {
  it("matches every catalog field and the complete compiled clause set", () => {
    expect(getCardDefinition(CAFE)).toMatchObject({
      cardId: CAFE,
      nameEn: "Hudie Net Café",
      colors: ["White"],
      kinds: ["Option"],
      playCost: 3,
      types: ["Hudie", "CS"],
    });
    expect(getCardDefinition(CAFE)?.effectText).toBe(
      "While you have a Digimon or Tamer with the [CS] trait on the field, you can ignore this card's color requirements.\n" +
        "[Main] ＜Draw 1＞ Then, place this card in the battle area.\n" +
        "[Main] ＜Delay＞ \n・You may play 1 Tamer card with the [CS] trait from your hand without paying the cost.",
    );
    expect(getCardDefinition(CAFE)?.securityEffectText).toBe(
      "[Security] You may play 1 level 3 Digimon card with the [CS] trait from your hand or trash without paying the cost. Then, place this card in the battle area.",
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(4);
  });

  it("waives its colour requirement while a [CS] Digimon or Tamer is in either field area", () => {
    const waive = compiled.effects.find((effect) => effect.trigger === "Static")?.actions?.[0] as any;
    expect(waive).toMatchObject({
      kind: "WaiveColorRequirement",
      target: { filter: { isSelfRef: true }, isSelf: true },
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon", "Tamer"],
          zone: ["battleArea", "breeding"],
          nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
        },
      },
    });
  });

  it("plays off-colour from hand while an off-colour [CS] Digimon holds the battle area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CS_DIGIMON_LV3, as: "csSource" }],
        hand: [{ card: CAFE, as: "option" }],
        deck: DECK,
      },
    });
    s.state.memory = 3;
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(false);
    expect(s.state.memory).toBe(0);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("plays off-colour from hand while the off-colour [CS] Digimon is only in breeding", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: CS_DIGIMON_LV3, as: "csInBreeding" },
        hand: [{ card: CAFE, as: "option" }],
        deck: DECK,
      },
    });
    s.state.memory = 3;
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("csInBreeding").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("accepts an off-colour [CS] Tamer as the waiver source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CS_TAMER, as: "csTamer" }],
        hand: [{ card: CAFE, as: "option" }],
        deck: DECK,
      },
    });
    s.state.memory = 3;
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("refuses the play when the only field Digimon has no [CS] trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: PLAIN_DIGIMON_LV3, as: "plain" }],
        hand: [{ card: CAFE, as: "option" }],
        deck: DECK,
      },
    });
    s.state.memory = 3;
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    await settle(() => false, 40);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([optionId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(3);
  });

  it("draws exactly the top deck card, then places itself as a battle-area permanent", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CS_DIGIMON_LV3, as: "csSource" }],
        hand: [{ card: CAFE, as: "option" }],
        deck: [{ card: NEUTRAL, as: "topOfDeck" }, ...DECK],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const drawnId = s.inst("topOfDeck").instanceId;
    const deckSize = s.state.players[0]!.deck.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId]);
    expect(s.state.players[0]!.deck).toHaveLength(deckSize - 1);
    const optionPermanent = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === optionId);
    expect(optionPermanent?.stack).toHaveLength(0);
    expect(s.state.memory).toBe(5 - 3);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("compiles the ＜Delay＞ bullet as an optional free Tamer play from hand", () => {
    const delay = compiled.effects.find(
      (effect) => effect.trigger === "Main" && effect.keywords?.some((keyword) => keyword.keyword === "Delay"),
    ) as any;
    expect(delay.actions).toHaveLength(1);
    expect(delay.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
        count: 1,
      },
      from: ["hand"],
      payCost: false,
      optional: true,
    });
  });

  it("cannot fire its ＜Delay＞ the turn it arrives, and on the next own turn trashes itself to free-play a [CS] Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CS_DIGIMON_LV3, as: "csSource" }],
          hand: [
            { card: CAFE, as: "option" },
            { card: CS_TAMER, as: "csTamer" },
            { card: PLAIN_TAMER, as: "plainTamer" },
            { card: NEUTRAL, as: "neutral" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const csTamerId = s.inst("csTamer").instanceId;
    const plainTamerId = s.inst("plainTamer").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId));
    const optionPermanent = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === optionId)!;

    const memoryAfterPlay = s.state.memory;
    expect(memoryAfterPlay).toBe(8 - 3);
    expect(observe(s.engine).activatableEffects(optionPermanent)).toEqual([]);
    s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: optionId, effectKey: DELAY_KEY });
    await settle(() => false, 60);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === csTamerId)).toBe(true);
    expect(s.state.memory).toBe(memoryAfterPlay);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const memoryBeforeDelay = s.state.memory;
    const offered = observe(s.engine).activatableEffects(s.perm("option"));
    expect(offered.map((entry) => entry.effectKey)).toContain(DELAY_KEY);
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: optionId, effectKey: DELAY_KEY }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === csTamerId));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === csTamerId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === plainTamerId)).toBe(true);
    expect(s.state.memory).toBe(memoryBeforeDelay);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("leaves the [CS] Tamer in hand when the controller declines the ＜Delay＞ bullet", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CS_DIGIMON_LV3, as: "csSource" }],
          hand: [
            { card: CAFE, as: "option" },
            { card: CS_TAMER, as: "csTamer" },
            { card: NEUTRAL, as: "neutral" },
          ],
          deck: DECK,
        },
        1: { deck: DECK, security: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const csTamerId = s.inst("csTamer").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId));

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: optionId, effectKey: DELAY_KEY }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === csTamerId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === csTamerId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("compiles the [Security] clause as an optional free level-3 [CS] play then a mandatory self-placement", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security") as any;
    expect(security.isSecurity).toBe(true);
    expect(security.actions).toHaveLength(2);
    expect(security.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          levels: [3],
          nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
        },
        count: 1,
      },
      from: ["hand", "trash"],
      payCost: false,
      optional: true,
    });
    expect(security.actions[1]).toMatchObject({ kind: "PlaceInBattleAreaSelf" });
    expect(security.actions[1].optional).toBeUndefined();
  });

  it("free-plays a level-3 [CS] Digimon from hand and places itself when the opponent checks it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: PLAIN_DIGIMON_LV3, as: "attacker" }],
          deck: DECK,
          security: ["BT1-010"],
        },
        1: {
          security: [{ card: CAFE, as: "option" }],
          hand: [
            { card: CS_DIGIMON_LV3, as: "csDigimon" },
            { card: NEUTRAL, as: "neutral" },
          ],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const csDigimonId = s.inst("csDigimon").instanceId;
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === optionId));

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === csDigimonId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([s.inst("neutral").instanceId]);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("takes the level-3 [CS] Digimon out of the trash when the hand has none", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: PLAIN_DIGIMON_LV3, as: "attacker" }],
          deck: DECK,
          security: ["BT1-010"],
        },
        1: {
          security: [{ card: CAFE, as: "option" }],
          trash: [{ card: CS_DIGIMON_LV3_ALT, as: "csInTrash" }],
          hand: [{ card: NEUTRAL, as: "neutral" }],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const csInTrashId = s.inst("csInTrash").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === optionId));

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === csInTrashId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === csInTrashId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === optionId)).toBe(true);
  });

  it("still places itself when the controller declines the optional free play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: PLAIN_DIGIMON_LV3, as: "attacker" }],
          deck: DECK,
          security: ["BT1-010"],
        },
        1: {
          security: [{ card: CAFE, as: "option" }],
          hand: [{ card: CS_DIGIMON_LV3, as: "csDigimon" }],
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const csDigimonId = s.inst("csDigimon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === optionId));

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === csDigimonId)).toBe(false);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([csDigimonId]);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === optionId)).toBe(true);
  });

  it("plays neither a level-4 [CS] Digimon nor a level-3 Digimon without the trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: PLAIN_DIGIMON_LV3, as: "attacker" }],
          deck: DECK,
          security: ["BT1-010"],
        },
        1: {
          security: [{ card: CAFE, as: "option" }],
          hand: [
            { card: CS_DIGIMON_LV4, as: "wrongLevel" },
            { card: PLAIN_DIGIMON_LV3, as: "wrongTrait" },
          ],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === optionId));

    expect(s.state.players[1]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("wrongLevel").instanceId, s.inst("wrongTrait").instanceId].sort(),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard?.instanceId).toBe(optionId);
  });
});
