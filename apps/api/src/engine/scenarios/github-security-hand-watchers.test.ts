import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

describe("GitHub #5421 SkullMammothmon watcher placement", () => {
  it.each(["hand", "trash", "battleArea"] as const)(
    "ordinary All Turns watcher has correct placement in %s",
    async (zone) => {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "BT14-072", as: "played" },
              { card: "BT1-009", as: "discard" },
              ...(zone === "hand" ? [{ card: "ST16-13", as: "skull" }] : []),
            ],
            battleArea: zone === "battleArea" ? [{ card: "ST16-13", as: "skull" }] : [],
            trash: [
              { card: "BT10-074", as: "target" },
              ...(zone === "trash" ? [{ card: "ST16-13", as: "skull" }] : []),
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discard").instanceId));
      await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
      expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(
        zone === "battleArea" ? ["ST16-13", "BT14-072", "BT10-074"] : ["BT14-072"],
      );
      expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(
        zone !== "battleArea",
      );
    },
  );
});

describe("GitHub #5419 Dark Masters respect Kongou", () => {
  it.each(["EX10-020", "EX10-035"])(
    "%s reaches face-up bottom security unless Kongou prevents security additions",
    async (cardId) => {
      for (const kongou of [false, true]) {
        const s = setupEngine(
          {
            0: {
              battleArea: [{ card: cardId, as: "master" }],
              security: [{ card: "EX10-057", faceUp: true, as: "purpleSecurity" }],
            },
            1: {
              battleArea: ["BT2-056"],
              hand: kongou ? [{ card: "BT9-103", as: "kongou" }] : [],
              security: ["EX13-035"],
            },
          },
          { autoAcceptOptional: true, autoSelectCards: true },
        );
        if (kongou) {
          // Set the initial intent controller just as the existing Kongou regressions do.
          s.state.turnSeat = 1;
          s.state.memory = 10;
          await s.ready();
          const result = s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("kongou").instanceId });
          if (!result.ok) throw new Error("Kongou setup intent refused");
          await settle(() => s.state.players[1]!.trash.some((c) => c.cardId === "BT9-103"));
        }
        s.state.turnSeat = 0;
        s.state.memory = 5;
        await s.ready();
        const id = s.perm("master").topCard.instanceId;
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: s.perm("master").permanentId,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            s.state.players[0]!.trash.some((c) => c.instanceId === id) ||
            s.state.players[0]!.security.some((c) => c.instanceId === id),
        );
        await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
        expect(s.state.players[0]!.security.map((c) => c.instanceId)).toEqual(
          kongou ? [s.inst("purpleSecurity").instanceId] : [s.inst("purpleSecurity").instanceId, id],
        );
        expect(s.state.players[0]!.trash.some((c) => c.instanceId === id)).toBe(kongou);
        expect(s.state.players[0]!.security.at(-1)?.faceUp).toBe(true);
      }
    },
  );
});

describe("GitHub #5420 Gallantmon source stripping and bottom decking", () => {
  it.each(["EX12-035", "AD1-025"])(
    "%s removes exact Gallantmon instance and trashes its remaining sources",
    async (cardId) => {
      const s = setupEngine(
        {
          0: {
            hand: [{ card: cardId, as: "played" }],
            battleArea:
              cardId === "AD1-025"
                ? [{ card: "EX12-035", as: "omniBase", under: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"] }]
                : [{ card: "EX12-032", as: "metalBase", under: ["BT1-009"] }],
          },
          1: {
            battleArea: [
              { card: "EX13-015", as: "gallant", under: ["EX13-001", "EX2-008", "EX13-010", "EX8-012", "EX13-013"] },
            ],
            deck: ["BT1-009"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      const gallant = s.perm("gallant");
      const sourceIds = gallant.stack.map((c) => c.instanceId);
      const id = gallant.topCard.instanceId;
      const intent =
        cardId === "AD1-025"
          ? {
              type: "digivolve" as const,
              instanceId: s.inst("played").instanceId,
              permanentId: s.perm("omniBase").permanentId,
            }
          : {
              type: "digivolve" as const,
              instanceId: s.inst("played").instanceId,
              permanentId: s.perm("metalBase").permanentId,
            };
      expect(s.engine.applyIntent(0, intent)).toEqual({ ok: true });
      await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
      expect(s.state.memory).toBe(cardId === "EX12-035" ? 6 : 5);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(id);
      expect(s.state.players[1]!.trash.map((c) => c.instanceId)).toEqual(expect.arrayContaining(sourceIds));
      expect(s.state.players[1]!.trash.some((c) => c.instanceId === id)).toBe(false);
    },
  );
});
