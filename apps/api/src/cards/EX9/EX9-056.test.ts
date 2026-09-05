import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-056.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("EX9-056", () => {
  it.each([false, true])(
    "Q4815 pays once to prevent every own Ver.3 in one simultaneous deletion (includes source=%s)",
    async (includesSource) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX9-056", as: "source" },
              { card: "EX9-059", as: "first" },
              { card: "EX9-059", as: "second" },
            ],
            security: ["BT1-010", "BT1-011"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      const first = s.perm("first").permanentId;
      const second = s.perm("second").permanentId;
      const targets = includesSource ? [s.perm("source").permanentId, first, second] : [first, second];
      expect(await advance(s.engine).verb.deletePermanent(targets, "byEffect")).toBe(0);
      await settle();
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
        s.perm("source").permanentId,
        first,
        second,
      ]);
      expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-011"]);
      expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-010"]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it("has Blast Digivolve and places an opposing 8000-DP-or-lower Digimon at the bottom of security on play or digivolution", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toContainEqual({
      keyword: "BlastDigivolve",
      raw: "＜Blast Digivolve＞",
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects?.find((entry) => entry.trigger === trigger);
      const action = effect?.actions[0];
      expect(effect?.actions).toHaveLength(1);
      expect(action).toMatchObject({
        kind: "SecurityManipulation",
        op: "trashTop",
        controller: "opponent",
        amount: 1,
        abortOnDecline: true,
        cost: { kind: "place", destination: "security", position: "bottom", faceDown: true },
      });
      expect(irNode(action?.cost)?.target?.filter).toMatchObject({ dp: { op: "lte", value: 8000 } });
    }
  });
  it("once per turn prevents a Ver.3 Digimon from leaving by trashing top security", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Replacement", event: "wouldLeavePlay", mode: "prevent", cost: { kind: "trashSecurityTop" } }],
    }));
  it("allows either player's qualifying Digimon as the bottom-security payment and affects all own Ver.3 leaves", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        abortOnDecline: true,
        kind: "SecurityManipulation",
        op: "trashTop",
        controller: "opponent",
        amount: 1,
        cost: {
          targetIsPermanent: true,
          target: { filter: { controller: "any", kind: ["Digimon"], dp: { op: "lte", value: 8000 } }, count: 1 },
          destination: "security",
          position: "bottom",
          faceDown: true,
        },
      });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      affectsAll: true,
      target: {
        filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ver.3"], match: "trait" }] },
      },
    });
  });
  it("places the opposing Digimon at security bottom and trashes that player's top security on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-056", as: "source" }] },
        1: {
          battleArea: [{ card: "EX9-050", as: "target", dp: 4000, under: ["EX9-001"] }],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-011", "EX9-050"]);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
  });

  it("places an own qualifying Digimon at its owner's security bottom on digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-056", as: "source" },
            { card: "EX9-059", as: "ownTarget", dp: 4000 },
          ],
        },
        1: { security: ["BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-059")).toBe(false);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["EX9-059"]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
  });

  it("prevents an own Ver.3 from leaving by trashing the controller's top security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-056", as: "source" },
            { card: "EX9-059", as: "target" },
          ],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    expect(await advance(s.engine).verb.deletePermanent([s.perm("target").permanentId], "byEffect")).toBe(0);
    await settle(() => s.perm("target").topCard.cardId === "EX9-059");

    expect(s.perm("target").topCard.cardId).toBe("EX9-059");
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
  });

  it("also prevents this Ver.3 source itself from leaving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-056", as: "source" }], security: ["BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect")).toBe(0);
    await settle(() => s.perm("source").topCard.cardId === "EX9-056");

    expect(s.perm("source").topCard.cardId).toBe("EX9-056");
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
  });
});
