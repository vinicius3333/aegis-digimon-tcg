import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./BT20-014.js";

describe("BT20-014 SaviorHuckmon", () => {
  it("deletes up to 5000 DP, pays no cost for the optional Jesmon evolution, and gates Alliance on Royal Knight", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 5000 } }, count: 1 },
          },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: false,
          optional: true,
          abortOnDecline: true,
          cost: { kind: "suspend" },
          into: { nameOrTrait: [{ tokens: ["Jesmon"], match: "name" }] },
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Alliance" },
          condition: { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }] } },
        },
      ],
    });
  });

  it("deletes at the 5000-DP boundary, then suspends another Digimon to evolve into Jesmon for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-010", as: "other" }],
          hand: [
            { card: "BT20-014", as: "savior" },
            { card: "BT20-017", as: "jesmon" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT20-010", dp: 5000, as: "low" },
            { card: "BT20-012", dp: 6000, as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("savior").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowId));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highId)).toBe(true);
    const savior = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-014")!;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, savior);
    await settle(() => savior.topCard.cardId === "BT20-017");
    expect(s.perm("other").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("grants inherited Alliance only to a Royal Knight host on its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-017", as: "royalKnight", under: ["BT20-014"] },
          { card: "BT20-015", as: "chronicle", under: ["BT20-014"] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("royalKnight"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chronicle"), "Alliance")).toBe(false);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("royalKnight"), "Alliance")).toBe(false);
  });
});
