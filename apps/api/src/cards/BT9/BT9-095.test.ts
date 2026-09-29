import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup, type PermanentSpec } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-095.js";
import "./BT9-095.js";
import "../BT1/BT1-021.js";
import "../BT8/BT8-067.js";
import "./BT9-016.js";

describe("BT9-095 Gaia Force ZERO", () => {
  it("matches catalog values and exact-source reduction, attack, and security IR", () => {
    expect(getCardDefinition("BT9-095")).toMatchObject({
      colors: ["Red"],
      kinds: ["Option"],
      playCost: 8,
      securityEffectText: "[Security] Delete 1 of your opponent's Digimon.",
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Static",
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              actions: [
                {
                  kind: "Replacement",
                  mode: "reduceCost",
                  amount: 2,
                  condition: {
                    kind: "youHave",
                    filter: { digivolutionStackNameOrTrait: [{ tokens: ["X Antibody"], match: "nameExact" }] },
                  },
                },
              ],
            },
          ],
        },
        {
          trigger: "Main",
          actions: [
            { kind: "Delete", target: { filter: { dp: { op: "lte", value: 13000 } } } },
            {
              kind: "Attack",
              attackPlayer: true,
              attackPlayerOnly: true,
              optional: true,
              target: { filter: { nameOrTrait: [{ tokens: ["Greymon"], match: "name" }] } },
            },
          ],
        },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "Delete" }] },
      ],
    });
  });

  it("deletes an opposing Digimon at 13000 DP or less", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT9-007"], hand: [{ card: "BT9-095", as: "option" }] }, 1: { battleArea: ["BT9-032"] } },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not reduce its cost for an X-Antibody-form source name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-016", as: "host", under: ["BT9-015"] }],
          hand: [{ card: "BT9-095", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.memory).toBe(-2);
  });

  it("reduces its cost when the exact X Antibody Option is in a Digimon's sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-016", as: "host", under: ["BT9-109"] }],
          hand: [{ card: "BT9-095", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.memory).toBe(0);
  });

  it("may make an unsuspended Greymon attack the player after deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-016", as: "greymon" }],
          hand: [{ card: "BT9-095", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT9-032", as: "deleteTarget" }],
          security: [{ card: "BT9-007", as: "security", faceUp: false }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("greymon").isSuspended);

    expect(s.perm("greymon").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

describe("BT9-095 Gaia Force ZERO — KB Q&A rulings", () => {
  const OPTION_COST = 8;

  function gaiaForceBoard(greymons: PermanentSpec[], extraOpponents: PermanentSpec[] = []): EngineSetup {
    const s = setupEngine(
      {
        0: { battleArea: greymons, hand: [{ card: "BT9-095", as: "option" }] },
        1: {
          battleArea: [{ card: "BT9-032", as: "deleteTarget" }, ...extraOpponents],
          security: [{ card: "BT9-007", faceUp: false }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    return s;
  }

  async function playGaiaForce(s: EngineSetup): Promise<void> {
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId) &&
        s.state.pendingDecision === undefined,
    );
  }

  const attackTargetDecisions = (s: EngineSetup) =>
    s.decisions.filter(({ req }) => req.options?.selectionContext === "attackTarget");

  it("cannot make a suspended or just-played [Greymon] Digimon attack (Q1898)", async () => {
    const unableToAttack: PermanentSpec[] = [
      { card: "BT1-021", as: "greymon", suspended: true },
      { card: "BT1-021", as: "greymon", enteredThisTurn: true },
    ];
    for (const greymon of unableToAttack) {
      const s = gaiaForceBoard([greymon]);

      await playGaiaForce(s);

      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.players[1]!.security).toHaveLength(1);
      expect(s.perm("greymon").isSuspended).toBe(greymon.suspended === true);
      expect(attackTargetDecisions(s)).toHaveLength(0);
      expect(s.state.memory).toBe(10 - OPTION_COST);
    }

    const control = gaiaForceBoard([{ card: "BT1-021", as: "readyGreymon" }]);
    await playGaiaForce(control);
    expect(control.perm("readyGreymon").isSuspended).toBe(true);
    expect(control.state.players[1]!.security).toHaveLength(0);
  });

  it("does not reduce its cost for a source with only the [X Antibody] trait (Q1899)", async () => {
    const traitOnlySource = getCardDefinition("BT9-015")!;
    expect(traitOnlySource.types).toContain("X Antibody");
    expect(traitOnlySource.nameEn).not.toBe("X Antibody");

    const memoryAfterPlayOver = async (source: string): Promise<number> => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT9-016", as: "host", under: [source] }],
            hand: [{ card: "BT9-095", as: "option" }],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 6;
      await playGaiaForce(s);
      return s.state.memory;
    };

    expect(await memoryAfterPlayOver("BT9-015")).toBe(6 - OPTION_COST);
    expect(await memoryAfterPlayOver("BT9-109")).toBe(6 - OPTION_COST + 2);
  });

  it("activates the attacking Digimon's [When Attacking] effect (Q1900)", async () => {
    const s = gaiaForceBoard([{ card: "BT1-021", as: "greymon" }]);

    await playGaiaForce(s);

    expect(s.perm("greymon").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(10 - OPTION_COST + 3);
  });

  it("only lets the [Greymon] attack the player, even with an unsuspended-attack grant (Q1901)", async () => {
    const warGreymonWithGrant: PermanentSpec = { card: "BT9-016", as: "greymon", under: ["BT8-067"] };
    const unsuspendedDefender: PermanentSpec = { card: "BT9-032", as: "defender", dp: 15000 };

    const control = gaiaForceBoard([warGreymonWithGrant], [unsuspendedDefender]);
    await control.ready();
    expect(
      control.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: control.perm("greymon").permanentId,
        target: { kind: "permanent", permanentId: control.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });

    const s = gaiaForceBoard([warGreymonWithGrant], [unsuspendedDefender]);
    const defenderId = s.perm("defender").permanentId;

    await playGaiaForce(s);

    expect(s.perm("greymon").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([defenderId]);
    expect(attackTargetDecisions(s).flatMap(({ req }) => req.options?.candidateInstanceIds ?? [])).not.toContain(
      defenderId,
    );
  });
});
