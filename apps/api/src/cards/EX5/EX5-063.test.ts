import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, assertNoLoudGap } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-063.js";
import "../index.js";

describe("EX5-063 Leviamon", () => {
  it("matches the catalog and maps every printed clause", () => {
    expect(getCardDefinition("EX5-063")).toMatchObject({
      cardId: "EX5-063",
      nameEn: "Leviamon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon Lord", "Seven Great Demon Lords"],
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 5 }],
      effectText:
        "＜Security Attack +1＞ (This Digimon checks 1 additional security card)[On Play] [When Digivolving] If your opponent has as many or more total Digimon and Tamers as you, delete 1 of your opponent's Digimon with the highest level. Then, delete 1 of your opponent's Digimon with the lowest level.[All Turns] When an opponent's Digimon is deleted, gain 1 memory for each Digimon.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });

  it("deletes highest then lowest level when the total-Digimon-and-Tamer condition is met", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX5-063", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-020", dp: 9000, as: "highest" },
            { card: "BT1-009", dp: 2000, as: "lowest" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 13;
    const lowestId = s.perm("lowest").permanentId;
    const highestId = s.perm("highest").permanentId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-020", "BT1-009"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("still resolves the unconditional lowest-level deletion when the first condition is false", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "ownOne" },
            { card: "BT1-010", as: "ownTwo" },
            { card: "BT1-011", as: "ownThree" },
          ],
          hand: [{ card: "EX5-063", as: "source" }],
        },
        1: {
          battleArea: [
            { card: "BT1-020", dp: 9000, as: "highest" },
            { card: "BT1-009", dp: 2000, as: "lowest" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 13;
    const lowestId = s.perm("lowest").permanentId;
    const highestId = s.perm("highest").permanentId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === lowestId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === highestId)).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resolves both deletion clauses through a legal purple level-5 evolution", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-060", as: "host" }], hand: [{ card: "EX5-063", as: "evolution" }] },
        1: {
          battleArea: [
            { card: "BT1-020", dp: 9000, as: "highest" },
            { card: "BT1-009", dp: 2000, as: "lowest" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("host").topCard.cardId).toBe("EX5-063");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX5-060"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("rejects a non-purple evolution source without changing the host or memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host" }], hand: [{ card: "EX5-063", as: "evolution" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.perm("host").topCard.cardId).toBe("BT1-009");
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("counts only opponent Digimon deletions, including a simultaneous batch and stack cards only once", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-063", as: "source" }],
          battleArea: [{ card: "BT1-009", as: "own" }],
        },
        1: {
          battleArea: [
            { card: "BT1-020", dp: 9000, as: "opponentOne", under: ["BT1-009"] },
            { card: "BT1-010", dp: 8000, as: "opponentTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 13;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("own").permanentId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("credits its controller when an opponent Digimon is deleted during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX5-063", as: "leviamon", dp: 9000 }],
        security: [{ card: "BT1-009" }],
      },
      1: { battleArea: [{ card: "AD1-001", as: "attacker", dp: 1000 }] },
    });
    s.state.turnSeat = 1;
    const attackerId = s.perm("attacker").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerId));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "AD1-001")).toBe(true);
    expect(s.state.memory).toBe(-1);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("keeps the deletion watcher and condition explicit for Q6035/Q6036/Q6039", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions).toMatchObject([
        {
          kind: "Delete",
          condition: { kind: "boardCountCompare", left: "opponent", op: "gte", right: "mine" },
        },
        { kind: "Delete", target: { filter: { superlative: "lowestLevel" } } },
      ]);
    }
  });
});
