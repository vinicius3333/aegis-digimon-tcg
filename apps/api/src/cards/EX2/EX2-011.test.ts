import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../LM/LM-021.js";
import "./EX2-008.js";
import "./EX2-009.js";
import "./EX2-010.js";
import { compiled } from "./EX2-011.js";

describe("EX2-011 Gallantmon", () => {
  it("matches the catalog and compiles all three printed clauses", () => {
    expect(getCardDefinition("EX2-011")).toMatchObject({
      cardId: "EX2-011",
      nameEn: "Gallantmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Red", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Holy Warrior", "Royal Knight"],
      effectText:
        "[Your Turn] This Digimon gets +2000 DP.[Your Turn] While you have a red Tamer in play, add 2000 to the maximum DP you can choose with DP-based deletion effects.[When Attacking] Choose any number of your opponent's Digimon whose total DP adds up to 6000 or less and delete them.",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              amount: 2000,
              duration: "permanent",
            },
          ],
        },
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "CostModifier",
              mode: "raiseCeiling",
              costType: "dpDeletion",
              amount: 2000,
              condition: {
                kind: "youHave",
                filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"], colors: ["Red"] },
                raw: "you have a red Tamer in play",
              },
            },
          ],
        },
        {
          trigger: "WhenAttacking",
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"] },
                count: "all",
                totalDpCap: 6000,
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("gets +2000 DP during its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-011", as: "gallantmon" }] } });
    await s.ready();
    expect(s.perm("gallantmon").currentDP).toBe(14000);
  });

  it("deletes any number totaling exactly 6000 DP without a red Tamer (Q3294)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-011", as: "gallantmon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 3000, as: "firstTarget" },
            { card: "BT1-010", dp: 3000, as: "secondTarget" },
            { card: "BT1-011", dp: 7000, as: "aboveLimit" },
          ],
          security: ["BT1-012"],
          deck: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallantmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-011");
  });

  it("raises its own aggregate deletion budget to 8000 DP with a red Tamer (Q3296)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-011", as: "gallantmon" },
            { card: "BT1-085", as: "redTamer" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 8000, as: "withinRaisedLimit" },
            { card: "BT1-010", dp: 9000, as: "aboveLimit" },
          ],
          security: ["BT1-012"],
          deck: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallantmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-010");
  });

  it("does not raise its DP or deletion ceiling during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-011", as: "gallantmon" }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "opponentDigimon" }],
        hand: ["BT1-010"],
        deck: ["BT1-011", "BT1-012"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("gallantmon").currentDP).toBe(12000);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await loop;
  });

  it("raises another numeric DP deletion ceiling from a separate stack (Q3297)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-011", as: "gallantmon" },
            { card: "EX2-009", under: ["EX2-008"], as: "growlmon" },
            { card: "BT1-085", as: "redTamer" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-009", dp: 5000, as: "target" }],
          security: ["BT1-010"],
          deck: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const targetId = s.perm("target").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("growlmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
  });

  it("does not raise a DP-relative deletion ceiling (Q3295)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-011", as: "gallantmon" },
            { card: "BT1-085", as: "redTamer" },
          ],
          hand: [{ card: "LM-021", as: "bond" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 15000, as: "tooHigh" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bond").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "LM-021"),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("tooHigh").currentDP).toBe(15000);
  });

  it("reaches Gallantmon through a legal red evolution and pays its cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-010", as: "source" }],
        hand: [{ card: "EX2-011", as: "gallantmon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("gallantmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.instanceId === s.inst("gallantmon").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["EX2-010"]);
    expect(s.perm("source").topCard.cardId).toBe("EX2-011");
  });

  it("rejects an evolution from a non-level-5 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-009", as: "invalidSource" }],
        hand: [{ card: "EX2-011", as: "gallantmon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("invalidSource").permanentId,
        instanceId: s.inst("gallantmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("gallantmon").instanceId]);
  });
});
