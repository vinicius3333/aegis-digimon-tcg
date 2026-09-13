import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-044.js";

describe("BT11-044 MetalEtemon", () => {
  it("maps the catalog and reveals exactly four for optional eligible play under the shared cost budget", () => {
    expect(getCardDefinition("BT11-044")).toMatchObject({
      cardId: "BT11-044",
      colors: ["Yellow", "Black"],
      level: 6,
      playCost: 11,
      dp: 11000,
      types: ["Cyborg"],
    });
    expect(compiled.effects).toEqual([
      { trigger: "OnPlay", actions: [expect.objectContaining({ kind: "RevealAdd", revealCount: 4, rest: "trash" })] },
      {
        trigger: "WhenDigivolving",
        actions: [expect.objectContaining({ kind: "RevealAdd", revealCount: 4, rest: "trash" })],
      },
    ]);
  });

  it.each(["play", "evolve"] as const)(
    "may reveal eligible Etemon-family Digimon under the 7-cost budget (%s)",
    async (mode) => {
      const s = setupEngine(
        {
          0: {
            battleArea: mode === "evolve" ? [{ card: "BT11-041", as: "base" }] : [],
            hand:
              mode === "evolve" ? [{ card: "BT11-044", as: "metalEtemon" }] : [{ card: "BT11-044", as: "metalEtemon" }],
            deck: [
              ...(mode === "evolve" ? [{ card: "BT1-009", as: "evoDraw" }] : []),
              { card: "BT11-036", as: "chuumon" },
              { card: "BT11-040", as: "sukamon" },
              { card: "BT11-023", as: "rest1" },
              { card: "BT1-009", as: "rest2" },
            ],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 10;

      expect(
        mode === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metalEtemon").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("metalEtemon").instanceId,
            }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.trash.length === 2);

      const playedIds = s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.instanceId);
      expect(playedIds).toContain(s.inst("chuumon").instanceId);
      expect(playedIds).toContain(s.inst("sukamon").instanceId);
      expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
        expect.arrayContaining([s.inst("rest1").instanceId, s.inst("rest2").instanceId]),
      );
      expect(s.state.memory).toBe(mode === "play" ? -1 : 7);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
        mode === "evolve" ? [s.inst("evoDraw").instanceId] : [],
      );
    },
  );
});
