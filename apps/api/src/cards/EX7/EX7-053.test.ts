import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-053.js";
import "../index.js";

describe("EX7-053 Eyesmon: Scatter Mode", () => {
  it("matches the catalog and fully registered IR", () => {
    expect(getCardDefinition("EX7-053")).toMatchObject({
      cardId: "EX7-053",
      nameEn: "Eyesmon: Scatter Mode",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dark Dragon"],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
      {
        kind: "Return",
        to: "hand",
        optional: true,
        target: {
          filter: {
            zone: "trash",
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Evil", "Dark Dragon", "Evil Dragon"], match: "trait" }],
          },
          count: 1,
        },
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Retaliation",
      raw: "＜Retaliation＞",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-053")).toBe(true);
  });

  it.each([
    ["EX7-050", "Evil"],
    ["BT12-010", "Dark Dragon"],
    ["BT11-079", "Evil Dragon"],
  ])("publicly pays the hand cost and returns a %s (%s) Digimon", async (returnable) => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-053", as: "scatter" },
            { card: "BT1-009", as: "discard" },
          ],
          trash: [{ card: returnable, as: "returnable" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("scatter").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("returnable").instanceId));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("discard").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("returnable").instanceId]);
  });

  it("may decline the return after still paying the mandatory hand cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-053", as: "scatter" },
            { card: "BT1-009", as: "discard" },
          ],
          trash: [{ card: "BT12-010", as: "returnable" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("scatter").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discard").instanceId));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("returnable").instanceId, s.inst("discard").instanceId]),
    );
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("can return the eligible Digimon it just discarded", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-053", as: "scatter" },
            { card: "EX7-050", as: "discardAndReturn" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("scatter").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("discardAndReturn").instanceId),
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discardAndReturn").instanceId)).toBe(
      false,
    );
  });

  it("evolves from purple level 3 with exact payment, draw, and stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-071", as: "base" }],
        hand: [{ card: "EX7-053", as: "scatter" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const sourceId = s.perm("base").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("scatter").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX7-053");
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("inherits Retaliation and deletes a stronger opponent after public battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-020", as: "host", under: ["EX7-053"], dp: 1000 }] },
      1: { battleArea: [{ card: "BT1-020", as: "target", suspended: true, dp: 7000 }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-020", "EX7-053"]),
    );
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-020");
  });
});
