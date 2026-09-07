import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT25-097 Guardian Palace", () => {
  it("with zero security waives color, places itself face up and continues to the reduced play (Q6457-Q6458)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-097", as: "palace" },
            { card: "BT25-034", as: "tsTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const palaceId = s.inst("palace").instanceId;
    const targetId = s.inst("tsTarget").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: palaceId, useAs: "option" } as never)).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === targetId));
    expect(s.state.players[0]!.security).toContainEqual(
      expect.objectContaining({ instanceId: palaceId, faceUp: true }),
    );
    // Pay 3 to use Guardian Palace, then 2 for Aegiomon (printed 5 - 3).
    expect(s.state.memory).toBe(5);
  });

  it("face-up Security grants Alliance only to yellow/purple TS and Scapegoat while Junomon exists (Q6463)", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT25-097", faceUp: true }],
        battleArea: [
          { card: "BT25-033", as: "eligible" },
          { card: "BT25-007", as: "wrongTrait" },
          { card: "BT25-044", as: "junomon", under: [{ card: "BT25-039" }] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Scapegoat")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("wrongTrait"), "Alliance")).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Scapegoat")).toBe(true);
  });

  it("Security plays exactly 1 level-4-or-lower yellow/purple TS from hand or trash for free", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-097", as: "checkedPalace", faceUp: true }],
          trash: [
            { card: "BT25-033", as: "eligible" },
            { card: "BT25-044", as: "levelSix" },
          ],
          hand: [{ card: "BT25-007", as: "wrongTrait" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("eligible").instanceId);
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("checkedPalace"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT25-033")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT25-044")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT25-007")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("allows declining the optional Security play", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-097", as: "checkedPalace", faceUp: true }],
          hand: [{ card: "BT25-033", as: "eligible" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();

    const resolving = advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("checkedPalace"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("eligible").instanceId)).toBe(true);
  });

  it("adds the bottom security card and places itself face up at the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-097", as: "palace" }],
          security: [{ card: "BT25-001" }, { card: "BT25-002", as: "bottomSecurity" }],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const palaceId = s.inst("palace").instanceId;
    const bottomSecurityId = s.inst("bottomSecurity").instanceId;
    type PlayCardIntentWithUseAs = Parameters<typeof s.engine.applyIntent>[1] & { useAs?: "digimon" | "option" };

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: palaceId,
        useAs: "option",
      } as PlayCardIntentWithUseAs),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === palaceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bottomSecurityId)).toBe(true);
    expect(s.state.players[0]!.security.find((card) => card.instanceId === palaceId)).toMatchObject({
      instanceId: palaceId,
      faceUp: true,
    });
  });

  it("publicly declines the reduced play after moving the bottom security card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-097", as: "palace" }, { card: "BT25-034", as: "candidate" }],
          security: [{ card: "BT25-001" }, { card: "BT25-002", as: "bottom" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("palace").instanceId, useAs: "option" } as never)).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: decision.decisionId, response: { kind: "optional", accept: false } })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bottom").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ instanceId: s.inst("palace").instanceId, faceUp: true });
  });

  it("does not waive color when a security card is already face up", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT25-097", as: "palace" }], security: [{ card: "BT25-095", faceUp: true }] } });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("palace").instanceId, useAs: "option" } as never)).toEqual(
      expect.objectContaining({ ok: false }),
    );
  });
});
