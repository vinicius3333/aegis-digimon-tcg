import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-094.js";
import "../index.js";

describe("BT24-094 Central Town: Throne Room", () => {
  it("encodes color waiver, face-up security static effects, main security exchange, and Security play", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          condition: { kind: "youHaveNone", filter: { zone: "security", faceUp: true } },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      isSecurity: true,
      actions: [
        { kind: "Aura", effect: { kind: "modifyDP", amount: 2000 } },
        {
          kind: "Aura",
          effect: { kind: "keyword", keyword: { keyword: "Alliance" } },
          while: { filter: { nameOrTrait: [{ tokens: ["Merukimon", "Minervamon"], match: "nameExact" }] } },
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Main",
      actions: [
        { kind: "SecurityManipulation", op: "toHand", toTop: false },
        { kind: "SecurityManipulation", op: "placeAsSecurity", toTop: false, faceUp: true },
        { kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 3 },
      ],
    });
    expect(compiled.effects[3]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true }],
    });
  });

  it("grants source-bound DP and conditional Alliance from face-up security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT24-094", as: "town", faceUp: true }],
        battleArea: [
          { card: "BT24-042", as: "eligible" },
          { card: "EX5-042", as: "merukimon" },
          { card: "BT1-009", as: "ineligible" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("eligible").currentDP).toBe(s.perm("eligible").baseDP + 2000);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("merukimon"), "Alliance")).toBe(false);
    expect(s.perm("ineligible").currentDP).toBe(s.perm("ineligible").baseDP);

    await advance(s.engine).verb.trash([s.inst("town").instanceId]);
    expect(s.perm("eligible").currentDP).toBe(s.perm("eligible").baseDP);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Alliance")).toBe(false);
  });

  it("does not grant Alliance without exact Merukimon or Minervamon", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT24-094", faceUp: true }],
        battleArea: [{ card: "BT24-042", as: "eligible" }],
      },
    });
    await s.ready();

    expect(s.perm("eligible").currentDP).toBe(s.perm("eligible").baseDP + 2000);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Alliance")).toBe(false);
  });

  it("exchanges bottom security for itself and plays a reduced-cost TS Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-045", as: "yellowSource" }],
          hand: [
            { card: "BT24-094", as: "source" },
            { card: "BT24-024", as: "digimon" },
          ],
          security: [{ card: "BT1-001", as: "bottom" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const sourceCard = s.inst("source");
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: sourceCard.instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT24-024"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === sourceCard.instanceId && card.faceUp)).toBe(
      true,
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT24-024")).toBe(true);
  });

  it("plays a level 4 green or yellow TS Digimon from Security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT24-094", as: "town" }],
          trash: [{ card: "BT24-034", as: "digimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("town"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("digimon").instanceId),
    );
  });
});
