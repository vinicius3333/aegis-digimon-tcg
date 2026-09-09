import { describe, expect, it } from "vitest";
import { digiXrosRequirementFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// BT19-014 Shoutmon EX6 — Lv.6 Red/Yellow/Black, play cost 11, DP 12000,
// [Composite]/[Xros Heart]/[Blue Flare].
//
// Printed text:
//   ＜Alliance＞.
//   ＜Reboot＞.
//   ＜Material Save 4＞
//   [On Play] For each color in this Digimon's digivolution cards, all of your opponent's
//   Digimon get -1000 DP for the turn. Then, you may play 1 [ShootingStarmon] from under your
//   Tamers without paying the cost.
//   [When Attacking] Delete 1 of your opponent's Digimon with as much or less DP as this Digimon.
//   [DigiXros -2] [OmniShoutmon] x [ZeigGreymon] x [AtlurBallistamon] x [JaegerDorulumon] x
//   [RaptorSparrowmon]

const materials = ["OmniShoutmon", "ZeigGreymon", "AtlurBallistamon", "JaegerDorulumon", "RaptorSparrowmon"];
const INERT_SECURITY = ["BT1-012", "BT1-013", "BT1-014"];

interface AllianceProbe {
  hasOpenAllianceDecision: boolean;
}

describe("BT19-014 Shoutmon EX6", () => {
  describe("[DigiXros -2] [OmniShoutmon] x [ZeigGreymon] x [AtlurBallistamon] x [JaegerDorulumon] x [RaptorSparrowmon]", () => {
    it("reduces the printed cost by 2 per material and stacks the leftmost name on top", async () => {
      expect(digiXrosRequirementFor("BT19-014")).toEqual([
        { materials: materials.map((name) => ({ names: [name] })), count: 2 },
      ]);
      const s = setupEngine({
        0: {
          hand: [
            { card: "BT19-014", as: "ex6" },
            { card: "BT19-012", as: "omni" },
            { card: "BT19-026", as: "zeig" },
            { card: "BT19-051", as: "atlur" },
            { card: "BT19-038", as: "jaeger" },
            { card: "BT19-061", as: "raptor" },
          ],
          security: INERT_SECURITY,
        },
        1: { security: INERT_SECURITY },
      });
      s.state.memory = 0;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("ex6").instanceId,
          digiXros: {
            materialInstanceIds: ["omni", "zeig", "atlur", "jaeger", "raptor"].map((a) => s.inst(a).instanceId),
          },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-014"));

      // 11 printed - 5 materials x 2 = 1 memory paid from 0.
      expect(s.state.memory).toBe(-1);
      // `Permanent.stack` runs bottom-to-top: the leftmost recipe name ends up directly under
      // the top card (7-2-2-8).
      expect(s.perm("ex6").stack.map((card) => card.cardId)).toEqual([
        "BT19-061",
        "BT19-038",
        "BT19-051",
        "BT19-026",
        "BT19-012",
      ]);
      expect(s.state.players[0]!.hand).toHaveLength(0);
    });

    it("charges 11 - 2n for a partial recipe and refuses a card no slot names", async () => {
      const s = setupEngine({
        0: {
          hand: [
            { card: "BT19-014", as: "ex6" },
            { card: "BT19-012", as: "omni" },
            { card: "BT19-026", as: "zeig" },
            // BT10-008 Shoutmon fills no slot of this recipe: [OmniShoutmon] is an exact name,
            // and BT19-012's "also treated as [Shoutmon]" grant runs the other way round.
            { card: "BT10-008", as: "shoutmon" },
          ],
          security: INERT_SECURITY,
        },
        1: { security: INERT_SECURITY },
      });
      s.state.memory = 10;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("ex6").instanceId,
          digiXros: {
            materialInstanceIds: ["omni", "zeig", "shoutmon"].map((a) => s.inst(a).instanceId),
          },
        }),
      ).toEqual({ ok: false, reason: "invalid-material" });
      expect(s.state.players[0]!.battleArea).toHaveLength(0);
      expect(s.state.memory).toBe(10);

      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("ex6").instanceId,
          digiXros: { materialInstanceIds: ["omni", "zeig"].map((a) => s.inst(a).instanceId) },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-014"));
      // 11 - 2 x 2 = 7 paid from 10.
      expect(s.state.memory).toBe(3);
      expect(s.perm("ex6").stack).toHaveLength(2);
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT10-008"]);
    });
  });

  describe("[On Play] For each color in this Digimon's digivolution cards, all of your opponent's Digimon get -1000 DP for the turn. Then, you may play 1 [ShootingStarmon] from under your Tamers without paying the cost.", () => {
    it("scales with the distinct source colors, hits every opposing Digimon, and plays ShootingStarmon from under a Tamer", async () => {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "BT19-014", as: "ex6" },
              { card: "BT19-012", as: "omni" },
              { card: "BT19-026", as: "zeig" },
              // A ShootingStarmon in HAND is not a legal source: the clause reads "from under
              // your Tamers".
              { card: "BT19-035", as: "handShooting" },
            ],
            battleArea: [
              // BT5-039 ShootingStarmon is the only legal target under the Tamer; BT19-020
              // Greymon is the near-miss that must stay put.
              { card: "BT19-079", as: "tamer", under: ["BT19-020", "BT5-039"] },
            ],
            security: INERT_SECURITY,
          },
          1: {
            battleArea: [
              { card: "BT1-009", as: "small", dp: 5000 },
              { card: "BT1-013", as: "big", dp: 9000 },
            ],
            security: INERT_SECURITY,
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();

      // A DigiXros play so the On Play clause resolves with real digivolution cards under it:
      // BT19-012 is Red/Yellow and BT19-026 is Blue/Black — four distinct colors.
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("ex6").instanceId,
          digiXros: { materialInstanceIds: ["omni", "zeig"].map((a) => s.inst(a).instanceId) },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT5-039"));

      expect(s.perm("small").currentDP).toBe(1000);
      expect(s.perm("big").currentDP).toBe(5000);
      // 11 - 2 x 2 = 7 paid from 10; the ShootingStarmon play is free.
      expect(s.state.memory).toBe(3);
      expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-020"]);
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-035"]);
      expect(s.state.pendingDecision).toBeUndefined();
    });

    it("applies no DP penalty and plays nothing when this Digimon has no digivolution cards", async () => {
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "BT19-014", as: "ex6" }],
            battleArea: [{ card: "BT19-079", as: "tamer", under: ["BT19-020"] }],
            security: INERT_SECURITY,
          },
          1: {
            battleArea: [{ card: "BT1-009", as: "small", dp: 5000 }],
            security: INERT_SECURITY,
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 20;
      await s.ready();

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ex6").instanceId })).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-014"));

      expect(s.perm("small").currentDP).toBe(5000);
      expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-020"]);
      expect(s.state.memory).toBe(9);
    });
  });

  describe("[When Attacking] Delete 1 of your opponent's Digimon with as much or less DP as this Digimon.", () => {
    it("deletes only an opposing Digimon at or under this Digimon's DP in a real attack", async () => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT19-014", as: "ex6" }], security: INERT_SECURITY },
          1: {
            battleArea: [
              { card: "BT1-009", as: "boundary", dp: 12_000, suspended: true },
              { card: "BT1-013", as: "tooLarge", dp: 13_000, suspended: true },
            ],
            security: INERT_SECURITY,
          },
        },
        { autoSelectCards: true },
      );
      await s.ready();
      const boundaryId = s.perm("boundary").permanentId;

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("ex6").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.battleArea.length === 1);

      expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === boundaryId)).toBe(false);
      expect(s.state.players[1]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT1-013"]);
      expect(s.perm("tooLarge").currentDP).toBe(13_000);
      // The deleted Digimon plus the one security card this unmodified attack checked.
      expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-009");
      expect(s.state.players[1]!.security).toHaveLength(2);
    });
  });

  describe("＜Alliance＞ and ＜Reboot＞", () => {
    it("＜Alliance＞ suspends another Digimon for its DP and ＜Security A. +1＞ (16-24-1)", async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT19-014", as: "ex6" },
              { card: "BT1-009", as: "ally", dp: 3000 },
            ],
            security: INERT_SECURITY,
          },
          1: { security: ["BT1-012", "BT1-012"] },
        },
        { autoSelectCards: true },
      );
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("ex6").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      const combat = (s.engine as unknown as { combat: AllianceProbe }).combat;
      await settle(() => combat.hasOpenAllianceDecision);
      expect(
        s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId } as never),
      ).toEqual({ ok: true });

      // Two security checks instead of one: ＜Security A. +1＞ for this attack.
      await settle(() => s.state.players[1]!.security.length === 0);
      expect(s.state.players[1]!.security).toHaveLength(0);
      expect(s.perm("ally").isSuspended).toBe(true);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-014")).toBe(true);
    });

    it("＜Reboot＞ unsuspends this Digimon in the opponent's public Unsuspend phase", async () => {
      const s = setupEngine({
        0: {
          battleArea: [
            { card: "BT19-014", as: "ex6", suspended: true },
            // A peer without ＜Reboot＞ stays suspended through the same phase.
            { card: "BT1-009", as: "peer", suspended: true },
          ],
          security: INERT_SECURITY,
          deck: ["BT1-012"],
        },
        1: { security: INERT_SECURITY, deck: ["BT1-012", "BT1-013"] },
      });
      s.state.turnSeat = 1;

      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(1);
      expect(s.perm("ex6").isSuspended).toBe(false);
      expect(s.perm("peer").isSuspended).toBe(true);
      advance(s.engine).endMainPhaseIfOpen(1);
      await turn;
    });
  });

  describe("＜Material Save 4＞", () => {
    it("places 4 of its own recipe-named digivolution cards under a Tamer when deleted (16-21-1)", async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "BT19-014",
                as: "ex6",
                // BT19-008 Shoutmon is not named in this card's DigiXros requirements, so it is
                // not an eligible ＜Material Save＞ card (16-21-1).
                under: ["BT19-008", "BT19-012", "BT19-026", "BT19-051", "BT19-038", "BT19-061"],
              },
              { card: "BT19-079", as: "tamer" },
            ],
            security: INERT_SECURITY,
          },
          1: { security: INERT_SECURITY },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );

      await advance(s.engine).verb.deletePermanent([s.perm("ex6").permanentId]);
      await settle(() => s.perm("tamer").stack.length === 4);

      expect(s.perm("tamer").stack).toHaveLength(4);
      for (const cardId of s.perm("tamer").stack.map((card) => card.cardId)) {
        expect(["BT19-012", "BT19-026", "BT19-051", "BT19-038", "BT19-061"]).toContain(cardId);
      }
      const trash = s.state.players[0]!.trash.map((card) => card.cardId);
      expect(trash).toContain("BT19-008");
      expect(trash).toContain("BT19-014");
      expect(trash).toHaveLength(3);
      expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-079"]);
    });

    it("saves nothing when this player controls no Tamer", async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT19-014", as: "ex6", under: ["BT19-012", "BT19-026"] }],
            security: INERT_SECURITY,
          },
          1: { security: INERT_SECURITY },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );

      await advance(s.engine).verb.deletePermanent([s.perm("ex6").permanentId]);
      await settle(() => s.state.players[0]!.battleArea.length === 0);

      expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT19-012", "BT19-014", "BT19-026"]);
    });
  });
});
