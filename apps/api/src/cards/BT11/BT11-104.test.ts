import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { drainMicrotasks, setupEngine, settle, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-104.js";

describe("BT11-104 Buster Dive", () => {
  it("maps catalog facts and each printed effect to IR", () => {
    expect(getCardDefinition("BT11-104")).toMatchObject({
      cardId: "BT11-104",
      colors: ["Green"],
      kinds: ["Option"],
      playCost: 4,
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", actions: [{ kind: "Replacement", event: "wouldBePlayed" }] },
      {
        trigger: "Main",
        actions: [
          { kind: "ModifyDP", amount: 5000, alsoGainKeywords: [{ keyword: "Rush" }] },
          { kind: "Attack", target: { filter: { controller: "mine", kind: ["Digimon"] } }, attackPlayer: false },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "AddToHandSelf" }] },
    ]);
  });

  it("gives one own Digimon +5000 DP and Rush", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-088", { card: "BT1-075", as: "recipient", dp: 5000 }],
          hand: [{ card: "BT11-104", as: "option" }],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("recipient").currentDP === 10000);
    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Rush")).toBe(true);
  });
});

describe("BT11-104 Buster Dive — KB Q&A rulings", () => {
  const useBusterDiveAgainst = async (opponentBattleArea: PermanentSpec[]) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-075", as: "attacker" }], hand: [{ card: "BT11-104", as: "option" }] },
        1: { battleArea: opponentBattleArea },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    const opponentIdentities = new Map(
      s.state.players[1]!.battleArea.map((permanent) => [
        permanent.topCard!.cardId,
        [permanent.permanentId, permanent.topCard!.instanceId],
      ]),
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT11-104"));
    await drainMicrotasks();
    return { s, opponentIdentities };
  };

  it("cannot attack an unsuspended opponent Digimon with its attack effect (Q2132)", async () => {
    const { s: onlyUnsuspended } = await useBusterDiveAgainst([{ card: "BT1-010" }]);
    expect(onlyUnsuspended.perm("attacker").isSuspended).toBe(false);
    expect(onlyUnsuspended.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-010"]);

    const { s: mixed, opponentIdentities } = await useBusterDiveAgainst([
      { card: "BT1-010" },
      { card: "BT1-012", suspended: true },
    ]);
    const offeredTargets = mixed.decisions.flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
    expect(offeredTargets).toContain(opponentIdentities.get("BT1-012")![0]);
    expect(offeredTargets.filter((id) => opponentIdentities.get("BT1-010")!.includes(id))).toEqual([]);
    expect(mixed.perm("attacker").isSuspended).toBe(true);
    expect(mixed.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-010"]);
    expect(mixed.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-012"]);
  });
});
