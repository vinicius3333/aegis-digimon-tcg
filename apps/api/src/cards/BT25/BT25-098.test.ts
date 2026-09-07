import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT25-098.js";
import "../index.js";

describe("BT25-098 Cyber Engage", () => {
  it("maps every printed clause to full IR without residual behavior", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          actions: [expect.objectContaining({ kind: "WaiveColorRequirement" })],
        }),
        expect.objectContaining({
          trigger: "Main",
          actions: [expect.objectContaining({ kind: "RevealAdd", revealCount: 3 }), { kind: "PlaceInBattleAreaSelf" }],
        }),
        expect.objectContaining({
          trigger: "Main",
          keywords: [{ keyword: "Delay" }],
          actions: [expect.objectContaining({ kind: "PlayWithoutCost", payCost: true, reduceCostBy: 3 })],
        }),
        expect.objectContaining({
          trigger: "Security",
          isSecurity: true,
          actions: [{ kind: "PlaceInBattleAreaSelf" }],
        }),
      ]),
    );
  });

  it("reveals three, adds only an Appmon, trashes the rest, and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-098", as: "option" }],
          battleArea: [{ card: "BT25-089", as: "appmon" }],
          deck: ["BT1-001", { card: "BT25-061", as: "revealedAppmon" }, "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-098"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealedAppmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-001", "BT1-002"]),
    );
  });

  it("places itself and trashes all three revealed cards when no Appmon is revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-098", as: "option" }],
          battleArea: [{ card: "BT25-089", as: "appmon" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-098"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-001", "BT1-002", "BT1-003"]),
    );
  });

  it("requires an Appmon Digimon or Tamer on the field for Use Req.", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-097", as: "appmonOption" }],
        hand: [{ card: "BT25-098", as: "option" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("consumes Delay and pays printed Appmon cost reduced by exactly 3", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT25-098", as: "delay" }], hand: [{ card: "BT25-061", as: "target" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("delay").enterFieldTurnCount = s.state.turnCount - 1;
    s.state.memory = 10;
    await s.ready();
    const [entry] = JSON.parse(s.perm("delay").activatableEffectsJson) as { effectKey: string }[];
    expect(entry).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("delay").topCard.instanceId,
        effectKey: entry!.effectKey,
      }).ok,
    ).toBe(true);
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.cardId === "BT25-098") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-061"),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-061")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT25-098")).toBe(true);
    expect(s.state.memory).toBe(10);
  });

  it("applies the Delay reduction exactly to an Appmon Tamer's play cost", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT25-098", as: "delay" }], hand: [{ card: "BT25-089", as: "target" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("delay").enterFieldTurnCount = s.state.turnCount - 1;
    s.state.memory = 10;
    await s.ready();
    const [entry] = JSON.parse(s.perm("delay").activatableEffectsJson) as { effectKey: string }[];
    expect(entry).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("delay").topCard.instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-089"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-089")).toBe(true);
    expect(s.state.memory).toBe(9);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT25-098")).toBe(true);
  });

  it("does not allow both copies' card-playing Delays to resolve concurrently (Q6464)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-098", as: "first" },
            { card: "BT25-098", as: "second" },
          ],
          hand: [{ card: "BT25-089", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    s.perm("first").enterFieldTurnCount = s.state.turnCount - 1;
    s.perm("second").enterFieldTurnCount = s.state.turnCount - 1;
    s.state.memory = 10;
    await s.ready();
    const first = JSON.parse(s.perm("first").activatableEffectsJson)[0] as { effectKey: string };
    const second = JSON.parse(s.perm("second").activatableEffectsJson)[0] as { effectKey: string };
    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("first").topCard.instanceId,
      effectKey: first.effectKey,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards" || s.state.pendingDecision?.kind === "chooseTargets");
    expect(s.state.pendingDecision).toBeDefined();
    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("second").topCard.instanceId,
      effectKey: second.effectKey,
    })).toEqual({ ok: false, reason: "decision-pending" });
    const pending = s.state.pendingDecision!;
    const payload = JSON.parse(pending.payloadJson) as { candidateInstanceIds?: string[] };
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: pending.decisionId,
      response: { kind: pending.kind, instanceIds: payload.candidateInstanceIds?.slice(0, 1) ?? [] },
    } as never)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-089"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-089")).toBe(true);
  });

  it("cannot consume Delay on the turn it entered the battle area", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT25-098", as: "delay" }], hand: [{ card: "BT25-061", as: "target" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("delay").enterFieldTurnCount = s.state.turnCount;
    await s.ready();
    expect(s.perm("delay").activatableEffectsJson).toBe("");
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-098")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT25-061")).toBe(true);
  });

  it("does not play an opponent's Appmon for Delay", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-098", as: "delay" }] },
        1: { hand: [{ card: "BT25-061", as: "opponentAppmon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("delay").enterFieldTurnCount = s.state.turnCount - 1;
    await s.ready();
    const [entry] = JSON.parse(s.perm("delay").activatableEffectsJson) as { effectKey: string }[];
    expect(entry).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("delay").topCard.instanceId,
        effectKey: entry!.effectKey,
      }).ok,
    ).toBe(true);
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT25-098"));
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT25-061")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-061")).toBe(false);
  });

  it("places itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT25-098", as: "security", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-098")).toBe(true);
  });
});
