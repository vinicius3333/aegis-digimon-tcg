import { describe, expect, it } from "vitest";
import { digiXrosRequirementFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// BT19-013 Shoutmon X5 — Lv.5 Red/Black, play cost 10, DP 10000, [Composite]/[Xros Heart].
//
// Printed text:
//   [All Turns] When this Digimon would leave the battle area, you may place up to 3 Digimon
//   cards with the [Xros Heart] trait from this Digimon's digivolution cards under 1 of your
//   Tamers.
//   [On Deletion] You may play 1 play cost 4 or lower Digimon card with the [Xros Heart] trait
//   from under your Tamers without paying the cost.
//   [DigiXros -2] [Shoutmon] x [Ballistamon] x [Dorulumon] x [Starmons] x [Sparrowmon]
//
// The [All Turns] clause spells its source out ("from this Digimon's digivolution cards"), so it
// is NOT the ＜Save＞ keyword (comprehensive 16-20): the IR carries `hostFilter: { isSelfRef: true }`
// and no keyword entry.

const INERT_SECURITY = ["BT1-009", "BT1-010", "BT1-011"];

describe("BT19-013 Shoutmon X5", () => {
  describe("[DigiXros -2] [Shoutmon] x [Ballistamon] x [Dorulumon] x [Starmons] x [Sparrowmon]", () => {
    it("reduces the printed cost by 2 per material for the full five-material recipe", async () => {
      expect(digiXrosRequirementFor("BT19-013")).toEqual([
        {
          materials: ["Shoutmon", "Ballistamon", "Dorulumon", "Starmons", "Sparrowmon"].map((name) => ({
            names: [name],
          })),
          count: 2,
        },
      ]);
      const s = setupEngine({
        0: {
          hand: [
            { card: "BT19-013", as: "x5" },
            { card: "BT10-008", as: "shoutmon" },
            { card: "BT10-049", as: "ballistamon" },
            { card: "BT10-034", as: "dorulumon" },
            { card: "BT10-029", as: "starmons" },
            { card: "BT10-060", as: "sparrowmon" },
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
          instanceId: s.inst("x5").instanceId,
          digiXros: {
            materialInstanceIds: ["shoutmon", "ballistamon", "dorulumon", "starmons", "sparrowmon"].map(
              (alias) => s.inst(alias).instanceId,
            ),
          },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-013"));

      // 10 printed - 5 materials x 2 = 0, so memory does not move (7-2-2-1).
      expect(s.state.memory).toBe(0);
      // `Permanent.stack` runs bottom-to-top, so the last entry sits directly under the top
      // card: [Shoutmon], the leftmost name of the recipe, is on top (7-2-2-8).
      expect(s.perm("x5").stack.map((card) => card.cardId)).toEqual([
        "BT10-060",
        "BT10-029",
        "BT10-034",
        "BT10-049",
        "BT10-008",
      ]);
      expect(s.state.players[0]!.hand).toHaveLength(0);
      expect(s.state.players[0]!.battleArea).toHaveLength(1);
      expect(s.state.pendingDecision).toBeUndefined();
    });

    it("charges 10 - 2n for a partial recipe (7-2-2-4: any number of the named cards)", async () => {
      const s = setupEngine({
        0: {
          hand: [
            { card: "BT19-013", as: "x5" },
            { card: "BT10-008", as: "shoutmon" },
            { card: "BT10-049", as: "ballistamon" },
            { card: "BT10-034", as: "dorulumon" },
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
          instanceId: s.inst("x5").instanceId,
          digiXros: {
            materialInstanceIds: ["shoutmon", "ballistamon", "dorulumon"].map((alias) => s.inst(alias).instanceId),
          },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-013"));

      // 10 - 3 x 2 = 4 memory paid from 0.
      expect(s.state.memory).toBe(-4);
      expect(s.perm("x5").stack).toHaveLength(3);
      expect(s.state.players[0]!.hand).toHaveLength(0);
    });

    it("accepts a peer treated as [Shoutmon] for a DigiXros but not a same-named peer without the grant", async () => {
      const s = setupEngine({
        0: {
          hand: [
            { card: "BT19-013", as: "x5" },
            { card: "BT19-012", as: "omniWithGrant" },
            { card: "BT5-014", as: "omniNoGrant" },
          ],
          security: INERT_SECURITY,
        },
        1: { security: INERT_SECURITY },
      });
      s.state.memory = 10;
      await s.ready();

      // BT5-014 OmniShoutmon prints no "also treated as [Shoutmon] for a DigiXros" line, so it
      // fills no slot of this recipe.
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("x5").instanceId,
          digiXros: { materialInstanceIds: [s.inst("omniNoGrant").instanceId] },
        }),
      ).toEqual({ ok: false, reason: "invalid-material" });
      expect(s.state.players[0]!.battleArea).toHaveLength(0);
      expect(s.state.memory).toBe(10);

      // BT19-012 OmniShoutmon does print it (KB Q3068) and fills the [Shoutmon] slot.
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("x5").instanceId,
          digiXros: { materialInstanceIds: [s.inst("omniWithGrant").instanceId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-013"));
      expect(s.perm("x5").stack.map((card) => card.cardId)).toEqual(["BT19-012"]);
      // 10 - 1 x 2 = 8 paid from 10.
      expect(s.state.memory).toBe(2);
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT5-014"]);
    });
  });

  describe("[All Turns] When this Digimon would leave the battle area ... place up to 3 [Xros Heart] Digimon cards from this Digimon's digivolution cards under 1 of your Tamers", () => {
    it("places at most 3 of its own [Xros Heart] sources under one Tamer and trashes the rest", async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              // Four [Xros Heart] sources, all play cost 5 or more, so the [On Deletion]
              // clause cannot play any of them back out from under the Tamer.
              { card: "BT19-013", as: "x5", under: ["BT19-051", "BT19-038", "BT19-035", "BT19-012"] },
              { card: "BT19-079", as: "tamer" },
            ],
            security: INERT_SECURITY,
          },
          1: { security: INERT_SECURITY },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 0;

      await advance(s.engine).verb.deletePermanent([s.perm("x5").permanentId]);
      await settle(() => s.perm("tamer").stack.length === 3);

      expect(s.perm("tamer").stack).toHaveLength(3);
      const savedIds = s.perm("tamer").stack.map((card) => card.cardId);
      expect(new Set(savedIds).size).toBe(3);
      for (const cardId of savedIds) expect(["BT19-051", "BT19-038", "BT19-035", "BT19-012"]).toContain(cardId);
      // The fourth eligible source and Shoutmon X5 itself are trashed by the deletion.
      expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT19-013");
      expect(s.state.players[0]!.trash).toHaveLength(2);
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-079"]);
      expect(s.state.memory).toBe(0);
    });

    it("ignores a digivolution card without the [Xros Heart] trait", async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              // BT19-009 Growlmon is [Dark Dragon] only; BT19-051 AtlurBallistamon is
              // [Xros Heart] and costs 7, so the [On Deletion] clause leaves it under the Tamer.
              { card: "BT19-013", as: "x5", under: ["BT19-009", "BT19-051"] },
              { card: "BT19-079", as: "tamer" },
            ],
            security: INERT_SECURITY,
          },
          1: { security: INERT_SECURITY },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );

      await advance(s.engine).verb.deletePermanent([s.perm("x5").permanentId]);
      await settle(() => s.perm("tamer").stack.length === 1);

      expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-051"]);
      expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT19-009", "BT19-013"]);
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-079"]);
    });

    it("saves nothing when this player controls no Tamer", async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT19-013", as: "x5", under: ["BT19-051", "BT19-035"] }],
            security: INERT_SECURITY,
          },
          1: { security: INERT_SECURITY },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );

      await advance(s.engine).verb.deletePermanent([s.perm("x5").permanentId]);
      await settle(() => s.state.players[0]!.battleArea.length === 0);

      expect(s.state.players[0]!.battleArea).toHaveLength(0);
      expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT19-013", "BT19-035", "BT19-051"]);
    });

    it("fires on the opponent's turn when a real battle deletes this Digimon ([All Turns])", async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT19-013", as: "x5", under: ["BT19-051"], suspended: true },
              { card: "BT19-079", as: "tamer" },
            ],
            security: INERT_SECURITY,
          },
          1: {
            battleArea: [{ card: "BT1-009", as: "attacker", dp: 15_000 }],
            security: INERT_SECURITY,
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;

      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(1);
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("x5").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("tamer").stack.length === 1);
      expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-051"]);
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-079"]);
      advance(s.engine).endMainPhaseIfOpen(1);
      await turn;
    });

    it("does not save Shoutmon X5 sources when a different friendly Digimon leaves", async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT19-013", as: "x5", under: ["BT19-008"] },
              { card: "BT19-009", as: "other" },
              { card: "BT19-079", as: "tamer" },
            ],
            security: INERT_SECURITY,
          },
          1: { security: INERT_SECURITY },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );

      await advance(s.engine).verb.deletePermanent([s.perm("other").permanentId]);

      expect(s.perm("x5").stack.map((card) => card.cardId)).toEqual(["BT19-008"]);
      expect(s.perm("tamer").stack).toHaveLength(0);
    });

    it("saves only this Digimon's Xros Heart sources when another stack also qualifies", async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT19-009", as: "other", under: ["BT19-008"] },
              { card: "BT19-013", as: "x5", under: ["BT19-012"] },
              { card: "BT19-079", as: "tamer" },
            ],
            security: INERT_SECURITY,
          },
          1: { security: INERT_SECURITY },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );

      await advance(s.engine).verb.deletePermanent([s.perm("x5").permanentId]);
      await settle(() => s.perm("tamer").stack.length === 1);

      // Only Shoutmon X5's own source moves; the other stack's [Xros Heart] card is untouched.
      // BT19-012 costs 7, so the [On Deletion] clause cannot play it back out.
      expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-012"]);
      expect(s.perm("other").stack.map((card) => card.cardId)).toEqual(["BT19-008"]);
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([
        "BT19-009",
        "BT19-079",
      ]);
      expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-013"]);
    });
  });

  describe("[On Deletion] play 1 play cost 4 or lower [Xros Heart] Digimon card from under your Tamers", () => {
    it("saves an eligible source before deletion, then plays that same card for free (Q3069)", async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT19-013", as: "x5", under: ["BT19-008", "BT19-009"] },
              { card: "BT19-079", as: "tamer" },
            ],
            security: INERT_SECURITY,
          },
          1: { security: INERT_SECURITY },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 0;

      await advance(s.engine).verb.deletePermanent([s.perm("x5").permanentId]);
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-008"));

      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-013")).toBe(false);
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-008")).toBe(true);
      expect(s.perm("tamer").stack).toHaveLength(0);
      expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
        expect.arrayContaining(["BT19-013", "BT19-009"]),
      );
      expect(s.state.memory).toBe(0);
    });

    it("rejects an over-cost or non-[Xros Heart] card already sitting under a Tamer", async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT19-013", as: "x5" },
              // BT19-051 AtlurBallistamon is [Xros Heart] but costs 7; BT19-009 Growlmon costs 5
              // and has no [Xros Heart] trait.
              { card: "BT19-079", as: "tamer", under: ["BT19-051", "BT19-009"] },
            ],
            security: INERT_SECURITY,
          },
          1: { security: INERT_SECURITY },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 0;

      await advance(s.engine).verb.deletePermanent([s.perm("x5").permanentId]);
      await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT19-013"));

      expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-051", "BT19-009"]);
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-079"]);
      expect(s.state.memory).toBe(0);
      expect(s.state.pendingDecision).toBeUndefined();
    });

    it("plays a cost-4 [Xros Heart] card from under a Tamer without paying its cost", async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT19-013", as: "x5" },
              // BT19-008 Shoutmon: play cost 4, [Xros Heart].
              { card: "BT19-079", as: "tamer", under: ["BT19-008"] },
            ],
            security: INERT_SECURITY,
          },
          1: { security: INERT_SECURITY },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 0;

      await advance(s.engine).verb.deletePermanent([s.perm("x5").permanentId]);
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-008"));

      expect(s.perm("tamer").stack).toHaveLength(0);
      expect(s.state.memory).toBe(0);
    });
  });
});
