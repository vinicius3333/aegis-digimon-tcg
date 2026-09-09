import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./EX4-011.js";
import "../index.js";

async function playChaosFromHand(s: ReturnType<typeof setupEngine>): Promise<void> {
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toEqual({ ok: true });
  await settle(
    () =>
      s.state.pendingDecision === undefined &&
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("chaos").instanceId),
  );
}

describe("EX4-011 ChaosGallantmon", () => {
  it("has the official identity and cost-gates the optional play from trash", () => {
    expect(getCardDefinition("EX4-011")).toMatchObject({
      cardId: "EX4-011",
      nameEn: "ChaosGallantmon",
      colors: ["Red", "Purple"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Red", level: 5, memoryCost: 4 },
        { color: "Purple", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Dark Knight"],
      effectText:
        "Digivolve: 3 from Lv.5 w/[WarGrowlmon] in name[Trash][End of Your Turn] By deleting 1 of your Digimon with digivolution cards and [Gallantmon] in its name, you may play this card without paying the cost. [On Play] Delete 1 of your opponent's Digimon with 7000 DP or less. For every 10 total cards in both players' trashes, add 2000 to the maximum this DP-based deletion effect can delete.",
    });
    expect(digivolutionRequirementsFor("EX4-011")).toContainEqual({
      level: 5,
      names: ["WarGrowlmon"],
      cost: 3,
      isAlternate: true,
    });
    expect(runtimeCompiledCard("EX4-011")).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      isFromTrash: true,
      actions: [
        {
          kind: "CostGatedBlock",
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                digivolutionCards: "hasAny",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ match: "name", tokens: ["Gallantmon"] }],
              },
            },
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              payCost: false,
              optional: true,
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            },
          ],
        },
      ],
    });
  });

  it.each([
    ["red level 5", "EX4-009", false, 0],
    ["purple level 5", "EX4-056", false, 0],
    ["WarGrowlmon in name", "EX4-010", true, 1],
  ])("digivolves through the printed %s route", async (_route, baseCard, useAlternateCost, expectedMemory) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "EX4-011", as: "chaos" }],
        deck: [{ card: "BT1-011", as: "digivolutionDraw" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chaos").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-011");

    expect(s.state.memory).toBe(expectedMemory);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual([baseCard]);
    expect(s.perm("base").topCard.cardId).toBe("EX4-011");
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("chaos").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("digivolutionDraw").instanceId,
    );
  });

  it("rejects the explicit WarGrowlmon alternate route from a non-WarGrowlmon level 5", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX4-009", as: "base" }],
        hand: [{ card: "EX4-011", as: "chaos" }],
        deck: [{ card: "BT1-011", as: "digivolutionDraw" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chaos").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(4);
    expect(s.perm("base").topCard.cardId).toBe("EX4-009");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("chaos").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(
      s.inst("digivolutionDraw").instanceId,
    );
  });

  it("deletes the Gallantmon cost before the player may decline the free play (Q3448)", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "EX4-011", as: "chaos" }],
          battleArea: [{ card: "BT2-020", as: "gallantmon", under: ["EX4-010"] }],
        },
      },
      { autoSelectCards: true },
    );
    const gallantmonId = s.perm("gallantmon").permanentId;
    const chaosId = s.inst("chaos").instanceId;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const activate = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: activate.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== gallantmonId) &&
        s.state.pendingDecision?.kind === "optional",
    );

    const play = s.state.pendingDecision!;
    expect(play.decisionId).not.toBe(activate.decisionId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: play.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await turn;

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === chaosId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX4-011")).toBe(false);
  });

  it("pays the Gallantmon deletion and plays itself from trash at end of turn (Q3447)", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "EX4-011", as: "chaos" }],
          battleArea: [{ card: "BT2-020", as: "gallantmon", under: ["EX4-010"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const gallantmonId = s.perm("gallantmon").permanentId;
    const chaosId = s.inst("chaos").instanceId;
    await s.ready();

    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== gallantmonId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === chaosId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === chaosId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX4-010")).toBe(true);
  });

  it("cannot pay the trash effect with a Gallantmon that has no digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "EX4-011", as: "chaos" }],
          battleArea: [{ card: "BT2-020", as: "gallantmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const chaosId = s.inst("chaos").instanceId;
    await s.ready();

    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === chaosId)).toBe(true);
  });
  it("uses a combined-trash DP ceiling starting at 7000 and adding 2000 per ten cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      dpCeiling: 7000,
      dpCeilingScaling: { per: 10, amount: 2000, unit: "cards", filter: { zone: "trash", controllerDefault: "both" } },
    });
  });

  it("deletes exactly one opposing Digimon at the base ceiling through public play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX4-011", as: "chaos" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target", dp: 7000 },
            { card: "BT1-009", as: "above", dp: 8000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    const targetId = s.perm("target").permanentId;
    const aboveId = s.perm("above").permanentId;
    await s.ready();

    await playChaosFromHand(s);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === aboveId)).toBe(true);
  });

  it("Q3449 floors the combined-trash bonus at each ten-card boundary", async () => {
    const below = setupEngine(
      {
        0: { trash: Array(9).fill("BT1-009"), hand: [{ card: "EX4-011", as: "chaos" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    below.state.memory = 12;
    await below.ready();
    await playChaosFromHand(below);
    expect(below.state.players[1]!.battleArea).toHaveLength(1);

    const atThreshold = setupEngine(
      {
        0: { trash: Array(10).fill("BT1-009"), hand: [{ card: "EX4-011", as: "chaos" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    atThreshold.state.memory = 12;
    await atThreshold.ready();
    await playChaosFromHand(atThreshold);
    await settle(() => atThreshold.state.players[1]!.battleArea.length === 0);

    expect(atThreshold.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("Q3449 combines both trashes (15 + 9 = 24) for an 11000-DP ceiling", async () => {
    const s = setupEngine(
      {
        0: { trash: Array(15).fill("BT1-009"), hand: [{ card: "EX4-011", as: "chaos" }] },
        1: {
          trash: Array(9).fill("BT1-010"),
          battleArea: [{ card: "BT1-009", as: "target", dp: 11000 }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    await playChaosFromHand(s);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });
});
