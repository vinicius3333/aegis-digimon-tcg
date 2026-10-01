import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-057.js";

describe("BT11-057 Titamon", () => {
  it("maps its dual-color mega, Piercing, and conditional trash/suspend/memory sequence", () => {
    expect(getCardDefinition("BT11-057")).toMatchObject({
      cardId: "BT11-057",
      colors: ["Green", "Purple"],
      level: 6,
      playCost: 12,
      dp: 12000,
      types: ["Shaman"],
    });
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Piercing" }] });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Trash" },
        {
          kind: "Suspend",
          condition: { kind: "namedCountAtLeast", countSource: "titamonTrashedCards", count: 1 },
        },
        {
          kind: "GainMemory",
          condition: { kind: "namedCountAtLeast", countSource: "titamonTrashedCards", count: 1 },
        },
      ],
    });
  });

  it("trashes up to 3, suspends that many opposing Digimon, then gains memory for all suspended opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-075", as: "base" }],
          hand: [
            { card: "BT11-057", as: "titamon" },
            { card: "BT1-009", as: "discard-a" },
            { card: "BT1-010", as: "discard-b" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target-a" },
            { card: "BT1-015", as: "target-b" },
            { card: "BT1-020", as: "already-suspended", suspended: true },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("titamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.length === 2 &&
        s.state.players[1]!.battleArea.every(({ isSuspended }) => isSuspended),
    );
    expect(s.state.players[1]!.battleArea.every(({ isSuspended }) => isSuspended)).toBe(true);
    expect(s.state.memory).toBe(9);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
  });

  it("does not suspend an opponent when no hand card was trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-075", as: "base" }],
          hand: [{ card: "BT11-057", as: "titamon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target" },
            { card: "BT1-020", as: "already-suspended", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("titamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-057");

    expect(s.perm("target").isSuspended).toBe(false);
    expect(s.state.memory).toBe(6);
  });

  it("still gains memory after trashing when every opposing Digimon was already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-075", as: "base" }],
          hand: [
            { card: "BT11-057", as: "titamon" },
            { card: "BT1-009", as: "discard" },
          ],
        },
        1: { battleArea: [{ card: "BT1-020", as: "already-suspended", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("titamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("discard").instanceId));

    expect(s.state.memory).toBe(7);
  });
});

describe("BT11-057 Titamon — KB Q&A rulings", () => {
  it("may trash 3 hand cards even when the opponent has only 1 Digimon (Q2091)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-075", as: "base" }],
        hand: [
          { card: "BT11-057", as: "titamon" },
          { card: "BT1-009", as: "discardA" },
          { card: "BT1-010", as: "discardB" },
          { card: "BT1-011", as: "discardC" },
        ],
      },
      1: { battleArea: [{ card: "BT1-010", as: "onlyTarget" }] },
    });
    s.state.memory = 10;
    const discardIds = [s.inst("discardA").instanceId, s.inst("discardB").instanceId, s.inst("discardC").instanceId];

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("titamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const handPick = s.decisions.at(-1)!.req;
    expect(handPick.options).toMatchObject({ min: 0, max: 3 });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: handPick.decisionId,
        response: { kind: "selectCards", instanceIds: discardIds },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("onlyTarget").isSuspended && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(expect.arrayContaining(discardIds));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("onlyTarget").isSuspended).toBe(true);
    expect(s.state.memory).toBe(7);
  });
});
