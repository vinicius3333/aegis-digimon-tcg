import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST15-15 Breakthrough of Courage", () => {
  it("rejects use without a black source or a Tai Kamiya Tamer", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "ST15-15", as: "option" }],
        battleArea: [{ card: "BT1-009", as: "redDigimon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("a red Tai waives color, unsuspends one Digimon, and protects only a Greymon from Digimon effects", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST15-15", as: "option" }],
          battleArea: [
            { card: "BT1-085", as: "tai" },
            { card: "ST15-08", as: "greymon", suspended: true },
            { card: "BT1-009", as: "nonGreymon", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !s.perm("greymon").isSuspended && observe(s.engine).hasRestriction(s.perm("greymon"), "beAffected", "Digimon"),
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("greymon").isSuspended).toBe(false);
    expect(s.perm("nonGreymon").isSuspended).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("greymon"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("greymon"), "beAffected", "Option")).toBe(false);
    expect(observe(s.engine).hasRestriction(s.perm("nonGreymon"), "beAffected", "Digimon")).toBe(false);
  });

  it("Security activates the full Main effect without paying cost or meeting color requirements", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "ST15-15", as: "securityOption", faceUp: true }],
          battleArea: [{ card: "ST15-08", as: "greymon", suspended: true }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 1;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.state.memory).toBe(1);
    expect(s.perm("greymon").isSuspended).toBe(false);
    expect(observe(s.engine).hasRestriction(s.perm("greymon"), "beAffected", "Digimon")).toBe(true);
  });
});

describe("ST15-15 Breakthrough of Courage — KB Q&A rulings", () => {
  async function protectGreymon(s: ReturnType<typeof setupEngine>): Promise<void> {
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !s.perm("greymon").isSuspended && observe(s.engine).hasRestriction(s.perm("greymon"), "beAffected", "Digimon"),
    );
  }

  it("a protected [Greymon] can still be blocked by an opponent's <Blocker> Digimon (Q816)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST15-15", as: "option" }],
          battleArea: [
            { card: "BT1-085", as: "tai" },
            { card: "ST15-08", as: "greymon", dp: 7000, suspended: true },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-072", as: "blocker" }],
          security: [{ card: "BT1-009", as: "securityCard" }],
        },
      },
      { autoSelectCards: true },
    );
    await protectGreymon(s);
    const blockerInstanceId = s.perm("blocker").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("greymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === blockerInstanceId));

    expect(s.events.some((event) => event.kind === "blocked")).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(blockerInstanceId);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("securityCard").instanceId]);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("greymon").permanentId),
    ).toBe(true);
  });

  it("a protected [Greymon] is not affected by a Security Digimon's [Security] effect (Q817)", async () => {
    async function greymonSurvivesHuckmon(protectFirst: boolean): Promise<boolean> {
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "ST15-15", as: "option" }],
            battleArea: [
              { card: "BT1-085", as: "tai" },
              { card: "ST15-08", as: "greymon", dp: 4000, suspended: protectFirst },
            ],
            deck: ["BT1-009", "BT1-009"],
          },
          1: {
            security: [{ card: "P-066", as: "huckmon" }],
            deck: ["BT1-009", "BT1-009"],
          },
        },
        { autoSelectCards: true },
      );
      const greymonId = s.perm("greymon").permanentId;
      if (protectFirst) await protectGreymon(s);

      expect(
        s.engine.applyIntent(0, { type: "attack", attackerPermanentId: greymonId, target: { kind: "player" } }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          !observe(s.engine).isAttacking() &&
          s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("huckmon").instanceId),
      );
      return s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === greymonId);
    }

    expect(await greymonSurvivesHuckmon(true)).toBe(true);
    expect(await greymonSurvivesHuckmon(false)).toBe(false);
  });
});
