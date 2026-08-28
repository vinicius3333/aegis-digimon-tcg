import { compiledEffects, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { compiled } from "./EX12-072.js";
import "../index.js";

const CARD_ID = "EX12-072";

describe("EX12-072 Metal Empire", () => {
  it("maps Use Req, face-up security Guard, bottom exchange, and Security play", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["ME"], match: "trait" }] } },
    });
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns" && effect.isSecurity)).toMatchObject({
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["ME"], match: "trait" }] }, count: "all" },
          keyword: { keyword: "Guard" },
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "Main")?.actions).toEqual([
      { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: false },
      {
        kind: "SecurityManipulation",
        op: "placeAsSecurity",
        controller: "mine",
        toTop: false,
        faceUp: true,
      },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "Security" && effect.isSecurity)).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: { filter: { playCostLte: 5 } },
        },
      ],
    });
    expect(registeredCompiledCards.get(CARD_ID)).toEqual(compiled);
    expect(compiledEffects[CARD_ID]).toEqual(compiled);
  });

  it("grants Guard only to your ME Digimon while Metal Empire is face-up in security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX12-008", as: "me" },
          { card: "EX12-005", as: "other" },
        ],
        security: [{ card: CARD_ID, as: "metal", faceUp: true }],
      },
      1: { battleArea: [{ card: "EX12-008", as: "opposingMe" }] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("me"), "Guard")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Guard")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("opposingMe"), "Guard")).toBe(false);
  });

  it("does not grant Guard while the security card is face-down", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-008", as: "me" }],
        security: [{ card: CARD_ID, as: "metal", faceUp: false }],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("me"), "Guard")).toBe(false);
  });

  it("returns the bottom security card and places itself face-up at the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-008", as: "me" }],
          hand: [{ card: CARD_ID, as: "option" }],
          security: ["BT1-101", "BT1-102"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const optionInstanceId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionInstanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.at(-1)?.instanceId === optionInstanceId);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-102")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ cardId: CARD_ID, faceUp: true });
  });

  it("places itself when the controller has no security cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-008", as: "me" }],
          hand: [{ card: CARD_ID, as: "option" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const optionInstanceId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionInstanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.at(-1)?.instanceId === optionInstanceId);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ cardId: CARD_ID, faceUp: true });
  });

  it("enforces Use Requirement when no ME card is present", async () => {
    const s = setupEngine({ 0: { hand: [{ card: CARD_ID, as: "option" }] } });
    s.state.memory = 2;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual(
      expect.objectContaining({ ok: false }),
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("option").instanceId);
  });

  it("plays a cost-5-or-lower ME card from hand when its Security effect resolves", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX12-008", as: "target" },
            { card: "EX12-016", as: "tooExpensive" },
          ],
          security: [{ card: CARD_ID, as: "security", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("target").instanceId),
    );

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("target").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tooExpensive").instanceId)).toBe(true);
  });

  // EX12-073 Giant Meat carries the [ME] trait but is an Option, and Options are USED, never
  // played — so a "play 1 [ME] trait card" effect cannot reach it. The trash target here is
  // the cheapest [ME] Digimon instead.
  it("also plays a qualifying ME card from the trash", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "EX12-010", as: "trashTarget" }],
          security: [{ card: CARD_ID, as: "security", faceUp: true }],
          deck: ["EX12-008", "EX12-008", "EX12-008"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-010"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-010")).toBe(true);
  });

  it("activates its Security effect when checked while already face-up", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-008", as: "attacker" }] },
        1: {
          hand: [{ card: "EX12-008", as: "target" }],
          security: [{ card: CARD_ID, as: "security", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX12-008"));

    expect(
      s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("target").instanceId),
    ).toBe(true);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("security").instanceId);
  });

  it("matches the complete catalog identity", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Metal Empire",
      colors: ["Black"],
      kinds: ["Option"],
      playCost: 2,
      dp: 0,
      evoCosts: [],
      types: ["ME"],
    });
  });
});
