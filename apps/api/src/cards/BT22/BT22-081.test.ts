import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT22-081.js";
import { itFollowsTamerDigivolutionRulings } from "./tamerDigivolution.testSupport.js";

describe("BT22-081 Eater Eve", () => {
  it("prevents one opponent Digimon from suspending and conditionally places Yuuko", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Restrict",
        restriction: "suspend",
        duration: "untilOpponentTurnEnd",
        target: { filter: { controllerDefault: "opponent", kind: ["Digimon"] }, count: 1 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "PlaceUnder",
        position: "bottom",
        underFilter: { isSelfRef: true },
        condition: { kind: "selfHasNoDigivolutionCards" },
        target: {
          filter: { nameOrTrait: [{ tokens: ["Yuuko Kamishiro"], match: "nameExact" }] },
          from: ["hand", "trash"],
          count: 1,
        },
      });
    }
  });

  it("anchors the leave replacement to this Eater Eve", () => {
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

  it("places Yuuko from trash under the publicly played Eater Eve", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT22-081", as: "eve" }], trash: [{ card: "BT22-083", as: "yuuko" }] },
        1: { battleArea: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const eveId = s.inst("eve").instanceId;
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: eveId })).toEqual({ ok: true });
    await settle(() => {
      const eve = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === eveId);
      return eve?.stack.some((card) => card.cardId === "BT22-083") === true;
    });
    const eve = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === eveId)!;
    expect(eve.stack.some((card) => card.cardId === "BT22-083")).toBe(true);
  });

  it("plays only Yuuko under the Eater Eve that leaves through a public battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-081", as: "decoy", under: [{ card: "BT22-083", as: "decoyYuuko" }] },
            {
              card: "BT22-081",
              as: "eve",
              dp: 1000,
              suspended: true,
              under: [{ card: "BT22-083", as: "eveYuuko" }],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const eveYuukoId = s.inst("eveYuuko").instanceId;
    const decoyYuukoId = s.inst("decoyYuuko").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("eve").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === eveYuukoId));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === eveYuukoId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === decoyYuukoId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT22-081")).toBe(true);
  });
});

describe("BT22-081 Eater Eve — KB Q&A rulings", () => {
  itFollowsTamerDigivolutionRulings(
    { digimon: "BT22-081", tamer: "BT22-083", securityTamer: "BT22-083" },
    {
      noAttackTheTurnTheTamerEntered: "Q4948",
      digivolvesAsTamer: "Q6693",
      bonusDraw: "Q6694",
      tamerIsDigivolutionCard: "Q6695",
      noSecurityEffect: "Q6696",
    },
  );

  it("gains the inherited effect of the Yuuko Kamishiro in its digivolution cards (Q6697)", async () => {
    const eveDpAfterRedirectedAttack = async (under: string[]) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT22-081", as: "eve", under },
              { card: "BT22-091", as: "arata" },
            ],
          },
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
      await settle(() => s.perm("arata").isSuspended);
      await advance(s.engine).finishAttack();
      return s.perm("eve").currentDP;
    };

    expect(await eveDpAfterRedirectedAttack(["BT22-083"])).toBe(10000);
    expect(await eveDpAfterRedirectedAttack([])).toBe(7000);
  });
});
