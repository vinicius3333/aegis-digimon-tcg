import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-057.js";

describe("BT12-057 Quartzmon", () => {
  it("digivolves for 9 from an off-color level 5 with Save text and rejects a plain near-match", async () => {
    const valid = setupEngine({
      0: {
        battleArea: [{ card: "BT12-041", as: "saveBase" }],
        hand: [{ card: "BT12-057", as: "quartz" }],
        deck: ["BT1-009"],
      },
    });
    valid.state.memory = 9;
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("saveBase").permanentId,
        instanceId: valid.inst("quartz").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("saveBase").topCard.cardId === "BT12-057");
    expect(valid.state.memory).toBe(0);
    expect(valid.perm("saveBase").stack.map(({ cardId }) => cardId)).toEqual(["BT12-041"]);
    expect(valid.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-057", as: "plainBase" }], hand: [{ card: "BT12-057", as: "quartz" }] },
    });
    invalid.state.memory = 9;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plainBase").permanentId,
        instanceId: invalid.inst("quartz").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(invalid.state.memory).toBe(9);
    expect(invalid.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT12-057"]);
  });

  it("suspends all other Digimon and Tamers on digivolution and gains memory per pair", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-057", as: "quartz" },
          { card: "BT1-009", as: "mine" },
          { card: "BT1-085", as: "myTamer" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "theirs" },
          { card: "BT10-092", as: "theirTamer" },
        ],
      },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("quartz"));
    expect(s.perm("quartz").isSuspended).toBe(false);
    expect(
      [s.perm("mine"), s.perm("myTamer"), s.perm("theirs"), s.perm("theirTamer")].every(
        ({ isSuspended }) => isSuspended,
      ),
    ).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("prevents every other Digimon and Tamer from unsuspending", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-057", as: "quartz" },
          { card: "BT1-009", as: "mine", suspended: true },
        ],
      },
      1: { battleArea: [{ card: "BT10-092", as: "tamer", suspended: true }] },
    });
    await s.ready();
    await advance(s.engine).verb.unsuspend([s.perm("mine").permanentId, s.perm("tamer").permanentId]);
    expect(s.perm("mine").isSuspended).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(true);
  });

  it("two Quartzmon copies prevent each other from unsuspending", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-057", as: "mine", suspended: true }] },
      1: { battleArea: [{ card: "BT12-057", as: "theirs", suspended: true }] },
    });
    await s.ready();
    await advance(s.engine).verb.unsuspend([s.perm("mine").permanentId, s.perm("theirs").permanentId]);
    expect(s.perm("mine").isSuspended).toBe(true);
    expect(s.perm("theirs").isSuspended).toBe(true);
  });

  it("allows a DNA result made from suspended materials to enter unsuspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-057", as: "quartz" },
          { card: "BT12-022", as: "blue", suspended: true },
          { card: "BT12-050", as: "green", suspended: true },
        ],
        hand: [{ card: "BT12-055", as: "dino" }],
        deck: ["BT1-009"],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("blue").permanentId, s.perm("green").permanentId],
        instanceId: s.inst("dino").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-055"));
    expect(s.perm("dino").isSuspended).toBe(false);
    expect(s.perm("dino").stack.map(({ cardId }) => cardId)).toEqual(["BT12-022", "BT12-050"]);
  });

  it("suspends an opposing permanent and trashes security per 5 suspended permanents when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-057", as: "quartz" },
            { card: "BT1-009", suspended: true },
            { card: "BT1-010", suspended: true },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target" },
            { card: "BT1-010", suspended: true },
            { card: "BT10-092", suspended: true },
          ],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("quartz"));
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
