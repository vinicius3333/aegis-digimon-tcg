import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-025.js";
import "./EX2-025.js";
import "./EX2-026.js";
import "./EX2-061.js";
import "./EX2-014.js";
import "../BT1/BT1-003.js";
import "../BT1/BT1-007.js";
import "../BT1/BT1-009.js";
import "../BT1/BT1-010.js";
import "../BT1/BT1-011.js";
import "../BT1/BT1-012.js";
import "../BT1/BT1-013.js";
import "../BT1/BT1-014.js";
import "../BT1/BT1-080.js";
import "../ST4/ST4-15.js";

const inertSecurity = ["BT1-009", "BT1-010"];

describe("EX2-025 Terriermon", () => {
  it("matches the catalog and compiled IR for both printed clauses", () => {
    expect(getCardDefinition("EX2-025")).toMatchObject({
      cardId: "EX2-025",
      nameEn: "Terriermon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Beast"],
      effectText: "[Your Turn][Once Per Turn] When you play a green Tamer, gain 1 memory.",
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When an opponent's Digimon becomes suspended, this Digimon gets +2000 DP for the turn.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "YourTurn",
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenPlayed",
              sourceFilter: { controllerDefault: "mine", kind: ["Tamer"], colors: ["Green"] },
              actions: [{ kind: "GainMemory", amount: 1 }],
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
              actions: [
                {
                  kind: "ModifyDP",
                  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                  amount: 2000,
                  duration: "forTheTurn",
                },
              ],
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("gains 1 memory once when its controller plays a green Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX2-025"],
          hand: [
            { card: "EX2-061", as: "henry1" },
            { card: "EX2-061", as: "henry2" },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("henry1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 7);
    expect(s.state.memory).toBe(7);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("henry2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "EX2-061").length === 2);
    expect(s.state.memory).toBe(3);
  });

  it("does not gain memory when its controller plays a non-green Tamer", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["EX2-025"], hand: [{ card: "EX2-060", as: "rika" }] } },
      { autoOrderTriggers: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rika").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX2-060"));
    expect(s.state.memory).toBe(1);
  });

  it("supports legal green level-2 evolution from breeding with the printed zero cost", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT1-007", as: "egg" }],
          hand: [{ card: "EX2-025", as: "evolution" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: inertSecurity,
        },
        1: { deck: ["BT1-013", "BT1-014"], security: inertSecurity },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 5;
    const turnLoop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-007");
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingPermanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX2-025");
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.cardId)).toEqual(["BT1-007"]);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("rejects evolution from a non-green level-2 source", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT1-003", as: "redEgg" }],
          hand: [{ card: "EX2-025", as: "evolution" }],
          deck: ["BT1-009", "BT1-010"],
          security: inertSecurity,
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 5;
    const turnLoop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-003");
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingPermanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.breeding!.topCard?.cardId).toBe("BT1-003");
    expect(s.state.memory).toBe(5);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("gains inherited DP when an opponent's Digimon becomes suspended", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-026", as: "host", under: ["EX2-025"] }],
          hand: [
            { card: "ST4-15", as: "option1" },
            { card: "ST4-15", as: "option2" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "EX2-014", as: "target1" },
            { card: "EX2-014", as: "target2" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: inertSecurity,
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
    await settle(() => s.perm("host").currentDP === 7000);
    expect(s.perm("host").currentDP).toBe(7000);
    preferred.length = 0;
    preferred.push(s.perm("target2").topCard.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target2").isSuspended);
    expect(s.perm("host").currentDP).toBe(7000);
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });
});
