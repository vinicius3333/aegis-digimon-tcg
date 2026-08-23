import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_090 } from "./BT24-090.js";
import "../index.js";

describe("BT24-090 Abyss Sanctuary: Throne Room", () => {
  it("models face-up security effects and the bottom-security Main sequence", () => {
    const security = BT24_090.effects?.find((entry) => entry.trigger === "AllTurns");
    expect(security).toMatchObject({ isSecurity: true });
    expect(security?.actions?.[0]).toMatchObject({
      kind: "Aura",
      effect: { kind: "keyword", keyword: { keyword: "Blocker" } },
    });
    expect(security?.actions?.[1]).toMatchObject({
      kind: "Aura",
      effect: { kind: "keyword", keyword: { keyword: "Alliance" } },
      while: {
        kind: "youHave",
        filter: {
          controller: "mine",
          zone: "battleArea",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Neptunemon", "Venusmon"], match: "nameExact" }],
        },
      },
    });

    const main = BT24_090.effects?.find((entry) => entry.trigger === "Main");
    expect(main?.actions?.[0]).toMatchObject({ kind: "SecurityManipulation", op: "toHand", position: "bottom" });
    expect(main?.actions?.[1]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      toTop: false,
      faceUp: true,
    });
    expect(main?.actions?.[2]).toMatchObject({ kind: "PlayWithoutCost", reduceCostBy: 3, optional: true });
  });

  it("grants source-bound Blocker and conditional Alliance from face-up security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT24-090", as: "sanctuary", faceUp: true }],
        battleArea: [
          { card: "BT24-020", as: "eligible" },
          { card: "BT5-030", as: "neptunemon" },
          { card: "BT1-009", as: "ineligible" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("neptunemon"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("neptunemon"), "Alliance")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("ineligible"), "Blocker")).toBe(false);

    await advance(s.engine).verb.trash([s.inst("sanctuary").instanceId]);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Alliance")).toBe(false);
  });

  it("does not grant Alliance without an exact Neptunemon or Venusmon", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT24-090", faceUp: true }],
        battleArea: [{ card: "BT24-020", as: "eligible" }],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Alliance")).toBe(false);
  });

  it("adds bottom security to hand, places itself face up, and plays a TS Digimon for 3 less", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-090", as: "sanctuary" },
            { card: "BT24-020", as: "digimon" },
          ],
          security: [
            { card: "BT1-001", as: "top" },
            { card: "BT1-002", as: "bottom" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sanctuary").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("digimon").instanceId),
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bottom").instanceId);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT24-090" && card.faceUp)).toBe(true);
    expect(s.state.memory).toBe(7);
  });

  it("plays a level 4 blue or yellow TS Digimon from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT24-090", as: "sanctuary" }],
          trash: [{ card: "BT24-022", as: "digimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("sanctuary"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("digimon").instanceId),
    );
  });
});
