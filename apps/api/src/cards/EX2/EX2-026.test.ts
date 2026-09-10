import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-026.js";
import "./EX2-026.js";
import "./EX2-027.js";
import "../ST4/ST4-15.js";

describe("EX2-026 Gargomon", () => {
  it("matches the catalog and compiled reduction/inherited clauses", () => {
    expect(getCardDefinition("EX2-026")).toMatchObject({
      cardId: "EX2-026",
      nameEn: "Gargomon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Beastkin"],
      effectText:
        "[Your Turn] When this Digimon would digivolve, if you have a green Tamer in play, reduce the digivolution cost by 1.",
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When an opponent's Digimon becomes suspended, this Digimon gets +2000 DP for the turn.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              sourceFilter: { isSelfRef: true },
              actions: [
                {
                  kind: "Replacement",
                  event: "wouldDigivolve",
                  mode: "reduceCost",
                  amount: 1,
                  condition: { kind: "youHave", filter: { zone: "battleArea", colors: ["Green"] } },
                },
              ],
            },
          ],
        },
        {
          trigger: "YourTurn",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenSuspended",
              sourceFilter: { controller: "opponent", kind: ["Digimon"] },
              actions: [{ kind: "ModifyDP", amount: 2000, duration: "forTheTurn" }],
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("reduces its digivolution cost by 1 with a green Tamer in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-026", as: "base" }, "EX2-061"],
          hand: [{ card: "EX2-027", as: "evolution" }],
          deck: ["BT1-009"],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 8);
    expect(s.state.memory).toBe(8);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX2-026"]);
    expect(s.perm("base").topCard.cardId).toBe("EX2-027");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("does not reduce the cost without a green Tamer", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX2-026", as: "base" }, "EX2-060"], hand: [{ card: "EX2-027", as: "evolution" }] } },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 7);
    expect(s.state.memory).toBe(7);
  });

  it("gains inherited DP when an opponent's Digimon becomes suspended", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-027", as: "host", under: ["EX2-026"] }],
          hand: [
            { card: "ST4-15", as: "option1" },
            { card: "ST4-15", as: "option2" },
            { card: "ST4-15", as: "option3" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "EX2-014", as: "target1" },
            { card: "EX2-014", as: "target2" },
            { card: "EX2-014", as: "target3" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    s.state.memory = 5;
    await s.ready();
    preferred.push(s.perm("target1").topCard.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").currentDP === 9000);
    expect(s.perm("host").currentDP).toBe(9000);
    preferred.length = 0;
    preferred.push(s.perm("target2").topCard.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target2").isSuspended);
    expect(s.perm("host").currentDP).toBe(9000);
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").currentDP).toBe(7000);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    preferred.length = 0;
    preferred.push(s.perm("target3").topCard.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option3").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").currentDP === 9000);
    expect(s.perm("host").currentDP).toBe(9000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });
});
