import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-001.js";
import "../BT4/BT4-104.js";
import "./EX2-006.js";
import "./EX2-039.js";
import { compiled } from "./EX2-006.js";

const FILLER_DECK = [
  "BT1-009",
  "BT1-010",
  "BT1-011",
  "BT1-012",
  "BT1-013",
  "BT1-014",
  "BT1-009",
  "BT1-010",
  "BT1-011",
  "BT1-012",
  "BT1-013",
  "BT1-014",
];
const INERT_SECURITY = ["BT1-009", "BT1-011", "BT1-012"];

describe("EX2-006 Yaamon", () => {
  it("matches the catalog and compiles the inherited conditional Aura", () => {
    expect(getCardDefinition("EX2-006")).toMatchObject({
      cardId: "EX2-006",
      nameEn: "Yaamon",
      colors: ["Purple"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      forms: ["In-Training"],
      types: ["Lesser"],
    });
    expect(getCardDefinition("EX2-006")!.inheritedEffectText).toBe(
      "[Your Turn] While there are 10 or more cards in your trash, this Digimon gets +2000 DP.",
    );
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "Aura",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            effect: { kind: "modifyDP", amount: 2000 },
            while: {
              kind: "zoneCount",
              seat: "mine",
              zone: "trash",
              op: "gte",
              value: 10,
              raw: "there are 10 or more cards in your trash",
            },
          },
        ],
        isInherited: true,
      },
    ]);
  });

  it("crosses the exact 10-card threshold from the controller's own trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-015", as: "host", under: ["EX2-006"] },
            { card: "EX2-015", as: "other" },
            { card: "EX2-021", as: "yellow" },
          ],
          hand: [{ card: "BT4-104", as: "threshold" }],
          security: ["BT1-009"],
          trash: Array.from({ length: 9 }, () => "BT1-001"),
          deck: FILLER_DECK,
        },
        1: {
          trash: Array.from({ length: 10 }, () => "BT1-001"),
          security: INERT_SECURITY,
          deck: FILLER_DECK,
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
    expect(s.perm("other").currentDP).toBe(6000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("threshold").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 10);
    expect(s.perm("host").currentDP).toBe(8000);
    expect(s.perm("other").currentDP).toBe(6000);
    expect(s.state.players[1]!.trash).toHaveLength(10);
  });

  it("proves the inherited effect through a legal purple egg stack", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "EX2-006", as: "egg" }],
        hand: [{ card: "EX2-039", as: "impmon" }],
        trash: Array.from({ length: 10 }, () => "BT1-001"),
        security: INERT_SECURITY,
        deck: FILLER_DECK,
      },
      1: { security: INERT_SECURITY, deck: FILLER_DECK },
    });
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX2-006");
    const egg = s.state.players[0]!.breeding!;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: egg.permanentId,
        instanceId: s.inst("impmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => egg.topCard?.cardId === "EX2-039");
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: egg.permanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding === undefined);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.perm("egg").topCard?.cardId).toBe("EX2-039");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["EX2-006"]);
    expect(s.perm("egg").currentDP).toBe(3000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("rejects an illegal off-colour source for the comparison evolution stack", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "redEgg" },
        hand: [{ card: "EX2-039", as: "impmon" }],
        security: INERT_SECURITY,
        deck: FILLER_DECK,
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redEgg").permanentId,
        instanceId: s.inst("impmon").instanceId,
      }),
    ).not.toEqual({ ok: true });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("impmon").instanceId]);
  });

  it("does not grant the bonus during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-015", as: "host", under: ["EX2-006"] }],
        trash: Array.from({ length: 10 }, () => "BT1-001"),
        security: INERT_SECURITY,
        deck: FILLER_DECK,
      },
      1: { security: INERT_SECURITY, deck: FILLER_DECK },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
  });
});
