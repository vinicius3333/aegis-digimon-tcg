import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { type EngineSetup, setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard, wouldDigivolveSelfReducersFor } from "../../engine/effects/interpreter.js";
import "../BT6/BT6-049.js";
import "../EX1/EX1-035.js";
import "./BT7-051.js";
import "./BT7-054.js";
import "./BT7-066.js";

const RHINOKABUTERIMON = "BT7-051";
const ANCIENT_BEETLEMON = "BT7-054";
const ANCIENT_VOLCANOMON = "BT7-066";
const ARBORMON = "BT6-049";
const KABUTERIMON = "EX1-035";

function declareAttackOnPlayer(s: EngineSetup, attackerAlias: string): void {
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm(attackerAlias).permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
}

async function finishAttackOnPlayer(s: EngineSetup, securityBefore: number): Promise<void> {
  await settle(() => s.state.players[1]!.security.length < securityBefore);
  await advance(s.engine).finishAttack();
}

const handCardIds = (s: EngineSetup): string[] => s.state.players[0]!.hand.map((card) => card.cardId);

describe("BT7-051 RhinoKabuterimon", () => {
  it("publishes its optional attack evolution and Tamer-source self reducer", () => {
    expect(runtimeCompiledCard("BT7-051")).toMatchObject({ coverage: "full", residual: [] });
    expect(wouldDigivolveSelfReducersFor("BT7-051")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          amount: 2,
          sourceFilter: { controller: "mine", kind: ["Digimon"], digivolutionStackKind: ["Tamer"] },
        }),
      ]),
    );
    expect(runtimeCompiledCard("BT7-051")?.effects[1]?.actions[0]).toMatchObject({
      kind: "Digivolve",
      optional: true,
      payCost: true,
      from: ["hand"],
      costOverride: 3,
    });
  });

  it("reduces its own Tamer-source digivolution cost by 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-046", under: ["BT7-089"], as: "base" }],
        hand: [{ card: "BT7-051", as: "rhinoInHand" }],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rhinoInHand").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === s.inst("rhinoInHand").instanceId);

    expect(s.state.memory).toBe(3);
  });

  it("digivolves into an Insectoid or Ten Warriors card for 3 memory when attacking with a qualifying source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-051", under: ["BT6-049"], as: "rhino" }],
          hand: [{ card: "BT7-054", as: "ancient" }],
          deck: ["BT1-010"],
        },
        1: { security: ["BT1-101"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rhino").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rhino").topCard?.instanceId === s.inst("ancient").instanceId);

    expect(s.state.memory).toBe(2);
  });
});

describe("BT7-051 RhinoKabuterimon — KB Q&A rulings", () => {
  it("lets the player decline the [When Attacking] digivolution even with a qualifying source and target (Q1592)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: RHINOKABUTERIMON, under: [ARBORMON], as: "rhino" }],
          hand: [{ card: ANCIENT_BEETLEMON, as: "ancient" }],
        },
        1: { security: 2 },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    declareAttackOnPlayer(s, "rhino");
    await finishAttackOnPlayer(s, 2);

    expect(s.decisions.some(({ seat, req }) => seat === 0 && req.sourceInstanceId === s.inst("rhino").instanceId)).toBe(
      true,
    );
    expect(s.perm("rhino").topCard?.cardId).toBe(RHINOKABUTERIMON);
    expect(handCardIds(s)).toEqual([ANCIENT_BEETLEMON]);
    expect(s.state.memory).toBe(5);
  });

  it("continues the attack after the digivolution cost passes memory to the opponent, then ends the turn (Q1593)", async () => {
    let boardAtSecurityCheck: { phase: Phase; memory: number } | undefined;
    const s: EngineSetup = setupEngine(
      {
        0: {
          battleArea: [{ card: RHINOKABUTERIMON, under: [ARBORMON], as: "rhino" }],
          hand: [{ card: ANCIENT_BEETLEMON, as: "ancient" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: 3,
        },
        1: { security: 2, deck: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        onEvent() {
          if (boardAtSecurityCheck === undefined && s.state.players[1]!.security.length < 2) {
            boardAtSecurityCheck = { phase: s.state.phase, memory: s.state.memory };
          }
        },
      },
    );
    s.state.memory = 2;
    const driver = advance(s.engine);

    const turn = s.engine.runOneTurn();
    await driver.waitForMainPhase(0);
    declareAttackOnPlayer(s, "rhino");
    await finishAttackOnPlayer(s, 2);

    expect(s.perm("rhino").topCard?.instanceId).toBe(s.inst("ancient").instanceId);
    expect(boardAtSecurityCheck).toEqual({ phase: Phase.Main, memory: -1 });
    expect(s.state.phase).toBe(Phase.End);

    driver.endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not trigger its own [When Attacking] after Kabuterimon digivolves into it mid-attack (Q1594)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: KABUTERIMON, under: [ARBORMON], as: "kabuterimon" }],
          hand: [
            { card: RHINOKABUTERIMON, as: "rhinoInHand" },
            { card: ANCIENT_BEETLEMON, as: "ancient" },
          ],
        },
        1: { security: 2 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;

    declareAttackOnPlayer(s, "kabuterimon");
    await finishAttackOnPlayer(s, 2);

    expect(s.perm("kabuterimon").topCard?.instanceId).toBe(s.inst("rhinoInHand").instanceId);
    expect(s.state.memory).toBe(5);
    expect(handCardIds(s)).toEqual([ANCIENT_BEETLEMON]);
  });

  it("still requires the target card's digivolution requirements to be met (Q1595)", async () => {
    const preferredPicks: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: RHINOKABUTERIMON, under: [ARBORMON], as: "rhino" }],
          hand: [
            { card: ANCIENT_VOLCANOMON, as: "blackTenWarrior" },
            { card: ANCIENT_BEETLEMON, as: "greenTenWarrior" },
          ],
        },
        1: { security: 2 },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredPicks },
    );
    const volcanomonId = s.inst("blackTenWarrior").instanceId;
    preferredPicks.push(volcanomonId);
    s.state.memory = 5;

    declareAttackOnPlayer(s, "rhino");
    await finishAttackOnPlayer(s, 2);

    const offeredCandidates = s.decisions.flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
    expect(offeredCandidates).not.toContain(volcanomonId);
    expect(s.perm("rhino").topCard?.instanceId).toBe(s.inst("greenTenWarrior").instanceId);
    expect(handCardIds(s)).toEqual([ANCIENT_VOLCANOMON]);
    expect(s.state.memory).toBe(2);
  });
});
