import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/BT11/BT11-062.js";
import "../cards/BT11/BT11-064.js";
import "../cards/BT9/BT9-012.js";
import "../cards/P/P-072.js";
import "../cards/BT5/BT5-086.js";
import "../cards/EX3/EX3-013.js";
import "../cards/ST10/ST10-14.js";
import "../cards/ST1/ST1-16.js";
import "../cards/ST2/ST2-16.js";
import "../cards/BT2/BT2-102.js";
import "../cards/BT11/BT11-088.js";

const cases = [
  { clause: "BT11-062", host: "BT1-025", under: ["BT11-062", "BT9-109"] },
  { clause: "BT11-064", host: "BT1-025", under: ["BT11-064", "BT9-109"] },
  { clause: "BT9-012", host: "BT1-025", under: ["BT1-010", "BT1-010", "BT9-012"] },
  { clause: "P-072", host: "BT1-025", under: ["BT1-010", "BT1-010", "P-072"] },
  { clause: "BT5-086", host: "BT5-086", under: ["BT1-044"] },
  { clause: "EX3-013", host: "EX3-013", under: ["BT1-021", "BT1-021"] },
];

describe("GitHub #5308 same-defect sweep: printed deletion/hand/deck protection", () => {
  for (const entry of cases) {
    it(`${entry.clause} does not protect Bagramon's placement under another Digimon`, async () => {
      const s = setupEngine(
        {
          0: { hand: [{ card: "BT11-088", as: "bagramon" }] },
          1: {
            battleArea: [
              { card: entry.host, under: entry.under, as: "host" },
              { card: "BT1-009", as: "receiver" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      const hostId = s.inst("host").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bagramon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.perm("receiver").stack.some((card) => card.instanceId === hostId));
      expect(s.state.players[1]!.battleArea).toHaveLength(1);
      expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(expect.arrayContaining(entry.under));
      expect(s.state.players[1]!.deck).toHaveLength(0);
      expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === entry.clause)).toBe(false);
      expect(s.state.pendingDecision).toBeUndefined();
    });

    it.each(["linked", undefined] as const)(
      `${entry.clause} does not offer or consume protection for destination %s`,
      async (destination) => {
        const s = setupEngine(
          { 1: { battleArea: [{ card: entry.host, under: entry.under, as: "host" }] } },
          { autoAcceptOptional: true, autoSelectCards: true },
        );
        await s.ready();
        const before = s.perm("host").stack.map((card) => card.instanceId);
        expect(
          await s.engine.consultLeavePrevention([s.perm("host").permanentId], "byEffect", 0, {
            isBounce: true,
            destination,
          }),
        ).toEqual(new Set());
        expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual(before);
        expect(s.state.players[1]!.deck).toHaveLength(0);
        expect(s.state.players[1]!.trash).toHaveLength(0);
        expect(s.decisions).toHaveLength(0);
        expect(s.state.pendingDecision).toBeUndefined();
      },
    );

    it(`${entry.clause} does not protect security placement or pay its prevention cost`, async () => {
      const s = setupEngine(
        {
          0: { battleArea: ["BT1-045", "BT10-079"], hand: [{ card: "ST10-14", as: "option" }] },
          1: { battleArea: [{ card: entry.host, under: entry.under, as: "host" }], security: ["BT1-010"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
      );
      s.state.memory = 10;
      await s.ready();
      const hostId = s.inst("host").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([hostId]);
      expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(expect.arrayContaining(entry.under));
      expect(s.state.players[1]!.deck).toHaveLength(0);
      expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === entry.clause)).toBe(false);
      expect(s.state.pendingDecision).toBeUndefined();
    });

    it.each([
      ["deletion", "ST1-16", "BT1-010"],
      ["hand", "ST2-16", "BT1-028"],
      ["deck", "BT2-102", "BT1-064"],
    ])(
      `${entry.clause} still protects legal %s by paying its printed cost`,
      async (_destination, option, colorSource) => {
        const s = setupEngine(
          {
            0: { battleArea: [colorSource], hand: [{ card: option, as: "option" }] },
            1: { battleArea: [{ card: entry.host, under: entry.under, as: "host", suspended: true }] },
          },
          { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
        );
        s.state.memory = 10;
        await s.ready();
        const sourcesBefore = s.perm("host").stack.length;
        expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
          ok: true,
        });
        await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
        expect(s.state.players[1]!.battleArea).toHaveLength(1);
        const paidCount = ["BT9-012", "P-072", "EX3-013"].includes(entry.clause) ? 2 : 1;
        expect(s.perm("host").stack.length).toBe(sourcesBefore - paidCount);
        const returnsXAntibody = ["BT11-062", "BT11-064"].includes(entry.clause);
        expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(returnsXAntibody ? ["BT9-109"] : []);
        expect(s.state.players[1]!.trash).toHaveLength(returnsXAntibody ? 0 : paidCount);
        expect(s.state.players[1]!.hand).toHaveLength(0);
        expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === entry.clause)).toBe(true);
        expect(s.state.pendingDecision).toBeUndefined();
      },
    );
  }
});
