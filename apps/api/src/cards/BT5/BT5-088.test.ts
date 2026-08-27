import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-088.js";

describe("BT5-088 Sora Takenouchi & Joe Kido", () => {
  it("gains 2 memory at turn start when the opponent has a Digimon without sources", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-088", as: "tamer" }] },
      1: { battleArea: [{ card: "BT5-020", as: "sourceLess" }] },
    });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tamer"));

    expect(s.state.memory).toBe(2);
  });

  it("does not gain memory when every opposing Digimon has a source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-088", as: "tamer" }] },
      1: { battleArea: [{ card: "BT5-020", as: "sourced", under: ["BT1-009"] }] },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tamer"));
    expect(s.state.memory).toBe(0);
  });

  it("may suspend when a blue Digimon attacks to trash 2 bottom opposing sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-088", as: "tamer" },
            { card: "BT1-027", as: "blue" },
          ],
        },
        1: {
          battleArea: [
            {
              card: "BT4-073",
              as: "target",
              under: [
                { card: "BT1-009", as: "bottomSource" },
                { card: "BT1-010", as: "middleSource" },
                { card: "BT1-011", as: "topSource" },
              ],
            },
          ],
          security: ["BT1-012"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blue").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").isSuspended && s.perm("target").stack.length === 1);

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("target").stack.map((card) => card.instanceId)).toEqual([s.inst("topSource").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("bottomSource").instanceId, s.inst("middleSource").instanceId]),
    );
  });

  it("trashes the only available source when fewer than 2 are present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-088", as: "tamer" },
            { card: "BT1-027", as: "blue" },
          ],
        },
        1: { battleArea: [{ card: "BT4-073", as: "target", under: [{ card: "BT1-009", as: "onlySource" }] }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blue").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").isSuspended && s.perm("target").stack.length === 0);

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("onlySource").instanceId);
  });

  it("may decline the source-trash effect, leaving the Tamer and sources unchanged", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-088", as: "tamer" },
            { card: "BT1-027", as: "blue" },
          ],
        },
        1: {
          battleArea: [{ card: "BT4-073", as: "target", under: ["BT1-009", "BT1-010"] }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blue").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blue").isSuspended);

    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-088", as: "securityTamer", faceUp: true }] } });
    const instanceId = s.inst("securityTamer").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));

    expect(s.state.players[0]?.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId)).toBe(true);
  });
});
