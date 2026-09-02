import { compiledEffects, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { compiled } from "./EX12-073.js";
import "../index.js";

const CARD_ID = "EX12-073";

describe("EX12-073 Giant Meat", () => {
  it("maps every printed clause and keeps the Delay separate from the play body", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: {
        kind: "youHave",
        // CR 16-42-3 scopes ＜Use Req.＞ to Digimon and Tamers on the field.
        filter: {
          kind: ["Digimon", "Tamer"],
          nameOrTrait: [{ tokens: ["NSp", "DS", "NSo", "WG", "ME", "VB"], match: "trait" }],
        },
      },
    });
    expect(
      compiled.effects.find((effect) => effect.trigger === "Main" && effect.keywords === undefined)?.actions,
    ).toEqual([
      {
        kind: "RevealAdd",
        revealCount: 3,
        add: [
          {
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["NSp", "DS", "NSo", "WG", "ME", "VB"], match: "trait" }],
            },
            count: 1,
            to: "hand",
          },
        ],
        rest: "deckBottom",
      },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
    expect(
      compiled.effects.find(
        (effect) => effect.trigger === "Main" && effect.keywords?.some((keyword) => keyword.keyword === "Delay"),
      ),
    ).toMatchObject({
      actions: [{ kind: "GainMemory", amount: 2 }],
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "Security" && effect.isSecurity)).toMatchObject({
      actions: [{ kind: "PlaceInBattleAreaSelf" }],
    });
    expect(registeredCompiledCards.get(CARD_ID)).toEqual(compiled);
    expect(compiledEffects[CARD_ID]).toBeDefined();
    expect(compiledEffects[CARD_ID]).toEqual(compiled);
  });

  it("can be played when an [ME] trait Digimon is in the breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX12-008", as: "meInBreeding" },
          hand: [{ card: CARD_ID, as: "giantMeat" }],
          deck: ["EX12-038", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("giantMeat").instanceId;
    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: optionId });

    expect(result).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-038")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId).sort()).toEqual(["BT1-009", "BT1-010"]);
  });

  it("still requires a matching trait when the breeding area is empty", () => {
    const s = setupEngine({ 0: { hand: [{ card: CARD_ID, as: "giantMeat" }] } });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("giantMeat").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("returns all revealed cards to deck bottom when none has a listed trait", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX12-008", as: "meInBreeding" },
          hand: [{ card: CARD_ID, as: "option" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));

    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId).sort()).toEqual(["BT1-009", "BT1-010", "BT1-011"]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("trashes itself and gains 2 memory through Delay on a later turn", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX12-008", as: "meInBreeding" },
          hand: [{ card: CARD_ID, as: "option" }],
          deck: ["EX12-038", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    const optionPermanent = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === optionId,
    )!;
    optionPermanent.enterFieldTurnCount = s.state.turnCount - 1;
    s.state.memory = 2;
    await s.engine.recomputeContinuousEffects();

    const effects = observe(s.engine).activatableEffects(optionPermanent) as Array<{ effectKey: string }>;
    expect(effects).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: optionId, effectKey: effects[0]!.effectKey }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4 && s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
  });

  it("does not expose Delay during the turn it entered the battle area", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "option" }] } });
    s.perm("option").placedByEffect = true;
    s.perm("option").enterFieldTurnCount = s.state.turnCount;
    await s.ready();
    const optionId = s.perm("option").topCard!.instanceId;
    const effects = observe(s.engine).activatableEffects(s.perm("option")) as Array<{ effectKey: string }>;

    expect(effects).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
  });

  it("places itself in the battle area when revealed as Security", async () => {
    const s = setupEngine({ 0: { security: [{ card: CARD_ID, as: "option", faceUp: true }] } });
    const optionId = s.inst("option").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
  });

  // Mutation guard for the CR 16-42-3 kind gate on the ＜Use Req.＞ condition: EX12-072 is an
  // OPTION whose colors never satisfy this card's colour requirement, yet it carries the [ME]
  // trait and EX12 Options sit in the battle area. Remove `kind: ["Digimon", "Tamer"]` from the
  // youHave filter and this play is wrongly allowed.
  it("is not enabled by a resident Option carrying the Use Req. trait", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-072", as: "residentOption" }],
        hand: [{ card: CARD_ID, as: "useReqOption" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("useReqOption").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("matches the complete catalog identity", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Giant Meat",
      colors: ["White"],
      kinds: ["Option"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      types: ["NSp", "DS", "NSo", "WG", "ME", "VB"],
    });
  });
});
