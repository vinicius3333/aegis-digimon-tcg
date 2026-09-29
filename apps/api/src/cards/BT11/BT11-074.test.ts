import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-074.js";
import "../BT18/BT18-016.js";
describe("BT11-074 BlackWarGreymon X", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-074")).toMatchObject({
      cardId: "BT11-074",
      colors: ["Black", "Red"],
      level: 6,
      playCost: 13,
      dp: 13000,
      types: ["Dragonkin", "X Antibody"],
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Reboot" }] },
      {
        trigger: "OpponentsTurn",
        frequency: "OncePerTurn",
        actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks" }],
      },
      {
        trigger: "OpponentsTurn",
        frequency: "OncePerTurn",
        actions: [{ kind: "SubTrigger", event: "whenUnsuspended" }],
      },
    ]);
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["BlackWarGreymon"], cost: 2, isAlternate: true }]);
  });

  it("has Reboot", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-074", as: "bwarg" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("bwarg"), "Reboot")).toBe(true);
  });

  it("digivolves for 2 from BlackWarGreymon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-070", as: "blackWarGreymon" }],
        hand: [{ card: "BT11-074", as: "xAntibody" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blackWarGreymon").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blackWarGreymon").topCard.cardId === "BT11-074");

    expect(s.state.memory).toBe(3);
  });

  it("redirects an attack declared by the opponent's highest-DP Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-074", as: "bwarg" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-011", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "highest", dp: 5000 },
            { card: "BT1-011", as: "lower", dp: 3000 },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const highestId = s.perm("highest").topCard.instanceId;
    const lowerId = s.perm("lower").topCard.instanceId;
    const securityIds = s.state.players[0]!.security.map(({ instanceId }) => instanceId);
    const highestPermanentId = s.perm("highest").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: highestPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([highestId]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual(securityIds);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("lower").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([highestId]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([securityIds[1]]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.instanceId)).toEqual([lowerId]);

    advance(s.engine).endMainPhaseIfOpen(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("lower").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([highestId, lowerId]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([securityIds[1]]);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("does not redirect an attack declared by a lower-DP Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-074", as: "bwarg" }], security: ["BT1-009"] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "highest", dp: 5000 },
            { card: "BT1-011", as: "lower", dp: 3000 },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("lower").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("deletes the lowest-play-cost opponent on a real unsuspend, once per turn, then resets", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-074", as: "bwarg", under: ["BT9-109"] }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "lowest", suspended: true },
            { card: "BT1-081", as: "expensive", suspended: true },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const lowestId = s.perm("lowest").topCard.instanceId;
    const expensiveId = s.perm("expensive").topCard.instanceId;
    const securityIds = s.state.players[1]!.security.map(({ instanceId }) => instanceId);

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.instanceId)).toEqual([expensiveId]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([lowestId]);

    await advance(s.engine).verb.suspend([s.perm("expensive").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("expensive").permanentId]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([lowestId]);
    await advance(s.engine).verb.suspend([s.perm("expensive").permanentId]);
    advance(s.engine).endMainPhaseIfOpen(1);
    await firstTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const neutralTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await neutralTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const resetTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([lowestId, expensiveId]);
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual(securityIds);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(1);
    await resetTurn;
  });
});

describe("BT11-074 BlackWarGreymon (X Antibody) — KB Q&A rulings", () => {
  it("can't switch the target when the attacker only becomes the highest DP through its When Attacking effect (Q2102)", async () => {
    async function volcanomonAttacks(rivalDP: number) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT11-074", as: "bwarg" }],
            security: ["BT1-009", "BT1-009"],
          },
          1: {
            battleArea: [
              { card: "BT18-016", as: "volcanomon" },
              { card: "BT1-011", as: "rival", dp: rivalDP },
            ],
          },
        },
        { autoOrderTriggers: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      await s.ready();
      const volcanomonId = s.perm("volcanomon").topCard.instanceId;
      const volcanomonDPWhenRedirectOffered: number[] = [];
      const answered = new Set<string>();
      const acceptRedirectOffers = (): void => {
        for (const { seat, req } of s.decisions) {
          if (seat !== 0 || req.kind !== "optional" || answered.has(req.decisionId)) continue;
          answered.add(req.decisionId);
          volcanomonDPWhenRedirectOffered.push(s.perm("volcanomon").currentDP);
          s.engine.applyIntent(seat, {
            type: "respondDecision",
            decisionId: req.decisionId,
            response: { kind: "optional", accept: true },
          });
        }
      };
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("volcanomon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => {
        acceptRedirectOffers();
        return !observe(s.engine).isAttacking();
      });
      return { s, volcanomonId, volcanomonDPWhenRedirectOffered };
    }

    const boostedPastRival = await volcanomonAttacks(10000);
    expect(boostedPastRival.volcanomonDPWhenRedirectOffered).toEqual([]);
    expect(boostedPastRival.s.perm("volcanomon").currentDP).toBe(11000);
    expect(boostedPastRival.s.state.players[0]!.security).toHaveLength(1);
    expect(boostedPastRival.s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      boostedPastRival.volcanomonId,
    );

    // The turn player's +2000 resolves before the redirect is offered, so in the 10000 DP board
    // Volcanomon already outranks the rival when the redirect would be checked at resolution.
    const highestAtDeclaration = await volcanomonAttacks(8000);
    expect(highestAtDeclaration.volcanomonDPWhenRedirectOffered).toEqual([11000]);
    expect(highestAtDeclaration.s.state.players[0]!.security).toHaveLength(2);
    expect(highestAtDeclaration.s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(
      highestAtDeclaration.volcanomonId,
    );
  });

  it("activates when one of the opponent's Digimon becomes unsuspended (Q2103)", async () => {
    async function unsuspendOpponentDigimon(under: string[]) {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT11-074", as: "bwarg", under }] },
          1: {
            battleArea: [
              { card: "BT1-081", as: "unsuspending", suspended: true },
              { card: "BT1-010", as: "cheapest" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      await s.ready();
      await advance(s.engine).verb.unsuspend([s.perm("unsuspending").permanentId]);
      await settle();
      return s;
    }

    const withXAntibody = await unsuspendOpponentDigimon(["BT9-109"]);
    expect(withXAntibody.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      withXAntibody.inst("unsuspending").instanceId,
    ]);
    expect(withXAntibody.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      withXAntibody.inst("cheapest").instanceId,
    ]);

    const withoutXAntibody = await unsuspendOpponentDigimon(["BT1-009"]);
    expect(withoutXAntibody.state.players[1]!.battleArea).toHaveLength(2);
    expect(withoutXAntibody.state.players[1]!.trash).toHaveLength(0);
  });
});
