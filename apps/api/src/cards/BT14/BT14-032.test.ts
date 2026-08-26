import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-032.js";

describe("BT14-032", () => {
  it("preserves Chuumon's catalog identity and complete IR", () => {
    expect(getCardDefinition("BT14-032")).toMatchObject({
      nameEn: "Chuumon",
      colors: ["Yellow"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Yellow", level: 2, memoryCost: 0 },
        { color: "Black", level: 2, memoryCost: 0 },
      ],
      attributes: ["Virus"],
      types: ["Beast"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1 },
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          optional: true,
          toTop: true,
          source: { filter: { nameOrTrait: [{ tokens: ["Sukamon"], match: "name" }] } },
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" }],
    });
  });

  it("Q2406 privately adds the top security card and may decline placing Sukamon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT14-032", as: "chuumon" },
            { card: "BT14-034", as: "sukamon" },
          ],
          security: [{ card: "BT1-001", as: "privateCard" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chuumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("privateCard").instanceId));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT14-034");
    expect(s.events.some((event) => event.kind === "cardRevealed")).toBe(false);
    expect(s.state.memory).toBe(7);
    assertNoLoudGap(s);
  });

  it("Q2405 may place a Sukamon on top even when security started empty", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT14-032", as: "chuumon" },
            { card: "BT14-034", as: "sukamon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chuumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT14-034"));
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT14-034"]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("inherits -3000 DP after a legal Chuumon to Sukamon evolution stack is deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-032", as: "base" }], hand: [{ card: "BT14-034", as: "sukamon" }] },
        1: { battleArea: [{ card: "BT14-026", as: "target", dp: 8000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sukamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT14-034");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT14-032"]);
    expect(s.state.memory).toBe(3);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("base").permanentId], "byEffect")).toBe(1);
    await settle(() => s.perm("target").currentDP === 5000);
    expect(s.perm("target").currentDP).toBe(5000);
    assertNoLoudGap(s);
  });
});
