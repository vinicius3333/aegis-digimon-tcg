import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-011.js";
import "../index.js";

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
    });
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
  });

  it("deletes the Gallantmon cost before the player may decline the free play (Q3448)", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "EX4-011", as: "chaos" }],
          battleArea: [{ card: "BT2-020", as: "gallantmon", under: ["BT1-001"] }],
        },
      },
      { autoSelectCards: true },
    );
    const gallantmonId = s.perm("gallantmon").permanentId;
    const chaosId = s.inst("chaos").instanceId;
    await s.ready();

    const firing = advance(s.engine).fireForInstance(EffectTiming.EndOfYourTurn, s.inst("chaos"));
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
    await firing;

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === chaosId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX4-011")).toBe(false);
  });

  it("pays the Gallantmon deletion and plays itself from trash at end of turn (Q3447)", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "EX4-011", as: "chaos" }],
          battleArea: [{ card: "BT2-020", as: "gallantmon", under: ["BT1-001"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const gallantmonId = s.perm("gallantmon").permanentId;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.EndOfYourTurn, s.inst("chaos"));

    expect(s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== gallantmonId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX4-011")).toBe(true);
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

    await advance(s.engine).fireForInstance(EffectTiming.EndOfYourTurn, s.inst("chaos"));

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

  it("deletes one opposing Digimon at or below the base ceiling on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-011", as: "chaos" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 7000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("chaos"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("Q3449 floors the combined-trash bonus at each ten-card boundary", async () => {
    const below = setupEngine(
      {
        0: { trash: Array(9).fill("BT1-001"), battleArea: [{ card: "EX4-011", as: "chaos" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    await below.ready();
    await advance(below.engine).fireForPermanent(EffectTiming.OnPlay, below.perm("chaos"));
    expect(below.state.players[1]!.battleArea).toHaveLength(1);

    const atThreshold = setupEngine(
      {
        0: { trash: Array(10).fill("BT1-001"), battleArea: [{ card: "EX4-011", as: "chaos" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    await atThreshold.ready();
    await advance(atThreshold.engine).fireForPermanent(EffectTiming.OnPlay, atThreshold.perm("chaos"));
    await settle(() => atThreshold.state.players[1]!.battleArea.length === 0);

    expect(atThreshold.state.players[1]!.battleArea).toHaveLength(0);
  });
});
