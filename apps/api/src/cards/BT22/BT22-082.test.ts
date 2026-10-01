import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT22-082.js";
import { itFollowsTamerDigivolutionRulings } from "./tamerDigivolution.testSupport.js";

describe("BT22-082 Eater Adam", () => {
  it("deletes an opposing play-cost-7-or-lower Digimon and places Arata underneath when empty", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 7 }, count: 1 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "PlaceUnder",
        condition: { kind: "selfHasNoDigivolutionCards" },
        underFilter: { isSelfRef: true },
        position: "bottom",
        target: { from: ["hand", "trash"], count: 1 },
      });
    }
  });

  it("anchors the leave replacement to this Eater Adam", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          optional: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["digivolutionCards"],
              optional: true,
              target: { filter: { zone: "digivolutionCards", hostFilter: { isSelfRef: true } } },
            },
          ],
        },
      ],
    });
  });

  it("cannot delete a play cost 10 Digimon on play (Discord 1555135721101197382 sweep)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT22-082", as: "adam" }] },
        1: { battleArea: [{ card: "ST5-12", as: "tooExpensive" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const adamId = s.inst("adam").instanceId;
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: adamId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === adamId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("tooExpensive").permanentId,
    ]);
  });

  it("deletes the cost-7 boundary and places Arata from hand under the played Eater", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT22-082", as: "adam" },
            { card: "BT22-091", as: "arata" },
          ],
        },
        1: { battleArea: [{ card: "BT1-024", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const adamId = s.inst("adam").instanceId;
    const victimId = s.perm("victim").permanentId;
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: adamId })).toEqual({ ok: true });
    await settle(() => {
      const adam = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === adamId);
      return adam?.stack.some((card) => card.cardId === "BT22-091") === true;
    });
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === victimId)).toBe(false);
    const adam = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === adamId)!;
    expect(adam.stack.some((card) => card.cardId === "BT22-091")).toBe(true);
  });

  it("plays only Arata under the Eater Adam that leaves through a public battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-082", as: "decoy", under: [{ card: "BT22-091", as: "decoyArata" }] },
            {
              card: "BT22-082",
              as: "adam",
              dp: 1000,
              suspended: true,
              under: [{ card: "BT22-091", as: "adamArata" }],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const adamArataId = s.inst("adamArata").instanceId;
    const decoyArataId = s.inst("decoyArata").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("adam").permanentId },
      }),
    ).toEqual({ ok: true });

    for (let decisionCount = 0; decisionCount < 4; decisionCount += 1) {
      await settle(
        () =>
          s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === adamArataId) ||
          s.state.pendingDecision?.kind === "optional",
      );
      if (s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === adamArataId)) break;

      const pending = s.state.pendingDecision;
      expect(pending?.kind).toBe("optional");
      if (pending?.kind !== "optional") break;
      const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)?.req;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind: "optional", accept: request?.sourceCardId === "BT22-082" },
        }),
      ).toEqual({ ok: true });
    }
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === adamArataId));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === adamArataId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === decoyArataId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT22-082")).toBe(true);
  });
});

describe("BT22-082 Eater Adam — KB Q&A rulings", () => {
  itFollowsTamerDigivolutionRulings(
    { digimon: "BT22-082", tamer: "BT22-091", securityTamer: "BT22-091" },
    {
      noAttackTheTurnTheTamerEntered: "Q4949",
      digivolvesAsTamer: "Q6698",
      bonusDraw: "Q6699",
      tamerIsDigivolutionCard: "Q6700",
      noSecurityEffect: "Q6701",
    },
  );

  it("gains the inherited effect of the Arata Sanada in its digivolution cards (Q6702)", async () => {
    const securityAfterOpponentAttacksPlayer = async (under: string[]) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT22-082", as: "adam", under }], security: ["BT1-010", "BT1-011"] },
          1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 1000 }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      await s.ready();

      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await advance(s.engine).finishAttack();
      return s.state.players[0]!.security.length;
    };

    expect(await securityAfterOpponentAttacksPlayer(["BT22-091"])).toBe(2);
    expect(await securityAfterOpponentAttacksPlayer([])).toBe(1);
  });
});
