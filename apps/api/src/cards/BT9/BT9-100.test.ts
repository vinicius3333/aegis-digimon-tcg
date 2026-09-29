import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup, type PermanentSpec } from "../../engine/testkit/harness.js";
import "../BT5/BT5-030.js";
import { compiled } from "./BT9-100.js";
import "./BT9-100.js";

describe("BT9-100 Grandis Scissor", () => {
  it("matches catalog values and the bound Insectoid attack and security IR", () => {
    expect(getCardDefinition("BT9-100")).toMatchObject({
      colors: ["Green"],
      kinds: ["Option"],
      playCost: 4,
      securityEffectText: "[Security] Suspend 1 of your opponent's Digimon or Tamers.",
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Main",
          actions: [
            { kind: "Suspend", target: { filter: { kind: ["Digimon"] } } },
            {
              kind: "Unsuspend",
              optional: true,
              abortOnDecline: true,
              target: {
                bindAs: "unsuspendedInsectoid",
                filter: { nameOrTrait: [{ tokens: ["Insectoid"], match: "trait" }] },
              },
            },
            { kind: "Attack", attackPlayer: false, target: { fromSelectionRef: "unsuspendedInsectoid" } },
          ],
        },
        {
          trigger: "Security",
          isSecurity: true,
          actions: [{ kind: "Suspend", target: { filter: { kind: ["Digimon", "Tamer"] } } }],
        },
      ],
    });
  });

  it("suspends an opponent, unsuspends an Insectoid, and makes it attack that Digimon rather than the player", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-055", as: "insectoid", suspended: true }],
          hand: [{ card: "BT9-100", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }], security: ["BT1-011"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0 || s.state.players[1]!.security.length === 0);

    expect(s.perm("insectoid").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});

describe("BT9-100 Grandis Scissor — KB Q&A rulings", () => {
  async function playScissor(board: { insectoid: PermanentSpec; opponent: PermanentSpec[] }, suspendAlias: string) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [board.insectoid], hand: [{ card: "BT9-100", as: "option" }] },
        1: { battleArea: board.opponent, security: ["BT1-009", "BT1-009"] },
      },
      {
        autoSelectCards: true,
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm(suspendAlias).topCard!.instanceId);
    const permanentIds = new Map(
      board.opponent.map((spec) => [spec.as ?? spec.card, s.perm(spec.as ?? spec.card).permanentId]),
    );
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT9-100"));
    await settle(() => s.state.pendingDecision === undefined);
    return { s, permanentIdOf: (alias: string) => permanentIds.get(alias)! };
  }

  function attackTargetCandidates(s: EngineSetup): string[] | undefined {
    return s.decisions.find(({ req }) => req.options?.selectionContext === "attackTarget")?.req.options
      ?.candidateInstanceIds;
  }

  function attackDeclared(s: EngineSetup): boolean {
    return s.events.some((event) => event.kind === "attackDeclared");
  }

  it("does not make an Insectoid Digimon played this turn attack (Q1903)", async () => {
    const { s: fresh } = await playScissor(
      {
        insectoid: { card: "BT9-055", as: "insectoid", suspended: true, enteredThisTurn: true },
        opponent: [{ card: "BT1-010", as: "target" }],
      },
      "target",
    );
    expect(fresh.perm("target").isSuspended).toBe(true);
    expect(fresh.perm("insectoid").isSuspended).toBe(false);
    expect(attackDeclared(fresh)).toBe(false);
    expect(fresh.state.players[1]!.battleArea.map((permanent) => permanent.topCard!.cardId)).toEqual(["BT1-010"]);

    const { s: established } = await playScissor(
      {
        insectoid: { card: "BT9-055", as: "insectoid", suspended: true },
        opponent: [{ card: "BT1-010", as: "target" }],
      },
      "target",
    );
    expect(attackDeclared(established)).toBe(true);
    expect(established.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("cannot make the Insectoid attack an unsuspended opponent's Digimon (Q1904)", async () => {
    const { s, permanentIdOf } = await playScissor(
      {
        insectoid: { card: "BT9-055", as: "insectoid", suspended: true },
        opponent: [
          { card: "BT1-010", as: "suspendedByScissor" },
          { card: "BT9-045", as: "unsuspended" },
        ],
      },
      "suspendedByScissor",
    );

    expect(attackTargetCandidates(s)).toEqual([permanentIdOf("suspendedByScissor")]);
    expect(s.perm("unsuspended").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard!.cardId)).toEqual(["BT9-045"]);
  });

  it("cannot make the Insectoid attack an opponent's Digimon that can't be attacked (Q1905)", async () => {
    const { s, permanentIdOf } = await playScissor(
      {
        insectoid: { card: "BT9-055", as: "insectoid", suspended: true },
        opponent: [
          { card: "BT5-030", as: "neptunemon" },
          { card: "BT1-010", as: "attackable", suspended: true },
        ],
      },
      "neptunemon",
    );

    expect(s.perm("neptunemon").isSuspended).toBe(true);
    expect(attackTargetCandidates(s)).toEqual([permanentIdOf("attackable")]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard!.cardId)).toEqual(["BT5-030"]);
  });
});
