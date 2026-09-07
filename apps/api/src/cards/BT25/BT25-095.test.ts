import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT25-095 Paradise Colosseum", () => {
  it("with zero security waives color, places itself face up, and continues to the reduced play (Q6450-Q6451)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-095", as: "colosseum" },
            { card: "BT25-008", as: "coronamon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("colosseum").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("coronamon").instanceId),
    );
    expect(s.state.players[0]!.security).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("colosseum").instanceId, faceUp: true }),
    );
    expect(s.state.memory).toBe(7);
  });

  it("takes only the bottom security card, then puts itself face up at the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-095", as: "colosseum" }],
          security: [
            { card: "BT25-001", as: "top" },
            { card: "BT25-002", as: "bottom" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const colosseumId = s.inst("colosseum").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: colosseumId, useAs: "option" } as never)).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((c) => c.instanceId === colosseumId));
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("bottom").instanceId);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).not.toContain(s.inst("top").instanceId);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ instanceId: colosseumId, faceUp: true });
  });

  it("publicly declines the reduced play after moving the bottom security card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-095", as: "colosseum" },
            { card: "BT25-008", as: "candidate" },
          ],
          security: [
            { card: "BT25-001", as: "top" },
            { card: "BT25-002", as: "bottom" },
          ],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("colosseum").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bottom").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({
      instanceId: s.inst("colosseum").instanceId,
      faceUp: true,
    });
  });

  it("does not waive its red/green use requirement while any security card is face up", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT25-095", as: "colosseum" }], security: [{ card: "BT25-099", faceUp: true }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("colosseum").instanceId,
        useAs: "option",
      } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("face-up Security gives +2000 DP only to own red/green TS and Rush with Marsmon", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT25-095", faceUp: true }],
        battleArea: [
          { card: "BT25-011", as: "target" },
          { card: "BT25-020", as: "marsmon" },
          { card: "BT25-007", as: "wrong" },
        ],
      },
      1: { battleArea: [{ card: "BT25-010", as: "opponent" }] },
    });
    await s.ready();
    expect(s.perm("target").currentDP).toBe(getCardDefinition("BT25-011")!.dp + 2000);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Rush")).toBe(true);
    expect(s.perm("wrong").currentDP).toBe(getCardDefinition("BT25-007")!.dp);
    expect(s.perm("opponent").currentDP).toBe(getCardDefinition("BT25-010")!.dp);
  });

  it("applies the DP bonus on either turn but not conditional Rush without Marsmon/Callismon", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT25-095", faceUp: true }], battleArea: [{ card: "BT25-011", as: "target" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("target").currentDP).toBe(getCardDefinition("BT25-011")!.dp + 2000);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Rush")).toBe(false);
  });

  it("Security plays an eligible level 4 TS from trash free and excludes wrong trait and level", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-095", faceUp: true, as: "colosseum" }],
          trash: [
            { card: "BT25-011", as: "eligible" },
            { card: "BT25-007", as: "wrong" },
            { card: "BT25-015", as: "tooHigh" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("colosseum"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("eligible").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(s.inst("wrong").instanceId);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(s.inst("tooHigh").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("allows declining the optional Security play", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-095", faceUp: true, as: "colosseum" }],
          trash: [{ card: "BT25-011", as: "eligible" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();
    const resolving = advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("colosseum"));
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
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(s.inst("eligible").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
