import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-012.js";
import "../index.js";

type Setup = ReturnType<typeof setupEngine>;

async function openMain(s: Setup, seat: 0 | 1): Promise<void> {
  await advance(s.engine).waitForMainPhase(seat);
}

function closeMain(s: Setup, seat: 0 | 1): void {
  advance(s.engine).endMainPhaseIfOpen(seat);
}

describe("EX4-012 VictoryGreymon", () => {
  it("matches the catalog and registers residual-free IR for every printed clause", () => {
    expect(getCardDefinition("EX4-012")).toMatchObject({
      cardId: "EX4-012",
      nameEn: "VictoryGreymon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Red", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Dragonkin"],
      effectText:
        "[When Digivolving] Delete 1 of your opponent's Digimon with 6000 DP or less. For every Digimon your opponent has in play, add 2000 to the maximum this DP-based deletion effect can delete. [All Turns][Once Per Turn] When an opponent's Digimon is deleted, if you have a Tamer in play, delete 1 of your opponent's Digimon with the highest DP.",
    });
    expect(runtimeCompiledCard("EX4-012")).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } },
        count: 1,
      },
      dpCeiling: 6000,
      dpCeilingScaling: {
        per: 1,
        amount: 2000,
        unit: "cards",
        filter: { zone: "battleArea", controller: "opponent", kind: ["Digimon"] },
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: { controller: "opponent", kind: ["Digimon"] },
      condition: {
        kind: "youHave",
        filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"] },
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
    });
  });

  it("digivolves from a red level-5 Digimon, draws, and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX4-009", as: "base" }],
        hand: [{ card: "EX4-012", as: "victory" }],
        deck: ["BT1-012", "BT1-013"],
      },
    });
    const sourceInstanceId = s.inst("base").instanceId;
    const evolutionInstanceId = s.inst("victory").instanceId;
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: evolutionInstanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX4-012");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard?.instanceId).toBe(evolutionInstanceId);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([sourceInstanceId]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-012");
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("rejects a non-red level-5 evolution route without paying or moving cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX4-036", as: "wrongColor" }],
        hand: [{ card: "EX4-012", as: "victory" }],
        deck: ["BT1-012"],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongColor").permanentId,
        instanceId: s.inst("victory").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(4);
    expect(s.perm("wrongColor").topCard?.cardId).toBe("EX4-036");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("victory").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("deletes one opposing Digimon at the exact scaled ceiling through public digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-009", as: "base" }],
          hand: [{ card: "EX4-012", as: "victory" }],
          deck: ["BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target", dp: 10000 },
            { card: "BT1-009", as: "other", dp: 1000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const targetPermanentId = s.perm("target").permanentId;
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("victory").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard?.cardId).toBe("EX4-012");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetPermanentId)).toBe(false);
    expect(s.perm("other").currentDP).toBe(1000);
  });

  it("does not count a breeding Digimon or delete above the exact scaled ceiling", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-009", as: "base" }],
          hand: [{ card: "EX4-012", as: "victory" }],
          deck: ["BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target", dp: 10001 },
            { card: "BT1-009", as: "other", dp: 1000 },
          ],
          breeding: { card: "BT1-009", as: "breeding", dp: 3000 },
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("victory").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.perm("target").currentDP).toBe(10001);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    ).toBe(true);
    expect(s.state.players[1]!.breeding?.permanentId).toBe(s.perm("breeding").permanentId);
  });

  it("deletes the opposing highest-DP Digimon once per turn and resets on the next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX4-012", as: "victory" },
          { card: "BT1-085", as: "tamer" },
          { card: "BT1-009", as: "attacker", dp: 10000 },
        ],
        deck: ["BT1-012", "BT1-013", "BT1-014"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first", dp: 3000 },
          { card: "BT1-009", as: "highest", dp: 7000 },
          { card: "BT1-009", as: "second", dp: 2000 },
          { card: "BT1-009", as: "third", dp: 6000, suspended: true },
          { card: "BT1-009", as: "survivor", dp: 5000 },
        ],
        deck: ["BT1-012", "BT1-013", "BT1-014"],
      },
    });
    const highestPermanentId = s.perm("highest").permanentId;
    const survivorPermanentId = s.perm("survivor").permanentId;
    s.state.turnSeat = 0;
    await s.ready();
    const firstTurn = s.engine.runOneTurn();
    await openMain(s, 0);

    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.battleArea.length === 3);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highestPermanentId)).toBe(
      false,
    );

    await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("third").permanentId),
    ).toBe(true);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("survivor").permanentId),
    ).toBe(true);

    closeMain(s, 0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await openMain(s, 1);
    await advance(s.engine).verb.suspend([s.perm("third").permanentId]);
    closeMain(s, 1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 10;
    const nextOwnTurn = s.engine.runOneTurn();
    await openMain(s, 0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("third").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === survivorPermanentId)).toBe(
      false,
    );

    await settle();
    closeMain(s, 0);
    await nextOwnTurn;
  });

  it("does not trigger the follow-up deletion without one of your Tamers in play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX4-012", as: "victory" }], deck: ["BT1-012", "BT1-013"] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first", dp: 3000 },
          { card: "BT1-009", as: "highest", dp: 7000 },
        ],
        deck: ["BT1-012", "BT1-013"],
      },
    });
    s.state.turnSeat = 0;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);

    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId], "byEffect");

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("highest").currentDP).toBe(7000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores deletion of your own Digimon for the opponent-deletion watcher", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX4-012", as: "victory" },
          { card: "BT1-085", as: "tamer" },
          { card: "BT1-009", as: "own", dp: 3000 },
        ],
        deck: ["BT1-012", "BT1-013"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "highest", dp: 7000 }], deck: ["BT1-012", "BT1-013"] },
    });
    s.state.turnSeat = 0;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await openMain(s, 0);

    await advance(s.engine).verb.deletePermanent([s.perm("own").permanentId], "byEffect");

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("highest").currentDP).toBe(7000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
