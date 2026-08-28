import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-100.js";

describe("BT1-100 Grace Cross Freezer", () => {
  it("prevents all opposing Digimon without sources from attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-028"], hand: [{ card: "BT1-100", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "noSources" },
            { card: "BT1-010", as: "withSource", under: ["BT1-001"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("noSources"), "attack"));
    expect(observe(s.engine).isRestricted(s.perm("withSource"), "attack")).toBe(false);
  });

  it("allows a restricted Digimon to attack after it gains a digivolution card (Q965)", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT1-028"],
        hand: [{ card: "BT1-100", as: "option" }],
        security: ["BT1-029"],
      },
      1: {
        battleArea: [{ card: "BT1-010", as: "target" }],
        hand: [{ card: "BT1-001", as: "newSource" }],
      },
    });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "attack"));

    await advance(s.engine).verb.placeUnder(s.perm("target").permanentId, [s.inst("newSource").instanceId]);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(false);

    s.state.turnSeat = 1;
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("also restricts a source-less opposing Digimon that enters after the Option resolves", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT1-028"], hand: [{ card: "BT1-100", as: "option" }] },
    });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-100"));

    const lateArrival = s.putOnBoard(1, { card: "BT1-010" });

    expect(observe(s.engine).isRestricted(lateArrival, "attack")).toBe(true);
  });

  it("prevents opposing source-less Digimon from attacking from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT1-100", as: "securityOption", faceUp: true }] },
      1: {
        battleArea: [
          { card: "BT1-010", as: "noSources" },
          { card: "BT1-010", as: "withSource", under: ["BT1-001"] },
        ],
      },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(observe(s.engine).isRestricted(s.perm("noSources"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("withSource"), "attack")).toBe(false);
  });
});
