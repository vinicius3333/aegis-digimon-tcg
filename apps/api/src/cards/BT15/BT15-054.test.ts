import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT15-054.js";
import "../index.js";

describe("BT15-054", () => {
  it("matches the catalog identity and green level-6 evolution route", () => {
    expect(getCardDefinition("BT15-054")).toMatchObject({
      nameEn: "Rosemon (X Antibody)",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 12000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 4 }],
      types: ["Fairy", "X Antibody"],
    });
  });

  it("suspends an opposing Digimon and Tamer and restricts their unsuspension", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Suspend", target: { bindAs: "digimonTarget" } },
        { kind: "Suspend", target: { bindAs: "tamerTarget" } },
        { kind: "Restrict", target: { fromSelectionRef: "digimonTarget" } },
        { kind: "Restrict", target: { fromSelectionRef: "tamerTarget" } },
      ],
    });
  });
  it("once per turn reacts to an opponent Digimon play or breeding move", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenPlayed" }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentMovedFromBreeding",
          actions: [
            {
              condition: {
                kind: "selfDigivolutionStackHasTrait",
                filter: { nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] },
              },
            },
          ],
        },
      ],
    });
  });

  it("naturally digivolves and must suspend both an opposing Digimon and Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-049", as: "base" }],
          hand: [{ card: "BT15-054", as: "rosemon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponentDigimon" },
            { card: "BT14-086", as: "opponentTamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rosemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponentDigimon").isSuspended && s.perm("opponentTamer").isSuspended);

    expect(s.perm("opponentDigimon").isSuspended).toBe(true);
    expect(s.perm("opponentTamer").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentDigimon"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentTamer"), "unsuspend")).toBe(true);
    expect(s.state.memory).toBe(6);
  });

  it("naturally suspends a played opposing Digimon during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-054", as: "rosemon" }] },
        1: { hand: [{ card: "BT1-009", as: "played" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.turnSeat = 1;
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("played").isSuspended);

    expect(s.perm("played").isSuspended).toBe(true);
  });

  it("naturally reacts to an opposing breeding move when X Antibody is in its stack", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-054", as: "rosemon", under: ["BT15-048"] }] },
        1: {
          breeding: { card: "BT1-009", as: "mover" },
          battleArea: [{ card: "BT1-010", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );

    preferInstanceIds.push(s.perm("target").topCard!.instanceId);
    s.state.turnSeat = 1;
    s.state.phase = Phase.Breeding;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("mover").inBreeding).toBe(false);
  });
});
