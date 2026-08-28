import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_098 } from "./BT24-098.js";
import "../index.js";

function delayEffectKey(s: ReturnType<typeof setupEngine>): string {
  const optionCard = s.perm("option").topCard;
  const source = (s.engine as unknown as { cardSourceOf(card: typeof optionCard): CardSource }).cardSourceOf(
    optionCard,
  );
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT24-098/"))!
    .effectKey;
}

describe("BT24-098 Invasion of the Titans", () => {
  it("draws and trashes on Main, then arms and consumes Delay correctly", () => {
    const main = BT24_098.effects?.find((entry) => entry.trigger === "Main" && entry.keywords === undefined);
    expect(main?.actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 2 },
      { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 2 } },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
    const arm = BT24_098.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(arm?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Titan"], match: "trait" }] },
    });
    const armAction = arm?.actions?.[0] as { actions?: unknown[] } | undefined;
    expect(armAction?.actions?.[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Delay" },
    });
    const delay = BT24_098.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Delay"));
    expect(delay?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      requiresDelayArmed: true,
      from: ["trash"],
      payCost: false,
      condition: { kind: "memoryAtLeast", value: 5, controller: "opponent" },
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          levelComparison: { op: "lte", value: 5 },
          nameOrTrait: [{ tokens: ["Titan"], match: "trait" }],
        },
        count: 1,
      },
    });
    expect(BT24_098.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
              nameOrTrait: [{ tokens: ["Titan"], match: "trait" }],
            },
            count: 1,
          },
        },
        { kind: "AddToHandSelf" },
      ],
    });
  });

  it("draws two, trashes exactly two hand cards, and places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-042", as: "purpleTitan" }],
          hand: [
            { card: "BT24-098", as: "option" },
            { card: "BT1-009", as: "discard1" },
            { card: "BT1-009", as: "discard2" },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT24-098"));
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("plays only a level-4-or-lower Titan from hand/trash, then adds itself to hand", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT24-098", as: "securityOption", faceUp: true }],
          hand: [{ card: "BT24-042", as: "eligibleTitan" }],
          trash: ["BT24-075"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT24-042")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT24-075")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT24-098")).toBe(true);
  });

  it("arms on a Titan play and uses Delay to play a level 5 Titan while the opponent has 5 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-098", as: "option" },
            { card: "BT24-042", as: "playedTitan" },
          ],
          trash: [{ card: "BT24-075", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -5;
    await s.ready();
    s.perm("option").enterFieldTurnCount = s.state.turnCount - 1;

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("playedTitan").permanentId,
    });
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("option").instanceId,
        effectKey: delayEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("target").instanceId),
    );

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
  });

  it("may pay Delay but plays nothing if the opponent no longer has 5 memory at resolution (Q5710)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-098", as: "option" },
            { card: "BT24-042", as: "playedTitan" },
          ],
          trash: [{ card: "BT24-075", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -5;
    await s.ready();
    s.perm("option").enterFieldTurnCount = s.state.turnCount - 1;
    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("playedTitan").permanentId,
    });
    s.state.memory = -1;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("option").instanceId,
        effectKey: delayEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("option").instanceId, s.inst("target").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-075")).toBe(false);
  });
});
