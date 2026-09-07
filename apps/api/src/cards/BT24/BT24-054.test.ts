import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_054 } from "./BT24-054.js";
import "../index.js";

describe("BT24-054 Ryudamon", () => {
  it("matches the immutable catalog identity and evolution routes", () => {
    expect(getCardDefinition("BT24-054")).toMatchObject({
      cardId: "BT24-054",
      nameEn: "Ryudamon",
      colors: ["Black", "Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Beast", "X Antibody", "DigiPolice", "SEEKERS"],
      evoCosts: [
        { color: "Black", level: 2, memoryCost: 1 },
        { color: "Green", level: 2, memoryCost: 1 },
      ],
    });
    expect(BT24_054.digivolutionRequirement).toEqual([
      { namesExact: ["Kyokyomon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["DigiPolice", "SEEKERS"], cost: 0, isAlternate: true },
    ]);
  });

  it("limits the inherited suspension target by this Digimon's play cost", () => {
    const inherited = BT24_054.effects?.find((entry) => entry.isInherited);
    expect((inherited?.actions?.[0] as any).actions?.[0]).toMatchObject({
      kind: "Suspend",
      target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"], playCostLteTriggerSource: true } },
    });
  });
  it("responds to your Shuu Yulin being played with optional Hisyaryumon digivolution", () => {
    const effect = BT24_054.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenPlayed" });
    expect((effect?.actions?.[0] as any).actions?.[0]).toMatchObject({
      kind: "Digivolve",
      payCost: true,
      costOverride: 3,
      ignoreRequirements: true,
      optional: true,
    });
  });

  it.each([
    ["normal black level-2 requirement", "BT17-005", false, undefined, 1],
    ["exact Kyokyomon requirement", "BT24-005", true, 0, 0],
    ["DigiPolice/SEEKERS requirement", "BT20-003", true, 1, 0],
  ])("uses the %s", async (_label, baseCard, useAlternateCost, alternateRequirementIndex, expectedCost) => {
    const s = setupEngine({
      0: {
        breeding: { card: baseCard, as: "base" },
        hand: [{ card: "BT24-054", as: "ryudamon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ryudamon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("ryudamon").instanceId);

    expect(s.state.memory).toBe(3 - expectedCost);
  });

  it("evolves itself into exact Hisyaryumon for cost 3 when Shuu Yulin is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-054", as: "ryudamon" }],
          hand: [
            { card: "BT15-087", as: "shuu" },
            { card: "BT24-060", as: "hisyaryumon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shuu").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("ryudamon").topCard.instanceId === s.inst("hisyaryumon").instanceId);

    expect(s.state.memory).toBe(3);
  });

  it("inherited effect suspends only a target within its host's play cost when that host suspends", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-055", as: "host", under: ["BT24-054"] }] },
        1: {
          battleArea: [
            { card: "BT1-088", as: "low" },
            { card: "BT24-051", as: "high" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("high").topCard.instanceId, s.perm("low").topCard.instanceId);
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);

    expect(s.perm("low").isSuspended).toBe(true);
    expect(s.perm("high").isSuspended).toBe(false);
  });

  it("inherited effect ignores a neighboring Digimon's suspension", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-055", as: "host", under: ["BT24-054"] },
            { card: "BT1-009", as: "neighbor" },
          ],
        },
        1: { battleArea: [{ card: "BT1-088", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("neighbor").permanentId]);

    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("uses inherited suspension once per turn and resets on the next public attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-055", as: "host", under: ["BT24-054"] }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-088", as: "first" },
            { card: "BT1-089", as: "second" },
          ],
          security: ["BT1-010", "BT1-011", "BT1-012"],
          deck: ["BT1-013", "BT1-014", "BT1-015", "BT1-016"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId, s.perm("second").permanentId);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("first").isSuspended);
    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    preferred.splice(0, preferred.length, s.perm("second").permanentId);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("second").isSuspended);
    expect(s.perm("second").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("activates inherited suspension from a public attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-055", as: "host", under: ["BT24-054"] }] },
      1: { security: ["BT1-010"], battleArea: [{ card: "BT1-088", as: "target" }] },
    });
    const targetId = s.perm("target").permanentId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.state.players[1]!.battleArea.find((p) => p.permanentId === targetId)!.isSuspended).toBe(true);
  });
});
