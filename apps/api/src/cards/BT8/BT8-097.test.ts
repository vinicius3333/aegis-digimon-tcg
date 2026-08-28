import { EffectTiming, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../ST7/ST7-06.js";
import { compiled } from "./BT8-097.js";

describe("BT8-097 Crimson Blaze", () => {
  it("keeps the zero-floored reduction and errata order in executable IR", () => {
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        { trigger: "Static", actions: [{ kind: "Replacement", event: "wouldBePlayed", mode: "reduceCost", amount: 1, scaling: { unit: "cards" } }] },
        {
          trigger: "Main",
          actions: [
            { kind: "RestrictPlay", seat: "opponent", mode: "play", byEffectOnly: true, duration: "untilOpponentTurnEnd" },
            { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } }, count: "all" } },
          ],
        },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
      ],
    });
  });

  it("reduces its use cost by each opposing Digimon and never below zero", async () => {
    const opponents = Array.from({ length: 7 }, (_, index) => ({
      card: "BT1-009",
      as: `opponent${index}`,
      dp: 7_000,
    }));
    const s = setupEngine({
      0: {
        battleArea: ["BT8-007"],
        hand: [{ card: "BT8-097", as: "option" }],
      },
      1: { battleArea: opponents },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.cardId === "BT8-097") && s.state.pendingDecision === undefined,
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(7);
    assertNoLoudGap(s);
  });

  it("deletes every opposing Digimon at 6000 DP or less and preserves 6001 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT8-007"],
        hand: [{ card: "BT8-097", as: "option" }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "below", dp: 5_999 },
          { card: "BT1-029", as: "exact", dp: 6_000 },
          { card: "BT8-023", as: "above", dp: 6_001 },
        ],
      },
    });
    s.state.memory = 3;
    const belowId = s.perm("below").permanentId;
    const exactId = s.perm("exact").permanentId;
    const aboveId = s.perm("above").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === belowId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === exactId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === aboveId)).toBe(true);
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards" || req.kind === "chooseTargets")).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("prevents the opponent's Security effect from playing a Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT8-007"],
        hand: [{ card: "BT8-097", as: "option" }],
      },
      1: {
        battleArea: [{ card: "BT8-023", dp: 7_000 }],
        security: [{ card: "ST7-06", as: "securityDigimon", faceUp: true }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.cardId === "BT8-097") && s.state.pendingDecision === undefined,
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityDigimon"));

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "ST7-06")).toBe(false);
    assertNoLoudGap(s);
  });

  it("does not prevent the opponent from normally playing a Digimon from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT8-007"],
          hand: [{ card: "BT8-097", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT8-023", dp: 7_000 }],
          hand: [{ card: "ST7-06", as: "handDigimon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT8-097"));

    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    s.state.memory = 7;
    expect(
      s.engine.applyIntent(1, {
        type: "playCard",
        instanceId: s.inst("handDigimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "ST7-06"));

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "ST7-06")).toBe(true);
    assertNoLoudGap(s);
  });
});
