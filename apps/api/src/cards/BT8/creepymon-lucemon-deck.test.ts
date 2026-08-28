import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT4/BT4-115.js";
import "../BT7/BT7-111.js";
import "./BT8-111.js";

describe("BT8 Creepymon Lucemon toolbox", () => {
  it("recovers with Lucemon, revives Chaos Mode, then mills six at 20 trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-012", as: "creepymonBase" }],
          hand: [
            { card: "BT4-115", as: "lucemon" },
            { card: "BT8-111", as: "creepymon" },
          ],
          trash: [{ card: "BT7-111", as: "chaosMode" }, ...Array.from({ length: 16 }, () => "BT4-033")],
          deck: [{ card: "BT4-041", as: "recovered" }, "BT1-001", "BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT7-085", as: "deletedTamer" }, "BT1-015", "BT1-016"],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006", "BT1-007"],
          security: ["BT1-011"],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    s.state.memory = 10;
    const recoveredId = s.inst("recovered").instanceId;
    const deletedTamerId = s.perm("deletedTamer").permanentId;
    preferred.push(s.inst("chaosMode").instanceId, deletedTamerId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("lucemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === recoveredId));
    expect(s.state.memory).toBe(5);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("creepymonBase").permanentId,
        instanceId: s.inst("creepymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT7-111") &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === deletedTamerId) &&
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-111"),
      5000,
    );

    expect(s.state.players[0]!.trash).toHaveLength(20);
    // The digivolution continuation also recomputes persistent effects. Wait for that
    // production pass before starting a second main-phase verb.
    await s.engine.recomputeContinuousEffects();
    const baseDP = s.perm("creepymonBase").baseDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("creepymonBase").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.deck.length === 1 &&
        !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
      5000,
    );

    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(s.perm("creepymonBase").currentDP).toBe(baseDP + 6000);
  });

  it("mills eight cards against four Digimon but revives exactly one purple level 5", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-012", as: "base" }],
          hand: [{ card: "BT8-111", as: "creepymon" }],
          deck: [
            { card: "BT1-001", as: "digivolveDraw" },
            { card: "BT6-076", as: "chosenLevelFive" },
            { card: "BT8-041", as: "otherLevelFive" },
            "BT1-002",
            "BT1-003",
            "BT1-004",
            "BT1-005",
            "BT1-006",
            "BT1-007",
          ],
        },
        1: {
          battleArea: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.inst("chosenLevelFive").instanceId);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("creepymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("chosenLevelFive").instanceId,
      ),
    );

    const revivedLevelFives = s.state.players[0]!.battleArea.filter((permanent) =>
      [s.inst("chosenLevelFive").instanceId, s.inst("otherLevelFive").instanceId].includes(
        permanent.topCard.instanceId,
      ),
    );
    expect(revivedLevelFives).toHaveLength(1);
    const revivedId = revivedLevelFives[0]!.topCard.instanceId;
    const unrevivedId = [s.inst("chosenLevelFive").instanceId, s.inst("otherLevelFive").instanceId].find(
      (instanceId) => instanceId !== revivedId,
    )!;
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === unrevivedId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(7);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("digivolveDraw").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
