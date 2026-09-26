import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX4-069.js";

describe("EX4-069 Gaia Reactor", () => {
  it("matches the catalog and compiled Main/Security effects", () => {
    expect(getCardDefinition("EX4-069")).toMatchObject({
      nameEn: "Gaia Reactor",
      colors: ["Black"],
      kinds: ["Option"],
      playCost: 6,
      effectText: "[Main] Choose 1 of each player's Digimon with the highest play cost. Delete all other Digimon.",
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
    expect(runtimeCompiledCard("EX4-069")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Main",
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "mine", kind: ["Digimon"] },
                count: "all",
                except: {
                  filter: { controller: "mine", kind: ["Digimon"] },
                  count: 1,
                  selector: "highestPlayCost",
                },
              },
            },
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"] },
                count: "all",
                except: {
                  filter: { controller: "opponent", kind: ["Digimon"] },
                  count: 1,
                  selector: "highestPlayCost",
                },
              },
            },
          ],
        },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
      ],
    });
  });

  it("lets the Option user choose tied highest-cost survivors on both sides", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX4-069", as: "reactor" }],
          battleArea: [
            { card: "BT10-058", as: "ownKeep" },
            { card: "BT1-011", as: "ownTie" },
            { card: "BT1-009", as: "ownLow" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "opponentKeep" },
            { card: "BT1-012", as: "opponentTie" },
            { card: "BT1-009", as: "opponentLow" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reactor").instanceId })).toEqual({
      ok: true,
    });

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const ownChoice = s.state.pendingDecision!;
    const ownRequest = s.decisions.find(({ req }) => req.decisionId === ownChoice.decisionId)!.req;
    const ownCandidates = ownRequest.options?.candidateInstanceIds ?? [];
    expect(ownCandidates).toEqual(
      expect.arrayContaining([s.perm("ownKeep").permanentId, s.perm("ownTie").permanentId]),
    );
    expect(ownCandidates).not.toContain(s.perm("ownLow").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ownChoice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("ownKeep").permanentId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const opponentChoice = s.state.pendingDecision!;
    const opponentRequest = s.decisions.find(({ req }) => req.decisionId === opponentChoice.decisionId)!.req;
    const opponentCandidates = opponentRequest.options?.candidateInstanceIds ?? [];
    expect(opponentCandidates).toEqual(
      expect.arrayContaining([s.perm("opponentKeep").permanentId, s.perm("opponentTie").permanentId]),
    );
    expect(opponentCandidates).not.toContain(s.perm("opponentLow").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: opponentChoice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("opponentKeep").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("ownKeep").permanentId,
    ]);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("opponentKeep").permanentId,
    ]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-011", "BT1-009"]),
    );
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-012", "BT1-009"]),
    );
  });

  it("activates from Security during a public attack and preserves each unique highest-cost Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-058", as: "ownHighest" },
            { card: "BT1-009", as: "ownLow" },
          ],
          security: [{ card: "EX4-069", as: "reactor" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-011", as: "attacker" },
            { card: "BT1-009", as: "opponentLow" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("reactor").instanceId) &&
        s.state.players[0]!.battleArea.length === 1 &&
        s.state.players[1]!.battleArea.length === 1,
    );

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("ownHighest").permanentId,
    ]);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("attacker").permanentId,
    ]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-009");
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-009");
    expect(s.state.players[0]!.security).toHaveLength(0);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
