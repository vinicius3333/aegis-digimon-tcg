import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-102.js";

describe("BT12-102 compiled IR module", () => {
  it("registers its Main, reduction, and Security clauses through the declarative record", () => {
    const module = getEffectModule("BT12-102");
    expect(module?.cardId).toBe("BT12-102");
    const source = {
      instanceId: "source-102",
      cardId: "BT12-102",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.BeforePayCost, source)).toHaveLength(1);
  });

  it("keeps the compiled reduction and Security clauses aligned with the catalog", async () => {
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter/compiledCards.js");
    const card = runtimeCompiledCard("BT12-102")!;
    expect(card.coverage).toBe("full");
    expect(card.residual).toEqual([]);
    expect(card.effects.find((effect) => effect.trigger === "BeforePayCost")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      mode: "reduceCost",
      amount: 3,
    });
    expect(card.effects.find((effect) => effect.trigger === "Security")).toBeDefined();
  });
});

it("resolves the printed Security activation", async () => {
  const s = setupEngine(
    {
      0: { security: [{ card: "BT12-102", as: "option", faceUp: true }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
  await settle(() => s.state.players[1]!.battleArea.length === 0);
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
  expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toContain("BT1-009");
});

it("returns an opposing Digimon to its owner's deck", async () => {
  const s = setupEngine(
    {
      0: { hand: [{ card: "BT12-102", as: "option" }], battleArea: [{ card: "BT1-029", as: "blue" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }], security: ["BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 9;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.battleArea.length === 0);
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
  expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toContain("BT1-009");
});

it("reduces its play cost by 3 by placing one blue Digimon under another", async () => {
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "BT12-102", as: "option" }],
        battleArea: [
          { card: "BT1-029", as: "moved", under: [{ card: "BT1-009", as: "moved-source" }] },
          { card: "BT1-029", as: "destination" },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  const movedPermanentId = s.perm("moved").permanentId;
  const movedSourceId = s.inst("moved-source").instanceId;
  s.state.memory = 6;

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-029" && p.stack.length > 1));

  expect(s.state.memory).toBe(0);
  expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === movedPermanentId)).toBe(false);
  expect(s.perm("destination").stack.map(({ cardId }) => cardId)).toEqual(["BT1-029"]);
  expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(movedSourceId);
});

it("binds the selected source before choosing a distinct destination", async () => {
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "BT12-102", as: "option" }],
        battleArea: [
          { card: "BT1-029", as: "firstSource" },
          { card: "BT1-029", as: "secondSource" },
          { card: "BT1-029", as: "destination" },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    },
    { autoAcceptOptional: true },
  );
  await s.ready();
  const selectedSourcePermanentId = s.perm("secondSource").permanentId;
  s.state.memory = 9;

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.decisions.some(({ req }) => req.sourceCardId === "BT12-102" && req.kind === "chooseTargets"));

  const sourceDecision = s.decisions.find(
    ({ req }) => req.sourceCardId === "BT12-102" && req.kind === "chooseTargets",
  )!.req;
  expect(sourceDecision.options?.candidateInstanceIds).toEqual([
    s.perm("firstSource").permanentId,
    s.perm("secondSource").permanentId,
    s.perm("destination").permanentId,
  ]);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: sourceDecision.decisionId,
      response: { kind: "chooseTargets", instanceIds: [selectedSourcePermanentId] },
    }),
  ).toEqual({ ok: true });
  await settle(() =>
    s.decisions.some(
      ({ req }) =>
        req.sourceCardId === "BT12-102" &&
        req.kind === "chooseTargets" &&
        req.options?.candidateInstanceIds?.length === 2,
    ),
  );

  const destinationDecision = s.decisions.find(
    ({ req }) =>
      req.sourceCardId === "BT12-102" &&
      req.kind === "chooseTargets" &&
      req.options?.candidateInstanceIds?.length === 2,
  )!.req;
  expect(destinationDecision.options?.candidateInstanceIds).toEqual([
    s.perm("firstSource").permanentId,
    s.perm("destination").permanentId,
  ]);
  expect(destinationDecision.options?.candidateInstanceIds).not.toContain(s.perm("secondSource").permanentId);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: destinationDecision.decisionId,
      response: { kind: "chooseTargets", instanceIds: [s.perm("destination").permanentId] },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.hand.every(({ cardId }) => cardId !== "BT12-102"));
  expect(s.state.memory).toBe(3);
  expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === selectedSourcePermanentId)).toBe(false);
});

it("does not offer the reduction when no distinct blue destination exists", async () => {
  const s = setupEngine(
    {
      0: { hand: [{ card: "BT12-102", as: "option" }], battleArea: [{ card: "BT1-029", as: "onlyBlue" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 9;

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.hand.every(({ cardId }) => cardId !== "BT12-102"));

  expect(s.perm("onlyBlue").stack).toHaveLength(0);
  expect(s.state.memory).toBe(0);
  expect(s.decisions.some(({ req }) => req.sourceCardId === "BT12-102" && req.kind === "optional")).toBe(false);
});
