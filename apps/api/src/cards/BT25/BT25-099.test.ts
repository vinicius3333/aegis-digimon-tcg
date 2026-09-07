import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT25-099 Gear Forest Village", () => {
  it("with zero security waives color, places itself face up, and continues to the reduced play (Q6465-Q6466)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-099", as: "village" },
            { card: "BT25-047", as: "floramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("village").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("floramon").instanceId),
    );
    expect(s.state.players[0]!.security).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("village").instanceId, faceUp: true }),
    );
    expect(s.state.memory).toBe(7);
  });

  it("takes only the bottom security card, then puts itself face up at the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-099", as: "village" }],
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
    const villageId = s.inst("village").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: villageId, useAs: "option" } as never)).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((c) => c.instanceId === villageId));
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("bottom").instanceId);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).not.toContain(s.inst("top").instanceId);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({
      instanceId: villageId,
      faceUp: true,
    });
  });

  it("publicly declines the reduced play after moving the bottom security card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-099", as: "village" },
            { card: "BT25-050", as: "candidate" },
          ],
          security: [{ card: "BT25-001" }, { card: "BT25-002", as: "bottom" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("village").instanceId, useAs: "option" } as never),
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
      instanceId: s.inst("village").instanceId,
      faceUp: true,
    });
  });

  it("does not waive its green/black use requirement while any security card is face up", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT25-099", as: "village" }],
        security: [{ card: "BT25-095", faceUp: true }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("village").instanceId,
        useAs: "option",
      } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("face-up Security grants Alliance only to own green/black TS and Piercing with Bacchusmon", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT25-099", faceUp: true }],
        battleArea: [
          { card: "BT25-050", as: "target" },
          { card: "BT25-077", as: "bacchus" },
          { card: "BT25-007", as: "wrong" },
        ],
      },
      1: { battleArea: [{ card: "BT25-068", as: "opponent" }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("target"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("wrong"), "Alliance")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("opponent"), "Alliance")).toBe(false);
  });

  it("does not grant conditional Piercing without the named Digimon or either keyword on the opponent's turn", async () => {
    const ownTurn = setupEngine({
      0: { security: [{ card: "BT25-099", faceUp: true }], battleArea: [{ card: "BT25-050", as: "target" }] },
    });
    await ownTurn.ready();
    expect(observe(ownTurn.engine).hasKeyword(ownTurn.perm("target"), "Alliance")).toBe(true);
    expect(observe(ownTurn.engine).hasPierce(ownTurn.perm("target"))).toBe(false);

    const opposingTurn = setupEngine({
      0: {
        security: [{ card: "BT25-099", faceUp: true }],
        battleArea: [{ card: "BT25-050", as: "target" }, { card: "BT25-059" }],
      },
    });
    opposingTurn.state.turnSeat = 1;
    await opposingTurn.ready();
    expect(observe(opposingTurn.engine).hasKeyword(opposingTurn.perm("target"), "Alliance")).toBe(false);
    expect(observe(opposingTurn.engine).hasPierce(opposingTurn.perm("target"))).toBe(false);
  });

  it("Security plays an eligible level 4 TS from trash free and excludes wrong trait and level", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-099", faceUp: true, as: "village" }],
          trash: [
            { card: "BT25-050", as: "eligible" },
            { card: "BT25-007", as: "wrong" },
            { card: "BT25-055", as: "tooHigh" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("village"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("eligible").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(s.inst("wrong").instanceId);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(s.inst("tooHigh").instanceId);
    expect(s.state.memory).toBe(0);
  });
});
