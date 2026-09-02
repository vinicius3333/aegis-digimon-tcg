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
    expect(s.state.memory).toBe(9); // the printed evolution cost is 4, then all three opposing Digimon count
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
    expect(s.state.memory).toBe(6); // evolution cost only; no trash cost means no memory gain
  });

  it("still gains memory after trashing when every opposing Digimon was already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-075", as: "base" }],
          hand: [
            { card: "BT11-057", as: "titamon" },
            { card: "BT1-001", as: "discard" },
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

    expect(s.state.memory).toBe(7); // evolution cost 4, then 1 for the already-suspended Digimon
  });
});
