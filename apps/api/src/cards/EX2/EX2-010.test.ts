import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import "../BT19/BT19-014.js";
import "./EX2-067.js";
import "./EX2-009.js";
import "./EX2-010.js";
import "./EX2-011.js";
import { compiled } from "./EX2-010.js";

const FILLER_DECK = ["BT1-009", "BT1-010", "BT1-011", "BT1-012"];

describe("EX2-010 WarGrowlmon", () => {
  it("matches the catalog and compiles both printed effects", () => {
    expect(getCardDefinition("EX2-010")).toMatchObject({
      cardId: "EX2-010",
      nameEn: "WarGrowlmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [{ color: "Red", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Cyborg"],
      effectText:
        "[When Attacking] Delete 1 of your opponent's Digimon with 4000 DP or less. If you have a red Tamer in play, delete 1 of your opponent's Digimon with 6000 DP or less instead.",
      inheritedEffectText: "[Your Turn] Add 1000 to the maximum DP you can choose with DP-based deletion effects.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "WhenAttacking",
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", dp: { op: "lte", value: 4000 } }, count: 1 },
            },
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", dp: { op: "lte", value: 6000 } }, count: 1 },
            },
          ],
        },
        {
          trigger: "YourTurn",
          isInherited: true,
          actions: [{ kind: "CostModifier", mode: "raiseCeiling", costType: "dpDeletion", amount: 1000 }],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("uses only the 6000 DP replacement limit with a red Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-010", as: "attacker" }, "EX2-056"] },
        1: {
          battleArea: [
            { card: "ST10-10", as: "target6000" },
            { card: "ST4-09", as: "target7000" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    const target7000Id = s.perm("target7000").permanentId;
    await s.ready();
    expect(s.perm("target6000").currentDP).toBe(6000);
    expect(s.perm("target7000").currentDP).toBe(7000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(target7000Id);
  });

  it("uses the 4000 DP base limit without a red Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-010", as: "attacker" }] },
        1: {
          battleArea: [
            { card: "ST10-10", as: "target6000" },
            { card: "ST1-04", as: "target4000" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("target6000").permanentId);
  });

  it("raises another effect's numeric deletion ceiling by 1000 through a legal evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-009", as: "base" }],
          hand: [
            { card: "EX2-010", as: "warGrowlmon" },
            { card: "EX2-011", as: "gallantmon" },
            { card: "EX2-067", as: "fireBall" },
          ],
          deck: FILLER_DECK,
          security: ["BT1-012"],
        },
        1: { battleArea: [{ card: "EX2-031", as: "target4000" }], deck: FILLER_DECK, security: ["BT1-012"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("warGrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX2-010");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gallantmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX2-011");
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("fireBall").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("base").topCard?.cardId).toBe("EX2-011");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX2-009", "EX2-010"]);
    expect(s.state.memory).toBe(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not raise the opponent's deletion ceiling during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-010", as: "warGrowlmon" },
            { card: "EX2-031", dp: 4000, as: "target" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "redSource" }],
          hand: [{ card: "EX2-067", as: "fireBall" }],
          deck: FILLER_DECK,
          security: ["BT1-012"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("fireBall").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("warGrowlmon").permanentId,
      s.perm("target").permanentId,
    ]);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not raise a source-relative DP ceiling (Q3292)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-010", as: "warGrowlmon" },
            { card: "BT19-014", as: "relativeAttacker" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 13_000, as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("relativeAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("target").permanentId);
  });
});
