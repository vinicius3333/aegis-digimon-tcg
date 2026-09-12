import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-193.js";

const DECK = Array(20).fill("BT1-009");
const SECURITY = Array(20).fill("BT1-009");

describe("P-193 The Wicked God Emerges!", () => {
  it("gates Draw 2 and battle-area placement behind trashing a Composite or Wicked God card", () => {
    const main = runtimeCompiledCard("P-193")!.effects.find((effect) => effect.trigger === "Main")!;
    expect(main).toMatchObject({
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          cost: {
            kind: "trash",
            target: {
              count: 1,
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [{ tokens: ["Composite", "Wicked God"], match: "trait" }],
              },
            },
          },
          abortOnDecline: true,
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
    expect(main.actions[1]).toEqual({ kind: "PlaceInBattleAreaSelf" });
  });

  it("delays a Wicked God play behind deleting your Millenniummon and activates Main from Security", () => {
    const card = runtimeCompiledCard("P-193")!;
    expect(card.effects.find((effect) => effect.trigger === "EndOfAllTurns")).toMatchObject({
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          cost: {
            kind: "deleteOwn",
            target: { count: 1, filter: { nameOrTrait: [{ tokens: ["Millenniummon"], match: "nameExact" }] } },
          },
          target: {
            count: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Wicked God"], match: "trait" }],
            },
          },
        },
      ],
    });
    expect(card.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
  });

  it("draws two after paying the Composite/Wicked God hand cost and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-193", as: "option" }, { card: "BT19-065", as: "cost" }, "ST1-16"],
          battleArea: [{ card: "BT19-065", as: "color" }],
          deck: ["BT1-009", "BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    const costId = s.inst("cost").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === optionId));
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === costId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("activates its Main effect when revealed in Security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "P-193", as: "option" }],
          hand: [{ card: "BT19-065", as: "cost" }],
          deck: ["BT1-009", "BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle();
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("option").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("fires Delay at the natural End of All Turns, trashing itself and playing a Wicked God", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-065", as: "color" },
            { card: "BT18-019", as: "millenniummon" },
          ],
          hand: [{ card: "P-193", as: "option" }, { card: "BT19-065", as: "cost" }, "ST1-16"],
          trash: [{ card: "BT19-075", as: "wickedGod" }],
          deck: ["BT1-009", "BT1-028", "BT1-009", "BT1-028"],
          security: Array(20).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          hand: ["BT1-009"],
          deck: Array(20).fill("BT1-009"),
          security: Array(20).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    const costId = s.inst("cost").instanceId;
    const millenniummonId = s.inst("millenniummon").instanceId;
    const wickedGodId = s.inst("wickedGod").instanceId;
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(costId);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === wickedGodId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(optionId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(millenniummonId);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.instanceId)).toContain(wickedGodId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(wickedGodId);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps its source and Millenniummon when the natural Delay window is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-193", as: "option" },
            { card: "BT18-019", as: "millenniummon" },
          ],
          trash: [{ card: "BT19-075", as: "wickedGod" }],
          deck: DECK,
          security: SECURITY,
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], deck: DECK, security: SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    const millenniummonId = s.inst("millenniummon").instanceId;
    const wickedGodId = s.inst("wickedGod").instanceId;
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.instanceId)).toEqual(
      expect.arrayContaining([optionId, millenniummonId]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(wickedGodId);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
