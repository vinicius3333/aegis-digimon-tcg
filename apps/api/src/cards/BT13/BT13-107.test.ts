import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-107.js";
import "./BT13-058.js";

describe("BT13-107 Vulcan Crusher", () => {
  it("returns one suspended opposing Digimon whose DP is at most the chosen own Digimon's DP", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.slice(0, 2)).toMatchObject([
      {
        kind: "SelectBind",
        target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, bindAs: "chosenDigimon" },
      },
      {
        kind: "Return",
        to: "hand",
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[1]).toMatchObject({
      to: "hand",
      target: {
        filter: {
          controller: "opponent",
          suspended: true,
          kind: ["Digimon"],
          relativeTo: { attr: "dp", op: "lte", selectionRef: "chosenDigimon" },
        },
        count: 1,
      },
    });
  });

  it("requires an optional exact Leopardmon top-card return cost before unsuspending all own Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[2]).toMatchObject({
      kind: "Unsuspend",
      target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" },
      cost: {
        kind: "return",
        target: {
          filter: {
            controller: "mine",
            zone: "battleArea",
            kind: ["Digimon"],
            nameOrTrait: [{ match: "nameExact", tokens: ["Leopardmon: Leopard Mode"] }],
          },
          count: 1,
          topCardOnly: true,
        },
        optional: true,
      },
      abortOnDecline: true,
    });
    expect(
      compiled.effects?.find((entry) => entry.trigger === "Security")?.actions?.map((action) => action.kind),
    ).toEqual(["Suspend", "AddToHandSelf"]);
  });

  it("suspends an opposing Digimon and returns itself when revealed in security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT13-107", as: "vulcan", faceUp: true }] },
      1: { battleArea: [{ card: "BT1-012", as: "target" }] },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("vulcan"));
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("vulcan").instanceId)).toBe(true);
  });

  it("returns the visible Leopardmon top while preserving an arbitrary undercard and unsuspends own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-107", as: "vulcan" }],
          battleArea: [
            { card: "BT13-058", as: "host", under: ["BT1-009"], suspended: true },
            { card: "BT13-036", as: "other", suspended: true },
          ],
          deck: [],
        },
        1: {
          battleArea: [
            { card: "BT1-015", as: "low", suspended: true, dp: 1000 },
            { card: "BT13-111", as: "high", suspended: true, dp: 13000 },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vulcan").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("low").instanceId));

    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("high").instanceId),
    ).toBe(true);
    expect(s.perm("host").topCard.cardId).toBe("BT1-009");
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT13-058")).toBe(true);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("other").isSuspended).toBe(false);
  });

  it("promotes a DP-bearing Mother D-Reaper Digi-Egg without marking it for rule trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-107", as: "vulcan" }],
          battleArea: [
            { card: "BT13-058", as: "host", under: ["EX2-007"], suspended: true },
            { card: "BT13-036", as: "other", suspended: true },
          ],
          deck: [],
        },
        1: { battleArea: [{ card: "BT1-015", as: "target", suspended: true, dp: 1000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vulcan").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("target").instanceId));

    expect(s.perm("host").topCard.cardId).toBe("EX2-007");
    expect(s.perm("host").baseDP).toBe(15000);
    expect(s.perm("host").currentDP).toBe(15000);
    expect(s.perm("host").invalidNoDpStackTop).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX2-007")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT13-058")).toBe(true);
    expect(s.perm("other").isSuspended).toBe(false);
  });

  it("Q2359: cannot pay the optional return cost when Leopardmon has no stack card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-107", as: "vulcan" }],
          battleArea: [
            { card: "BT13-058", as: "host", suspended: true },
            { card: "BT13-036", as: "other", suspended: true },
          ],
          deck: [],
        },
        1: { battleArea: [{ card: "BT1-015", as: "target", suspended: true, dp: 1000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vulcan").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("target").instanceId));

    expect(s.perm("host").topCard.cardId).toBe("BT13-058");
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("other").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT13-058")).toBe(false);
  });

  it("Q2360: promotes a level-2 no-DP Digi-Egg, then trashes the invalid top after full resolution", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-107", as: "vulcan" }],
          battleArea: [
            { card: "BT13-058", as: "host", under: ["BT13-001"], suspended: true },
            { card: "BT13-036", as: "other", suspended: true },
          ],
          deck: [],
        },
        1: { battleArea: [{ card: "BT1-015", as: "target", suspended: true, dp: 1000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vulcan").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("target").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT13-001")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-058")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT13-058")).toBe(true);
    expect(s.perm("other").isSuspended).toBe(false);
  });

  it("declining the optional top-card return aborts the unsuspend action", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-107", as: "vulcan" }],
          battleArea: [
            { card: "BT13-058", as: "host", under: ["BT1-009"], suspended: true },
            { card: "BT13-036", as: "other", suspended: true },
          ],
          deck: [],
        },
        1: { battleArea: [{ card: "BT1-015", as: "target", suspended: true, dp: 1000 }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vulcan").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("target").instanceId));

    expect(s.perm("host").topCard.cardId).toBe("BT13-058");
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("other").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT13-058")).toBe(false);
  });
});
