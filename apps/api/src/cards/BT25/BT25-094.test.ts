import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT25-094 Cosmic Area", () => {
  it("places itself face up at the bottom security", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-094", as: "area" }],
          security: [{ card: "BT25-001" }, { card: "BT25-002" }],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const areaId = s.inst("area").instanceId;
    type PlayCardIntentWithUseAs = Parameters<typeof s.engine.applyIntent>[1] & { useAs?: "digimon" | "option" };

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: areaId,
      useAs: "option",
    } as PlayCardIntentWithUseAs)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === areaId));

    expect(s.state.players[0]!.security.find((card) => card.instanceId === areaId)).toMatchObject({
      instanceId: areaId,
      faceUp: true,
    });
  });

  it("with zero security waives color and continues to the reduced paid play (Q6444-Q6445)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-094", as: "area" },
            { card: "BT25-008", as: "coronamon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("area").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("coronamon").instanceId),
    );
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({
      instanceId: s.inst("area").instanceId,
      faceUp: true,
    });
  });

  it("takes exactly the bottom security card and does not waive color with a face-up card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-094", as: "area" }],
          security: [
            { card: "BT25-001", as: "top" },
            { card: "BT25-002", as: "bottom" },
          ],
          battleArea: [{ card: "BT25-021" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const areaId = s.inst("area").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: areaId, useAs: "option" } as never)).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === areaId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bottom").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("top").instanceId);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ instanceId: areaId, faceUp: true });

    const blocked = setupEngine({
      0: {
        hand: [{ card: "BT25-094", as: "area" }],
        security: [{ card: "BT25-095", faceUp: true }],
      },
    });
    blocked.state.memory = 10;
    await blocked.ready();
    expect(
      blocked.engine.applyIntent(0, {
        type: "playCard",
        instanceId: blocked.inst("area").instanceId,
        useAs: "option",
      } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("face-up Security grants Alliance only to own red/blue TS and Rush with Apollomon", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT25-094", faceUp: true }],
        battleArea: [
          { card: "BT25-008", as: "target" },
          { card: "BT25-018", as: "apollomon" },
          { card: "BT25-050", as: "wrongColor" },
        ],
      },
      1: { battleArea: [{ card: "BT25-008", as: "opponent" }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("wrongColor"), "Alliance")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("opponent"), "Alliance")).toBe(false);
  });

  it("does not grant conditional Rush without the named Digimon or either keyword off-turn", async () => {
    const ownTurn = setupEngine({
      0: { security: [{ card: "BT25-094", faceUp: true }], battleArea: [{ card: "BT25-008", as: "target" }] },
    });
    await ownTurn.ready();
    expect(observe(ownTurn.engine).hasKeyword(ownTurn.perm("target"), "Alliance")).toBe(true);
    expect(observe(ownTurn.engine).hasKeyword(ownTurn.perm("target"), "Rush")).toBe(false);

    const offTurn = setupEngine({
      0: {
        security: [{ card: "BT25-094", faceUp: true }],
        battleArea: [{ card: "BT25-008", as: "target" }, { card: "BT25-018" }],
      },
    });
    offTurn.state.turnSeat = 1;
    await offTurn.ready();
    expect(observe(offTurn.engine).hasKeyword(offTurn.perm("target"), "Alliance")).toBe(false);
    expect(observe(offTurn.engine).hasKeyword(offTurn.perm("target"), "Rush")).toBe(false);
  });

  it("Security free-plays only a level 4 or lower red/blue TS Digimon from hand or trash", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-094", faceUp: true, as: "area" }],
          trash: [
            { card: "BT25-009", as: "eligible" },
            { card: "BT25-050", as: "wrongColor" },
            { card: "BT25-016", as: "tooHigh" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("area"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("eligible").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("wrongColor").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("tooHigh").instanceId);
    expect(s.state.memory).toBe(0);
  });
});
